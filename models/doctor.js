module.exports = (sequelize, DataTypes) => {
  const Doctor = sequelize.define(
    "Doctor",
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      full_name: DataTypes.STRING(100),
      birthday: DataTypes.DATEONLY,
      gender: DataTypes.STRING(10),
      phone: DataTypes.STRING(20),
      email: DataTypes.STRING(100),
      address: DataTypes.STRING(255),
    },
    {
      tableName: "doctors",
      timestamps: true,
      createdAt: "created_at",
      updatedAt: "updated_at",
    }
  );

  return Doctor;
};
