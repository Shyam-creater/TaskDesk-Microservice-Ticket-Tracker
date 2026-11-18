import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  'mongodb+srv://TASKDESK:SMAA5VZfA7rzR9qA@cluster0.rfz95.mongodb.net/TASKDESK?retryWrites=true&w=majority';

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true, collection: 'users' }
);

// Ticket Schema
const ticketSchema = new mongoose.Schema(
  {
    customId: { type: String, unique: true, sparse: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_review', 'in_progress', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdBy: { type: String, required: true },
    createdByName: { type: String, default: 'Shyam' },
    createdByEmail: { type: String, default: 'user@taskdesk.com' },
  },
  { timestamps: true, collection: 'tickets' }
);

// Counter Schema
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, default: 1000 },
  },
  { collection: 'counters' }
);

async function seed() {
  console.log('🌱 Starting TaskDesk database seeding...');
  console.log(`Connecting to MongoDB at: ${MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);

  const conn = await mongoose.connect(MONGODB_URI);
  console.log(`✅ Connected to database: "${conn.connection.name}"`);

  const UserModel = conn.model('User', userSchema);
  const TicketModel = conn.model('Ticket', ticketSchema);
  const CounterModel = conn.model('Counter', counterSchema);

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin1234!', saltRounds);
  const userPasswordHash = await bcrypt.hash('User1234!', saltRounds);

  // Upsert Admin
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
  console.log(`✅ Admin user verified: admin@taskdesk.com (ID: ${admin._id})`);

  // Upsert Demo User (Shyam)
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
  console.log(`✅ Demo user verified: user@taskdesk.com - Shyam (ID: ${demoUser._id})`);

  // Seed sample tickets
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

  for (const t of sampleTickets) {
    const existing = await TicketModel.findOne({ customId: t.customId });
    if (!existing) {
      await TicketModel.create(t);
      console.log(`✅ Created ticket: [${t.customId}] "${t.title}"`);
    } else {
      console.log(`ℹ️  Ticket already exists: [${t.customId}] "${t.title}"`);
    }
  }

  await CounterModel.findByIdAndUpdate(
    'ticket_seq',
    { $set: { seq: 1005 } },
    { upsert: true }
  );

  await mongoose.disconnect();

  console.log('\n🎉 Seeding completed successfully in TASKDESK database!');
  console.log('--------------------------------------------------');
  console.log('Admin Account: admin@taskdesk.com / Admin1234!');
  console.log('User Account:  user@taskdesk.com  / User1234!');
  console.log('--------------------------------------------------\n');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
