const { Appointment, DonationSite } = require("../../models");
const { Op } = require("sequelize");

module.exports = {
  // Tạo lịch: đã có req.validated từ BookingDonationRequest
  async create(req, res) {
    try {
      const {
        donor_id, donation_site_id, appointment_slot_id,
        scheduled_at, preferred_volume_ml, notes
      } = req.validated;

      // (tuỳ chọn) chặn trùng: 1 donor không đặt 2 lịch cùng ngày
      const sameDay = new Date(scheduled_at.getFullYear(), scheduled_at.getMonth(), scheduled_at.getDate());
      const nextDay = new Date(sameDay); nextDay.setDate(nextDay.getDate() + 1);

      const existed = await Appointment.findOne({
        where: {
          donor_id,
          scheduled_at: { [Op.gte]: sameDay, [Op.lt]: nextDay },
          status: { [Op.in]: ["REQUESTED","APPROVED","BOOKED"] }
        }
      });
      if (existed) {
        return res.status(422).json({
          status: false,
          message: "Bạn đã có lịch hiến máu trong ngày này!",
          errors: { duplicate: ["Đã tồn tại lịch trong ngày."] },
        });
      }

      const newAppt = await Appointment.create({
        donor_id,
        donation_site_id,
        appointment_slot_id: appointment_slot_id || null,
        scheduled_at,                  // Date -> DATETIME
        preferred_volume_ml,           // 250 / 350 / 450
        notes: notes || null,
        status: "REQUESTED",           // để bác sĩ duyệt
      });

      return res.status(200).json({
        status: true,
        message: "Đặt lịch hiến máu thành công! Vui lòng chờ bác sĩ duyệt.",
        data: newAppt,
      });
    } catch (error) {
      console.error("🔥 Appointment.create error:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi máy chủ khi tạo lịch hẹn!",
        errors: { general: [error.message] },
      });
    }
  },

  // Donor xem danh sách lịch của mình (gần nhất trước)
  async myList(req, res) {
    try {
      const donor_id = req.user?.userId || req.user?.id;
      const rows = await Appointment.findAll({
        where: { donor_id },
        include: [{ model: DonationSite, as: "donation_site", required: false }],
        order: [["scheduled_at","DESC"]],
      });
      return res.json({ status: true, data: rows });
    } catch (e) {
      return res.status(500).json({ status: false, message: "Không tải được danh sách lịch!", errors:{general:[e.message]} });
    }
  },

  // Donor huỷ nếu lịch còn chờ/đã duyệt, chưa hoàn thành
  async cancel(req, res) {
    try {
      const donor_id = req.user?.userId || req.user?.id;
      const { id } = req.params;
      const appt = await Appointment.findOne({ where: { id, donor_id } });
      if (!appt) return res.status(404).json({ status:false, message:"Không tìm thấy lịch!" });

      if (!["REQUESTED","APPROVED","BOOKED"].includes(appt.status)) {
        return res.status(422).json({ status:false, message:"Lịch không thể huỷ ở trạng thái hiện tại!" });
      }
      await appt.update({ status: "CANCELLED" });
      return res.json({ status:true, message:"Đã huỷ lịch hiến máu!" });
    } catch (e) {
      return res.status(500).json({ status:false, message:"Lỗi khi huỷ lịch!", errors:{general:[e.message]} });
    }
  },
};
