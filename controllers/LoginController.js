// LoginController.js
const { User } = require("./../models");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  async login(req, res) {
    const error = validationResult(req);
    if (!error.isEmpty())
      return res
        .status(422)
        .json({ status: false, errors: error.array().map((e) => e.msg) });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user)
        return res
          .status(400)
          .json({ status: false, message: "Email hoặc mật khẩu không đúng!" });
      if (user.tinh_trang === 0) {
      return res.json({
        status: false,
        message: "Tài khoản của bạn chưa được kích hoạt. Vui lòng kiểm tra email!",
      });
    }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res
          .status(400)
          .json({ status: false, message: "Email hoặc mật khẩu không đúng!" });

      const payload = {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      };
      const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: "7d",
      });

      res.cookie("token", token, { httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        // sameSite: "strict",
        // maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days

       });
      return res.json({
        status: true,
        message: "Đăng nhập thành công!",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          token,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng nhập thất bại!",
        error: error.message,
      });
    }
  },
};
