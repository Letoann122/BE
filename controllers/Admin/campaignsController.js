// controllers/admin/CampaignsController.js
const { Campaign, User } = require("../../models");

module.exports = {
  // ------------------ Tạo chiến dịch ------------------
  async createCampaign(req, res) {
    try {
      const { title, content, start_date, end_date, is_emergency } = req.body;
      const createdById = req.userData.id;

      const newCampaign = await Campaign.create({
        title,
        content,
        start_date,
        end_date,
        is_emergency: is_emergency ? 1 : 0,
        created_by: createdById,
      });

      return res.status(201).json({
        status: true,
        message: "Tạo chiến dịch thành công!",
        data: newCampaign,
      });
    } catch (error) {
      console.error("Lỗi khi tạo chiến dịch (Sequelize):", error);
      return res
        .status(500)
        .json({ status: false, message: "Lỗi server!", error: error.message });
    }
  },

  // ------------------ Lấy danh sách chiến dịch ------------------
  async getAllCampaigns(req, res) {
    try {
      const campaigns = await Campaign.findAll({
        order: [["created_at", "DESC"]],
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["id", "full_name", "email"],
          },
        ],
      });

      return res.status(200).json({
        status: true,
        data: campaigns,
      });
    } catch (error) {
      console.error("Lỗi khi tải chiến dịch (Sequelize):", error);
      return res
        .status(500)
        .json({ status: false, message: "Lỗi server!", error: error.message });
    }
  },
};
