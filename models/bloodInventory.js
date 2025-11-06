// models/bloodInventory.js
module.exports = (sequelize, DataTypes) => {
  const BloodInventory = sequelize.define(
    "BloodInventory",
    {
      id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true,
      },
      blood_type_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
      },
      units: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      donation_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      expiry_date: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM("full", "expiring", "low", "critical"),
        defaultValue: "full",
      },
    },
    {
      tableName: "blood_inventory",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  // ✅ Quan trọng: định nghĩa associations trong 1 callback
  BloodInventory.associate = (models) => {
    BloodInventory.belongsTo(models.BloodType, {
      foreignKey: "blood_type_id",
      as: "blood_type",
    });
    BloodInventory.belongsTo(models.User, {
      foreignKey: "user_id",
      as: "user",
    });
  };

  return BloodInventory;
};
