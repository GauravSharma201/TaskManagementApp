'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Adding the 'verified' column to the 'Users' table.
     * We use 'verified' as the column name because your model uses
     * 'underscored: true', but for a single word, it remains the same.
     */
    await queryInterface.addColumn('Users', 'verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Reverting the change: removing the 'verified' column.
     */
    await queryInterface.removeColumn('Users', 'verified');
  }
};
