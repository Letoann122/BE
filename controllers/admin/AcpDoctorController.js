const { User, Sequelize } = require("../../models");
const { Op } = Sequelize;

module.exports = {
  async getPending(req, res) {
    try {
      const doctors = await User.findAll({
        where: { role: "doctor", tinh_trang: 0 },
        attributes: ["id", "full_name", "email", "birthday", "address", "created_at"],
        order: [["created_at", "DESC"]],
      });

      res.json({ status: true, data: doctors });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async searchDoctor(req, res) {
    try {
      const { noi_dung_tim } = req.body;

      const whereCondition = {
        role: "doctor",
        tinh_trang: 0,
      };
      if (noi_dung_tim && noi_dung_tim.trim() !== "") {
        whereCondition.full_name = { [Op.like]: `%${noi_dung_tim}%` };
      }
      const doctors = await User.findAll({
        where: whereCondition,
        attributes: ["id", "full_name", "email", "birthday", "address", "created_at"],
        order: [["created_at", "DESC"]],
      });
      res.json({
        status: true,
        data: doctors,
      });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async approve(req, res) {
    try {
      const { id } = req.params;
      const doctor = await User.findOne({ where: { id, role: "doctor" } });
      if (!doctor) {
        return res.status(404).json({ status: false, message: "Không tìm thấy bác sĩ" });
      }
      doctor.tinh_trang = 1;
      await doctor.save();
      res.json({ status: true, message: "Đã duyệt bác sĩ thành công" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
  async reject(req, res) {
    try {
      const { id } = req.params;
      const doctor = await User.findOne({ where: { id, role: "doctor" } });
      if (!doctor) {
        return res.status(404).json({ status: false, message: "Không tìm thấy bác sĩ" });
      }
      doctor.tinh_trang = 2;
      await doctor.save();
      res.json({ status: true, message: "Đã từ chối bác sĩ thành công" });
    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
    }
  },
};
