const { Campaign, User } = require("../../models");

exports.createCampaign = async (req, res) => {
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

    res.status(201).json({
      status: true,
      message: "Tạo chiến dịch thành công!",
      data: newCampaign,
    });
  } catch (error) {
    console.error("Lỗi khi tạo chiến dịch (Sequelize):", error);
    res.status(500).json({ status: false, message: "Lỗi server!" });
  }
};

exports.getAllCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.findAll({
      order: [["created_at", "DESC"]],
    });

    res.status(200).json({
      status: true,
      data: campaigns,
    });
  } catch (error) {
    console.error("Lỗi khi tải chiến dịch (Sequelize):", error);
    res.status(500).json({ status: false, message: "Lỗi server!" });
  }
};
