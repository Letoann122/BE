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

      // hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await User.create({
        full_name, birthday, gender, phone,
        email, address, blood_group, role,
        medical_history, password: hashedPassword
      });

      res.json({ message: "Đăng ký thành công!", user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = UserController;
