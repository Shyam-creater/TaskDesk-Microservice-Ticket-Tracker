import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});

describe('Auth Service Tests', () => {
  const testUser = {
    name: 'Alice Developer',
    email: 'alice@example.com',
    password: 'Password123!',
  };

  describe('POST /auth/register', () => {
    it('should register a new user successfully and return JWT token', async () => {
      const res = await request(app)
        .post('/auth/register')
        .set('x-correlation-id', 'test-corr-id-1')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.headers['x-correlation-id']).toBe('test-corr-id-1');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user).toMatchObject({
        name: testUser.name,
        email: testUser.email,
        role: 'user',
      });
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should reject registration with duplicate email with 409 Conflict', async () => {
      // First registration
      await request(app).post('/auth/register').send(testUser);

      // Duplicate registration
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Alice Duplicate',
          email: testUser.email,
          password: 'AnotherPassword123!',
        });

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('already exists');
    });

    it('should reject invalid email format with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('valid email');
    });

    it('should reject weak password with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weak@example.com',
          password: 'weak',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send(testUser);
    });

    it('should login successfully with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe(testUser.email);
    });

    it('should reject login with incorrect password with 401 and generic message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('should reject login with non-existent email with 401 and generic message', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  describe('GET /auth/me', () => {
    let token: string;

    beforeEach(async () => {
      const regRes = await request(app).post('/auth/register').send(testUser);
      token = regRes.body.data.token;
    });

    it('should return current user profile when valid token provided', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toMatchObject({
        name: testUser.name,
        email: testUser.email,
        role: 'user',
      });
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should reject request without token with 401 Unauthorized', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request with invalid token with 401 Unauthorized', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /health and GET /metrics', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('auth-service');
    });

    it('should expose Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('auth_service_');
    });
  });
});
