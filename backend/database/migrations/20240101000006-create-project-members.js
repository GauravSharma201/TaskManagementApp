'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('project_members', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.BIGINT
      },
      user_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      project_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        references: {
          model: 'Projects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint to prevent duplicate memberships
    await queryInterface.addIndex('project_members', ['user_id', 'project_id'], {
      unique: true,
      name: 'unique_project_membership'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('project_members');
  }
};