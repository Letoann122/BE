const { User, Campaign, BloodInventory, Donation } = require("../../models");

const { Op, fn, col } = require("sequelize");

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalDonors,
      totalDoctors,
      activeCampaigns,
      inventoryTotal,
      inventoryByType,
      recentDonations,
    ] = await Promise.all([
      User.count({ where: { role: "donor" } }),

      User.count({ where: { role: "doctor" } }),

      Campaign.count({
        where: { end_date: { [Op.gte]: new Date() } },
      }),

      BloodInventory.count({
        where: {
          status: "available",
          expiry_date: { [Op.gte]: new Date() },
        },
      }),

      BloodInventory.findAll({
        attributes: ["blood_type", [fn("COUNT", col("id")), "count"]],
        where: {
          status: "available",
          expiry_date: { [Op.gte]: new Date() },
        },
        group: ["blood_type"],
        order: [["count", "DESC"]],
      }),

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

    // 2. Gom kết quả
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

    res.status(200).json({ status: true, data: responsePayload });
  } catch (error) {
    console.error("Lỗi khi tải Dashboard (Sequelize):", error);
    res.status(500).json({ status: false, message: "Lỗi server!" });
  }
};
