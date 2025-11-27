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

const toDateStr = (d) => (d ? d.toISOString().slice(0, 10) : null);
const toTimeStr = (d) => (d ? d.toTimeString().slice(0, 5) : "");

// ====== helpers: resolve associations safely (đỡ dính alias) ======
const pickAssoc = (SourceModel, targetName, foreignKey) => {
  const assocs = SourceModel?.associations || {};
  return Object.values(assocs).find(
    (a) =>
      a?.target?.name === targetName &&
      (!foreignKey || a.foreignKey === foreignKey)
  );
};

const donorAssoc = pickAssoc(Appointment, "User", "donor_id"); // as: "donor"
const siteAssoc = pickAssoc(Appointment, "DonationSite", "donation_site_id"); // as: "donation_site"
const slotAssoc = pickAssoc(Appointment, "AppointmentSlot", "appointment_slot_id"); // as: "slot"
const hospitalAssoc = pickAssoc(DonationSite, "Hospital"); // as có thể khác

const getDonor = (a) => (donorAssoc ? a[donorAssoc.as] : a.donor || a.User);
const getSite = (a) => (siteAssoc ? a[siteAssoc.as] : a.donation_site);
const getSlot = (a) => (slotAssoc ? a[slotAssoc.as] : a.slot || a.AppointmentSlot);
const getHospitalFromSite = (site) =>
  (hospitalAssoc && site?.[hospitalAssoc.as]) || site?.Hospital || site?.hospital || null;

module.exports = {
  // GET /doctor/donation-appointments/approved?appointment_code=&from_date=&to_date=
  async index(req, res) {
    try {
      const { appointment_code, from_date, to_date } = req.query;

      const where = { status: "APPROVED" };

      if (appointment_code) where.appointment_code = appointment_code.trim();

      if (from_date && to_date) {
        where.scheduled_at = {
          [Op.between]: [
            new Date(`${from_date}T00:00:00`),
            new Date(`${to_date}T23:59:59.999`),
          ],
        };
      } else if (from_date) {
        where.scheduled_at = {
          [Op.between]: [
            new Date(`${from_date}T00:00:00`),
            new Date(`${from_date}T23:59:59.999`),
          ],
        };
      }

      const rows = await Appointment.findAll({
        where,
        include: [
          // ✅ FIX alias donor
          donorAssoc
            ? { association: donorAssoc, attributes: ["full_name", "phone", "blood_group"] }
            : { model: User, as: "donor", attributes: ["full_name", "phone", "blood_group"] },

          // ✅ FIX alias donation_site + include hospital (alias-safe)
          siteAssoc
            ? {
                association: siteAssoc,
                attributes: ["id", "name", "hospital_id"],
                required: false,
                include: hospitalAssoc
                  ? [{ association: hospitalAssoc, attributes: ["id", "name"], required: false }]
                  : [{ model: Hospital, attributes: ["id", "name"], required: false }],
              }
            : {
                model: DonationSite,
                as: "donation_site",
                attributes: ["id", "name", "hospital_id"],
                required: false,
                include: hospitalAssoc
                  ? [{ association: hospitalAssoc, attributes: ["id", "name"], required: false }]
                  : [{ model: Hospital, attributes: ["id", "name"], required: false }],
              },

          // ✅ FIX alias slot
          slotAssoc
            ? { association: slotAssoc, attributes: ["start_time", "end_time"], required: false }
            : { model: AppointmentSlot, as: "slot", attributes: ["start_time", "end_time"], required: false },
        ],
        order: [["scheduled_at", "ASC"]],
      });

      const data = rows.map((a) => {
        const donor = getDonor(a);
        const site = getSite(a);
        const hosp = getHospitalFromSite(site);
        const slot = getSlot(a);

        const timeRange = slot?.start_time
          ? `${toTimeStr(slot.start_time)} - ${toTimeStr(slot.end_time)}`
          : toTimeStr(a.scheduled_at);

        return {
          id: a.id,
          appointment_code: a.appointment_code,

          donor_name: donor?.full_name || "",
          donor_phone: donor?.phone || "",

          scheduled_date: toDateStr(a.scheduled_at),
          time_range: timeRange,

          donation_site_name: site?.name || "",
          hospital_name: hosp?.name || "",

          blood_group: donor?.blood_group || "",
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

  // POST /doctor/donations/complete
  async completeDonation(req, res) {
    const t = await sequelize.transaction();
    try {
      const { appointment_id, blood_group, volume_ml, collected_at, screened_ok, notes } = req.body;

      if (!appointment_id) return res.status(400).json({ status: false, message: "Thiếu appointment_id!" });
      if (!blood_group) return res.status(400).json({ status: false, message: "Vui lòng chọn nhóm máu!" });
      if (!volume_ml || Number(volume_ml) <= 0)
        return res.status(400).json({ status: false, message: "Số lượng ml không hợp lệ!" });
      if (!collected_at) return res.status(400).json({ status: false, message: "Thiếu thời điểm lấy máu!" });

      const loggedUserId = req.user?.userId;

      const doctor = await Doctor.findOne({
        where: { user_id: loggedUserId },
        transaction: t,
      });

      if (!doctor) {
        await t.rollback();
        return res.status(403).json({ status: false, message: "Tài khoản không phải bác sĩ!" });
      }

      const appointment = await Appointment.findOne({
        where: { id: appointment_id },
        include: [
          // giữ alias donation_site cho đúng model bạn define
          siteAssoc
            ? {
                association: siteAssoc,
                required: false,
                include: hospitalAssoc
                  ? [{ association: hospitalAssoc, required: false }]
                  : [{ model: Hospital, required: false }],
              }
            : {
                model: DonationSite,
                as: "donation_site",
                required: false,
                include: [{ model: Hospital, required: false }],
              },
        ],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!appointment) {
        await t.rollback();
        return res.status(404).json({ status: false, message: "Không tìm thấy lịch hiến máu!" });
      }

      if (appointment.status !== "APPROVED") {
        await t.rollback();
        return res.status(400).json({ status: false, message: "Chỉ được ghi nhận lịch đã APPROVED!" });
      }

      const existedDonation = await Donation.findOne({ where: { appointment_id }, transaction: t });
      if (existedDonation) {
        await t.rollback();
        return res.status(400).json({ status: false, message: "Bản ghi hiến máu đã tồn tại!" });
      }

      const group = blood_group.trim();
      const rh = group.slice(-1);
      const abo = group.slice(0, -1);

      const [bloodType] = await BloodType.findOrCreate({
        where: { abo, rh },
        defaults: { abo, rh },
        transaction: t,
      });

      const site = getSite(appointment);
      const hospitalId = site?.hospital_id || null;

      const donation = await Donation.create(
        {
          appointment_id,
          hospital_id: hospitalId,
          blood_type_id: bloodType.id,
          volume_ml,
          collected_at: new Date(collected_at),
          screened_ok: screened_ok ? 1 : 0,
          confirmed_by_doctor_id: doctor.id,
          confirmed_at: new Date(),
          notes: notes?.trim() || null,
        },
        { transaction: t }
      );

      if (notes && notes.trim()) {
        appointment.notes = appointment.notes
          ? appointment.notes + "\n[Doctor note] " + notes.trim()
          : "[Doctor note] " + notes.trim();

        await appointment.save({ transaction: t });
      }

      await t.commit();
      return res.status(201).json({
        status: true,
        message: "Ghi nhận hiến máu thành công!",
        data: { donation_id: donation.id },
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
