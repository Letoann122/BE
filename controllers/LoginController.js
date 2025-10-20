// LoginController.js
const { User } = require("./../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  async login(req, res) {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ status: false, errors: errors.array().map(e => e.msg) });

    const { email, password } = req.body;

    try {
      const user = await User.findOne({ where: { email } });
      if (!user)
        return res.status(400).json({ status: false, message: "Email hoặc mật khẩu không đúng!" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ status: false, message: "Email hoặc mật khẩu không đúng!" });

      const token = jwt.sign(
        { id: user.id, full_name: user.full_name, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("token", token, { httpOnly: true });
      return res.json({
        status: true,
        message: "Đăng nhập thành công!",
        data: { id: user.id, full_name: user.full_name, email, token },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Đăng nhập thất bại!", error: error.message });
    }
  },
};
