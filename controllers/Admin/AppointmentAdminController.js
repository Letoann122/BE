const {
  Appointment,
  User,
  DonationSite,
  AppointmentSlot,
} = require("../../models");
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

      const { status, search, dateFrom, dateTo } = req.query;

      const whereCondition = {};

      const validStatuses = [
        "pending",
        "approved",
        "rejected",
        "completed",
        "no_show",
      ];
      if (status && validStatuses.includes(status)) {
        whereCondition.status = status;
      }

      if (search) {
        whereCondition[Op.or] = [
          { appointment_code: { [Op.like]: `%${search}%` } },
          { notes: { [Op.like]: `%${search}%` } },
        ];
      }

      if (dateFrom || dateTo) {
        whereCondition.scheduled_at = {};
        if (dateFrom) {
          whereCondition.scheduled_at[Op.gte] = new Date(dateFrom);
        }
        if (dateTo) {
          whereCondition.scheduled_at[Op.lte] = new Date(dateTo);
        }
      }

      const { count, rows } = await Appointment.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["scheduled_at", "DESC"]],
        include: [
          {
            model: User,
            as: "donor",
            attributes: ["id", "full_name", "email", "phone", "blood_group"],
          },
          {
            model: DonationSite,
            as: "donation_site",
            attributes: ["id", "name", "address", "hospital_id"],
            required: false,
          },
        ],
      });

      const mappedData = rows.map((apt) => ({
        id: apt.id,
        appointment_code: apt.appointment_code,
        appointment: apt.notes || "Lịch hẹn hiến máu",
        scheduled_at: apt.scheduled_at,
        location: apt.donation_site?.address || "N/A",
        organizer: apt.donation_site?.name || "N/A",
        status: apt.status,
        donor: {
          full_name: apt.donor?.full_name,
          email: apt.donor?.email,
          phone: apt.donor?.phone,
          blood_group: apt.donor?.blood_group,
        },
        volume: apt.preferred_volume_ml,
        created_at: apt.created_at,
      }));

      res.status(200).json({
        status: true,
        message: "Tải danh sách lịch hẹn thành công!",
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: mappedData,
      });
    } catch (error) {
      console.error("❌ Lỗi getAllAppointments:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server khi tải danh sách lịch hẹn!",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },

  async getAppointmentDetail(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "donor",
            attributes: [
              "id",
              "full_name",
              "email",
              "phone",
              "blood_group",
              "address",
            ],
          },
          {
            model: DonationSite,
            as: "donation_site",
            attributes: ["id", "name", "address", "hospital_id", "lat", "lon"],
          },
          {
            model: AppointmentSlot,
            attributes: [
              "id",
              "start_time",
              "end_time",
              "capacity",
              "booked_count",
            ],
          },
        ],
      });

      if (!appointment) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch hẹn",
        });
      }

      res.status(200).json({
        status: true,
        data: appointment,
      });
    } catch (error) {
      console.error("❌ Lỗi getAppointmentDetail:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },

  async approveAppointment(req, res) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findOne({
        where: { id },
        include: [
          { model: User, as: "donor" },
          { model: DonationSite, as: "donation_site" },
        ],
      });

      if (!appointment) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch hẹn",
        });
      }

      if (appointment.status !== "pending") {
        return res.status(400).json({
          status: false,
          message: `Lịch hẹn này ở trạng thái "${appointment.status}", không thể duyệt`,
        });
      }

      appointment.status = "approved";
      await appointment.save();

      const appointmentDate = new Date(
        appointment.scheduled_at
      ).toLocaleDateString("vi-VN", {
        weekday: "long",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const venue = appointment.donation_site?.name || "N/A";
      const address = appointment.donation_site?.address || "N/A";

      const mailOptions = {
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: appointment.donor.email,
        subject: " Lịch hẹn hiến máu của bạn đã được duyệt",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #28a745;"> Lịch hẹn của bạn đã được duyệt!</h2>
            <p>Xin chào <strong>${appointment.donor.full_name}</strong>,</p>
            
            <p>Lịch hẹn hiến máu của bạn đã được <strong style="color: #28a745;">phê duyệt</strong>.</p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
              <h4> Chi tiết lịch hẹn:</h4>
              <p><strong> Ngày & giờ:</strong> ${appointmentDate}</p>
              <p><strong> Địa điểm:</strong> ${venue}</p>
              <p><strong> Địa chỉ:</strong> ${address}</p>
              <p><strong> Mã lịch hẹn:</strong> ${
                appointment.appointment_code
              }</p>
              <p><strong>📊 Dự kiến hiến:</strong> ${
                appointment.preferred_volume_ml || 450
              } ml</p>
            </div>
            
            <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; margin: 15px 0;">
              <h4> Hướng dẫn quan trọng:</h4>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Vui lòng đến đúng giờ (sớm 15 phút)</li>
                <li>Mang theo CMND/Thẻ căn cước bản gốc</li>
                <li>Ăn sáng nhẹ trước khi đến</li>
                <li>Uống đủ nước trước khi hiến</li>
                <li>Không uống rượu bia 48 giờ trước</li>
              </ul>
            </div>
            
            <p>Nếu bạn không thể tham dự, vui lòng liên hệ với chúng tôi sớm nhất có thể.</p>
            
            <p style="margin-top: 30px;">Cảm ơn bạn đã tham gia chương trình hiến máu cứu người! </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              <strong>Smart Blood Donation System</strong><br>
              Hệ thống quản lý hiến máu thông minh<br>
               Liên hệ: ${process.env.SUPPORT_PHONE || "1900-xxxx"}
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        status: true,
        message: "Đã duyệt lịch hẹn & gửi email thông báo thành công",
        data: appointment,
      });
    } catch (err) {
      console.error(" Lỗi approveAppointment:", err);
      res.status(500).json({
        status: false,
        message: err.message || "Lỗi khi duyệt lịch hẹn",
      });
    }
  },

  async rejectAppointment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const appointment = await Appointment.findOne({
        where: { id },
        include: [
          { model: User, as: "donor" },
          { model: DonationSite, as: "donation_site" },
        ],
      });

      if (!appointment) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch hẹn",
        });
      }

      if (appointment.status !== "pending") {
        return res.status(400).json({
          status: false,
          message: `Lịch hẹn này ở trạng thái "${appointment.status}", không thể từ chối`,
        });
      }

      appointment.status = "rejected";
      appointment.notes = reason || null;
      await appointment.save();

      const appointmentDate = new Date(
        appointment.scheduled_at
      ).toLocaleDateString("vi-VN");
      const venue = appointment.donation_site?.name || "N/A";

      const mailOptions = {
        from: `"Smart Blood Donation" <${process.env.MAIL_USER}>`,
        to: appointment.donor.email,
        subject: " Lịch hẹn hiến máu bị từ chối",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #dc3545;"> Lịch hẹn của bạn bị từ chối</h2>
            <p>Xin chào <strong>${appointment.donor.full_name}</strong>,</p>
            
            <p>Rất tiếc, lịch hẹn hiến máu của bạn vào ngày <strong>${appointmentDate}</strong> tại <strong>${venue}</strong> đã bị <strong style="color: #dc3545;">từ chối</strong>.</p>
            
            ${
              reason
                ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
                <p><strong>📝 Lý do:</strong></p>
                <p>${reason}</p>
              </div>
            `
                : ""
            }
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; border-left: 4px solid #007bff; margin: 15px 0;">
              <p><strong>Vui lòng liên hệ với chúng tôi để:</strong></p>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Tìm hiểu thêm lý do từ chối</li>
                <li>Đăng ký lịch hẹn mới</li>
                <li>Giải quyết các vấn đề liên quan</li>
              </ul>
            </div>
            
            <p>Xin cảm ơn bạn đã quan tâm đến chương trình hiến máu!</p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              <strong>Smart Blood Donation System</strong><br>
              Hệ thống quản lý hiến máu thông minh<br>
              📞 Liên hệ: ${process.env.SUPPORT_PHONE || "1900-xxxx"}
            </p>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);

      res.status(200).json({
        status: true,
        message: "Đã từ chối lịch hẹn & gửi email thông báo thành công",
        data: appointment,
      });
    } catch (err) {
      console.error(" Lỗi rejectAppointment:", err);
      res.status(500).json({
        status: false,
        message: err.message || "Lỗi khi từ chối lịch hẹn",
      });
    }
  },

  // ✅ UPDATE APPOINTMENT STATUS
  async updateAppointmentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = [
        "pending",
        "approved",
        "rejected",
        "completed",
        "no_show",
      ];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          status: false,
          message: `Trạng thái không hợp lệ. Các trạng thái hợp lệ: ${validStatuses.join(
            ", "
          )}`,
        });
      }

      const appointment = await Appointment.findByPk(id);

      if (!appointment) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch hẹn",
        });
      }

      await Appointment.update({ status }, { where: { id } });

      res.status(200).json({
        status: true,
        message: "Cập nhật trạng thái thành công",
        data: { id, status },
      });
    } catch (err) {
      console.error("❌ Lỗi updateAppointmentStatus:", err);
      res.status(500).json({
        status: false,
        message: err.message || "Lỗi khi cập nhật trạng thái",
      });
    }
  },

  async getAppointmentStats(req, res) {
    try {
      const { dateFrom, dateTo } = req.query;

      const whereCondition = {};

      if (dateFrom || dateTo) {
        whereCondition.scheduled_at = {};
        if (dateFrom) whereCondition.scheduled_at[Op.gte] = new Date(dateFrom);
        if (dateTo) whereCondition.scheduled_at[Op.lte] = new Date(dateTo);
      }

      const statusStats = await Appointment.findAll({
        where: whereCondition,
        attributes: [
          "status",
          [
            require("sequelize").fn("COUNT", require("sequelize").col("id")),
            "count",
          ],
        ],
        group: ["status"],
        raw: true,
      });

      const totalCount = await Appointment.count({ where: whereCondition });

      const upcomingCount = await Appointment.count({
        where: {
          ...whereCondition,
          scheduled_at: { [Op.gt]: new Date() },
        },
      });

      res.status(200).json({
        status: true,
        data: {
          total: totalCount,
          upcoming: upcomingCount,
          byStatus: statusStats,
        },
      });
    } catch (error) {
      console.error("❌ Lỗi getAppointmentStats:", error);
      res.status(500).json({
        status: false,
        message: "Lỗi server",
      });
    }
  },
};
