"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Thêm các quan hệ nếu có, ví dụ:
      // User.hasMany(models.Donation, { foreignKey: "user_id" });
    }
  }

  User.init(
    {
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      gender: {
        type: DataTypes.ENUM("Nam", "Nữ", "Khác"),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      blood_group: {
        type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM("donor", "admin", "doctor"),
        allowNull: false,
        defaultValue: "donor",
      },
      medical_history: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    
      
      resetPasswordToken: {
        // token mã hoá SHA256 để xác minh reset password
        type: DataTypes.STRING,
        allowNull: true,
           require: false,
      },
      resetPasswordExpires: {
        // thời điểm hết hạn token reset password
        type: DataTypes.DATE,
        allowNull: true,
        require: false,
      },
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users",
      timestamps: true, // có createdAt, updatedAt
      underscored: false, // bạn có thể để true nếu muốn tên cột snake_case
    }
  );

  return User;
};
