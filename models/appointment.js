"use strict";
module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },

      donor_id: DataTypes.BIGINT,
      donation_site_id: DataTypes.BIGINT,
      appointment_slot_id: DataTypes.BIGINT,

      // để NULL, trigger sẽ tự generate
      appointment_code: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true,
      },

      scheduled_at: DataTypes.DATE,
      preferred_volume_ml: DataTypes.INTEGER,
      status: DataTypes.STRING(20),
      notes: DataTypes.TEXT,

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
  };

  return Appointment;
};
