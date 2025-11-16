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
      if (!email || !password || !full_name) {
        return res.status(400).json({
          status: false,
          message: "Vui lòng nhập đầy đủ họ tên, email và mật khẩu!",
        });
      }
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({
          status: false,
          message: "Email đã được sử dụng!",
        });
      }
      const existingPhone = await User.findOne({ where: { phone } });
      if (existingPhone) {
        return res.status(400).json({
          status: false,
          message: "Số điện thoại đã được đăng ký!",
        });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const activeToken = uuidv4();
      let userData = {
        full_name,
        birthday,
        gender,
        phone,
        email,
        address,
        password: hashedPassword,
        role: role || "donor",
        tinh_trang: 0,
      };
      if (role === "donor") {
        userData.blood_group = blood_group;
        userData.medical_history = medical_history;
        userData.hash_active = activeToken;
        const activateLink = `${process.env.APP_URL}/activate/${activeToken}`;
        await transporter.sendMail({
          from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
          to: email,
          subject: "Kích hoạt tài khoản của bạn",
          html: `
            <h2>Xin chào ${full_name},</h2>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại <b>Smart Blood Donation</b>.</p>
            <p>Vui lòng nhấn vào link dưới đây để kích hoạt tài khoản:</p>
            <a href="${activateLink}" target="_blank">${activateLink}</a>
            <br/><br/>
            <p>Nếu bạn không đăng ký, vui lòng bỏ qua email này.</p>
          `,
        });
      } else if (role === "doctor") {
        userData.blood_group = null;
        userData.medical_history = null;
        userData.hash_active = null;
        userData.tinh_trang = 0;
      }
      const user = await User.create(userData);
      let message = "";
      if (role === "donor") {
        message =
          "Đăng ký thành công! Vui lòng kiểm tra email để kích hoạt tài khoản.";
      } else if (role === "doctor") {
        message =
          "Đăng ký thành công! Tài khoản bác sĩ của bạn đang được xét duyệt bởi quản trị viên.";
      } else {
        message = "Đăng ký thành công!";
      }
      return res.status(201).json({
        status: true,
        message,
        data: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          tinh_trang: user.tinh_trang,
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
};
