"use strict";

const { Appointment, DonationSite } = require("../../models");
const { Op } = require("sequelize");
const emailQueue = require("../../services/emailQueue");

module.exports = {
  async create(req, res) {
    try {
      const {
        donor_id,
        donation_site_id,
        appointment_slot_id,
        scheduled_at,
        preferred_volume_ml,
        notes,
        time_slot,
      } = req.validated;

      const scheduledDate = new Date(scheduled_at);
      const now = new Date();

      // SỬA: Trả về 200 để FE tự handle toast
      if (scheduledDate < now) {
        return res.json({
          status: false,
          message: "Khung giờ bạn chọn đã trôi qua. Vui lòng chọn thời gian khác!",
        });
      }

      const lastDonation = await Appointment.findOne({
        where: {
          donor_id,
          status: "COMPLETED",
        },
        order: [["scheduled_at", "DESC"]],
      });

      if (lastDonation) {
        const lastDate = new Date(lastDonation.scheduled_at);
        const nextAllowedDate = new Date(lastDate);
        nextAllowedDate.setMonth(nextAllowedDate.getMonth() + 3);

        // SỬA: Trả về 200 để FE tự handle toast
        if (scheduledDate < nextAllowedDate) {
          const dateStr = nextAllowedDate.toLocaleDateString("vi-VN");
          return res.json({
            status: false,
            message: `Bạn cần nghỉ ngơi sau lần hiến trước. Bạn có thể hiến máu lại từ ngày ${dateStr}.`,
          });
        }
      }

      const sameDay = new Date(
        scheduledDate.getFullYear(),
        scheduledDate.getMonth(),
        scheduledDate.getDate()
      );
      const nextDay = new Date(sameDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const existed = await Appointment.findOne({
        where: {
          donor_id,
          scheduled_at: { [Op.gte]: sameDay, [Op.lt]: nextDay },
          status: { [Op.in]: ["REQUESTED", "APPROVED", "BOOKED", "COMPLETED"] },
        },
      });

      // SỬA: Trả về 200 để FE tự handle toast
      if (existed) {
        return res.json({
          status: false,
          message: "Bạn đã có lịch đăng ký hoặc đã hiến máu trong ngày này!",
        });
      }

      const newAppt = await Appointment.create({
        donor_id,
        donation_site_id,
        appointment_slot_id,
        scheduled_at: scheduledDate,
        preferred_volume_ml,
        notes,
        time_slot,
        status: "REQUESTED",
      });

      const sendAt = new Date(scheduledDate);
      sendAt.setDate(sendAt.getDate() - 1);

      if (req.user?.email) {
        await emailQueue.enqueue({
          email: req.user.email,
          subject: "Nhắc lịch hiến máu của bạn",
          template: "truoc_khi_hien_mau",
          payload: {
            ten: req.user.full_name,
            ngay_hien: scheduledDate.toISOString().slice(0, 10),
          },
          scheduled_at: sendAt,
        });
      }

      return res.status(200).json({
        status: true,
        message: "Đặt lịch hiến máu thành công! Vui lòng chờ bác sĩ duyệt.",
        data: newAppt,
      });
    } catch (error) {
      return res.status(500).json({
        status: false,
        message: "Lỗi máy chủ khi tạo lịch hẹn!",
      });
    }
  },

  async myList(req, res) {
    try {
      const donor_id = req.user?.userId || req.user?.id;

      const rows = await Appointment.findAll({
        where: { donor_id },
        include: [{ model: DonationSite, as: "donation_site" }],
        order: [["scheduled_at", "DESC"]],
      });

      return res.json({ status: true, data: rows });
    } catch (e) {
      return res.status(500).json({
        status: false,
        message: "Không tải được danh sách lịch!",
      });
    }
  },

  async cancel(req, res) {
    try {
      const donor_id = req.user?.userId || req.user?.id;
      const { id } = req.params;

      const appt = await Appointment.findOne({
        where: { id, donor_id },
      });

      if (!appt) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy lịch!",
        });
      }

      if (!["REQUESTED", "APPROVED", "BOOKED"].includes(appt.status)) {
        // SỬA: Trả về 200
        return res.json({
          status: false,
          message: "Lịch không thể huỷ ở trạng thái hiện tại!",
        });
      }

      await appt.update({ status: "CANCELLED" });

      return res.json({
        status: true,
        message: "Đã huỷ lịch hiến máu!",
      });
    } catch (e) {
      return res.status(500).json({
        status: false,
        message: "Lỗi khi huỷ lịch!",
      });
    }
  },
};