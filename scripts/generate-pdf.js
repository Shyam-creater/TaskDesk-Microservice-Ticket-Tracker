const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TaskDesk - Microservice Support Ticket Tracker Documentation</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1d1d1f;
      background-color: #ffffff;
      line-height: 1.55;
      font-size: 10.5pt;
      margin: 0;
      padding: 0;
    }
    
    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 20px;
    }
    
    .cover-badge {
      display: inline-block;
      align-self: flex-start;
      background: #0071e3;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 5px 14px;
      border-radius: 20px;
      margin-bottom: 24px;
    }
    
    .cover-title {
      font-size: 32pt;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #111827;
      margin: 0 0 12px 0;
      line-height: 1.15;
    }
    
    .cover-subtitle {
      font-size: 14pt;
      color: #4b5563;
      margin: 0 0 32px 0;
      line-height: 1.4;
      font-weight: 400;
    }
    
    .cover-divider {
      width: 80px;
      height: 4px;
      background: #0071e3;
      border-radius: 2px;
      margin-bottom: 32px;
    }
    
    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 20px;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px 24px;
    }
    
    .cover-meta-item strong {
      display: block;
      color: #6b7280;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    
    .cover-meta-item span {
      font-size: 11pt;
      font-weight: 600;
      color: #111827;
    }
    
    /* Document Headers */
    h1, h2, h3, h4 {
      color: #111827;
      font-weight: 700;
      letter-spacing: -0.2px;
    }
    
    h1 {
      font-size: 18pt;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
      margin-top: 36px;
      margin-bottom: 16px;
      page-break-before: auto;
    }
    
    .page-break {
      page-break-before: always;
    }
    
    h2 {
      font-size: 13.5pt;
      margin-top: 24px;
      margin-bottom: 10px;
      color: #1f2937;
    }
    
    h3 {
      font-size: 11.5pt;
      margin-top: 18px;
      margin-bottom: 8px;
      color: #374151;
    }
    
    p {
      margin-top: 0;
      margin-bottom: 12px;
      color: #374151;
    }
    
    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0 20px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }
    
    th, td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
      text-align: left;
      vertical-align: top;
    }
    
    th {
      background: #f3f4f6;
      font-weight: 700;
      color: #111827;
    }
    
    tr:nth-child(even) td {
      background: #f9fafb;
    }
    
    /* Code and Blocks */
    pre {
      background: #1e1e24;
      color: #f3f4f6;
      padding: 12px 14px;
      border-radius: 8px;
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      overflow-x: auto;
      margin: 12px 0 18px 0;
      page-break-inside: avoid;
    }
    
    code {
      font-family: "SF Mono", Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 8.8pt;
      background: #f3f4f6;
      color: #b91c1c;
      padding: 2px 5px;
      border-radius: 4px;
    }
    
    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 12px;
      font-size: 8pt;
      font-weight: 600;
    }
    
    .badge-gateway { background: #fdf2f8; color: #be185d; border: 1px solid #fbcfe8; }
    .badge-auth { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
    .badge-ticket { background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; }
    .badge-notif { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
    .badge-frontend { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
    .badge-success { background: #dcfce7; color: #166534; font-weight: 700; }
    
    /* Cards and Callouts */
    .callout {
      border-left: 4px solid #0071e3;
      background: #f0f7ff;
      padding: 12px 16px;
      border-radius: 0 8px 8px 0;
      margin: 14px 0 18px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    
    .callout-title {
      font-weight: 700;
      color: #0071e3;
      margin-bottom: 4px;
    }
    
    .diagram-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 14px;
      margin: 14px 0;
      font-family: "SF Mono", Consolas, monospace;
      font-size: 8pt;
      line-height: 1.35;
      color: #0f172a;
      white-space: pre;
      page-break-inside: avoid;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 12px;
      padding-left: 22px;
    }

    li {
      margin-bottom: 4px;
    }
    
    .header-tag {
      font-size: 8pt;
      color: #6b7280;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 4px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>

  <!-- Cover Page -->
  <div class="cover-page">
    <div class="cover-badge">Architecture & System Specification</div>
    <div class="cover-title">TaskDesk</div>
    <div class="cover-subtitle">Distributed Microservice Support Ticket Tracking Platform<br>Full-Stack Architectural Design, Observability & Security Blueprint</div>
    <div class="cover-divider"></div>
    
    <p style="font-size: 11pt; color: #374151; max-width: 90%;">
      A complete production-ready microservices solution featuring an edge API Gateway, discrete Auth, Ticket, and Notification microservices, multi-database namespace isolation on MongoDB Atlas, distributed request tracing, structured JSON telemetry, and an Apple Human Interface styled React 18 client.
    </p>

    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Application Edition</strong>
        <span>Distributed Microservices v2.0.0</span>
      </div>
      <div class="cover-meta-item">
        <strong>GitHub Repository</strong>
        <span>Shyam-creater / TaskDesk-Microservice-Ticket-Tracker</span>
      </div>
      <div class="cover-meta-item">
        <strong>Test Verification</strong>
        <span>25 / 25 Passing (Automated Integration Suite)</span>
      </div>
      <div class="cover-meta-item">
        <strong>Primary Stack</strong>
        <span>TypeScript, Node.js, Express, React 18, Vite, MongoDB</span>
      </div>
    </div>
  </div>

  <!-- Document Content -->
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Microservices Architecture Blueprint</span>
  </div>

  <h1>1. Executive Summary & Microservices Topology</h1>
  <p>
    TaskDesk is engineered as an enterprise-grade distributed microservices system designed for high availability, fault tolerance, role-based access control, and complete data decoupling. All incoming client traffic enters through a secure API Gateway, which handles edge security, rate limiting, and request routing across three independent microservices.
  </p>

  <div class="diagram-box">
+-----------------------------------------------------------------------------------+
|                           REACT 18 CLIENT (Port 5173)                             |
|          Apple Human Interface Design | Grid & Table Views | Real-Time Chat       |
+-----------------------------------------------------------------------------------+
                                          |
                                          | [HTTP REST + Bearer JWT]
                                          v
+-----------------------------------------------------------------------------------+
|                             API GATEWAY (Port 4000)                               |
|   Reverse Proxy (http-proxy-middleware) | Helmet Security | Strict CORS (5173)    |
|   X-Correlation-ID Header Injection | Strip Client Identity Spoofing              |
|   Edge Rate Limiter (1000 req/15m) | Prometheus /metrics & JSON /api/metrics      |
+-----------------------------------------------------------------------------------+
          |                               |                               |
          | Proxy /api/auth               | Proxy /api/tickets            | Proxy /api/notifications
          v                               v                               v
+-----------------------+     +-----------------------+     +-----------------------+
|  AUTH MICROSERVICE    |     |  TICKET MICROSERVICE  |     |  NOTIFICATION SERVICE |
|      (Port 4001)      |     |      (Port 4002)      |     |      (Port 4003)      |
|  Register, Login, Me  |     |  Ticket CRUD, Review  |     |  User Notifications   |
|  bcrypt & JWT Tokens  |     |  TD-XXXX Auto-Counter |     |  Dynamic Badge Counts |
|  GET /internal/users  |     |  Threaded Support Chat|     |  POST /internal/notifs|
+-----------------------+     +-----------------------+     +-----------------------+
          |                               |  |                            |
          | Sync REST                     |  +----------------------------+
          +-------------------------------+     Async Fire-and-Forget (3s timeout)
          |     Sync User Resolution (2s timeout)                         |
          v                               v                               v
+-----------------------+     +-----------------------+     +-----------------------+
|   MongoDB Database:   |     |   MongoDB Database:   |     |   MongoDB Database:   |
|     taskdesk_auth     |     |   taskdesk_tickets    |     | taskdesk_notifications|
|   (users collection)  |     | (tickets, messages,   |     |    (notifications)    |
|                       |     |     counters)         |     |                       |
+-----------------------+     +-----------------------+     +-----------------------+
  </div>

  <h2>Process & Port Responsibility Matrix</h2>
  <table>
    <thead>
      <tr>
        <th>Service Name</th>
        <th>Port</th>
        <th>Database Namespace</th>
        <th>Key Responsibilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Frontend Client</strong></td>
        <td><code>5173</code></td>
        <td><em>Browser Storage</em></td>
        <td>Vite + React 18 SPA, Apple glassmorphic design, notification polling, chat thread modal.</td>
      </tr>
      <tr>
        <td><span class="badge badge-gateway">API Gateway</span></td>
        <td><code>4000</code></td>
        <td><em>None</em></td>
        <td>Reverse proxying, CORS enforcement, Helmet headers, rate limiting, request tracing, telemetry metrics.</td>
      </tr>
      <tr>
        <td><span class="badge badge-auth">Auth Service</span></td>
        <td><code>4001</code></td>
        <td><code>taskdesk_auth</code></td>
        <td>User identity lifecycle, bcrypt hashing (10 rounds), JWT signing/verification, private users directory.</td>
      </tr>
      <tr>
        <td><span class="badge badge-ticket">Ticket Service</span></td>
        <td><code>4002</code></td>
        <td><code>taskdesk_tickets</code></td>
        <td>Ticket CRUD, atomic <code>TD-XXXX</code> sequence counter, review state machine, conversation thread management.</td>
      </tr>
      <tr>
        <td><span class="badge badge-notif">Notification Service</span></td>
        <td><code>4003</code></td>
        <td><code>taskdesk_notifications</code></td>
        <td>Role & user broadcasts, unread badge counters, mark read, delete, event receiver.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Inter-Service Communication & Fault Tolerance</span>
  </div>

  <h1>2. Service-to-Service Communication & Resilience</h1>
  <p>
    TaskDesk eliminates monolithic coupling by establishing clear REST interfaces between discrete microservices. The architecture is resilient against cascading failures and network disruptions.
  </p>

  <h3>1. Edge Reverse Proxy & Identity Header Sanitization</h3>
  <ul>
    <li><strong>Spoofing Prevention:</strong> When external requests hit the API Gateway, it forcibly removes client-provided identity headers (<code>X-User-Id</code>, <code>X-User-Role</code>, <code>X-User-Name</code>, <code>X-User-Email</code>).</li>
    <li><strong>Trusted Header Injection:</strong> If a valid Bearer JWT is attached, the Gateway validates the token claims and injects trusted identity headers before dispatching the request to downstream services.</li>
  </ul>

  <h3>2. Defense in Depth: Independent JWT Verification</h3>
  <ul>
    <li>Downstream services (Auth, Ticket, Notification) never blindly trust HTTP headers.</li>
    <li>Each service maintains its own JWT middleware to independently verify token signatures using the shared cryptographic <code>JWT_SECRET</code>. Directly calling a microservice without a valid token returns <code>401 Unauthorized</code>.</li>
  </ul>

  <h3>3. Internal Service Mesh Protection (<code>X-Internal-Key</code>)</h3>
  <ul>
    <li>Private inter-service routes (such as <code>GET /internal/users</code> and <code>POST /internal/notifications</code>) are shielded from public access.</li>
    <li>Incoming internal requests must provide an <code>X-Internal-Key</code> header matching the environment secret <code>INTERNAL_SERVICE_KEY</code>. Unauthorized calls are rejected with <code>401 Unauthorized</code> or <code>403 Forbidden</code>.</li>
  </ul>

  <h3>4. Synchronous User Resolution with Fallback</h3>
  <ul>
    <li>When administrators browse tickets, <code>ticket-service</code> fetches current creator details via:
      <pre><code>GET http://localhost:4001/internal/users?ids=6afe...,6aff...
Headers: X-Internal-Key: &lt;key&gt;, X-Correlation-ID: &lt;id&gt;</code></pre>
    </li>
    <li><strong>2000ms Timeout & Fallback:</strong> Configured with an aggressive 2-second timeout. If <code>auth-service</code> is temporarily unreachable or slow, <code>ticket-service</code> automatically falls back to the creator name and email cached on the ticket document at creation time.</li>
  </ul>

  <h3>5. Asynchronous Fire-and-Forget Notifications</h3>
  <ul>
    <li>Ticket mutations (creation, review, status transition, chat message) emit events to <code>notification-service</code>:
      <pre><code>POST http://localhost:4003/internal/notifications
Headers: X-Internal-Key: &lt;key&gt;, X-Correlation-ID: &lt;id&gt;</code></pre>
    </li>
    <li><strong>Fault Isolation:</strong> Dispatched with a <strong>3000ms timeout</strong> in fire-and-forget mode. If the notification service is degraded or offline, the main ticket transaction completes successfully without error.</li>
  </ul>

  <h3>6. Gateway 503 Fallback Resilience</h3>
  <p>
    If a downstream microservice crashes or is offline, the Gateway intercepts the connection error and returns a clean <code>503 Service Unavailable</code> JSON response with the active <code>correlationId</code>, shielding users from raw stack traces.
  </p>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Multi-Database Architecture & Schemas</span>
  </div>

  <h1>3. Multi-Database Architecture & Data Isolation</h1>
  <p>
    TaskDesk guarantees absolute data decoupling by isolating service data into three distinct MongoDB database namespaces. There are zero cross-service Mongoose model imports or database joins.
  </p>

  <table>
    <thead>
      <tr>
        <th>Database</th>
        <th>Collection</th>
        <th>Key Fields & Indexes</th>
        <th>Design Rationale</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>taskdesk_auth</code></td>
        <td><code>users</code></td>
        <td>
          • <code>name</code> (String)<br>
          • <code>email</code> (String, Unique Index)<br>
          • <code>passwordHash</code> (String, select: false)<br>
          • <code>role</code> (Enum: 'user', 'admin')<br>
          • <code>createdAt</code>, <code>updatedAt</code>
        </td>
        <td>Strictly encapsulates credential hashes and user profiles. Referenced across services purely by String ID.</td>
      </tr>
      <tr>
        <td><code>taskdesk_tickets</code></td>
        <td><code>tickets</code></td>
        <td>
          • <code>customId</code> (String, Unique Sparse Index)<br>
          • <code>title</code> (String, 3-120 chars)<br>
          • <code>description</code> (String, min 5 chars)<br>
          • <code>status</code> (Enum Index)<br>
          • <code>priority</code> (Enum Index)<br>
          • <code>createdBy</code> (String Index)<br>
          • <code>createdByName</code> (String, cached fallback)<br>
          • <code>createdByEmail</code> (String, cached fallback)<br>
          • <code>statusHistory</code> (Audit Array)
        </td>
        <td>Stores ticket state and lifecycle audit trail. Stores cached creator metadata to eliminate tight runtime coupling to auth service.</td>
      </tr>
      <tr>
        <td><code>taskdesk_tickets</code></td>
        <td><code>messages</code></td>
        <td>
          • <code>ticketId</code> (ObjectId Index)<br>
          • <code>senderId</code> (String)<br>
          • <code>senderRole</code> (Enum: 'user', 'admin')<br>
          • <code>body</code> (String, 1-2000 chars)<br>
          • Compound: <code>{ ticketId: 1, createdAt: 1 }</code>
        </td>
        <td>Chronological support conversation messages. The compound index guarantees instant rendering during active support discussions.</td>
      </tr>
      <tr>
        <td><code>taskdesk_tickets</code></td>
        <td><code>counters</code></td>
        <td>
          • <code>_id: 'ticketId'</code><br>
          • <code>seq</code> (Number)
        </td>
        <td>Maintains atomic <code>$inc</code> sequences ensuring unique, human-readable ticket numbers (<code>TD-1001</code>, <code>TD-1002</code>) without race conditions.</td>
      </tr>
      <tr>
        <td><code>taskdesk_notifications</code></td>
        <td><code>notifications</code></td>
        <td>
          • <code>recipientId</code> (String Index)<br>
          • <code>recipientRole</code> (Enum Index)<br>
          • <code>ticketId</code> (ObjectId)<br>
          • <code>customId</code> (String)<br>
          • <code>type</code> (Enum)<br>
          • <code>read</code> (Boolean Index)<br>
          • Compound: <code>{ recipientId: 1, read: 1 }</code>
        </td>
        <td>High-speed notification lookup and unread counts. Admins query on <code>recipientRole: 'admin'</code>; users query on <code>recipientId</code>.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout">
    <div class="callout-title">Database Setup for Evaluators</div>
    All services connect to standard MongoDB Atlas URI or local instance (<code>mongodb://localhost:27017</code>). Each microservice automatically initializes its respective database namespace and collections on boot.
  </div>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Security Rules, RBAC & State Machine</span>
  </div>

  <h1>4. Role-Based Access Control & Lifecycle State Machine</h1>

  <h2>Role-Based Access Control (RBAC) Enforcement</h2>
  <table>
    <thead>
      <tr>
        <th>Action / Capability</th>
        <th>Standard User</th>
        <th>Administrator</th>
        <th>Enforcement Mechanism</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Register Account</td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td>Seeded Only</td>
        <td>Public endpoint strictly hardcodes <code>role: 'user'</code>.</td>
      </tr>
      <tr>
        <td>Create Ticket</td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td><strong>Blocked (403)</strong></td>
        <td>Controller rejects ticket creation if <code>user.role === 'admin'</code>.</td>
      </tr>
      <tr>
        <td>View Ticket List</td>
        <td>Own Tickets Only</td>
        <td>Global Tickets</td>
        <td>Queries filtered: <code>{ createdBy: user.id }</code> for standard users.</td>
      </tr>
      <tr>
        <td>Edit Title / Description</td>
        <td>Own Open Tickets Only</td>
        <td><strong>Blocked (403)</strong></td>
        <td>Forbidden for admins; forbidden for users if status is not <code>open</code>.</td>
      </tr>
      <tr>
        <td>Review Ticket</td>
        <td><strong>Blocked (403)</strong></td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td>Shielded with <code>requireRole('admin')</code> middleware.</td>
      </tr>
      <tr>
        <td>Update Ticket Status</td>
        <td><strong>Blocked (403)</strong></td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td>Enforced by <code>requireRole('admin')</code> + state machine validator.</td>
      </tr>
      <tr>
        <td>Chat in Ticket Thread</td>
        <td>Own Active Tickets</td>
        <td>Any Active Ticket</td>
        <td>Blocked with <code>403 Forbidden</code> if ticket status is <code>closed</code>.</td>
      </tr>
      <tr>
        <td>Delete Ticket</td>
        <td><strong>Blocked (403)</strong></td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td>Restricted to administrators. Permanently deletes ticket & messages.</td>
      </tr>
      <tr>
        <td>View Analytics / Stats</td>
        <td><strong>Blocked (403)</strong></td>
        <td><span class="badge badge-success">Allowed</span></td>
        <td>Shielded by <code>requireRole('admin')</code>; returns breakdown counts.</td>
      </tr>
    </tbody>
  </table>

  <h2>Ticket Lifecycle State Machine</h2>
  <p>
    Ticket status updates follow a validated deterministic state machine. Out-of-sequence transitions return <code>400 Bad Request</code>:
  </p>
  <div class="diagram-box">
  [User: Create Ticket]
           |
           v
      +----------+        Admin Review
      |   open   | ------------------------+
      +----------+                         |
           | Admin Triage                  v
           v                        +---------------+
     +-----------+  Investigation   |   in_review   |
     |in_progress| <----------------+---------------+
     +-----------+
           | Admin Resolves
           v
     +-----------+      Admin Closes      +-----------+
     | resolved  | ---------------------> |  closed   |
     +-----------+                        +-----------+
           |                                    |
           +---------- Reopen Ticket <----------+
  </div>

  <ul>
    <li><code>open</code> ➔ <code>in_review</code> (or via Admin Review action)</li>
    <li><code>in_review</code> ➔ <code>in_progress</code> (or back to <code>open</code>)</li>
    <li><code>in_progress</code> ➔ <code>resolved</code> (or back to <code>in_review</code>)</li>
    <li><code>resolved</code> ➔ <code>closed</code> (or back to <code>open</code> to reopen)</li>
    <li><code>closed</code> ➔ <code>open</code> (reopens resolved issue)</li>
  </ul>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Observability, Metrics & Validation</span>
  </div>

  <h1>5. Observability, Logging, Metrics & Validation</h1>

  <h2>1. Request Tracing with Correlation IDs</h2>
  <p>
    Every incoming request is assigned a unique UUIDv4 <code>X-Correlation-ID</code> at the Gateway. If the caller supplies one, it is adopted. This header is propagated across all inter-service REST calls and returned in client response headers.
  </p>

  <h2>2. Structured JSON Access Logging</h2>
  <p>
    All four backend processes emit standardized single-line JSON logs on request completion:
  </p>
  <pre><code>{
  "timestamp": "2026-11-19T02:08:59.318Z",
  "level": "info",
  "service": "api-gateway",
  "correlationId": "71821855-af81-4d52-9714-452f826aa2c6",
  "method": "POST",
  "path": "/api/tickets",
  "statusCode": 201,
  "durationMs": 18
}</code></pre>

  <h2>3. Prometheus Metrics & Runtime Telemetry</h2>
  <ul>
    <li><strong>Prometheus Scrape (<code>GET /metrics</code>):</strong> Exposed across all microservices and the Gateway. Emits standard counters including <code>gateway_http_requests_total</code>, <code>auth_http_requests_total</code>, and response time histograms.</li>
    <li><strong>JSON Health Telemetry (<code>GET /api/metrics</code>):</strong> Gateway endpoint returning uptime, active request counts, HTTP status breakdown (2xx, 4xx, 5xx), and Node.js heap memory metrics.</li>
  </ul>

  <h2>4. Runtime Schema Validation (Zod)</h2>
  <p>
    All HTTP payloads are validated with Zod before executing business logic, returning structured 400 Bad Request responses on validation failure:
  </p>
  <table>
    <thead>
      <tr>
        <th>Endpoint</th>
        <th>Validation Rules</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><code>POST /api/auth/register</code></td>
        <td><code>name</code> (min 2 chars), <code>email</code> (valid email format), <code>password</code> (min 6 chars).</td>
      </tr>
      <tr>
        <td><code>POST /api/auth/login</code></td>
        <td><code>email</code> (valid email format), <code>password</code> (non-empty string).</td>
      </tr>
      <tr>
        <td><code>POST /api/tickets</code></td>
        <td><code>title</code> (3-120 chars), <code>description</code> (min 5 chars), <code>priority</code> (enum).</td>
      </tr>
      <tr>
        <td><code>PATCH /api/tickets/:id/status</code></td>
        <td><code>status</code> (enum: open, in_review, in_progress, resolved, closed), <code>note</code> (optional).</td>
      </tr>
      <tr>
        <td><code>PATCH /api/tickets/:id/review</code></td>
        <td><code>priority</code> (enum: low, medium, high, urgent), <code>reviewNotes</code> (optional).</td>
      </tr>
      <tr>
        <td><code>POST /api/tickets/:id/messages</code></td>
        <td><code>body</code> (1-2000 chars string, trimmed).</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>Automated Testing Suite Verification</span>
  </div>

  <h1>6. Automated Test Suite Execution (25/25 Passing)</h1>
  <p>
    The project includes an end-to-end integration test suite in <code>tests/microservices.test.ts</code> testing live microservices behind the Gateway:
  </p>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Phase / Category</th>
        <th>Test Description</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody>
      <tr><td>01</td><td>Authentication</td><td>Admin login returns 200, JWT token and admin role</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>02</td><td>Authentication</td><td>User login returns 200, JWT token and user role</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>03</td><td>Authentication</td><td>Invalid password rejected with 401 Unauthorized</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>04</td><td>Validation</td><td>Zod Schema validation rejects missing email with 400 Bad Request</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>05</td><td>Ticket Creation</td><td>Standard user creates support ticket with TD-XXXX sequential ID</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>06</td><td>RBAC Rule</td><td>Admin ticket creation blocked with 403 Forbidden</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>07</td><td>Validation</td><td>Zod Schema validation: Ticket title &lt; 3 chars rejected with 400</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>08</td><td>RBAC Rule</td><td>Admin prevented from editing ticket title/description (403)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>09</td><td>RBAC Rule</td><td>Standard user cannot update ticket status directly (403)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>10</td><td>Lifecycle</td><td>Admin review transitions ticket status from open to in_review (200)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>11</td><td>Lifecycle</td><td>Admin transitions ticket status: in_review ➔ in_progress (200)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>12</td><td>RBAC Rule</td><td>Non-admin accessing stats endpoint blocked with 403</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>13</td><td>Analytics</td><td>Admin accesses analytics stats breakdown successfully (200)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>14</td><td>Chat Thread</td><td>User sends message on active ticket (201)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>15</td><td>Lifecycle</td><td>Admin transitions in_progress ➔ resolved ➔ closed</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>16</td><td>Security Rule</td><td>User messaging on closed ticket blocked with 403</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>17</td><td>Clean-up</td><td>Admin deletes test ticket (200)</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>18</td><td>Tracing</td><td>Gateway returns exact same X-Correlation-ID header supplied by caller</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>19</td><td>Observability</td><td>Prometheus /metrics endpoint exposes scrape metrics on Gateway</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>20</td><td>Observability</td><td>JSON /api/metrics endpoint returns structured telemetry on Gateway</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>21</td><td>Isolation</td><td>Direct call to ticket-service (4002) without JWT returns 401</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>22</td><td>Internal Security</td><td>Call to /internal/users on auth-service without internal key returns 401/403</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>23</td><td>Internal Security</td><td>Call to /internal/notifications without key returns 401/403</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>24</td><td>Spoofing Guard</td><td>Client-supplied X-User-Role: admin header is stripped and ignored</td><td><span class="badge badge-success">PASSED</span></td></tr>
      <tr><td>25</td><td>Resilience</td><td>Gateway returns 503 with correlationId when downstream is unreachable</td><td><span class="badge badge-success">PASSED</span></td></tr>
    </tbody>
  </table>

  <div class="page-break"></div>
  <div class="header-tag">
    <span>TaskDesk System Documentation</span>
    <span>API Reference, Setup & Credentials</span>
  </div>

  <h1>7. Complete REST API Reference</h1>

  <h3>Authentication API (Base: <code>http://localhost:4000/api/auth</code>)</h3>
  <table>
    <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>POST</code></td><td><code>/register</code></td><td>Public (Zod)</td><td>Registers new standard user; returns JWT token & user profile.</td></tr>
      <tr><td><code>POST</code></td><td><code>/login</code></td><td>Public (Zod)</td><td>Authenticates credentials; returns JWT token & user profile.</td></tr>
      <tr><td><code>GET</code></td><td><code>/me</code></td><td>Bearer JWT</td><td>Returns authenticated user identity from token claims.</td></tr>
      <tr><td><code>GET</code></td><td><code>/users</code></td><td>Admin JWT</td><td>Lists registered users for administrative name resolution.</td></tr>
    </tbody>
  </table>

  <h3>Ticket API (Base: <code>http://localhost:4000/api/tickets</code>)</h3>
  <table>
    <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>GET</code></td><td><code>/</code></td><td>Bearer JWT</td><td>Lists tickets (own tickets for users, global for administrators).</td></tr>
      <tr><td><code>POST</code></td><td><code>/</code></td><td>User JWT (Zod)</td><td>Creates ticket with sequential <code>TD-XXXX</code> identifier.</td></tr>
      <tr><td><code>GET</code></td><td><code>/stats</code></td><td>Admin JWT</td><td>Returns analytics breakdown by status & priority.</td></tr>
      <tr><td><code>GET</code></td><td><code>/:id</code></td><td>Bearer JWT</td><td>Fetches ticket details by ObjectId or customId.</td></tr>
      <tr><td><code>PATCH</code></td><td><code>/:id</code></td><td>User JWT (Zod)</td><td>Edits title/description (open status only).</td></tr>
      <tr><td><code>PATCH</code></td><td><code>/:id/status</code></td><td>Admin JWT (Zod)</td><td>Transitions ticket status via validated state machine.</td></tr>
      <tr><td><code>PATCH</code></td><td><code>/:id/review</code></td><td>Admin JWT (Zod)</td><td>Marks ticket reviewed; updates priority; moves open ➔ in_review.</td></tr>
      <tr><td><code>DELETE</code></td><td><code>/:id</code></td><td>Admin JWT</td><td>Permanently removes ticket and associated message thread.</td></tr>
      <tr><td><code>GET</code></td><td><code>/:id/messages</code></td><td>Bearer JWT</td><td>Retrieves chronological discussion thread.</td></tr>
      <tr><td><code>POST</code></td><td><code>/:id/messages</code></td><td>Bearer JWT (Zod)</td><td>Sends message; blocked if ticket status is closed.</td></tr>
    </tbody>
  </table>

  <h3>Notification API (Base: <code>http://localhost:4000/api/notifications</code>)</h3>
  <table>
    <thead><tr><th>Method</th><th>Endpoint</th><th>Auth</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td><code>GET</code></td><td><code>/</code></td><td>Bearer JWT</td><td>Fetches notifications & unread count badge.</td></tr>
      <tr><td><code>PATCH</code></td><td><code>/read-all</code></td><td>Bearer JWT</td><td>Marks all user notifications as read.</td></tr>
      <tr><td><code>PATCH</code></td><td><code>/:id/read</code></td><td>Bearer JWT</td><td>Marks single notification as read.</td></tr>
      <tr><td><code>DELETE</code></td><td><code>/:id</code></td><td>Bearer JWT</td><td>Dismisses / deletes notification item.</td></tr>
    </tbody>
  </table>

  <h2>Quick Start Commands & Test Credentials</h2>
  <pre><code># 1. Install all dependencies across 5 packages
npm run install:all

# 2. Seed database namespaces
npm run seed

# 3. Launch all 5 processes concurrently
npm run dev

# 4. Run automated test suite (25/25)
npm test</code></pre>

  <table>
    <thead><tr><th>Role</th><th>Email</th><th>Password</th><th>Permissions</th></tr></thead>
    <tbody>
      <tr><td><strong>Demo User</strong></td><td><code>user@taskdesk.com</code></td><td><code>User1234!</code></td><td>Create tickets, view/edit own open tickets, chat, notifications.</td></tr>
      <tr><td><strong>Demo Admin</strong></td><td><code>admin@taskdesk.com</code></td><td><code>Admin1234!</code></td><td>Global table/grid, stats analytics, triage review, status updates, delete.</td></tr>
    </tbody>
  </table>

  <h2>AI Tools Used</h2>
  <ul>
    <li><strong>Google Antigravity:</strong> Distributed process management, background daemon execution, terminal sandboxing, and automated verification.</li>
    <li><strong>Gemini 2.5 Pro / Flash:</strong> Core foundational reasoning models for TypeScript strict typing, reverse proxy routing, and microservice decoupling.</li>
    <li><strong>Claude:</strong> Architectural review for distributed correlation tracing and Apple Human Interface Design principles.</li>
  </ul>

</body>
</html>
`;

const htmlPath = path.join(__dirname, '..', 'temp-pdf-document.html');
const pdfPath = path.join(__dirname, '..', 'TaskDesk-Project-Details.pdf');

fs.writeFileSync(htmlPath, htmlContent, 'utf8');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
console.log('Generating PDF via Chrome Headless...');

try {
  execSync(`"${chromePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf="${pdfPath}" "${htmlPath}"`, {
    stdio: 'inherit'
  });
  console.log(`✅ Successfully generated: ${pdfPath}`);
} catch (err) {
  console.error('Error generating PDF:', err);
} finally {
  if (fs.existsSync(htmlPath)) {
    fs.unlinkSync(htmlPath);
  }
}
