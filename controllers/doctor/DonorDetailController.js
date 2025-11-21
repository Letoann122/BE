"use strict";

const {
  Donor,
  User,
  BloodType,
  Donation,
  Appointment,
  DonationSite,
  Hospital,
} = require("../../models");

module.exports = {
  async detail(req, res) {
    try {
      const user_id = req.params.id;

      // 1️⃣ Lấy thông tin donor + user + blood type
      const donor = await Donor.findOne({
        where: { user_id },
        include: [
          {
            model: User,
            attributes: [
              "full_name",
              "birthday",
              "gender",
              "phone",
              "email",
              "address",
              "blood_group",
              "tinh_trang",
            ],
          },
          {
            model: BloodType,
            attributes: ["abo", "rh"],
          },
        ],
      });

      if (!donor) {
        return res.status(404).json({
          status: false,
          message: "Donor không tồn tại",
        });
      }

      // 2️⃣ Lấy lịch sử hiến máu
      const history = await Donation.findAll({
        where: { donor_user_id: user_id },
        include: [
          {
            model: Appointment,
            include: [
              {
                // dùng đúng alias đã định nghĩa trong model Appointment
                model: DonationSite,
                as: "donation_site",
                include: [
                  {
                    model: Hospital, // Hospital gắn với DonationSite (xem donation_site.js)
                  },
                ],
              },
            ],
          },
        ],
        order: [["collected_at", "DESC"]],
      });

      // 3️⃣ Lần hiến máu gần nhất
      const lastDonation = history.length > 0 ? history[0] : null;

      // 4️⃣ Tính ngày có thể hiến lại (12 tuần = 84 ngày)
      let nextDonationDate = null;
      if (lastDonation && lastDonation.collected_at) {
        const d = new Date(lastDonation.collected_at);
        d.setDate(d.getDate() + 84);
        nextDonationDate = d.toISOString().slice(0, 10);
      }

      // 5️⃣ Nhóm máu hiển thị
      const bloodType = donor.BloodType
        ? `${donor.BloodType.abo}${donor.BloodType.rh}`
        : donor.User.blood_group || "Không rõ";

      // Helper get site + hospital từ 1 bản ghi Donation
      const mapDonationRecord = (item) => {
        const appointment = item.Appointment || null;
        const site = appointment && appointment.donation_site
          ? appointment.donation_site
          : null;
        const hospital = site && site.Hospital ? site.Hospital : null;

        return {
          date: item.collected_at
            ? item.collected_at.toISOString().slice(0, 10)
            : null,
          volume: item.volume_ml,
          site: site ? site.name : "",
          hospital: hospital ? hospital.name : "",
          status: "Hoàn thành",
        };
      };

      // 6️⃣ Format response
      return res.json({
        status: true,
        data: {
          donor: {
            id: user_id,
            name: donor.User.full_name,
            birthday: donor.User.birthday,
            gender: donor.User.gender,
            phone: donor.User.phone,
            email: donor.User.email,
            address: donor.User.address,
            bloodType,
            status: donor.User.tinh_trang === 1 ? "Hoạt động" : "Tạm ngừng",
          },

          lastDonation: lastDonation ? mapDonationRecord(lastDonation) : null,

          nextDonationDate,

          history: history.map(mapDonationRecord),
        },
      });
    } catch (error) {
      console.error("❌ Lỗi lấy chi tiết donor:", error);
      return res.status(500).json({
        status: false,
        error: error.message,
      });
    }
  },
};
