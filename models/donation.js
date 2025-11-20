"use strict";
module.exports = (sequelize, DataTypes) => {
  const Donation = sequelize.define(
    "Donation",
    {
      id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
      appointment_id: DataTypes.BIGINT,
      hospital_id: DataTypes.BIGINT,
      blood_type_id: DataTypes.BIGINT,
      volume_ml: DataTypes.INTEGER,
      collected_at: DataTypes.DATE,
      screened_ok: DataTypes.TINYINT,
      // nếu muốn có luôn:
      confirmed_by_doctor_id: DataTypes.BIGINT,
      confirmed_at: DataTypes.DATE,
      notes: DataTypes.STRING(255),
    },
    { tableName: "donations", timestamps: false }
  );

  Donation.associate = (models) => {
    Donation.belongsTo(models.Appointment, { foreignKey: "appointment_id" });
  };

  return Donation;
};
