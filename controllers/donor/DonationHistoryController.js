"use strict";

const { sequelize } = require("../../models");

/**
 * GET /donor/donation-history?year=&month=&q=&page=&limit=
 * - Trả: stats + data + meta (pagination)
 */
module.exports = {
  async index(req, res) {
    try {
      const userId = req.user?.userId || req.user?.id;
      const role = req.user?.role;

      if (!userId) {
        return res.status(401).json({ status: false, message: "Unauthorized" });
      }
      // Nếu bạn không check role ở middleware thì giữ, còn không thì bỏ cũng được
      if (role && role !== "donor") {
        return res.status(403).json({ status: false, message: "Forbidden" });
      }

      const year = req.query.year ? parseInt(req.query.year, 10) : null;
      const month = req.query.month ? parseInt(req.query.month, 10) : null;
      const q = (req.query.q || "").trim() || null;

      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limitRaw = parseInt(req.query.limit || "10", 10);
      const limit = Math.min(Math.max(limitRaw, 1), 100);
      const offset = (page - 1) * limit;

      const safeYear = Number.isFinite(year) && year >= 2000 && year <= 2100 ? year : null;
      const safeMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? month : null;
      const like = q ? `%${q}%` : null;

      // ---- STATS (tính tổng + lần gần nhất) ----
      const statsSql = `
        SELECT
          COUNT(*) AS total_count,
          COALESCE(SUM(d.volume_ml), 0) AS total_volume_ml,
          MAX(d.collected_at) AS last_donation_at
        FROM donations d
        JOIN appointments a ON a.id = d.appointment_id
        LEFT JOIN donation_sites ds ON ds.id = a.donation_site_id
        LEFT JOIN hospitals h ON h.id = d.hospital_id
        WHERE d.donor_user_id = :userId
          AND (:year IS NULL OR YEAR(d.collected_at) = :year)
          AND (:month IS NULL OR MONTH(d.collected_at) = :month)
          AND (
            :q IS NULL OR
            ds.name LIKE :like OR
            ds.address LIKE :like OR
            h.name LIKE :like
          )
      `;

      const [statsRows] = await sequelize.query(statsSql, {
        replacements: { userId, year: safeYear, month: safeMonth, q, like },
      });

      const statsRow = statsRows?.[0] || { total_count: 0, total_volume_ml: 0, last_donation_at: null };
      const totalRecords = parseInt(statsRow.total_count || 0, 10);
      const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

      // ---- LIST (phân trang) ----
      // Lưu ý: để tránh lỗi bind LIMIT/OFFSET tùy driver, mình nhúng trực tiếp sau khi đã sanitize số
      const listSql = `
        SELECT
          d.id,
          d.collected_at,
          d.volume_ml,
          d.notes,
          d.screened_ok,
          CONCAT(bt.abo, bt.rh) AS blood_group,
          h.name AS hospital_name,
          ds.name AS donation_site_name,
          ds.address AS donation_site_address
        FROM donations d
        JOIN appointments a ON a.id = d.appointment_id
        LEFT JOIN donation_sites ds ON ds.id = a.donation_site_id
        LEFT JOIN hospitals h ON h.id = d.hospital_id
        JOIN blood_types bt ON bt.id = d.blood_type_id
        WHERE d.donor_user_id = :userId
          AND (:year IS NULL OR YEAR(d.collected_at) = :year)
          AND (:month IS NULL OR MONTH(d.collected_at) = :month)
          AND (
            :q IS NULL OR
            ds.name LIKE :like OR
            ds.address LIKE :like OR
            h.name LIKE :like
          )
        ORDER BY d.collected_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `;

      const [rows] = await sequelize.query(listSql, {
        replacements: { userId, year: safeYear, month: safeMonth, q, like },
      });

      return res.json({
        status: true,
        message: "OK",
        stats: {
          total_count: totalRecords,
          total_volume_ml: parseInt(statsRow.total_volume_ml || 0, 10),
          last_donation_at: statsRow.last_donation_at || null,
        },
        meta: {
          page,
          limit,
          total_records: totalRecords,
          total_pages: totalPages,
        },
        data: rows || [],
      });
    } catch (err) {
      console.error("DonationHistoryController.index error:", err);
      return res.status(500).json({
        status: false,
        message: "Lỗi server!",
        error: err.message,
      });
    }
  },
};
