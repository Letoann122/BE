"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // Nếu sau này có quan hệ với bảng khác thì thêm ở đây
    }
  }

  User.init(
    {
      full_name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      birthday: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      gender: {
        type: DataTypes.ENUM("Nam", "Nữ", "Khác"),
        allowNull: false
      },
      phone: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        }
      },
      address: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      blood_group: {
        type: DataTypes.ENUM("A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"),
        allowNull: false
      },
      role: {
        type: DataTypes.ENUM("donor", "admin", "doctor"),
        allowNull: false,
        defaultValue: "donor"
      },
      medical_history: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: "User",
      tableName: "users"
    }
  );
  userSchema.methods ={
    createPassword
  }
  return User;
};
