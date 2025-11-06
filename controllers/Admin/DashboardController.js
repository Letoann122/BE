// controllers/admin/DashboardController.js
const { User, Campaign, BloodInventory, Donation } = require("../../models");
const { Op, fn, col } = require("sequelize");

module.exports = {
  async getDashboardStats(req, res) {
    try {
      // 1. Lấy các số liệu song song
      const [
        totalDonors,
        totalDoctors,
        activeCampaigns,
        inventoryTotal,
        inventoryByType,
        recentDonations,
      ] = await Promise.all([
        // Tổng số người hiến máu
        User.count({ where: { role: "donor" } }),

        // Tổng số bác sĩ
        User.count({ where: { role: "doctor" } }),

        // Chiến dịch còn hoạt động
        Campaign.count({
          where: { end_date: { [Op.gte]: new Date() } },
        }),

        // Tổng số đơn vị máu còn hạn sử dụng
        BloodInventory.count({
          where: {
            status: "available",
            expiry_date: { [Op.gte]: new Date() },
          },
        }),

        // Phân loại số lượng máu theo nhóm máu
        BloodInventory.findAll({
          attributes: ["blood_type", [fn("COUNT", col("id")), "count"]],
          where: {
            status: "available",
            expiry_date: { [Op.gte]: new Date() },
          },
          group: ["blood_type"],
          order: [["count", "DESC"]],
        }),

        // 5 lượt hiến máu gần nhất
        Donation.findAll({
          where: { status: "completed" },
          order: [["donated_at", "DESC"]],
          limit: 5,
          include: [
            {
              model: User,
              as: "donor",
              attributes: ["full_name"],
            },
          ],
        }),
      ]);

      // 2. Gom kết quả trả về
      const responsePayload = {
        stats: {
          totalDonors,
          totalDoctors,
          activeCampaigns,
        },
        inventory: {
          totalUnits: inventoryTotal,
          byBloodType: inventoryByType,
        },
        recentDonations,
      };

      return res.status(200).json({
        status: true,
        data: responsePayload,
      });
    } catch (error) {
      console.error("Lỗi khi tải Dashboard (Sequelize):", error);
      return res
        .status(500)
        .json({ status: false, message: "Lỗi server!", error: error.message });
    }
  },
};
