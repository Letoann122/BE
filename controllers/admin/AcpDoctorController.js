const { User, Sequelize } = require("../../models");
const { Op } = Sequelize;
const transporter = require("../../config/mailer"); 
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  async getPending(req, res) {
    try {
      const doctors = await User.findAll({
        where: { role: "doctor", tinh_trang: 0 },
        attributes: ["id", "full_name", "email", "birthday", "address", "created_at"],
        order: [["created_at", "DESC"]],
      });
      res.json({ status: true, data: doctors });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async searchDoctor(req, res) {
    try {
      const { noi_dung_tim } = req.body;
      const whereCondition = {
        role: "doctor",
        tinh_trang: 0,
      };
      if (noi_dung_tim && noi_dung_tim.trim() !== "") {
        whereCondition.full_name = { [Op.like]: `%${noi_dung_tim}%` };
      }
      const doctors = await User.findAll({
        where: whereCondition,
        attributes: ["id", "full_name", "email", "birthday", "address", "created_at"],
        order: [["created_at", "DESC"]],
      });
      res.json({ status: true, data: doctors });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async approve(req, res) {
    try {
      const { id } = req.params;
      const doctor = await User.findOne({ where: { id, role: "doctor" } });
      if (!doctor) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy bác sĩ" });
      }
      doctor.tinh_trang = 1;
      await doctor.save();
      const loginUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/dang-nhap`;
      const mailOptions = {
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: doctor.email,
        subject: "Tài khoản bác sĩ của bạn đã được duyệt ✅",
        html: `
          <div style="font-family: Arial, sans-serif; line-height:1.6;">
            <h2 style="color:#d9534f;">Xin chào ${doctor.full_name},</h2>
            <p>Tài khoản bác sĩ của bạn đã được <b>duyệt thành công</b> để tham gia hệ thống hiến máu cứu người.</p>
            <p>Vui lòng đăng nhập để bắt đầu sử dụng tài khoản:</p>
            <a href="${loginUrl}" 
              style="display:inline-block;padding:10px 18px;background-color:#d9534f;color:#fff;
              text-decoration:none;border-radius:6px;font-weight:bold;">Đăng nhập ngay</a>
            <p style="margin-top:15px;">Hoặc truy cập trực tiếp: <a href="${loginUrl}">${loginUrl}</a></p>
            <br/>
            <p>Trân trọng,<br/><b>Đội ngũ Smart Blood Donation System</b></p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);

      res.json({
        status: true,
        message: "Đã duyệt bác sĩ và gửi email thông báo thành công",
      });
    } catch (err) {
      console.error("❌ Lỗi gửi mail:", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async reject(req, res) {
    try {
      const { id } = req.params;
      const doctor = await User.findOne({ where: { id, role: "doctor" } });
      if (!doctor) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy bác sĩ" });
      }
      doctor.tinh_trang = 2;
      await doctor.save();
      res.json({ status: true, message: "Đã từ chối bác sĩ thành công" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};
