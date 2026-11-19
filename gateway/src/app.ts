import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { gatewaySecurityAndTracing, gatewayMetricsHandler } from './middleware/observability.middleware.js';
import { globalLimiter, authLimiter } from './middleware/rateLimiter.middleware.js';

export const app = express();

app.use(helmet());

const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(gatewaySecurityAndTracing);
app.use(globalLimiter);

// Gateway Health & Telemetry
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});
app.get('/metrics', gatewayMetricsHandler);
app.get('/api/metrics', gatewayMetricsHandler);

// Helper for proxy creation
const createServiceProxy = (targetUrl: string) => {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        const correlationId = (req as any).correlationId;
        if (correlationId) {
          proxyReq.setHeader('X-Correlation-ID', correlationId);
        }
        const user = (req as any).trustedUser;
        if (user) {
          proxyReq.setHeader('X-User-Id', user.id);
          proxyReq.setHeader('X-User-Role', user.role);
          proxyReq.setHeader('X-User-Name', encodeURIComponent(user.name || ''));
          proxyReq.setHeader('X-User-Email', user.email || '');
        }
      },
      error: (err, req, res) => {
        const correlationId = (req as any).correlationId || req.headers['x-correlation-id'];
        console.error(`[api-gateway] Proxy error to ${targetUrl}:`, err.message);
        if ('writeHead' in res && typeof res.writeHead === 'function' && !res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 'SERVICE_UNAVAILABLE',
                message: 'Downstream service is currently unreachable',
              },
              correlationId,
            })
          );
        }
      },
    },
  });
};

const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const ticketServiceUrl = process.env.TICKET_SERVICE_URL || 'http://localhost:4002';
const notificationServiceUrl = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4003';

// Microservice Route Proxies
app.use('/api/auth', authLimiter, createServiceProxy(authServiceUrl));
app.use('/api/tickets', createServiceProxy(ticketServiceUrl));
app.use('/api/notifications', createServiceProxy(notificationServiceUrl));
app.use('/api/offline-test', createServiceProxy('http://127.0.0.1:59999'));

// 404 fallback
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.path}`,
    },
    correlationId: (req as any).correlationId,
  });
});
