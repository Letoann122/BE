// controllers/doctor/BloodInventoryController.js
"use strict";

const {
  BloodInventory,
  BloodType,
  InventoryTransaction,
  User,
  sequelize,
} = require("../../models");
const { Op } = require("sequelize");

// helper: chuẩn hóa về 00:00 để so sánh theo ngày
function normalizeDate(d) {
  const dt = new Date(d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

// ✅ helper ghi log transaction (NHẬN transaction)
async function createInventoryTx(
  { inventoryId, userId, txType, units, reason, refDonationId = null },
  options = {}
) {
  const { transaction = null } = options;

  return InventoryTransaction.create(
    {
      inventory_id: inventoryId,
      user_id: userId || null,
      tx_type: txType, // 'IN' | 'OUT' | 'ADJUST' | 'EXPIRE'
      units,
      reason,
      ref_donation_id: refDonationId,
      occurred_at: new Date(),
    },
    { transaction }
  );
}

module.exports = {
  // 🩸 Lấy danh sách tất cả lô máu
  async getAll(req, res) {
    try {
      const list = await BloodInventory.findAll({
        include: [
          { model: BloodType, as: "blood_type", attributes: ["abo", "rh"] },
        ],
        order: [["id", "DESC"]],
      });

      return res.json({ status: true, data: list });
    } catch (error) {
      console.error("❌ Lỗi getAll blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy danh sách kho máu",
        error: error.message,
      });
    }
  },

  // 🔍 Lấy chi tiết 1 lô máu
  async getOne(req, res) {
    try {
      const { id } = req.params;

      const batch = await BloodInventory.findByPk(id, {
        include: [
          { model: BloodType, as: "blood_type", attributes: ["abo", "rh"] },
        ],
      });

      if (!batch) {
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lô máu" });
      }

      return res.json({
        status: true,
        message: "Lấy chi tiết lô máu thành công",
        data: batch,
      });
    } catch (error) {
      console.error("❌ Lỗi getOne blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy chi tiết lô máu",
        error: error.message,
      });
    }
  },

  // ➕ Thêm mới (nhập kho thủ công, hospital_id có thể NULL)
  async create(req, res) {
    const t = await sequelize.transaction();
    try {
      const { blood_type_id, units, donation_date, expiry_date } = req.body;
      const authUser = req.user;

      if (!blood_type_id || !units || !donation_date || !expiry_date) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message:
            "Vui lòng nhập đầy đủ nhóm máu, ngày nhập, hạn sử dụng và số lượng",
        });
      }

      const today = normalizeDate(new Date());
      const donation = normalizeDate(donation_date);
      const expiry = normalizeDate(expiry_date);

      if (donation < today) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Ngày nhập không được nhỏ hơn ngày hiện tại",
        });
      }
      if (expiry < today) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Hạn sử dụng không được nhỏ hơn ngày hiện tại",
        });
      }
      if (expiry < donation) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Hạn sử dụng không được nhỏ hơn ngày nhập",
        });
      }

      const diff = (expiry - today) / (1000 * 3600 * 24);
      let status = "full";
      if (diff <= 0 || units < 5) status = "critical";
      else if (diff <= 3) status = "expiring";
      else if (units < 10) status = "low";

      const newBatch = await BloodInventory.create(
        {
          hospital_id: null,
          blood_type_id,
          units,
          donation_date,
          expiry_date,
          status,
        },
        { transaction: t }
      );

      let label = "";
      const type = await BloodType.findByPk(blood_type_id, { transaction: t });
      if (type) label = `${type.abo}${type.rh}`;

      await createInventoryTx(
        {
          inventoryId: newBatch.id,
          userId: authUser?.userId,
          txType: "IN",
          units,
          reason: `Nhập ${units} túi máu ${label || ""} (id=${newBatch.id})`,
        },
        { transaction: t }
      );

      await t.commit();
      return res.json({
        status: true,
        message: "Thêm lô máu thành công",
        data: newBatch,
      });
    } catch (error) {
      await t.rollback();
      console.error("❌ Lỗi create blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi thêm lô máu",
        error: error.message,
      });
    }
  },

  // ✏️ Cập nhật
  async update(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const { blood_type_id, units, donation_date, expiry_date } = req.body;
      const authUser = req.user;

      const batch = await BloodInventory.findByPk(id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!batch) {
        await t.rollback();
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lô máu" });
      }

      if (!blood_type_id || !units || !donation_date || !expiry_date) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message:
            "Vui lòng nhập đầy đủ nhóm máu, ngày nhập, hạn sử dụng và số lượng",
        });
      }

      const today = normalizeDate(new Date());
      const donation = normalizeDate(donation_date);
      const expiry = normalizeDate(expiry_date);

      if (donation < today) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Ngày nhập không được nhỏ hơn ngày hiện tại",
        });
      }
      if (expiry < today) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Hạn sử dụng không được nhỏ hơn ngày hiện tại",
        });
      }
      if (expiry < donation) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Hạn sử dụng không được nhỏ hơn ngày nhập",
        });
      }

      const oldUnits = Number(batch.units || 0);

      const diffDays = (expiry - today) / (1000 * 3600 * 24);
      let status = "full";
      if (diffDays <= 0 || units < 5) status = "critical";
      else if (diffDays <= 3) status = "expiring";
      else if (units < 10) status = "low";

      await batch.update(
        { blood_type_id, units, donation_date, expiry_date, status },
        { transaction: t }
      );

      let label = "";
      const type = await BloodType.findByPk(blood_type_id, { transaction: t });
      if (type) label = `${type.abo}${type.rh}`;

      const diffUnits = Math.abs(Number(units) - oldUnits);
      if (diffUnits > 0) {
        await createInventoryTx(
          {
            inventoryId: batch.id,
            userId: authUser?.userId,
            txType: "ADJUST",
            units: diffUnits,
            reason: `Điều chỉnh lô máu ${label || ""} (id=${batch.id}) từ ${oldUnits} → ${units} túi`,
          },
          { transaction: t }
        );
      }

      await t.commit();
      return res.json({
        status: true,
        message: "Cập nhật lô máu thành công",
        data: batch,
      });
    } catch (error) {
      await t.rollback();
      console.error("❌ Lỗi update blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi cập nhật lô máu",
        error: error.message,
      });
    }
  },

  // ❌ Xóa
  async delete(req, res) {
    const t = await sequelize.transaction();
    try {
      const { id } = req.params;
      const authUser = req.user;

      const batch = await BloodInventory.findByPk(id, {
        include: [
          { model: BloodType, as: "blood_type", attributes: ["abo", "rh"] },
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!batch) {
        await t.rollback();
        return res
          .status(404)
          .json({ status: false, message: "Không tìm thấy lô máu" });
      }

      const label = batch.blood_type
        ? `${batch.blood_type.abo}${batch.blood_type.rh}`
        : "";
      const units = Number(batch.units || 0);

      await createInventoryTx(
        {
          inventoryId: batch.id,
          userId: authUser?.userId,
          txType: "OUT",
          units,
          reason: `Xóa lô máu ${label || ""} (id=${id}), xuất khỏi kho ${units} túi`,
        },
        { transaction: t }
      );

      await batch.destroy({ transaction: t });

      await t.commit();
      return res.json({ status: true, message: "Xóa lô máu thành công" });
    } catch (error) {
      await t.rollback();
      console.error("❌ Lỗi delete blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi xóa lô máu",
        error: error.message,
      });
    }
  },

  // 🧭 Lọc
  async filter(req, res) {
    try {
      const { bloodType, status } = req.body;

      const whereClause = {};
      if (status && status !== "all") whereClause.status = status;

      const includeClause = [
        {
          model: BloodType,
          as: "blood_type",
          attributes: ["abo", "rh"],
          required: true,
        },
      ];

      // ✅ FIX: chịu được "AB+" bị thành "AB " (space) + parse RH đúng
      if (bloodType && bloodType !== "all") {
        const bt = String(bloodType).trim().replace(/ /g, "+"); // normalize space -> '+'
        const abo = bt.replace(/[+\-\s]/g, "");                 // bỏ + - space
        const rh = bt.includes("-") ? "-" : "+";                // ưu tiên '-' nếu có

        includeClause[0].where = {
          [Op.and]: [{ abo }, { rh }],
        };
      }

      const result = await BloodInventory.findAll({
        where: whereClause,
        include: includeClause,
        order: [["id", "DESC"]],
      });

      return res.json({ status: true, data: result });
    } catch (error) {
      console.error("❌ Lỗi filter blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lọc dữ liệu",
        error: error.message,
      });
    }
  },

  // 🕒 Logs 1 lô (giữ như bạn đang dùng cho trang detail)
  async logsByBatch(req, res) {
    try {
      const { batch_id } = req.params;

      const logs = await InventoryTransaction.findAll({
        where: { inventory_id: batch_id },
        include: [{ model: User, attributes: ["full_name", "role"] }],
        order: [["occurred_at", "DESC"]],
      });

      const mapped = logs.map((log) => {
        let icon = "bi bi-info-circle";
        let title = "Hoạt động";

        switch (log.tx_type) {
          case "IN":
            icon = "bi bi-box-arrow-in-down";
            title = "Nhập kho";
            break;
          case "OUT":
            icon = "bi bi-arrow-up-circle";
            title = "Xuất kho";
            break;
          case "ADJUST":
            icon = "bi bi-pencil-square";
            title = "Điều chỉnh";
            break;
          case "EXPIRE":
            icon = "bi bi-exclamation-triangle";
            title = "Hết hạn";
            break;
        }

        return {
          icon,
          title,
          description: log.reason || "",
          actor: log.User ? log.User.full_name : "Hệ thống",
          time: log.occurred_at,
        };
      });

      return res.json({
        status: true,
        message: "Lấy nhật ký lô máu thành công",
        data: mapped,
      });
    } catch (error) {
      console.error("❌ Lỗi logsByBatch blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi lấy nhật ký lô máu",
        error: error.message,
      });
    }
  },

  // 📜 Logs toàn kho (✅ map đúng format FE BloodStockLogView)
 // 📜 Logs toàn kho
async logsAll(req, res) {
  try {
    const logs = await InventoryTransaction.findAll({
      include: [{ model: User, attributes: ["full_name", "role"] }],
      order: [["occurred_at", "DESC"]],
    });

    const mapped = logs.map((log) => {
      const mapAction = {
        IN: "import",
        OUT: "export",
        ADJUST: "update",
        EXPIRE: "expire",
      };

      const mapIcon = {
        IN: "bi bi-box-arrow-in-down",
        OUT: "bi bi-arrow-up-circle",
        ADJUST: "bi bi-pencil-square",
        EXPIRE: "bi bi-exclamation-triangle",
      };

      return {
        id: log.id,
        action: mapAction[log.tx_type] || "update",
        icon: mapIcon[log.tx_type] || "bi bi-info-circle",
        batch_id: log.inventory_id,
        actor_name: log.User ? log.User.full_name : "Hệ thống",
        actor_role: log.User ? log.User.role : "system",
        actor_avatar: null,
        time: log.occurred_at,
        notes: log.reason || "",
      };
    });

    return res.json({
      status: true,
      message: "Lấy nhật ký kho máu thành công",
      data: mapped,
    });
  } catch (error) {
    console.error("❌ Lỗi logsAll blood-inventory:", error);
    return res.status(500).json({
      status: false,
      message: "Lỗi lấy nhật ký kho máu",
      error: error.message,
    });
  }
},


  // 🚚 Xuất túi máu: ưu tiên hạn gần nhất
  async export(req, res) {
    const t = await sequelize.transaction();
    try {
      const { blood_type_id, units, reason } = req.body;
      const authUser = req.user;

      if (!blood_type_id || !units || Number(units) <= 0) {
        await t.rollback();
        return res.status(400).json({
          status: false,
          message: "Thiếu thông tin nhóm máu / số lượng",
        });
      }

      const today = new Date();

      const batches = await BloodInventory.findAll({
        where: {
          blood_type_id,
          units: { [Op.gt]: 0 },
          expiry_date: { [Op.gte]: today },
        },
        order: [
          ["expiry_date", "ASC"],
          ["id", "ASC"],
        ],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!batches.length) {
        await t.rollback();
        return res.json({
          status: false,
          message: "Không còn lô máu phù hợp để xuất",
        });
      }

      let remaining = Number(units);

      for (const batch of batches) {
        if (remaining <= 0) break;

        const take = Math.min(Number(batch.units), remaining);
        const newUnits = Number(batch.units) - take;

        await batch.update({ units: newUnits }, { transaction: t });

        await createInventoryTx(
          {
            inventoryId: batch.id,
            userId: authUser?.userId,
            txType: "OUT",
            units: take,
            reason:
              reason ||
              `Xuất ${take} túi từ lô id=${batch.id} (blood_type_id=${blood_type_id})`,
          },
          { transaction: t }
        );

        remaining -= take;
      }

      if (remaining > 0) {
        await t.rollback();
        return res.json({
          status: false,
          message: "Không đủ số lượng túi để xuất",
        });
      }

      await t.commit();
      return res.json({
        status: true,
        message: "Xuất túi máu thành công",
      });
    } catch (error) {
      await t.rollback();
      console.error("❌ Lỗi export blood-inventory:", error);
      return res.status(500).json({
        status: false,
        message: "Lỗi xuất túi máu",
        error: error.message,
      });
    }
  },
};
