"use strict";
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

const formatDate = (d) => (d ? d.toISOString().slice(0, 10) : null);
const formatTime = (d) => (d ? d.toTimeString().slice(0, 5) : null);

const inferTimeRange = (date) => {
  if (!date) return "";
  return date.getHours() < 12 ? "7:00 - 11:00" : "13:00 - 17:00";
};

const buildMailDataFromAppointment = (appointment) => {
  const donor = appointment.User;
  const slot = appointment.AppointmentSlot;

  const site = slot?.DonationSite || appointment.donation_site;
  const hospital = site?.Hospital;

  const timeRange = slot?.start_time
    ? `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
    : inferTimeRange(appointment.scheduled_at);

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
  async index(req, res) {
    try {
      const { appointment_code, date } = req.query;
      const where = { status: "REQUESTED" }; 
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
          { model: User, attributes: ["full_name", "phone", "email", "blood_group"] },
          {
            model: AppointmentSlot,
            required: false,
            include: [{ model: DonationSite, required: false, include: [Hospital] }],
          },
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
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
        const site = slot?.DonationSite || row.donation_site;
        const hospital = site?.Hospital;
        const timeRange = slot?.start_time
          ? `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
          : inferTimeRange(row.scheduled_at);
        return {
          id: row.id,
          appointment_code: row.appointment_code,
          status: row.status,
          donor_name: donor?.full_name || "",
          donor_phone: donor?.phone || "",
          donor_email: donor?.email || "",
          blood_group: donor?.blood_group || "",
          scheduled_date: formatDate(row.scheduled_at),
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
        message: "Lấy danh sách lịch đang CHỜ DUYỆT thành công",
        data,
      });
    } catch (error) {
      console.error("Lỗi lấy danh sách:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },
  async approve(req, res) {
    try {
      const { id } = req.body;
      if (!id)
        return res.status(400).json({ status: false, message: "Thiếu ID lịch hiến máu" });
      const appointment = await Appointment.findByPk(id, {
        include: [
          { model: User, attributes: ["full_name", "email"] },
          {
            model: AppointmentSlot,
            required: false,
            include: [{ model: DonationSite, required: false, include: [Hospital] }],
          },
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
        ],
      });
      if (!appointment)
        return res.status(404).json({ status: false, message: "Không tìm thấy lịch hiến máu" });
      if (appointment.status !== "REQUESTED")
        return res.status(400).json({
          status: false,
          message: "Chỉ được duyệt lịch CHỜ DUYỆT",
        });
      const doctorUserId = req.user?.userId;
      const doctor = await Doctor.findOne({ where: { user_id: doctorUserId } });
      if (!doctor)
        return res.status(403).json({
          status: false,
          message: "Tài khoản bác sĩ không hợp lệ",
        });
      appointment.status = "APPROVED";
      appointment.approved_by_doctor_id = doctor.id;
      appointment.approved_at = new Date();
      appointment.rejected_reason = null;
      await appointment.save();

      const mailData = buildMailDataFromAppointment(appointment);
      if (mailData.email) {
        sendMail({
          to: mailData.email,
          subject: "Lịch hiến máu của bạn đã được duyệt",
          template: "duyet_hien_mau",
          data: mailData,
        });
      }
      return res.json({
        status: true,
        message: "Duyệt lịch hiến máu thành công",
      });
    } catch (error) {
      console.error("Lỗi duyệt:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },
  async reject(req, res) {
    try {
      const { id, rejected_reason } = req.body;
      if (!id)
        return res.status(400).json({ status: false, message: "Thiếu ID lịch hiến máu" });
      if (!rejected_reason || !rejected_reason.trim())
        return res.status(400).json({
          status: false,
          message: "Vui lòng nhập lý do từ chối",
        });
      const appointment = await Appointment.findByPk(id, {
        include: [
          { model: User, attributes: ["full_name", "email"] },
          {
            model: AppointmentSlot,
            required: false,
            include: [{ model: DonationSite, required: false, include: [Hospital] }],
          },
          {
            model: DonationSite,
            as: "donation_site",
            required: false,
            include: [Hospital],
          },
        ],
      });
      if (!appointment)
        return res.status(404).json({ status: false, message: "Không tìm thấy lịch hiến máu" });
      if (appointment.status !== "REQUESTED")
        return res.status(400).json({
          status: false,
          message: "Chỉ được từ chối lịch CHỜ DUYỆT",
        });
      const doctorUserId = req.user?.userId;
      const doctor = await Doctor.findOne({ where: { user_id: doctorUserId } });
      if (!doctor)
        return res.status(403).json({
          status: false,
          message: "Tài khoản bác sĩ không hợp lệ",
        });
      appointment.status = "REJECTED";
      appointment.approved_by_doctor_id = doctor.id;
      appointment.approved_at = new Date();
      appointment.rejected_reason = rejected_reason.trim();
      await appointment.save();
      const mailData = buildMailDataFromAppointment(appointment);
      mailData.rejected_reason = rejected_reason.trim();
      if (mailData.email) {
        sendMail({
          to: mailData.email,
          subject: "Lịch hiến máu của bạn không được duyệt",
          template: "tu_choi_hien_mau",
          data: mailData,
        });
      }
      return res.json({
        status: true,
        message: "Từ chối lịch hiến máu thành công",
      });
    } catch (error) {
      console.error("Lỗi từ chối:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: error.message,
      });
    }
  },
};
