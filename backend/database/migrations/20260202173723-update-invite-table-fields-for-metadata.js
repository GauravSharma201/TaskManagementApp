'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Remove the old column
    await queryInterface.removeColumn('Invites', 'module_end_point');

    // Add the new columns
    await queryInterface.addColumn('Invites', 'target_id', {
      type: Sequelize.BIGINT,
      allowNull: false
    });

    await queryInterface.addColumn('Invites', 'target_type', {
      type: Sequelize.STRING,
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    // Revert: remove new columns
    await queryInterface.removeColumn('Invites', 'target_id');
    await queryInterface.removeColumn('Invites', 'target_type');

    // Re-add the old column
    await queryInterface.addColumn('Invites', 'module_end_point', {
      type: Sequelize.STRING,
      allowNull: true
    });
  }
};
