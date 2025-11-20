// controllers/doctor/DonationAppointmentController.js
const { Op } = require("sequelize");
const {
  Appointment,
  AppointmentSlot,
  DonationSite,
  User,
  Doctor,
  Hospital,
} = require("../../models");

const { sendMail } = require("../../services/mailService");

// format helper
const formatDate = (d) => (d ? d.toISOString().slice(0, 10) : null);
const formatTime = (d) => (d ? d.toTimeString().slice(0, 5) : null);

// Suy ra khung giờ từ scheduled_at nếu không có slot
const inferTimeRange = (date) => {
  if (!date) return "";
  const h = date.getHours();
  return h < 12 ? "7:00 - 11:00" : "13:00 - 17:00";
};

// helper chung để build data gửi mail
const buildMailDataFromAppointment = (appointment) => {
  const donor = appointment.User;

  const slot = appointment.AppointmentSlot;
  const siteFromSlot = slot?.DonationSite;
  const siteDirect = appointment.donation_site;
  const site = siteFromSlot || siteDirect;
  const hospital = site?.Hospital;

  let timeRange = "";
  if (slot && slot.start_time && slot.end_time) {
    timeRange = `${formatTime(slot.start_time)} - ${formatTime(
      slot.end_time
    )}`;
  } else {
    timeRange = inferTimeRange(appointment.scheduled_at);
  }

  return {
    ho_ten: donor?.full_name || "",
    email: donor?.email || "",
    appointment_code: appointment.appointment_code,
    ngay_hien: appointment.scheduled_at
      ? formatDate(appointment.scheduled_at)
      : "",
    khung_gio: timeRange,
    dia_diem: site?.name || "",
    benh_vien: hospital?.name || "",
    the_tich: appointment.preferred_volume_ml || "",
    ghi_chu: appointment.notes || "",
  };
};

module.exports = {
  // =========================
  // GET /doctor/donation-appointments
  // =========================
  async index(req, res) {
    try {
      const { appointment_code, date } = req.query;
      const where = {};

      if (appointment_code) {
        where.appointment_code = appointment_code.trim();
      }

      if (date) {
        const start = new Date(`${date} 00:00:00`);
        const end = new Date(`${date} 23:59:59`);
        where.scheduled_at = { [Op.between]: [start, end] };
      }

      const rows = await Appointment.findAll({
        where,
        include: [
          // Người hiến máu
          {
            model: User,
            attributes: ["full_name", "phone", "email", "blood_group"],
          },
          // Slot (nếu sau này ông dùng appointment_slot_id)
          {
            model: AppointmentSlot,
            required: false,
            include: [
              {
                model: DonationSite,
                required: false,
                include: [Hospital],
              },
            ],
          },
          // Điểm hiến máu từ cột donation_site_id của appointments
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
          // Bác sĩ duyệt
          {
            model: Doctor,
            as: "approved_doctor",
            attributes: ["full_name"],
            required: false,
          },
        ],
        order: [["created_at", "DESC"]],
      });

      const data = rows.map((row) => {
        const donor = row.User;

        const slot = row.AppointmentSlot;
        const siteFromSlot = slot?.DonationSite;
        const siteDirect = row.donation_site;
        const site = siteFromSlot || siteDirect;
        const hospital = site?.Hospital;

        let timeRange = "";
        if (slot && slot.start_time && slot.end_time) {
          timeRange = `${formatTime(slot.start_time)} - ${formatTime(
            slot.end_time
          )}`;
        } else {
          timeRange = inferTimeRange(row.scheduled_at);
        }

        return {
          id: row.id,
          appointment_code: row.appointment_code,
          status: row.status,

          donor_name: donor?.full_name || "",
          donor_phone: donor?.phone || "",
          donor_email: donor?.email || "",
          blood_group: donor?.blood_group || "",

          scheduled_date: row.scheduled_at
            ? formatDate(row.scheduled_at)
            : null,
          time_range: timeRange,

          donation_site_name: site?.name || "",
          hospital_name: hospital?.name || "",

          preferred_volume_ml: row.preferred_volume_ml,
          notes: row.notes,

          doctor_name: row.approved_doctor?.full_name || "Chưa duyệt",
        };
      });

      return res.json({
        status: true,
        message: "Lấy danh sách lịch hiến máu thành công",
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách lịch hiến máu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },

  // =========================
  // POST /doctor/donation-appointments/approve
  // =========================
  async approve(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu ID lịch hiến máu" });
      }

      const appointment = await Appointment.findByPk(id, {
        include: [
          { model: User, attributes: ["full_name", "email"] },
          {
            model: AppointmentSlot,
            required: false,
            include: [
              {
                model: DonationSite,
                required: false,
                include: [Hospital],
              },
            ],
          },
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
        ],
      });

      if (!appointment) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lịch hiến máu" });
      }

      if (appointment.status !== "REQUESTED") {
        return res.status(400).json({
          status: false,
          message: "Chỉ được duyệt các lịch đang ở trạng thái CHỜ DUYỆT",
        });
      }

      const userId = req.user?.userId;
      const doctor = await Doctor.findOne({ where: { user_id: userId } });
      if (!doctor) {
        return res.status(403).json({
          status: false,
          message: "Tài khoản bác sĩ không hợp lệ",
        });
      }

      appointment.status = "APPROVED";
      appointment.approved_by_doctor_id = doctor.id;
      appointment.approved_at = new Date();
      appointment.rejected_reason = null;

      await appointment.save();

      // gửi mail thành công
      const mailData = buildMailDataFromAppointment(appointment);
      if (mailData.email) {
        sendMail({
          to: mailData.email,
          subject: "Lịch hiến máu của bạn đã được duyệt",
          template: "duyet_hien_mau",
          data: mailData,
        }).catch((err) =>
          console.error("Lỗi gửi mail APPROVED:", err.message)
        );
      }

      return res.json({
        status: true,
        message: "Duyệt lịch hiến máu thành công",
      });
    } catch (error) {
      console.error("Lỗi duyệt lịch hiến máu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },

  // =========================
  // POST /doctor/donation-appointments/reject
  // =========================
  async reject(req, res) {
    try {
      const { id, rejected_reason } = req.body;

      if (!id) {
        return res
          .status(400)
          .json({ status: false, message: "Thiếu ID lịch hiến máu" });
      }

      if (!rejected_reason || !rejected_reason.trim()) {
        return res.status(400).json({
          status: false,
          message: "Vui lòng nhập lý do từ chối",
        });
      }

      const appointment = await Appointment.findByPk(id, {
        include: [
          { model: User, attributes: ["full_name", "email"] },
          {
            model: AppointmentSlot,
            required: false,
            include: [
              {
                model: DonationSite,
                required: false,
                include: [Hospital],
              },
            ],
          },
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
        ],
      });

      if (!appointment) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lịch hiến máu" });
      }

      if (appointment.status !== "REQUESTED") {
        return res.status(400).json({
          status: false,
          message: "Chỉ được từ chối các lịch đang ở trạng thái CHỜ DUYỆT",
        });
      }

      const userId = req.user?.userId;
      const doctor = await Doctor.findOne({ where: { user_id: userId } });
      if (!doctor) {
        return res.status(403).json({
          status: false,
          message: "Tài khoản bác sĩ không hợp lệ",
        });
      }

      appointment.status = "REJECTED";
      appointment.approved_by_doctor_id = doctor.id;
      appointment.approved_at = new Date();
      appointment.rejected_reason = rejected_reason.trim();

      await appointment.save();

      // gửi mail từ chối
      const mailData = buildMailDataFromAppointment(appointment);
      mailData.rejected_reason = appointment.rejected_reason;

      if (mailData.email) {
        sendMail({
          to: mailData.email,
          subject: "Lịch hiến máu của bạn không được duyệt",
          template: "tu_choi_hien_mau",
          data: mailData,
        }).catch((err) =>
          console.error("Lỗi gửi mail REJECTED:", err.message)
        );
      }

      return res.json({
        status: true,
        message: "Từ chối lịch hiến máu thành công",
      });
    } catch (error) {
      console.error("Lỗi từ chối lịch hiến máu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },
};
