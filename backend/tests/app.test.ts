import request from 'supertest';
import app from '../src/app';

describe('App', () => {
  describe('GET /health', () => {
    it('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body).toHaveProperty('status', 'OK');
      expect(res.body).toHaveProperty('timestamp');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('environment');
    });
  });

  describe('GET /api', () => {
    it('should return welcome message', async () => {
      const res = await request(app)
        .get('/api')
        .expect(200);

      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('version');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const res = await request(app)
        .get('/nonexistent')
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
    });
  });
});