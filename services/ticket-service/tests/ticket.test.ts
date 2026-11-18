import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../src/app';
import { config } from '../src/config/env';

let mongoServer: MongoMemoryServer;

const createToken = (id: string, email: string, role: 'user' | 'admin') => {
  return jwt.sign({ id, email, role }, config.JWT_SECRET, { expiresIn: '1h' });
};

const user1 = { id: new mongoose.Types.ObjectId().toString(), email: 'user1@example.com', role: 'user' as const };
const user2 = { id: new mongoose.Types.ObjectId().toString(), email: 'user2@example.com', role: 'user' as const };
const adminUser = { id: new mongoose.Types.ObjectId().toString(), email: 'admin@example.com', role: 'admin' as const };

const tokenUser1 = createToken(user1.id, user1.email, user1.role);
const tokenUser2 = createToken(user2.id, user2.email, user2.role);
const tokenAdmin = createToken(adminUser.id, adminUser.email, adminUser.role);

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

describe('Ticket Service Tests', () => {
  describe('POST /tickets', () => {
    it('should create a new ticket for authenticated user', async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .set('x-correlation-id', 'test-ticket-corr-1')
        .send({
          title: 'Database connection latency spike',
          description: 'Investigating high latency spikes on replica read pool',
          priority: 'high',
        });

      expect(res.status).toBe(201);
      expect(res.headers['x-correlation-id']).toBe('test-ticket-corr-1');
      expect(res.body.data.ticket).toMatchObject({
        title: 'Database connection latency spike',
        description: 'Investigating high latency spikes on replica read pool',
        priority: 'high',
        status: 'open',
        createdBy: user1.id,
      });
    });

    it('should reject creation without authentication token with 401', async () => {
      const res = await request(app)
        .post('/tickets')
        .send({
          title: 'Unauthenticated ticket',
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject invalid payload (title too short) with 400', async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          title: 'Hi',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /tickets (List Tickets & Isolation)', () => {
    beforeEach(async () => {
      // User 1 creates 2 tickets
      await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'User1 Ticket A', priority: 'low' });

      await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'User1 Ticket B', priority: 'high' });

      // User 2 creates 1 ticket
      await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ title: 'User2 Ticket C', priority: 'medium' });
    });

    it('should allow user1 to see ONLY their own tickets', async () => {
      const res = await request(app)
        .get('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(2);
      expect(res.body.data.pagination.total).toBe(2);
      res.body.data.tickets.forEach((t: { createdBy: string }) => {
        expect(t.createdBy).toBe(user1.id);
      });
    });

    it('should allow user2 to see ONLY their own tickets', async () => {
      const res = await request(app)
        .get('/tickets')
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(1);
      expect(res.body.data.pagination.total).toBe(1);
      expect(res.body.data.tickets[0].createdBy).toBe(user2.id);
    });

    it('should allow admin to see ALL tickets across all users', async () => {
      const res = await request(app)
        .get('/tickets')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(3);
      expect(res.body.data.pagination.total).toBe(3);
    });

    it('should support pagination properly', async () => {
      const res = await request(app)
        .get('/tickets?page=1&limit=1')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(1);
      expect(res.body.data.pagination.totalPages).toBe(2);
      expect(res.body.data.pagination.page).toBe(1);
    });
  });

  describe('GET /tickets/:id and PATCH /tickets/:id', () => {
    let user1TicketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Bug report in auth module', priority: 'medium' });
      user1TicketId = res.body.data.ticket._id;
    });

    it('should allow owner to view their ticket', async () => {
      const res = await request(app)
        .get(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticket._id).toBe(user1TicketId);
    });

    it('should FORBID user2 from viewing user1 ticket with 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should allow admin to view any user ticket', async () => {
      const res = await request(app)
        .get(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticket._id).toBe(user1TicketId);
    });

    it('should allow owner to update ticket status', async () => {
      const res = await request(app)
        .patch(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'in_progress', priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('in_progress');
      expect(res.body.data.ticket.priority).toBe('high');
    });

    it('should FORBID user2 from updating user1 ticket with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /tickets/:id (Admin only delete)', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Ticket for deletion test', priority: 'low' });
      ticketId = res.body.data.ticket._id;
    });

    it('should REJECT deletion by standard user with 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should ALLOW admin to delete any ticket with 200 OK', async () => {
      const res = await request(app)
        .delete(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('message');

      // Verify it is actually deleted
      const checkRes = await request(app)
        .get(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(checkRes.status).toBe(404);
    });
  });

  describe('Observability endpoints', () => {
    it('should return health check', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('ticket-service');
    });

    it('should return Prometheus metrics', async () => {
      const res = await request(app).get('/metrics');
      expect(res.status).toBe(200);
      expect(res.text).toContain('ticket_service_');
    });
  });
});
