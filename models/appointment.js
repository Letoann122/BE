"use strict";
module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      donor_id: DataTypes.BIGINT,
      donation_site_id: DataTypes.BIGINT,
      appointment_slot_id: DataTypes.BIGINT,

      appointment_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },

      scheduled_at: DataTypes.DATE,
      preferred_volume_ml: DataTypes.INTEGER,
      status: DataTypes.STRING(20),
      notes: DataTypes.TEXT,

      // ➕ thêm 3 field này
      approved_by_doctor_id: DataTypes.BIGINT,
      approved_at: DataTypes.DATE,
      rejected_reason: DataTypes.STRING(255),

      created_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: sequelize.literal("CURRENT_TIMESTAMP"),
      },
    },
    {
      tableName: "appointments",
      timestamps: false,
    }
  );

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, { foreignKey: "donor_id" });

    Appointment.belongsTo(models.DonationSite, {
      foreignKey: "donation_site_id",
      as: "donation_site",
    });

    Appointment.belongsTo(models.AppointmentSlot, {
      foreignKey: "appointment_slot_id",
    });

    // ➕ để lấy tên bác sĩ duyệt
    Appointment.belongsTo(models.Doctor, {
      foreignKey: "approved_by_doctor_id",
      as: "approved_doctor",
    });
  };

  return Appointment;
};