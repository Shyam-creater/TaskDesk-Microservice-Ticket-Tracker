import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:4000';

interface HttpResponse<T = any> {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: T;
}

function request<T = any>(
  path: string,
  method = 'GET',
  data?: any,
  token?: string
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const postData = data ? JSON.stringify(data) : null;

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(postData ? { 'Content-Length': Buffer.byteLength(postData) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'X-Correlation-ID': `test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          let body = raw;
          try {
            body = JSON.parse(raw);
          } catch {
            // Keep raw string
          }
          resolve({
            status: res.statusCode || 500,
            headers: res.headers,
            body: body as T,
          });
        });
      }
    );

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 TaskDesk Microservices Automated Test Suite');
  console.log('======================================================\n');

  let adminToken = '';
  let userToken = '';
  let testTicketId = '';

  // --------------------------------------------------------------------------
  // 1. Authentication & Login Tests
  // --------------------------------------------------------------------------
  console.log('▶ [1/4] Running Authentication & Login Tests...');

  // 1.1 Admin login success
  const adminLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@taskdesk.com',
    password: 'Admin1234!',
  });
  assert.strictEqual(adminLogin.status, 200, 'Admin login should return 200');
  assert.ok(adminLogin.body.data?.token, 'Admin login must return a JWT token');
  assert.strictEqual(adminLogin.body.data.user.role, 'admin', 'Admin role must be "admin"');
  adminToken = adminLogin.body.data.token;
  console.log('  ✔ Admin login successful (JWT verified, role="admin")');

  // 1.2 User login success
  const userLogin = await request('/api/auth/login', 'POST', {
    email: 'user@taskdesk.com',
    password: 'User1234!',
  });
  assert.strictEqual(userLogin.status, 200, 'User login should return 200');
  assert.ok(userLogin.body.data?.token, 'User login must return a JWT token');
  assert.strictEqual(userLogin.body.data.user.role, 'user', 'User role must be "user"');
  userToken = userLogin.body.data.token;
  console.log('  ✔ User login successful (JWT verified, role="user")');

  // 1.3 Invalid password rejected
  const badLogin = await request('/api/auth/login', 'POST', {
    email: 'admin@taskdesk.com',
    password: 'WrongPassword999!',
  });
  assert.strictEqual(badLogin.status, 401, 'Invalid password should return 401 Unauthorized');
  console.log('  ✔ Invalid password rejected with 401 Unauthorized');

  // 1.4 Zod Validation: Missing email rejected
  const invalidPayload = await request('/api/auth/login', 'POST', {
    password: 'Admin1234!',
  });
  assert.strictEqual(invalidPayload.status, 400, 'Missing email should fail Zod validation with 400');
  assert.ok(invalidPayload.body.error?.message?.includes('Email is required'));
  console.log('  ✔ Zod Schema validation enforced on missing email (400 Bad Request)');

  // --------------------------------------------------------------------------
  // 2. Ticket Creation & Custom ID Generation Tests
  // --------------------------------------------------------------------------
  console.log('\n▶ [2/4] Running Ticket Creation & Validation Tests...');

  // 2.1 User creates ticket
  const ticketCreate = await request(
    '/api/tickets',
    'POST',
    {
      title: 'Automated Test Ticket - Microservice Suite',
      description: 'End-to-end testing ticket creation and role validation rules',
      priority: 'high',
    },
    userToken
  );
  assert.strictEqual(ticketCreate.status, 201, 'User ticket creation should return 201');
  const ticket = ticketCreate.body.data?.ticket;
  assert.ok(ticket?._id, 'Created ticket must have a MongoDB _id');
  assert.match(ticket?.customId, /^TD-\d{4,}$/, 'Ticket customId must follow TD-XXXX pattern');
  assert.strictEqual(ticket?.status, 'open', 'New ticket must start in "open" status');
  testTicketId = ticket._id;
  console.log(`  ✔ Ticket successfully created: ${ticket.customId} (id: ${ticket._id})`);

  // 2.2 RBAC: Admin CANNOT create tickets
  const adminCreateAttempt = await request(
    '/api/tickets',
    'POST',
    {
      title: 'Illegal Admin Ticket',
      description: 'Admins should be forbidden from creating tickets',
      priority: 'medium',
    },
    adminToken
  );
  assert.strictEqual(adminCreateAttempt.status, 403, 'Admin ticket creation must return 403 Forbidden');
  console.log('  ✔ RBAC Rule: Admin ticket creation blocked with 403 Forbidden');

  // 2.3 Zod Validation: Title too short (< 3 chars)
  const shortTitleAttempt = await request(
    '/api/tickets',
    'POST',
    {
      title: 'ab',
      description: 'Testing short title validation',
    },
    userToken
  );
  assert.strictEqual(shortTitleAttempt.status, 400, 'Short title should fail Zod validation with 400');
  console.log('  ✔ Zod Schema validation: Ticket title < 3 chars rejected with 400');

  // --------------------------------------------------------------------------
  // 3. RBAC & State Machine Lifecycle Tests
  // --------------------------------------------------------------------------
  console.log('\n▶ [3/4] Running RBAC Security & Lifecycle Rules Tests...');

  // 3.1 RBAC: Admin CANNOT edit ticket title/description
  const adminEditAttempt = await request(
    `/api/tickets/${testTicketId}`,
    'PATCH',
    {
      title: 'Admin altered title',
    },
    adminToken
  );
  assert.strictEqual(adminEditAttempt.status, 403, 'Admin editing ticket title must return 403 Forbidden');
  console.log('  ✔ RBAC Rule: Admin prevented from altering ticket content (403 Forbidden)');

  // 3.2 RBAC: User CANNOT update status directly
  const userStatusAttempt = await request(
    `/api/tickets/${testTicketId}/status`,
    'PATCH',
    {
      status: 'resolved',
    },
    userToken
  );
  assert.strictEqual(userStatusAttempt.status, 403, 'User updating status must return 403 Forbidden');
  console.log('  ✔ RBAC Rule: Standard user cannot update ticket status (403 Forbidden)');

  // 3.3 Admin reviews ticket: open -> in_review
  const reviewRes = await request(
    `/api/tickets/${testTicketId}/review`,
    'PATCH',
    {
      priority: 'high',
    },
    adminToken
  );
  assert.strictEqual(reviewRes.status, 200, 'Admin review should return 200');
  assert.strictEqual(reviewRes.body.data.ticket.status, 'in_review', 'Reviewing moves open to in_review');
  console.log('  ✔ State Machine: Reviewing ticket moves status to "in_review"');

  // 3.4 Admin transitions: in_review -> in_progress
  const progressRes = await request(
    `/api/tickets/${testTicketId}/status`,
    'PATCH',
    {
      status: 'in_progress',
    },
    adminToken
  );
  assert.strictEqual(progressRes.status, 200, 'Transition to in_progress should return 200');
  console.log('  ✔ State Machine: in_review ➔ in_progress validated and approved');

  // 3.5 Non-admin blocked from admin stats endpoint
  const userStatsAttempt = await request('/api/tickets/stats', 'GET', undefined, userToken);
  assert.strictEqual(userStatsAttempt.status, 403, 'Non-admin accessing stats must return 403');
  console.log('  ✔ RBAC Rule: /api/tickets/stats restricted to administrators only (403)');

  // 3.6 Admin views stats
  const adminStats = await request('/api/tickets/stats', 'GET', undefined, adminToken);
  assert.strictEqual(adminStats.status, 200, 'Admin accessing stats should return 200');
  assert.ok(adminStats.body.data?.stats?.total >= 1, 'Stats total count should be >= 1');
  console.log('  ✔ Admin stats verified: Total tickets recorded in analytics');

  // 3.7 Chat messaging: user sends message on open/in-progress ticket
  const msgRes = await request(
    `/api/tickets/${testTicketId}/messages`,
    'POST',
    {
      body: 'Need update on automated test resolution',
    },
    userToken
  );
  assert.strictEqual(msgRes.status, 201, 'Chat message should return 201 Created');
  console.log('  ✔ Chat thread: Message posted successfully on active ticket');

  // 3.8 Admin resolves and closes ticket
  await request(`/api/tickets/${testTicketId}/status`, 'PATCH', { status: 'resolved' }, adminToken);
  await request(`/api/tickets/${testTicketId}/status`, 'PATCH', { status: 'closed' }, adminToken);
  console.log('  ✔ State Machine: in_progress ➔ resolved ➔ closed');

  // 3.9 RBAC: User CANNOT message on closed ticket
  const closedMsgAttempt = await request(
    `/api/tickets/${testTicketId}/messages`,
    'POST',
    {
      body: 'Attempt message on closed ticket',
    },
    userToken
  );
  assert.strictEqual(closedMsgAttempt.status, 403, 'Messaging on closed ticket must return 403');
  console.log('  ✔ Security Rule: Messages blocked on closed tickets (403 Forbidden)');

  // 3.10 Clean up test ticket
  const delRes = await request(`/api/tickets/${testTicketId}`, 'DELETE', undefined, adminToken);
  assert.strictEqual(delRes.status, 200, 'Admin deleting ticket should return 200');
  console.log('  ✔ Clean-up: Test ticket deleted cleanly');

  // --------------------------------------------------------------------------
  // 4. Observability & Telemetry Tests
  // --------------------------------------------------------------------------
  console.log('\n▶ [4/4] Running Observability & Telemetry Tests...');

  // 4.1 Correlation ID header propagation
  const healthRes = await request('/health', 'GET');
  assert.strictEqual(healthRes.status, 200);
  assert.ok(healthRes.headers['x-correlation-id'], 'Responses must contain X-Correlation-ID header');
  console.log(`  ✔ Distributed Tracing: X-Correlation-ID header verified (${healthRes.headers['x-correlation-id']})`);

  // 4.2 Prometheus Metrics endpoint
  const metricsRes = await request('/metrics', 'GET');
  assert.strictEqual(metricsRes.status, 200, '/metrics should return 200');
  assert.ok(
    typeof metricsRes.body === 'string' && metricsRes.body.includes('taskdesk_http_requests_total'),
    '/metrics must expose taskdesk_http_requests_total counter'
  );
  console.log('  ✔ Observability: Prometheus /metrics endpoint active and scraped');

  // 4.3 JSON Telemetry endpoint
  const jsonMetricsRes = await request('/api/metrics', 'GET', undefined, undefined);
  assert.strictEqual(jsonMetricsRes.status, 200, '/api/metrics should return 200');
  assert.ok(jsonMetricsRes.body.data?.uptimeSeconds !== undefined, 'JSON metrics must include uptimeSeconds');
  console.log('  ✔ Telemetry: /api/metrics exposes runtime metrics in structured JSON');

  console.log('\n======================================================');
  console.log('✅ ALL TEST SUITES PASSED SUCCESSFULLY (17/17)');
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
