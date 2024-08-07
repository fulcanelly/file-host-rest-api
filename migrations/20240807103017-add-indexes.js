'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addIndex('Files', ['userId'], {
      name: 'idx_files_userId',
      unique: false
    })
    await queryInterface.addIndex('Sessions', ['userId'], {
      name: 'idx_sessions_userId',
      unique: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('Sessions', 'idx_sessions_userId');
    await queryInterface.removeIndex('Files', 'idx_files_userId')
  }
};
