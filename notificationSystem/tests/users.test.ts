import request from 'supertest';
import app from '../src/app';
import { sequelize } from '../src/models';
import { UserCreationAttributes } from '../src/types';

describe('Users API', () => {
    beforeAll(async () => {
        // Sync database for testing
        await sequelize.sync({ force: true });
    });

    afterAll(async () => {
        // Close database connection
        await sequelize.close();
    });

    beforeEach(async () => {
        // Clean up database before each test
        await sequelize.sync({ force: true });
    });

    describe('GET /api/v1/users', () => {
        it('should get all users', async () => {
            const res = await request(app)
                .get('/api/v1/users')
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
            expect(Array.isArray(res.body.data)).toBe(true);
        });

        it('should support pagination', async () => {
            // Create some test users first
            await request(app)
                .post('/api/v1/users')
                .send({ name: 'User 1', email: 'user1@test.com' } as UserCreationAttributes);

            await request(app)
                .post('/api/v1/users')
                .send({ name: 'User 2', email: 'user2@test.com' } as UserCreationAttributes);

            const res = await request(app)
                .get('/api/v1/users?page=1&limit=1')
                .expect(200);

            expect(res.body.pagination.page).toBe(1);
            expect(res.body.pagination.limit).toBe(1);
            expect(res.body.data.length).toBe(1);
        });
    });

    describe('POST /api/v1/users', () => {
        it('should create a new user', async () => {
            const userData: UserCreationAttributes = {
                name: 'Test User',
                email: 'test@example.com'
            };

            const res = await request(app)
                .post('/api/v1/users')
                .send(userData)
                .expect(201);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('name', userData.name);
            expect(res.body.data).toHaveProperty('email', userData.email);
            expect(res.body.data).toHaveProperty('id');
        });

        it('should return validation error for invalid data', async () => {
            const userData = {
                name: '',
                email: 'invalid-email'
            };

            const res = await request(app)
                .post('/api/v1/users')
                .send(userData)
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body).toHaveProperty('errors');
        });

        it('should prevent duplicate emails', async () => {
            const userData: UserCreationAttributes = {
                name: 'Test User',
                email: 'duplicate@example.com'
            };

            // Create first user
            await request(app)
                .post('/api/v1/users')
                .send(userData)
                .expect(201);

            // Try to create second user with same email
            const res = await request(app)
                .post('/api/v1/users')
                .send({ ...userData, name: 'Another User' })
                .expect(400);

            expect(res.body).toHaveProperty('success', false);
            expect(res.body.message).toContain('already exists');
        });
    });

    describe('GET /api/v1/users/:id', () => {
        it('should get a user by id', async () => {
            // Create a user first
            const createRes = await request(app)
                .post('/api/v1/users')
                .send({ name: 'Test User', email: 'test@example.com' } as UserCreationAttributes);

            const userId = createRes.body.data.id;

            const res = await request(app)
                .get(`/api/v1/users/${userId}`)
                .expect(200);

            expect(res.body).toHaveProperty('success', true);
            expect(res.body.data).toHaveProperty('id', userId);
        });

        it('should return 404 for non-existent user', async () => {
            const fakeId = '123e4567-e89b-12d3-a456-426614174000';

            const res = await request(app)
                .get(`/api/v1/users/${fakeId}`)
                .expect(404);

            expect(res.body).toHaveProperty('success', false);
        });
    });
});