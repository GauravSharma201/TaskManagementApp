'use strict';

const { v4: uuidv4 } = require('crypto');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'users',
      [
        {
          id: uuidv4(),
          name: 'John Doe',
          email: 'john.doe@example.com',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Jane Smith',
          email: 'jane.smith@example.com',
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: uuidv4(),
          name: 'Bob Johnson',
          email: 'bob.johnson@example.com',
          is_active: false,
          created_at: new Date(),
          updated_at: new Date()
        }
      ],
      {}
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', null, {});
  }
};
