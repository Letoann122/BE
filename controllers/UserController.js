const { User } = require("../models");
const bcrypt = require("bcrypt");

const UserController = {
  async register(req, res) {
    try {
      const {
        full_name, birthday, gender, phone,
        email, address, blood_group, role,
        medical_history, password
      } = req.body;

      // Kiểm tra email tồn tại
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.json({
          status: false,
          message: "Email đã được sử dụng!"
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo user mới
      const user = await User.create({
        full_name, birthday, gender, phone,
        email, address, blood_group, role,
        medical_history, password: hashedPassword
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công!",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng ký thất bại!",
        error: error.message
      });
    }
  }
};

module.exports = UserController;
