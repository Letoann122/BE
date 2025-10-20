const { User } = require("../models");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
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
      if (existingUser)
        return res.json({ status: false, message: "Email đã được sử dụng!" });

      // Hash mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
      const activeToken = uuidv4();

      // Tạo user
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
        html: `
          <h2>Xin chào ${full_name},</h2>
          <p>Cảm ơn bạn đã đăng ký tài khoản tại Smart Blood Donation.</p>
          <p>Vui lòng nhấn vào link dưới đây để kích hoạt tài khoản:</p>
          <a href="${activateLink}" target="_blank">${activateLink}</a>
          <br/><br/>
          <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>`,
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt.",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (err) {
      console.error("❌ Register error:", err);
      return res.status(500).json({
        status: false,
        message: "Đăng ký thất bại!",
        error: err.message,
      });
    }
  },

  async activate(req, res) {
    try {
      const { token } = req.params;
      const user = await User.findOne({ where: { hash_active: token } });
      if (!user)
        return res.status(400).json({
          status: false,
          message: "Token kích hoạt không hợp lệ",
        });

      user.tinh_trang = 1;
      user.hash_active = null;
      await user.save();

      return res.redirect(`${process.env.FRONTEND_URL}/dang-nhap`);
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Kích hoạt thất bại",
        error: error.message,
      });
    }
  },

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

      res.cookie("token", token, { httpOnly: true });
      return res.json({
        status: true,
        message: "Đăng nhập thành công!",
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
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
      res.clearCookie("token", { httpOnly: true });
      return res.json({ status: true, message: "Đăng xuất thành công!" });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Đăng xuất thất bại!",
        error: error.message,
      });
    }
  },

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      const user = await User.findOne({ where: { email } });

      if (!user)
        return res.status(404).json({
          status: false,
          message: "Email không tồn tại!",
        });

      const resetToken = uuidv4();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

      user.reset_token = resetToken;
      user.reset_expires = resetExpires;
      await user.save();

      const resetLink = `${process.env.FRONTEND_URL}/doi-mat-khau?token=${resetToken}`;

      await transporter.sendMail({
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: email,
        subject: "Đặt lại mật khẩu",
        html: `
          <h2>Xin chào ${user.full_name},</h2>
          <p>Bạn vừa yêu cầu đặt lại mật khẩu.</p>
          <p>Vui lòng nhấn vào link dưới đây để đổi mật khẩu (hiệu lực trong 1 giờ):</p>
          <a href="${resetLink}" target="_blank">${resetLink}</a>`,
      });

      return res.json({
        status: true,
        message: "Email đặt lại mật khẩu đã được gửi!",
      });
    } catch (err) {
      console.error("❌ Forgot password error:", err);
      return res.status(500).json({
        status: false,
        message: "Có lỗi khi gửi mail quên mật khẩu!",
        error: err.message,
      });
    }
  },

  async resetPassword(req, res) {
    try {
      const { token, password, password_confirmation } = req.body;

      if (password !== password_confirmation)
        return res.status(400).json({
          status: false,
          message: "Mật khẩu xác nhận không khớp!",
        });

      const user = await User.findOne({ where: { reset_token: token } });
      if (!user)
        return res.status(400).json({
          status: false,
          message: "Token không hợp lệ!",
        });

      if (user.reset_expires < new Date())
        return res.status(400).json({
          status: false,
          message: "Token đã hết hạn!",
        });

      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.reset_token = null;
      user.reset_expires = null;
      await user.save();

      return res.json({
        status: true,
        message: "Đổi mật khẩu thành công!",
      });
    } catch (err) {
      console.error("❌ Change password error:", err);
      return res.status(500).json({
        status: false,
        message: "Đổi mật khẩu thất bại!",
        error: err.message,
      });
    }
  },
};

module.exports = UserController;
