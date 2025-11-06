const { BloodInventory, BloodType, User } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  // 🩸 Lấy danh sách tất cả lô máu
  async getAll(req, res) {
    try {
      const list = await BloodInventory.findAll({
        include: [
          { model: BloodType, as: "blood_type", attributes: ["abo", "rh"] },
          { model: User, as: "user", attributes: ["full_name"] },
        ],
        order: [["id", "DESC"]],
      });
      res.json({ status: true, data: list });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Lỗi lấy danh sách",
        error: error.message,
      });
    }
  },

  // ➕ Thêm mới
  async create(req, res) {
    try {
      const { blood_type_id, units, donation_date, expiry_date } = req.body;
      const user_id = req.user.userId;

      // ✅ Tính trạng thái tự động
      const today = new Date();
      const exp = new Date(expiry_date);
      const diff = (exp - today) / (1000 * 3600 * 24);
      let status = "full";
      if (diff <= 0 || units < 5) status = "critical";
      else if (diff <= 3) status = "expiring";
      else if (units < 10) status = "low";

      const newBatch = await BloodInventory.create({
        blood_type_id,
        user_id,
        units,
        donation_date,
        expiry_date,
        status,
      });

      res.json({ status: true, message: "Thêm lô máu thành công", data: newBatch });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Lỗi thêm lô máu",
        error: error.message,
      });
    }
  },

  // ✏️ Cập nhật
  async update(req, res) {
    try {
      const { id } = req.params;
      const { blood_type_id, units, donation_date, expiry_date } = req.body;

      const batch = await BloodInventory.findByPk(id);
      if (!batch)
        return res.status(404).json({ status: false, message: "Không tìm thấy lô máu" });

      const today = new Date();
      const exp = new Date(expiry_date);
      const diff = (exp - today) / (1000 * 3600 * 24);
      let status = "full";
      if (diff <= 0 || units < 5) status = "critical";
      else if (diff <= 3) status = "expiring";
      else if (units < 10) status = "low";

      await batch.update({ blood_type_id, units, donation_date, expiry_date, status });

      res.json({ status: true, message: "Cập nhật thành công", data: batch });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Lỗi cập nhật",
        error: error.message,
      });
    }
  },

  // ❌ Xóa
  async delete(req, res) {
    try {
      const { id } = req.params;
      const batch = await BloodInventory.findByPk(id);
      if (!batch)
        return res.status(404).json({ status: false, message: "Không tìm thấy lô máu" });
      await batch.destroy();
      res.json({ status: true, message: "Xóa thành công" });
    } catch (error) {
      res.status(500).json({
        status: false,
        message: "Lỗi xóa",
        error: error.message,
      });
    }
  },

  // 🧭 Lọc theo nhóm máu và trạng thái
  async filter(req, res) {
    try {
      const { bloodType, status } = req.body; // ví dụ: { bloodType: "A+", status: "expiring" }

      const whereClause = {};
      if (status && status !== "all") {
        whereClause.status = status;
      }

      const includeClause = [
        {
          model: BloodType,
          as: "blood_type",
          attributes: ["abo", "rh"],
          required: true,
        },
        { model: User, as: "user", attributes: ["full_name"] },
      ];

      // Nếu lọc theo nhóm máu
      if (bloodType && bloodType !== "all") {
        includeClause[0].where = {
          [Op.and]: [
            { abo: bloodType.replace(/[+-]/g, "") },
            { rh: bloodType.includes("+") ? "+" : "-" },
          ],
        };
      }

      const result = await BloodInventory.findAll({
        include: includeClause,
        where: whereClause,
        order: [["id", "DESC"]],
      });

      res.json({ status: true, data: result });
    } catch (error) {
      console.error("❌ Lỗi filter:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi lọc dữ liệu",
        error: error.message,
      });
    }
  },
};
