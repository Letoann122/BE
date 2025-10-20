// RegisterController.js

const { User } = require("./../models");
const bcrypt = require("bcrypt");
const dotenv = require("dotenv");
const { v4: uuidv4 } = require("uuid");
const transporter = require("./../config/mailer");

dotenv.config();

module.exports = {
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

      // Kiểm tra email trùng
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.json({ status: false, message: "Email đã được sử dụng!" });
      }

      // Hash mật khẩu
      const hashedPassword = await bcrypt.hash(password, 10);
      const activeToken = uuidv4();

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

      // Gửi mail kích hoạt
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
          <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
        `,
      });

      return res.json({
        status: true,
        message: "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt.",
        data: { id: user.id, full_name: user.full_name, email: user.email, role: user.role },
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
};
