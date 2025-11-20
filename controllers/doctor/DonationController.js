// controllers/doctor/DonationAppointmentController.js
"use strict";

const { Op } = require("sequelize");
const {
  Appointment,
  AppointmentSlot,
  DonationSite,
  Hospital,
  User,
  Doctor,
  Donation,
  BloodType,
  sequelize,
} = require("../../models");

// Helper format
const toDateStr = (d) => (d ? d.toISOString().slice(0, 10) : null); // YYYY-MM-DD
const toTimeStr = (d) => (d ? d.toTimeString().slice(0, 5) : "");   // HH:mm

module.exports = {
  // ------------------ GET /doctor/donation-appointments ------------------
  async index(req, res) {
    try {
      const { appointment_code, date } = req.query;

      // Lọc theo status
      const where = {
        status: {
          [Op.in]: ["APPROVED", "COMPLETED"],
        },
      };

      // Lọc theo mã lịch nếu có
      if (appointment_code) {
        where.appointment_code = appointment_code.trim();
      }

      // Lọc theo ngày hiến máu (date = YYYY-MM-DD)
      if (date) {
        const start = new Date(`${date}T00:00:00`);
        const end = new Date(`${date}T23:59:59.999`);
        where.scheduled_at = { [Op.between]: [start, end] };
      }

      // Lọc theo bác sĩ đang login (nếu cần)
      const userId = req.user?.userId;
      if (userId) {
        const doctor = await Doctor.findOne({ where: { user_id: userId } });
        if (doctor) {
          where.approved_by_doctor_id = doctor.id;
        }
      }

      const rows = await Appointment.findAll({
        where,
        include: [
          {
            model: User,
            attributes: ["full_name", "phone", "blood_group"],
          },
          {
            model: DonationSite,
            as: "donation_site",
            attributes: ["id", "name", "hospital_id"],
            include: [
              {
                model: Hospital,
                attributes: ["id", "name"],
              },
            ],
          },
          {
            model: AppointmentSlot,
            attributes: ["start_time", "end_time"],
          },
        ],
        order: [["scheduled_at", "ASC"]],
      });

      const data = rows.map((a) => {
        const slot = a.AppointmentSlot;
        const scheduledAt = a.scheduled_at;

        let timeRange = "";
        if (slot) {
          timeRange = `${toTimeStr(slot.start_time)} - ${toTimeStr(
            slot.end_time
          )}`;
        } else if (scheduledAt) {
          timeRange = toTimeStr(scheduledAt);
        }

        return {
          id: a.id,
          appointment_code: a.appointment_code,
          donor_name: a.User?.full_name,
          donor_phone: a.User?.phone,
          scheduled_date: scheduledAt ? toDateStr(scheduledAt) : null,
          time_range: timeRange,
          donation_site_name: a.donation_site?.name,
          hospital_name: a.donation_site?.Hospital?.name,
          blood_group: a.User?.blood_group,
          preferred_volume_ml: a.preferred_volume_ml,
          status: a.status,
        };
      });

      return res.status(200).json({
        status: true,
        message: "Lấy danh sách lịch hiến máu thành công!",
        data,
      });
    } catch (error) {
      console.error("Lỗi khi lấy danh sách lịch hiến máu:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi server khi tải danh sách lịch hiến máu!",
        error: error.message,
      });
    }
  },

  // ------------------ POST /doctor/donations/complete ------------------
  async completeDonation(req, res) {
    const t = await sequelize.transaction();
    try {
      const {
        appointment_id,
        blood_group, // "A+", "O-", ...
        volume_ml,
        collected_at, // datetime-local string
        screened_ok,
        notes,
      } = req.body;

      // ===== Validate input =====
      if (!appointment_id) {
        await t.rollback();
        return res
          .status(400)
          .json({ status: false, message: "Thiếu appointment_id!" });
      }
      if (!blood_group) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Vui lòng chọn nhóm máu thực tế!",
        });
      }
      if (!volume_ml || Number(volume_ml) <= 0) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Vui lòng nhập số ml hợp lệ!",
        });
      }
      if (!collected_at) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Vui lòng chọn thời điểm lấy máu!",
        });
      }

      // ===== Lấy doctor từ token để lưu confirmed_by_doctor_id =====
      const loggedUserId = req.user?.userId;
      if (!loggedUserId) {
        await t.rollback();
        return res.status(401).json({
          status: false,
          message: "Không xác định được người dùng đăng nhập!",
        });
      }

      const doctor = await Doctor.findOne({
        where: { user_id: loggedUserId },
        transaction: t,
      });

      if (!doctor) {
        await t.rollback();
        return res.status(403).json({
          status: false,
          message: "Tài khoản hiện tại không phải bác sĩ!",
        });
      }

      // ===== Lấy appointment + site + hospital =====
      const appointment = await Appointment.findOne({
        where: { id: appointment_id },
        include: [
          {
            model: DonationSite,
            as: "donation_site",
            include: [{ model: Hospital }],
          },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!appointment) {
        await t.rollback();
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch hiến máu!",
        });
      }

      if (appointment.status === "COMPLETED") {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Lịch này đã được ghi nhận hiến máu trước đó!",
        });
      }

      if (appointment.status !== "APPROVED") {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message:
            "Chỉ được ghi nhận các lịch đã được bác sĩ duyệt (APPROVED)!",
        });
      }

      // Kiểm tra đã có donation cho lịch này chưa (UNIQUE appointment_id)
      const existedDonation = await Donation.findOne({
        where: { appointment_id },
        transaction: t,
      });

      if (existedDonation) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Đã tồn tại bản ghi hiến máu cho lịch này!",
        });
      }

      // ===== Tách ABO + Rh từ blood_group (vd: "AB+", "O-") =====
      const group = blood_group.trim();
      const rh = group.slice(-1); // + hoặc -
      const abo = group.slice(0, group.length - 1); // A, B, AB, O

      const [bloodType] = await BloodType.findOrCreate({
        where: { abo, rh },
        defaults: { abo, rh },
        transaction: t,
      });

      const hospitalId = appointment.donation_site?.hospital_id;
      if (!hospitalId) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Không xác định được bệnh viện của điểm hiến máu!",
        });
      }

      // ===== Tạo donation – trigger sẽ tự:
      //   - cập nhật blood_inventory + inventory_transactions
      //   - cập nhật appointments / donor_profiles / donors
      const donation = await Donation.create(
        {
          appointment_id: appointment.id,
          hospital_id: hospitalId,
          blood_type_id: bloodType.id,
          volume_ml: volume_ml,
          collected_at: new Date(collected_at),
          screened_ok: screened_ok ? 1 : 0,
          confirmed_by_doctor_id: doctor.id,   // 👈 quan trọng
          confirmed_at: new Date(),            // thời điểm xác nhận
          notes: notes && notes.trim() ? notes.trim() : null,
        },
        { transaction: t }
      );

      // Appointment.status -> COMPLETED đã để trigger xử lý.
      // Ở đây chỉ cần cập nhật thêm notes (nếu có) để không bị mất.
      if (notes && notes.trim()) {
        appointment.notes = appointment.notes
          ? `${appointment.notes}\n[Doctor note] ${notes.trim()}`
          : `[Doctor note] ${notes.trim()}`;
        await appointment.save({ transaction: t });
      }

      await t.commit();

      return res.status(201).json({
        status: true,
        message: "Ghi nhận hiến máu thành công!",
        data: {
          donation_id: donation.id,
        },
      });
    } catch (error) {
      console.error("Lỗi khi ghi nhận hiến máu:", error);
      await t.rollback();
      return res.status(500).json({
        status: false,
        message: "Lỗi server khi ghi nhận hiến máu!",
        error: error.message,
      });
    }
  },
};
