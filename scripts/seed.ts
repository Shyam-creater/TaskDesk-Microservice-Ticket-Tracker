import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const AUTH_MONGO_URI =
  process.env.AUTH_MONGO_URI ||
  (process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/auth_db$1')
    : 'mongodb://localhost:27017/auth_db');

const TICKET_MONGO_URI =
  process.env.TICKET_MONGO_URI ||
  (process.env.MONGODB_URI
    ? process.env.MONGODB_URI.replace(/\/[^/?]+(\?|$)/, '/ticket_db$1')
    : 'mongodb://localhost:27017/ticket_db');

// Minimal User Schema for seeding
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
  },
  { timestamps: true }
);

// Minimal Ticket Schema for seeding
const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['open', 'in_progress', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

async function seed() {
  console.log('🌱 Starting TaskDesk database seeding...');

  // 1. Connect to Auth DB
  console.log(`Connecting to Auth DB at: ${AUTH_MONGO_URI}`);
  const authConn = await mongoose.createConnection(AUTH_MONGO_URI).asPromise();
  const UserModel = authConn.model('User', userSchema);

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

  // Upsert Demo User
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
  console.log(`✅ Demo user verified: user@taskdesk.com (ID: ${demoUser._id})`);

  // 2. Connect to Ticket DB
  console.log(`Connecting to Ticket DB at: ${TICKET_MONGO_URI}`);
  const ticketConn = await mongoose.createConnection(TICKET_MONGO_URI).asPromise();
  const TicketModel = ticketConn.model('Ticket', ticketSchema);

  // Seed sample tickets for Demo User
  const sampleTickets = [
    {
      title: 'High latency observed on read replica pool',
      description: 'P99 response times spiked to 850ms during peak load on the secondary replica.',
      priority: 'high',
      status: 'in_progress',
      createdBy: demoUser._id.toString(),
    },
    {
      title: 'Update API Gateway CORS origins for staging',
      description: 'Allow new test subdomain staging.taskdesk.internal to access API routes.',
      priority: 'medium',
      status: 'open',
      createdBy: demoUser._id.toString(),
    },
    {
      title: 'Audit log exporter timestamp drift fixed',
      description: 'Resolved NTP sync drift on the OpenTelemetry collector container.',
      priority: 'low',
      status: 'closed',
      createdBy: demoUser._id.toString(),
    },
    {
      title: 'Configure Prometheus alerting rules for 5xx spikes',
      description: 'Establish alert manager rule to notify channel if 5xx rate exceeds 1% over 5m.',
      priority: 'high',
      status: 'open',
      createdBy: admin._id.toString(),
    },
  ];

  for (const t of sampleTickets) {
    const existing = await TicketModel.findOne({ title: t.title });
    if (!existing) {
      await TicketModel.create(t);
      console.log(`✅ Created ticket: "${t.title}"`);
    } else {
      console.log(`ℹ️  Ticket already exists: "${t.title}"`);
    }
  }

  await authConn.close();
  await ticketConn.close();

  console.log('\n🎉 Seeding completed successfully!');
  console.log('--------------------------------------------------');
  console.log('Admin Account: admin@taskdesk.com / Admin1234!');
  console.log('User Account:  user@taskdesk.com  / User1234!');
  console.log('--------------------------------------------------\n');
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
