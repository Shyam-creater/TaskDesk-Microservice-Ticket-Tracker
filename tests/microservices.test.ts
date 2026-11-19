import assert from 'node:assert';
import http from 'node:http';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const TICKET_SERVICE_URL = process.env.TICKET_SERVICE_URL || 'http://localhost:4002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4003';

interface HttpResponse<T = any> {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: T;
}

function request<T = any>(
  baseUrl: string,
  path: string,
  method = 'GET',
  data?: any,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<HttpResponse<T>> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const postData = data !== undefined ? JSON.stringify(data) : null;

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
          ...extraHeaders,
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
  console.log('🧪 TaskDesk Microservices Architecture Test Suite');
  console.log('======================================================\n');

  let adminToken = '';
  let userToken = '';
  let testTicketId = '';
  let passedCount = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      passedCount += 1;
      console.log(`  ✔ [${passedCount.toString().padStart(2, '0')}] ${name}`);
    } catch (err: any) {
      console.error(`  ❌ FAILED: ${name}`);
      console.error(err);
      process.exit(1);
    }
  };

  // --------------------------------------------------------------------------
  // Phase 1: Authentication, Tokens & Zod Validation (through Gateway)
  // --------------------------------------------------------------------------
  console.log('▶ [Phase 1/5] Authentication & Identity Management...');

  await test('Admin login returns 200, JWT token and admin role', async () => {
    const res = await request(GATEWAY_URL, '/api/auth/login', 'POST', {
      email: 'admin@taskdesk.com',
      password: 'Admin1234!',
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data?.token);
    assert.strictEqual(res.body.data.user.role, 'admin');
    adminToken = res.body.data.token;
  });

  await test('User login returns 200, JWT token and user role', async () => {
    const res = await request(GATEWAY_URL, '/api/auth/login', 'POST', {
      email: 'user@taskdesk.com',
      password: 'User1234!',
    });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data?.token);
    assert.strictEqual(res.body.data.user.role, 'user');
    userToken = res.body.data.token;
  });

  await test('Invalid password rejected with 401 Unauthorized', async () => {
    const res = await request(GATEWAY_URL, '/api/auth/login', 'POST', {
      email: 'admin@taskdesk.com',
      password: 'WrongPassword999!',
    });
    assert.strictEqual(res.status, 401);
  });

  await test('Zod Schema validation rejects missing email with 400 Bad Request', async () => {
    const res = await request(GATEWAY_URL, '/api/auth/login', 'POST', {
      password: 'Admin1234!',
    });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error?.message?.includes('Email is required'));
  });

  // --------------------------------------------------------------------------
  // Phase 2: Ticket Creation & Custom Sequence Counter (TD-XXXX)
  // --------------------------------------------------------------------------
  console.log('\n▶ [Phase 2/5] Ticket Creation & Atomic Counter...');

  await test('Standard user creates support ticket with TD-XXXX sequential ID', async () => {
    const res = await request(
      GATEWAY_URL,
      '/api/tickets',
      'POST',
      {
        title: 'Microservices Integration Ticket',
        description: 'Verifying inter-service communication and distributed tracing',
        priority: 'high',
      },
      userToken
    );
    assert.strictEqual(res.status, 201);
    const ticket = res.body.data?.ticket;
    assert.ok(ticket?._id);
    assert.match(ticket?.customId, /^TD-\d{4,}$/);
    assert.strictEqual(ticket?.status, 'open');
    testTicketId = ticket._id;
  });

  await test('RBAC Rule: Admin ticket creation blocked with 403 Forbidden', async () => {
    const res = await request(
      GATEWAY_URL,
      '/api/tickets',
      'POST',
      {
        title: 'Illegal Admin Ticket',
        description: 'Admins cannot create tickets',
      },
      adminToken
    );
    assert.strictEqual(res.status, 403);
  });

  await test('Zod Schema validation: Ticket title < 3 chars rejected with 400', async () => {
    const res = await request(
      GATEWAY_URL,
      '/api/tickets',
      'POST',
      {
        title: 'ab',
      },
      userToken
    );
    assert.strictEqual(res.status, 400);
  });

  // --------------------------------------------------------------------------
  // Phase 3: RBAC Enforcement & Lifecycle State Machine
  // --------------------------------------------------------------------------
  console.log('\n▶ [Phase 3/5] RBAC Security & Ticket Lifecycle...');

  await test('RBAC Rule: Admin prevented from editing ticket title/description (403)', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}`,
      'PATCH',
      { title: 'Admin Tampered Title' },
      adminToken
    );
    assert.strictEqual(res.status, 403);
  });

  await test('RBAC Rule: Standard user cannot update ticket status directly (403)', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/status`,
      'PATCH',
      { status: 'resolved' },
      userToken
    );
    assert.strictEqual(res.status, 403);
  });

  await test('Admin review transitions ticket status from open to in_review (200)', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/review`,
      'PATCH',
      { priority: 'high' },
      adminToken
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.ticket.status, 'in_review');
  });

  await test('Admin transitions ticket status: in_review ➔ in_progress (200)', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/status`,
      'PATCH',
      { status: 'in_progress' },
      adminToken
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.ticket.status, 'in_progress');
  });

  await test('RBAC Rule: Non-admin accessing stats endpoint blocked with 403', async () => {
    const res = await request(GATEWAY_URL, '/api/tickets/stats', 'GET', undefined, userToken);
    assert.strictEqual(res.status, 403);
  });

  await test('Admin accesses analytics stats breakdown successfully (200)', async () => {
    const res = await request(GATEWAY_URL, '/api/tickets/stats', 'GET', undefined, adminToken);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data?.stats?.total >= 1);
  });

  await test('Chat thread: User sends message on active ticket (201)', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/messages`,
      'POST',
      { body: 'Testing chat thread communication' },
      userToken
    );
    assert.strictEqual(res.status, 201);
  });

  await test('Lifecycle close: Admin transitions in_progress ➔ resolved ➔ closed', async () => {
    await request(GATEWAY_URL, `/api/tickets/${testTicketId}/status`, 'PATCH', { status: 'resolved' }, adminToken);
    const closeRes = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/status`,
      'PATCH',
      { status: 'closed' },
      adminToken
    );
    assert.strictEqual(closeRes.status, 200);
  });

  await test('Security Rule: User messaging on closed ticket blocked with 403', async () => {
    const res = await request(
      GATEWAY_URL,
      `/api/tickets/${testTicketId}/messages`,
      'POST',
      { body: 'Message on closed ticket' },
      userToken
    );
    assert.strictEqual(res.status, 403);
  });

  await test('Clean-up: Admin deletes test ticket (200)', async () => {
    const res = await request(GATEWAY_URL, `/api/tickets/${testTicketId}`, 'DELETE', undefined, adminToken);
    assert.strictEqual(res.status, 200);
  });

  // --------------------------------------------------------------------------
  // Phase 4: Request Tracing & Observability
  // --------------------------------------------------------------------------
  console.log('\n▶ [Phase 4/5] Distributed Tracing & Telemetry...');

  await test('Gateway returns the exact same X-Correlation-ID header supplied by caller', async () => {
    const testCorrelationId = `trace-test-${Date.now()}-abc`;
    const res = await request(
      GATEWAY_URL,
      '/health',
      'GET',
      undefined,
      undefined,
      { 'X-Correlation-ID': testCorrelationId }
    );
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['x-correlation-id'], testCorrelationId);
  });

  await test('Prometheus /metrics endpoint exposes scrape metrics on Gateway', async () => {
    const res = await request(GATEWAY_URL, '/metrics', 'GET');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body === 'string' && res.body.includes('gateway_http_requests_total'));
  });

  await test('JSON /api/metrics endpoint returns structured telemetry on Gateway', async () => {
    const res = await request(GATEWAY_URL, '/api/metrics', 'GET');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data?.uptimeSeconds !== undefined);
  });

  // --------------------------------------------------------------------------
  // Phase 5: Microservice Isolation, Defense in Depth & Error Handling
  // --------------------------------------------------------------------------
  console.log('\n▶ [Phase 5/5] Microservice Isolation & Defense in Depth...');

  await test('Defense in Depth: Direct call to ticket-service (4002) without JWT returns 401', async () => {
    const res = await request(TICKET_SERVICE_URL, '/api/tickets', 'GET');
    assert.strictEqual(res.status, 401);
  });

  await test('Internal Auth: Call to /internal/users on auth-service without internal key returns 401/403', async () => {
    const res = await request(AUTH_SERVICE_URL, '/internal/users', 'GET');
    assert.ok(res.status === 401 || res.status === 403);
  });

  await test('Internal Auth: Call to /internal/notifications on notification-service without key returns 401/403', async () => {
    const res = await request(NOTIFICATION_SERVICE_URL, '/internal/notifications', 'POST', {
      title: 'Hacked',
    });
    assert.ok(res.status === 401 || res.status === 403);
  });

  await test('Spoofing Protection: Client-supplied X-User-Role: admin header is stripped and does not grant admin access', async () => {
    const res = await request(
      GATEWAY_URL,
      '/api/tickets/stats',
      'GET',
      undefined,
      userToken, // Valid user JWT
      { 'X-User-Role': 'admin' } // Spoofed header
    );
    assert.strictEqual(res.status, 403);
  });

  await test('Gateway Resilience: When a downstream service is unreachable, returns 503 with correlationId', async () => {
    const res = await request(GATEWAY_URL, '/api/offline-test', 'GET');
    assert.strictEqual(res.status, 503);
    assert.strictEqual(res.body.error?.code, 'SERVICE_UNAVAILABLE');
    assert.ok(res.body.correlationId);
  });

  console.log('\n======================================================');
  console.log(`✅ ALL TEST SUITES PASSED SUCCESSFULLY (${passedCount}/${passedCount})`);
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
