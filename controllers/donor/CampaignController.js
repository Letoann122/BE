"use strict";

const { Op } = require("sequelize");
const { Campaign, DonationSite, Hospital, Appointment } = require("../../models");

// ===== helpers =====
const normalizeStatus = (startDate, endDate, existingStatus) => {
  if (existingStatus) return existingStatus; // nếu DB đã có sẵn status
  const now = new Date();
  const s = new Date(startDate);
  const e = new Date(endDate);
  if (now < s) return "upcoming";
  if (now > e) return "ended";
  return "running";
};

const buildLocationDisplay = (campaignJson) => {
  if (campaignJson.locate_type === "donation_site") {
    const ds = campaignJson.donation_site;
    if (ds) return [ds.name, ds.address].filter(Boolean).join(" – ");
  }
  return campaignJson.location || "";
};

module.exports = {
  // ===================== PUBLIC: CAMPAIGNS =====================
  // GET /api/public/campaigns?status=active|upcoming|running|ended
  async publicCampaigns(req, res) {
    try {
      const { status = "active" } = req.query;

      const where = { approval_status: "approved" };

      if (status === "active") where.status = { [Op.in]: ["upcoming", "running"] };
      else if (status) where.status = status;

      const campaigns = await Campaign.findAll({
        where,
        include: [
          {
            model: DonationSite,
            as: "donation_site",
            include: [{ model: Hospital, as: "hospital" }],
          },
        ],
        order: [["start_date", "ASC"]],
      });

      const data = campaigns.map((c) => {
        const raw = c.toJSON();
        const st = normalizeStatus(raw.start_date, raw.end_date, raw.status);

        return {
          id: raw.id,
          title: raw.title,
          content: raw.content,
          start_date: raw.start_date,
          end_date: raw.end_date,
          is_emergency: raw.is_emergency,
          locate_type: raw.locate_type,
          location: raw.location,
          location_display: buildLocationDisplay(raw),
          status: st,
          hospital_name: raw.donation_site?.hospital?.name || "",
        };
      });

      return res.json({ status: true, data });
    } catch (err) {
      console.error("CommonController.publicCampaigns error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  // GET /api/public/campaigns/:id
  async publicCampaignDetail(req, res) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findOne({
        where: { id, approval_status: "approved" },
        include: [
          {
            model: DonationSite,
            as: "donation_site",
            include: [{ model: Hospital, as: "hospital" }],
          },
        ],
      });

      if (!campaign) {
        return res.status(404).json({ status: false, message: "Không tìm thấy chiến dịch" });
      }

      const raw = campaign.toJSON();
      const st = normalizeStatus(raw.start_date, raw.end_date, raw.status);

      return res.json({
        status: true,
        data: {
          ...raw,
          status: st,
          location_display: buildLocationDisplay(raw),
          hospital_name: raw.donation_site?.hospital?.name || "",
        },
      });
    } catch (err) {
      console.error("CommonController.publicCampaignDetail error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  // ===================== DONOR: CREATE APPOINTMENT (save campaign_id) =====================
  // POST /api/donor/donation-appointments
  async donorCreateAppointment(req, res) {
    try {
      const donor_id = req.user?.userId; // tùy middleware auth của mày
      const {
        donation_site_id,
        appointment_slot_id,
        scheduled_at,
        preferred_volume_ml,
        notes,
        campaign_id,
      } = req.body;

      // validate campaign nếu có gửi
      let campaignIdToSave = null;
      if (campaign_id) {
        const camp = await Campaign.findOne({
          where: {
            id: campaign_id,
            approval_status: "approved",
            status: { [Op.in]: ["upcoming", "running"] }, // chặn ended
          },
        });

        if (!camp) {
          return res.status(400).json({
            status: false,
            message: "Chiến dịch không hợp lệ hoặc đã kết thúc!",
          });
        }

        campaignIdToSave = camp.id;
      }

      const created = await Appointment.create({
        donor_id,
        donation_site_id,
        appointment_slot_id,
        scheduled_at,
        preferred_volume_ml,
        notes,
        campaign_id: campaignIdToSave,
        status: "REQUESTED",
      });

      return res.json({ status: true, message: "Đặt lịch thành công!", data: created });
    } catch (err) {
      console.error("CommonController.donorCreateAppointment error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },
};
