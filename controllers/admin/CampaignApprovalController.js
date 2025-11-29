"use strict";

const { Op } = require("sequelize");
const { Campaign, User, DonationSite } = require("../../models");

module.exports = {
  // GET /admin/campaigns/pending?q=&type=
  async listPending(req, res) {
    try {
      const { q = "", type = "" } = req.query;

      const where = { approval_status: "pending" };

      // filter type (0 = định kỳ, 1 = khẩn cấp)
      if (type === "0") where.is_emergency = 0;
      if (type === "1") where.is_emergency = 1;

      // search
      const keyword = String(q || "").trim();
      if (keyword) {
        where[Op.or] = [
          { title: { [Op.like]: `%${keyword}%` } },
          { content: { [Op.like]: `%${keyword}%` } },
          { location: { [Op.like]: `%${keyword}%` } },
        ];
      }

      const campaigns = await Campaign.findAll({
        where,
        include: [
          { model: User, as: "creator", attributes: ["id", "full_name", "email"] },
          { model: DonationSite, as: "donation_site" },
        ],
        order: [["created_at", "DESC"]],
      });

      return res.json({ status: true, data: campaigns });
    } catch (err) {
      console.error("CampaignApprovalController.listPending error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  // PATCH /admin/campaigns/:id/approve
  async approve(req, res) {
    try {
      const { id } = req.params;

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.json({ status: false, message: "Không tìm thấy chiến dịch" });
      }

      // nếu đã approved rồi thì thôi
      if (campaign.approval_status === "approved") {
        return res.json({
          status: true,
          message: "Chiến dịch đã được duyệt trước đó.",
          data: campaign,
        });
      }

      await campaign.update({
        approval_status: "approved",
        reviewed_by_admin_id: req.user.userId,
        reviewed_at: new Date(),
        rejected_reason: null,
      });

      await campaign.reload();

      return res.json({
        status: true,
        message: "Duyệt chiến dịch thành công",
        data: campaign,
      });
    } catch (err) {
      console.error("CampaignApprovalController.approve error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },

  // PATCH /admin/campaigns/:id/reject  { reason }
  async reject(req, res) {
    try {
      const { id } = req.params;
      const reason = String(req.body?.reason || "").trim();

      if (!reason) {
        return res.json({ status: false, message: "Vui lòng nhập lý do từ chối!" });
      }

      const campaign = await Campaign.findByPk(id);
      if (!campaign) {
        return res.json({ status: false, message: "Không tìm thấy chiến dịch" });
      }

      // nếu đã rejected rồi thì vẫn update lại reason
      await campaign.update({
        approval_status: "rejected",
        reviewed_by_admin_id: req.user.userId,
        reviewed_at: new Date(),
        rejected_reason: reason,
      });

      await campaign.reload();

      return res.json({
        status: true,
        message: "Từ chối chiến dịch thành công",
        data: campaign,
      });
    } catch (err) {
      console.error("CampaignApprovalController.reject error:", err);
      return res.status(500).json({ status: false, message: err.message });
    }
  },
};
