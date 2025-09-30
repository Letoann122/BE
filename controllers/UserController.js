const { User } = require("../models");
const bcrypt = require("bcrypt");
const cookieParser = require("cookie-parser");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { v4: UUIDv4 } = require("uuid");
const transporter = require("../config/mailer");

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

      //hash_active
      const activeToken = UUIDv4();

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
        tinh_trang: 0,
        hash_active: activeToken,
      });

      const activateLink = `${process.env.APP_URL}/activate/${activeToken}`;

      await transporter.sendMail({
         from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Kích hoạt tài khoản của bạn",
        html: 
        `<h2>Xin chào ${full_name},</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Smart Blood Donation.</p>
          <p>Vui lòng nhấn vào link dưới đây để kích hoạt tài khoản của bạn:</p>
          <a href="${activateLink}" target="_blank">${activateLink}</a>
          <br/><br/>
          <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>`
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          // hash_active: user.hash_active,
        },
      });
    } catch (err) {
      console.error("❌ Register error:", err);
      return res.status(500).json({
        status: false,
        message: "Đăng ký thất bại!",
        error: err.message
      });
    }
  },
  //active_account
  async activate(req, res){
    try {
      const { token} = req.params;
      const user = await User.findOne({where: {hash_active: token}});
      if (!user) {
        return res.status(400).json({
          status  : false,
          message : "Token kích hoạt không hợp lệ",
        });
      }
      user.tinh_trang = 1;
      user.hash_active = null;
      await user.save();

      return res.redirect(`${process.env.FRONTEND_URL}/dang-nhap`);
    } catch (error){
      return res.data(500).json({
        status: false,
        message: "Kích hoạt thất bại",
        error: error.message,
      });
    }
  },
  //dang-nhap
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

  //dang-xuat
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
