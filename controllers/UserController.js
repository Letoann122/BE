const { User } = require("../models");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Op } = require("sequelize");
const { v4: UUIDv4 } = require("uuid");
const transporter = require("../config/mailer");

dotenv.config();

const UserController = {
  
  async register(req, res) {
    try {
      const {
        full_name, birthday, gender, phone, email,
        address, blood_group, role, medical_history, password,
      } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser)
        return res.json({ status: false, message: "Email đã được sử dụng!" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const activeToken = UUIDv4();

      const user = await User.create({
        full_name, birthday, gender, phone, email,
        address, blood_group, role, medical_history,
        password: hashedPassword, tinh_trang: 0, hash_active: activeToken,
      });

      const activateLink = `${process.env.APP_URL}/activate/${activeToken}`;

      await transporter.sendMail({
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Kích hoạt tài khoản của bạn",
        html: `
          <h2>Xin chào ${full_name},</h2>
          <p>Nhấn vào link dưới đây để kích hoạt tài khoản:</p>
          <a href="${activateLink}" target="_blank">${activateLink}</a>
        `,
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công! Kiểm tra email để kích hoạt.",
        data: { id: user.id, full_name: user.full_name, email: user.email },
      });
    } catch (err) {
      console.error("Register error:", err);
      return res.status(500).json({ status: false, message: "Đăng ký thất bại!", error: err.message });
    }
  },

 
  async activate(req, res) {
    try {
      const { token } = req.params;
      const user = await User.findOne({ where: { hash_active: token } });
      if (!user)
        return res.status(400).json({ status: false, message: "Token kích hoạt không hợp lệ" });

      user.tinh_trang = 1;
      user.hash_active = null;
      await user.save();
      return res.redirect(`${process.env.FRONTEND_URL}/dang-nhap`);
    } catch (error) {
      return res.status(500).json({ status: false, message: "Kích hoạt thất bại", error: error.message });
    }
  },

  
  async login(req, res) {
    const error = validationResult(req);
    if (!error.isEmpty())
      return res.status(422).json({ status: false, errors: error.array().map(e => e.msg) });

    const { email, password } = req.body;
    try {
      const user = await User.findOne({ where: { email } });
      if (!user)
        return res.status(400).json({ status: false, message: "Email hoặc mật khẩu không đúng!" });

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch)
        return res.status(400).json({ status: false, message: "Email hoặc mật khẩu không đúng!" });

      const payload = { id: user.id, full_name: user.full_name, role: user.role };
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });

      res.cookie("token", token, { httpOnly: true });
      return res.json({
        status: true,
        message: "Đăng nhập thành công!",
        data: { id: user.id, full_name: user.full_name, email: user.email, token },
      });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Đăng nhập thất bại!", error: error.message });
    }
  },


  async logout(req, res) {
    try {
      res.clearCookie("token", { httpOnly: true });
      return res.json({ status: true, message: "Đăng xuất thành công!" });
    } catch (error) {
      return res.status(500).json({ status: false, message: "Đăng xuất thất bại!", error: error.message });
    }
  },

 
  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email: email.toLowerCase() } });

      if (!user) {
        return res.json({
          status: true,
          message: "Nếu email tồn tại, link reset mật khẩu đã được gửi.",
        });
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

      
      user.resetPasswordToken = resetTokenHash;
      user.resetPasswordExpires = new Date(Date.now() + 3600000);
      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      console.log("Reset password URL:", resetUrl);

      await transporter.sendMail({
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Yêu cầu đặt lại mật khẩu",
        html: `
          <p>Xin chào ${user.full_name},</p>
          <p>Nhấn vào link bên dưới để đặt lại mật khẩu (hết hạn sau 1 giờ):</p>
          <a href="${resetUrl}" target="_blank">${resetUrl}</a>
        `,
      });

      return res.json({
        status: true,
        message: "Link đặt lại mật khẩu đã được gửi đến email của bạn.",
      });
    } catch (error) {
      console.error("Lỗi Quên Mật Khẩu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi hệ thống khi xử lý yêu cầu quên mật khẩu.",
        error: error.message,
      });
    }
  },

  
  async resetPassword(req, res) {
    try {
      const { token, newPassword } = req.body;
      if (!token || !newPassword)
        return res.status(400).json({ status: false, message: "Thiếu token hoặc mật khẩu mới" });

      const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const user = await User.findOne({
        where: { resetPasswordToken: resetTokenHash, resetPasswordExpires: { [Op.gt]: new Date() } },
      });

      if (!user)
        return res.status(400).json({ status: false, message: "Token không hợp lệ hoặc đã hết hạn." });

      const hashedPassword = await bcrypt.hash(newPassword, 10);

      user.password = hashedPassword;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();

      return res.json({ status: true, message: "Mật khẩu đã được cập nhật thành công!" });
    } catch (error) {
      console.error("Lỗi reset mật khẩu:", error);
      return res.status(500).json({ status: false, message: "Lỗi hệ thống khi đặt lại mật khẩu.", error: error.message });
    }
  },
};

module.exports = UserController;
