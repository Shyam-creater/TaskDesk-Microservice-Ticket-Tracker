import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../src/app';
import { config } from '../src/config/env';

describe('API Gateway Tests', () => {
  const validToken = jwt.sign(
    { id: 'user-id-123', email: 'test@example.com', role: 'user' },
    config.JWT_SECRET,
    { expiresIn: '1h' }
  );

  describe('Correlation ID Handling', () => {
    it('should generate a new x-correlation-id when none is provided in request', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.headers).toHaveProperty('x-correlation-id');
      expect(typeof res.headers['x-correlation-id']).toBe('string');
      expect(res.headers['x-correlation-id'].length).toBeGreaterThan(10);
    });

    it('should preserve and propagate incoming x-correlation-id', async () => {
      const customCorrelationId = 'client-custom-corr-uuid-456';
      const res = await request(app)
        .get('/health')
        .set('x-correlation-id', customCorrelationId);

      expect(res.status).toBe(200);
      expect(res.headers['x-correlation-id']).toBe(customCorrelationId);
    });
  });

  describe('JWT Verification & Route Protection', () => {
    it('should REJECT requests to protected /api/tickets when Authorization header is missing', async () => {
      const res = await request(app).get('/api/tickets');

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toContain('Authorization');
    });

    it('should REJECT requests to protected /api/tickets when JWT is invalid', async () => {
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', 'Bearer invalid-malformed-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should REJECT requests to protected /api/tickets when JWT is signed with wrong secret', async () => {
      const wrongToken = jwt.sign({ id: '123' }, 'wrong_secret_key_that_does_not_match');
      const res = await request(app)
        .get('/api/tickets')
        .set('Authorization', `Bearer ${wrongToken}`);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow public routes like /health without JWT', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('should allow /metrics endpoint without JWT', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('api_gateway_');
    });
  });

  describe('Security Headers (Helmet & CORS)', () => {
    it('should set security headers via Helmet', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).toHaveProperty('x-content-type-options');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });
  });
});
