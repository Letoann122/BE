const { User } = require("../models");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");

dotenv.config();

const UserController = {
  async register(req, res) {
    try {
      const {
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        role,
        medical_history,
        password,
      } = req.body;

      // Kiểm tra email tồn tại
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.json({
          status: false,
          message: "Email đã được sử dụng!",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Tạo user mới
      const user = await User.create({
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        blood_group,
        role,
        medical_history,
        password: hashedPassword,
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công!",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng ký thất bại!",
        error: error.message,
      });
    }
  },


   async login(req, res) {
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(422).json({
      status: false,
      errors: error.array().map((err) => err.msg),
    });
  }

  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({
        status: false,
        message: "Email hoặc mật khẩu không đúng!",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Email hoặc mật khẩu không đúng!",
      });
    }

    const payload = {
      id: user.id,
      full_name: user.full_name,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.jwt_secret, {
      expiresIn: "7d",
    });

    res.cookie("token", token, { httpOnly: true });
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

  


   async logout(req, res) {
  try {
    // Xoá cookie token
    res.clearCookie("token", { httpOnly: true });

    return res.json({
      status: true,
      message: "Đăng xuất thành công!",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Đăng xuất thất bại!",
      error: error.message,
    });
  }
}

};

module.exports = UserController;
