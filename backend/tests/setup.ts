// Set test environment
process.env.NODE_ENV = 'test';
process.env.DB_NAME = 'taskify_test';

// Increase timeout for database operations
jest.setTimeout(30000);