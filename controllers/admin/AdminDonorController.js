const { User } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  async getAllUsers(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5;
      const offset = (page - 1) * limit;

      const { search, role } = req.query;

      const whereCondition = {
        role: { [Op.in]: ["donor", "doctor"] },
      };

      if (role && ["donor", "doctor"].includes(role)) {
        whereCondition.role = role;
      }

      if (search) {
        whereCondition[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["created_at", "DESC"]],
        attributes: {
          exclude: ["password", "hash_active", "reset_token", "reset_expires"],
        },
      });

      res.status(200).json({
        status: true,
        message: "Tải danh sách người dùng thành công!",
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
      });
    } catch (error) {
      console.error("🔥 Lỗi getAllUsers:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi tải danh sách người dùng!",
      });
    }
  },

  async editUser(req, res) {
    try {
      const { id } = req.params;
      const {
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        medical_history,
        tinh_trang,
      } = req.body;

      const safeData = {
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        medical_history,
        tinh_trang,
      };

      const [affectedRows] = await User.update(safeData, {
        where: {
          id,
          role: { [Op.ne]: "admin" },
        },
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy người dùng để cập nhật.",
        });
      }

      res.status(200).json({
        status: true,
        message: "Cập nhật người dùng thành công!",
      });
    } catch (error) {
      console.error("🔥 Lỗi editUser:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi cập nhật người dùng!",
      });
    }
  },

  async removeUser(req, res) {
    try {
      const { id } = req.params;

      const affectedRows = await User.destroy({
        where: {
          id,
          role: { [Op.ne]: "admin" },
        },
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy người dùng để xóa.",
        });
      }

      res.status(200).json({
        status: true,
        message: "Xóa người dùng thành công!",
      });
    } catch (error) {
      console.error("🔥 Lỗi removeUser:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi xóa người dùng!",
      });
    }
  },
};