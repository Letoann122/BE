"use strict";
module.exports = (sequelize, DataTypes) => {
  const Appointment = sequelize.define(
    "Appointment",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      donor_id: DataTypes.BIGINT,
      donation_site_id: DataTypes.BIGINT,
      appointment_slot_id: DataTypes.BIGINT,
      scheduled_at: DataTypes.DATE,
      preferred_volume_ml: DataTypes.INTEGER,           // <-- mới thêm
      status: DataTypes.STRING(20), // BOOKED/RESCHEDULED/CANCELLED/COMPLETED/NO_SHOW
      notes: DataTypes.TEXT,
      created_at: DataTypes.DATE,
      updated_at: DataTypes.DATE,
    },
    { tableName: "appointments", timestamps: false }
  );

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, { foreignKey: "donor_id" });
    Appointment.belongsTo(models.DonationSite, { foreignKey: "donation_site_id" });
    Appointment.belongsTo(models.AppointmentSlot, { foreignKey: "appointment_slot_id" });
  };

  return Appointment;
};
