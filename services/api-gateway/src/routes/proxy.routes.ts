import { Router, Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/env';
import { verifyGatewayAuth } from '../middleware/auth.middleware';
import { logger } from '../observability/logger';
import { proxiedRequestsTotal } from '../observability/metrics';

const router = Router();

// Auth Service Proxy
// /api/auth/register and /api/auth/login are public; /api/auth/me requires auth
router.use(
  '/auth',
  (req: Request, res: Response, next: NextFunction) => {
    // Only verify auth on /api/auth/me (or any route other than register/login)
    if (req.path === '/register' || req.path === '/login') {
      return next();
    }
    return verifyGatewayAuth(req, res, next);
  },
  createProxyMiddleware({
    target: config.AUTH_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (_path, req) => {
      return (req.originalUrl || '').replace(/^\/api/, '');
    },
    on: {
      proxyReq: (proxyReq, req) => {
        const correlationId = (req as Request).correlationId;
        if (correlationId) {
          proxyReq.setHeader('x-correlation-id', correlationId);
        }
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }
      },
      proxyRes: (proxyRes, req) => {
        proxiedRequestsTotal
          .labels('auth-service', req.method || 'GET', proxyRes.statusCode ? proxyRes.statusCode.toString() : '200')
          .inc();
      },
      error: (err, req, res) => {
        const correlationId = (req as Request).correlationId || 'unknown';
        logger.error({ err, correlationId, target: 'auth-service' }, 'Failed to proxy request to auth-service');
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 'BAD_GATEWAY',
                message: 'Auth service is currently unavailable',
              },
              correlationId,
            })
          );
        }
      },
    },
  })
);

// Ticket Service Proxy
// All /api/tickets/* endpoints require authentication
router.use(
  '/tickets',
  verifyGatewayAuth,
  createProxyMiddleware({
    target: config.TICKET_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (_path, req) => {
      return (req.originalUrl || '').replace(/^\/api/, '');
    },
    on: {
      proxyReq: (proxyReq, req) => {
        const correlationId = (req as Request).correlationId;
        if (correlationId) {
          proxyReq.setHeader('x-correlation-id', correlationId);
        }
        if (req.headers['x-user-id']) {
          proxyReq.setHeader('x-user-id', req.headers['x-user-id']);
        }
        if (req.headers['x-user-role']) {
          proxyReq.setHeader('x-user-role', req.headers['x-user-role']);
        }
      },
      proxyRes: (proxyRes, req) => {
        proxiedRequestsTotal
          .labels('ticket-service', req.method || 'GET', proxyRes.statusCode ? proxyRes.statusCode.toString() : '200')
          .inc();
      },
      error: (err, req, res) => {
        const correlationId = (req as Request).correlationId || 'unknown';
        logger.error({ err, correlationId, target: 'ticket-service' }, 'Failed to proxy request to ticket-service');
        if ('writeHead' in res && typeof res.writeHead === 'function') {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              error: {
                code: 'BAD_GATEWAY',
                message: 'Ticket service is currently unavailable',
              },
              correlationId,
            })
          );
        }
      },
    },
  })
);

export const proxyRoutes = router;
