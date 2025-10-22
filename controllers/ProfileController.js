const { User } = require("./../models");

module.exports = {
  async profile(req, res) {
    try {
      const user = await User.findByPk(req.user.id, {
        attributes: ["id", "full_name", "email", "role"],
      });
      if (!user)
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy người dùng!" });

      return res.json({ status: true, data: user });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Lỗi khi lấy thông tin user!",
        error: error.message,
      });
    }
  },
};
