import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('❌ MONGODB_URI is required to seed databases.');
  process.exit(1);
}

async function runSeed() {
  console.log('🌱 Starting TaskDesk Microservices Database Seed...');

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin1234!', saltRounds);
  const userPasswordHash = await bcrypt.hash('User1234!', saltRounds);

  // --------------------------------------------------------------------------
  // 1. Seed taskdesk_auth
  // --------------------------------------------------------------------------
  console.log('\n▶ [1/2] Seeding Auth Database (taskdesk_auth)...');
  const authConn = await mongoose.createConnection(uri, { dbName: 'taskdesk_auth' }).asPromise();
  const UserSchema = new mongoose.Schema(
    {
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ['user', 'admin'], default: 'user' },
    },
    { timestamps: true, collection: 'users' }
  );
  const UserModel = authConn.model('User', UserSchema);

  const admin = await UserModel.findOneAndUpdate(
    { email: 'admin@taskdesk.com' },
    {
      $set: {
        name: 'System Administrator',
        email: 'admin@taskdesk.com',
        passwordHash: adminPasswordHash,
        role: 'admin',
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ✔ Admin verified: admin@taskdesk.com (ID: ${admin._id})`);

  const demoUser = await UserModel.findOneAndUpdate(
    { email: 'user@taskdesk.com' },
    {
      $set: {
        name: 'Shyam',
        email: 'user@taskdesk.com',
        passwordHash: userPasswordHash,
        role: 'user',
      },
    },
    { upsert: true, new: true }
  );
  console.log(`  ✔ User verified: user@taskdesk.com - Shyam (ID: ${demoUser._id})`);

  // --------------------------------------------------------------------------
  // 2. Seed taskdesk_tickets
  // --------------------------------------------------------------------------
  console.log('\n▶ [2/2] Seeding Ticket Database (taskdesk_tickets)...');
  const ticketConn = await mongoose.createConnection(uri, { dbName: 'taskdesk_tickets' }).asPromise();

  const CounterSchema = new mongoose.Schema(
    {
      _id: { type: String, required: true },
      seq: { type: Number, default: 1000 },
    },
    { collection: 'counters' }
  );
  const CounterModel = ticketConn.model('Counter', CounterSchema);

  const counter = await CounterModel.findByIdAndUpdate(
    'ticketId',
    { $max: { seq: 1005 } },
    { upsert: true, new: true }
  );
  console.log(`  ✔ Ticket counter sequence initialized to: ${counter.seq}`);

  const TicketSchema = new mongoose.Schema(
    {
      customId: { type: String, unique: true, sparse: true },
      title: { type: String, required: true },
      description: { type: String, default: '' },
      status: { type: String, default: 'open' },
      priority: { type: String, default: 'medium' },
      createdBy: { type: String, required: true },
      createdByName: { type: String },
      createdByEmail: { type: String },
      statusHistory: { type: Array, default: [] },
    },
    { timestamps: true, collection: 'tickets' }
  );
  const TicketModel = ticketConn.model('Ticket', TicketSchema);

  const existingTickets = await TicketModel.countDocuments();
  if (existingTickets === 0) {
    const sampleTickets = [
      {
        customId: 'TD-1001',
        title: 'High latency observed on read replica pool',
        description: 'P99 response times spiked to 850ms during peak load on the secondary replica.',
        priority: 'high',
        status: 'in_progress',
        createdBy: demoUser._id.toString(),
        createdByName: 'Shyam',
        createdByEmail: 'user@taskdesk.com',
      },
      {
        customId: 'TD-1002',
        title: 'Update API Gateway CORS origins for staging',
        description: 'Allow new test subdomain staging.taskdesk.internal to access API routes.',
        priority: 'medium',
        status: 'open',
        createdBy: demoUser._id.toString(),
        createdByName: 'Shyam',
        createdByEmail: 'user@taskdesk.com',
      },
      {
        customId: 'TD-1003',
        title: 'Audit log exporter timestamp drift fixed',
        description: 'Resolved NTP sync drift on the OpenTelemetry collector container.',
        priority: 'low',
        status: 'closed',
        createdBy: demoUser._id.toString(),
        createdByName: 'Shyam',
        createdByEmail: 'user@taskdesk.com',
      },
      {
        customId: 'TD-1004',
        title: 'E2E Atlas RBAC Latency Test Ticket',
        description: 'Testing live Atlas MongoDB integration with strict RBAC rules',
        priority: 'high',
        status: 'resolved',
        createdBy: demoUser._id.toString(),
        createdByName: 'Shyam',
        createdByEmail: 'user@taskdesk.com',
      },
      {
        customId: 'TD-1005',
        title: 'Configure Prometheus alerting rules for 5xx spikes',
        description: 'Establish alert manager rule to notify channel if 5xx rate exceeds 1% over 5m.',
        priority: 'high',
        status: 'open',
        createdBy: demoUser._id.toString(),
        createdByName: 'Shyam',
        createdByEmail: 'user@taskdesk.com',
      },
    ];

    await TicketModel.insertMany(sampleTickets);
    console.log(`  ✔ Seeded ${sampleTickets.length} initial tickets into taskdesk_tickets`);
  } else {
    console.log(`  ✔ Tickets already present (${existingTickets} tickets found).`);
  }

  await authConn.close();
  await ticketConn.close();

  console.log('\n======================================================');
  console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY');
  console.log('======================================================\n');
}

runSeed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
