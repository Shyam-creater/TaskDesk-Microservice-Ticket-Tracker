import bcrypt from 'bcryptjs';
import { User } from './models/user.model.js';
import { Ticket } from './models/ticket.model.js';
import { Counter } from './models/counter.model.js';

export async function seedDatabase(): Promise<void> {
  console.log('🌱 Checking TaskDesk database seeds in TASKDESK database...');

  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('Admin1234!', saltRounds);
  const userPasswordHash = await bcrypt.hash('User1234!', saltRounds);

  // 1. Upsert Admin User
  const admin = await User.findOneAndUpdate(
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
  console.log(`✅ Admin verified: admin@taskdesk.com (${admin._id})`);

  // 2. Upsert Demo User (Shyam)
  const demoUser = await User.findOneAndUpdate(
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
  console.log(`✅ User verified: user@taskdesk.com - Shyam (${demoUser._id})`);

  // 3. Seed Sample Tickets if none exist
  const existingTicketsCount = await Ticket.countDocuments();
  if (existingTicketsCount === 0) {
    console.log('📝 Seeding initial tickets...');
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

    await Ticket.insertMany(sampleTickets);
    console.log(`✅ Seeded ${sampleTickets.length} initial tickets with custom IDs.`);
  }

  // 4. Upsert Counter sequence
  await Counter.findByIdAndUpdate(
    'ticket_seq',
    { $set: { seq: 1005 } },
    { upsert: true }
  );
  console.log('✅ Ticket counter initialized to 1005.');
}
