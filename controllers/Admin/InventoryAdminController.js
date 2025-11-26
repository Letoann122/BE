const { BloodInventory, User } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  async getAllInventory(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { search, blood_type, rh_factor, status } = req.query;

      const whereCondition = {};

      const validStatuses = [
        "available",
        "reserved",
        "issued",
        "moved",
        "canceled",
      ];
      if (status && validStatuses.includes(status)) {
        whereCondition.status = status;
      }

      const validBloodTypes = ["A", "B", "AB", "O"];
      if (blood_type && validBloodTypes.includes(blood_type)) {
        whereCondition.blood_type = blood_type;
      }

      const validRhFactors = ["+", "-"];
      if (rh_factor && validRhFactors.includes(rh_factor)) {
        whereCondition.rh_factor = rh_factor;
      }

      if (search) {
        whereCondition.blood_bag_id = { [Op.like]: `%${search}%` };
      }

      // ✅ FIX: Bỏ include nếu BloodInventory không có foreign key user_id
      // Nếu cần user info, cần check lại schema database

      const { count, rows } = await BloodInventory.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["expiry_date", "ASC"]],
        // ❌ REMOVE: include không cần nếu không có user_id
        // include: [
        //   {
        //     model: User,
        //     as: "user",
        //     attributes: ["id", "full_name"],
        //   },
        // ],
      });

      res.status(200).json({
        status: true,
        message: "Tải danh sách kho máu thành công!",
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
      });
    } catch (error) {
      console.error(" Lỗi getAllInventory (Admin):", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi tải danh sách kho máu!",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  // ✅ GET DETAIL
  async getInventoryDetail(req, res) {
    try {
      const { id } = req.params;

      const inventory = await BloodInventory.findByPk(id);

      if (!inventory) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy túi máu này",
        });
      }

      res.status(200).json({
        status: true,
        data: inventory,
      });
    } catch (error) {
      console.error(" Lỗi getInventoryDetail:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async updateInventoryStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "available",
        "reserved",
        "issued",
        "moved",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: false,
          message: "Trạng thái không hợp lệ",
        });
      }

      const inventory = await BloodInventory.findByPk(id);

      if (!inventory) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy túi máu này",
        });
      }

      if (new Date(inventory.expiry_date) < new Date() && status === "issued") {
        return res.status(400).json({
          status: false,
          message: "Không thể cấp phát máu đã hết hạn",
        });
      }

      await BloodInventory.update({ status }, { where: { id } });

      res.status(200).json({
        status: true,
        message: "Cập nhật trạng thái thành công",
      });
    } catch (error) {
      console.error("❌ Lỗi updateInventoryStatus:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async bulkUpdateInventoryStatus(req, res) {
    try {
      const { ids, status } = req.body;

      // Validate input
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          status: false,
          message: "Vui lòng chọn ít nhất một túi máu",
        });
      }

      const validStatuses = [
        "available",
        "reserved",
        "issued",
        "moved",
        "canceled",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: false,
          message: "Trạng thái không hợp lệ",
        });
      }

      // Update multiple records
      const result = await BloodInventory.update(
        { status },
        { where: { id: { [Op.in]: ids } } }
      );

      res.status(200).json({
        status: true,
        message: `Cập nhật thành công ${result[0]} túi máu`,
        updatedCount: result[0],
      });
    } catch (error) {
      console.error(" Lỗi bulkUpdateInventoryStatus:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },

  // ✅ GET STATISTICS
  async getInventoryStatistics(req, res) {
    try {
      const { blood_type, rh_factor } = req.query;

      const whereCondition = {};

      if (blood_type && ["A", "B", "AB", "O"].includes(blood_type)) {
        whereCondition.blood_type = blood_type;
      }

      if (rh_factor && ["+", "-"].includes(rh_factor)) {
        whereCondition.rh_factor = rh_factor;
      }

      // Count by status
      const statusStats = await BloodInventory.findAll({
        where: whereCondition,
        attributes: [
          "status",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["status"],
        raw: true,
      });

      // Count by blood type
      const bloodTypeStats = await BloodInventory.findAll({
        where: whereCondition,
        attributes: [
          "blood_type",
          "rh_factor",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["blood_type", "rh_factor"],
        raw: true,
      });

      // Expired count
      const expiredCount = await BloodInventory.count({
        where: {
          ...whereCondition,
          expiry_date: { [Op.lt]: new Date() },
        },
      });

      // Total count
      const totalCount = await BloodInventory.count({
        where: whereCondition,
      });

      res.status(200).json({
        status: true,
        data: {
          total: totalCount,
          expired: expiredCount,
          byStatus: statusStats,
          byBloodType: bloodTypeStats,
        },
      });
    } catch (error) {
      console.error(" Lỗi getInventoryStatistics:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },
};
