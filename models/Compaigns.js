"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Campaign extends Model {
    static associate(models) {
      Campaign.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator",
      });

      // ✅ admin duyệt (user)
      Campaign.belongsTo(models.User, {
        foreignKey: "reviewed_by_admin_id",
        as: "reviewer",
      });

      Campaign.belongsTo(models.DonationSite, {
        foreignKey: "donation_site_id",
        as: "donation_site",
      });
    }
  }

  Campaign.init(
    {
      id: { type: DataTypes.BIGINT, autoIncrement: true, primaryKey: true },

      hospital_id: { type: DataTypes.BIGINT, allowNull: true },

      title: DataTypes.STRING(255),
      content: DataTypes.TEXT,

      start_date: DataTypes.DATEONLY,
      end_date: DataTypes.DATEONLY,

      is_emergency: DataTypes.TINYINT,

      created_by: DataTypes.BIGINT,

      locate_type: {
        type: DataTypes.ENUM("custom", "donation_site"),
        defaultValue: "custom",
      },

      // ✅ trạng thái theo thời gian (GIỮ NGUYÊN để không vỡ logic)
      status: {
        type: DataTypes.ENUM("upcoming", "running", "ended"),
        defaultValue: "upcoming",
      },

      donation_site_id: { type: DataTypes.BIGINT, allowNull: true },

      location: { type: DataTypes.STRING(255), allowNull: true },

      // ✅ NEW: trạng thái duyệt
      approval_status: {
        type: DataTypes.ENUM("pending", "approved", "rejected"),
        defaultValue: "pending",
      },
      reviewed_by_admin_id: { type: DataTypes.BIGINT, allowNull: true },
      reviewed_at: { type: DataTypes.DATE, allowNull: true },
      rejected_reason: { type: DataTypes.STRING(255), allowNull: true },

      created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    },
    {
      sequelize,
      modelName: "Campaign",
      tableName: "campaigns",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: false,
    }
  );

  return Campaign;
};
