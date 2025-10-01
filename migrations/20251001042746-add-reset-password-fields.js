// File: migrations/YYYYMMDD...add-reset-password-fields.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Thêm cột resetPasswordToken
    await queryInterface.addColumn('users', 'resetPasswordToken', {
      type: Sequelize.STRING(255),
      allowNull: true,
    });
    
    // Thêm cột resetPasswordExpires
    await queryInterface.addColumn('users', 'resetPasswordExpires', {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Logic rollback (xóa cột)
    await queryInterface.removeColumn('users', 'resetPasswordExpires');
    await queryInterface.removeColumn('users', 'resetPasswordToken');
  }
};