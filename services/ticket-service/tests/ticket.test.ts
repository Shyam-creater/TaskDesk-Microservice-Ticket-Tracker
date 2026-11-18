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
  describe('POST /tickets (Role-Based Ticket Creation)', () => {
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

    it('should FORBID admin from creating tickets with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          title: 'Admin created ticket',
          description: 'Admins should not be allowed to create tickets',
          priority: 'low',
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
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

    it('should filter by priority and status for admin', async () => {
      const res = await request(app)
        .get('/tickets?priority=high')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.tickets.length).toBe(1);
      expect(res.body.data.tickets[0].title).toBe('User1 Ticket B');
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

  describe('GET /tickets/:id (Ticket Details & Access Rules)', () => {
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

    it('should return 404 Not Found when user2 requests user1 ticket', async () => {
      const res = await request(app)
        .get(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should allow admin to view any user ticket', async () => {
      const res = await request(app)
        .get(`/tickets/${user1TicketId}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.ticket._id).toBe(user1TicketId);
    });
  });

  describe('PATCH /tickets/:id (User Edit Content)', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Original title', description: 'Original description' });
      ticketId = res.body.data.ticket._id;
    });

    it('should allow owner to update title and description while ticket is open', async () => {
      const res = await request(app)
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Updated title', description: 'Updated description' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.title).toBe('Updated title');
      expect(res.body.data.ticket.description).toBe('Updated description');
    });

    it('should return 404 when non-owner tries to edit content', async () => {
      const res = await request(app)
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ title: 'Hijacked title' });

      expect(res.status).toBe(404);
    });

    it('should REJECT edit with 400 when ticket is not open', async () => {
      // Admin moves ticket to in_review
      await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_review' });

      // User attempts to edit
      const res = await request(app)
        .patch(`/tickets/${ticketId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'New title when in_review' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('only be edited while open');
    });
  });

  describe('PATCH /tickets/:id/status (Admin-Only Status Lifecycle)', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Ticket for status lifecycle' });
      ticketId = res.body.data.ticket._id;
    });

    it('should REJECT status update by regular user with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ status: 'in_review' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should ALLOW admin to advance status along valid lifecycle: open -> in_review -> in_progress -> resolved -> closed', async () => {
      // 1. open -> in_review
      let res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_review' });
      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('in_review');

      // 2. in_review -> in_progress
      res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_progress' });
      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('in_progress');

      // 3. in_progress -> resolved
      res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'resolved' });
      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('resolved');

      // 4. resolved -> closed
      res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'closed' });
      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('closed');
      expect(res.body.data.ticket.statusHistory.length).toBe(4);

      // 5. Admin can reopen from closed -> open
      res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'open' });
      expect(res.status).toBe(200);
      expect(res.body.data.ticket.status).toBe('open');
    });

    it('should REJECT invalid status transitions with 400 Bad Request', async () => {
      // Attempt open -> closed (skipping in_review, in_progress, resolved)
      const res = await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'closed' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Invalid status transition');
    });
  });

  describe('PATCH /tickets/:id/review (Admin Review Ticket)', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Ticket for review', priority: 'low' });
      ticketId = res.body.data.ticket._id;
    });

    it('should REJECT review by standard user with 403 Forbidden', async () => {
      const res = await request(app)
        .patch(`/tickets/${ticketId}/review`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ priority: 'high' });

      expect(res.status).toBe(403);
    });

    it('should ALLOW admin to review ticket and update priority', async () => {
      const res = await request(app)
        .patch(`/tickets/${ticketId}/review`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ priority: 'high' });

      expect(res.status).toBe(200);
      expect(res.body.data.ticket.reviewedBy).toBe(adminUser.id);
      expect(res.body.data.ticket.reviewedAt).toBeDefined();
      expect(res.body.data.ticket.priority).toBe('high');
      expect(res.body.data.ticket.status).toBe('in_review');
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

  describe('GET /tickets/stats (Admin Stats)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Ticket 1' });

      const res2 = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Ticket 2' });

      // Admin moves Ticket 2 to in_review
      await request(app)
        .patch(`/tickets/${res2.body.data.ticket._id}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_review' });
    });

    it('should REJECT regular user from viewing stats with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/tickets/stats')
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(res.status).toBe(403);
    });

    it('should ALLOW admin to view stats counts breakdown', async () => {
      const res = await request(app)
        .get('/tickets/stats')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.status).toBe(200);
      expect(res.body.data.stats).toMatchObject({
        open: 1,
        in_review: 1,
        in_progress: 0,
        resolved: 0,
        closed: 0,
        total: 2,
      });
    });
  });

  describe('Ticket Messages (Chat Conversation)', () => {
    let ticketId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/tickets')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ title: 'Support Chat Ticket' });
      ticketId = res.body.data.ticket._id;
    });

    it('should allow user and admin to post messages in ticket thread', async () => {
      // User posts message
      const userMsg = await request(app)
        .post(`/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ body: 'Hello support, I need help with replica latency.' });

      expect(userMsg.status).toBe(201);
      expect(userMsg.body.data.message.senderRole).toBe('user');
      expect(userMsg.body.data.message.body).toBe('Hello support, I need help with replica latency.');

      // Admin posts message
      const adminMsg = await request(app)
        .post(`/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ body: 'Hello! We are looking into your query right now.' });

      expect(adminMsg.status).toBe(201);
      expect(adminMsg.body.data.message.senderRole).toBe('admin');

      // Fetch messages list
      const listRes = await request(app)
        .get(`/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.messages.length).toBe(2);
      expect(listRes.body.data.messages[0].senderRole).toBe('user');
      expect(listRes.body.data.messages[1].senderRole).toBe('admin');
    });

    it('should return 404 when user2 tries to chat on user1 ticket', async () => {
      const res = await request(app)
        .post(`/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ body: 'Attempting to inject into foreign ticket' });

      expect(res.status).toBe(404);
    });

    it('should BLOCK user from posting message when ticket is closed', async () => {
      // Progress to closed: open -> in_review -> in_progress -> resolved -> closed
      await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_review' });

      await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'in_progress' });

      await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'resolved' });

      await request(app)
        .patch(`/tickets/${ticketId}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ status: 'closed' });

      // User tries to send message
      const res = await request(app)
        .post(`/tickets/${ticketId}/messages`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ body: 'Can I still message?' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('closed ticket');
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
