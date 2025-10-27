// controllers/NewsController.js
const { Op } = require("sequelize");
const { News } = require("../models");

module.exports = {
  // ✅ Lấy danh sách tin tức (có filter start / end)
  async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 8;
      const offset = (page - 1) * limit;

      const { start, end } = req.query;
      const whereCondition = {};

      // 🧠 Nếu FE gửi start hoặc end thì lọc theo ngày xuất bản
      if (start && end) {
        whereCondition.published_date = {
          [Op.between]: [start, end],
        };
      } else if (start) {
        whereCondition.published_date = { [Op.gte]: start };
      } else if (end) {
        whereCondition.published_date = { [Op.lte]: end };
      }

      // ✅ Lấy dữ liệu phân trang
      const { count, rows } = await News.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["published_date", "DESC"]],
      });

      return res.json({
        status: true,
        total: count,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        data: rows,
      });
    } catch (err) {
      console.error("❌ Lỗi khi lấy danh sách tin tức:", err);
      return res.status(500).json({
        status: false,
        message: "Không thể tải danh sách tin tức!",
        error: err.message,
      });
    }
  },

  // ✅ Lấy chi tiết bài viết
  async getById(req, res) {
    try {
      const id = req.params.id;
      const news = await News.findByPk(id);

      if (!news) {
        return res.status(404).json({
          status: false,
          message: "Không tìm thấy bài viết!",
        });
      }

      return res.json({ status: true, data: news });
    } catch (err) {
      console.error("❌ Lỗi khi lấy chi tiết bài viết:", err);
      return res.status(500).json({
        status: false,
        message: "Không thể tải bài viết!",
        error: err.message,
      });
    }
  },
};
