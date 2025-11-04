const { User } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  async getAllUsers(req, res) {
    try {
      // 1. Lấy các tham số query từ FE
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 5; // Khớp với FE
      const offset = (page - 1) * limit;

      const { search, role } = req.query;

      const whereCondition = {
        role: { [Op.in]: ["donor", "doctor"] },
      };

      if (role && (role === "donor" || role === "doctor")) {
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
        limit: limit,
        offset: offset,

        attributes: {
          exclude: ["password", "hash_active", "reset_token", "reset_expires"],
        },
        order: [["created_at", "DESC"]],
      });

      res.status(200).json({
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
      });
    } catch (error) {
      console.error("Error in getAllUsers:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
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

      // Dữ liệu an toàn (không cho phép đổi vai trò)
      const safe_data = {
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

      const [affectedRows] = await User.update(safe_data, {
        where: {
          id: id,
          role: { [Op.ne]: "admin" }, // Đảm bảo Admin không thể tự sửa Admin khác
        },
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy người dùng để cập nhật.",
        });
      }

      res
        .status(200)
        .json({ status: true, message: "Cập nhật người dùng thành công." });
    } catch (error) {
      console.error("Error in editUser:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  },

  async removeUser(req, res) {
    try {
      const { id } = req.params;

      const affectedRows = await User.destroy({
        where: {
          id: id,
          role: { [Op.ne]: "admin" }, // Ngăn Admin tự xóa Admin khác
        },
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy người dùng để xóa.",
        });
      }

      res
        .status(200)
        .json({ status: true, message: "Xóa người dùng thành công." });
    } catch (error) {
      console.error("Error in removeUser:", error);
      res.status(500).json({ status: false, message: "Internal server error" });
    }
  },
};
