// controllers/admin/AppointmentController.js
const { Appointment, User } = require("../../models");
const { Op } = require("sequelize");
const transporter = require("../../config/mailer");
const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  async getAllAppointments(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { status } = req.query;

      const whereCondition = {};

      if (status) {
        whereCondition.status = status;
      }

      const { count, rows } = await Appointment.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["appointment_date", "ASC"]],
        include: [
          {
            model: User,
            as: "donor",
            attributes: ["id", "full_name", "email"],
          },
        ],
      });

      res.status(200).json({
        status: true,
        message: "Tải danh sách lịch hẹn thành công!",
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
      });
    } catch (error) {
      console.error("🔥 Lỗi getAllAppointments (Admin):", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi tải danh sách lịch hẹn!",
      });
    }
  },

  async approveAppointment(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOne({
        where: { id },
        include: [{ model: User, as: "donor" }],
      });

      if (!appointment) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lịch hẹn" });
      }

      appointment.status = "approved";
      await appointment.save();

      const mailOptions = {
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: appointment.donor.email,
        subject: "Lịch hẹn hiến máu của bạn đã được duyệt ",
        html: `<h3>Xin chào ${appointment.donor.full_name},</h3>
               <p>Lịch hẹn hiến máu của bạn vào ngày ${appointment.appointment_date} đã được phê duyệt.</p>
               <p>Vui lòng đến đúng giờ. Cảm ơn bạn!</p>`,
      };
      await transporter.sendMail(mailOptions);

      res.json({
        status: true,
        message: "Đã duyệt lịch hẹn & gửi email thông báo thành công",
      });
    } catch (err) {
      console.error(" Lỗi gửi mail (Approve Appointment):", err);
      res.status(500).json({ status: false, message: err.message });
    }
  },

  async rejectAppointment(req, res) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findOne({ where: { id } });

      if (!appointment) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lịch hẹn" });
      }

      appointment.status = "rejected";
      await appointment.save();

      res.json({ status: true, message: "Đã từ chối lịch hẹn thành công" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};
