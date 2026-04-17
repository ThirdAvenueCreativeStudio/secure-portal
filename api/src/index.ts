import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import documentRoutes from './routes/documents';
import applicationRoutes from './routes/applications';
import officerRoutes from './routes/officer';
import adminRoutes from './routes/admin';
import bankAdminRoutes from './routes/bankadmin';
import { errorHandler, notFound } from './middleware/errorHandler';
import rateLimit from 'express-rate-limit';
import * as Sentry from '@sentry/node';
dotenv.config({ path: '../../.env.local' });

// Sentry error monitoring
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.2 });
}

const app = express();
const PORT = process.env.PORT || 3001;

// Global rate limit — 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Strict limit for upload endpoint — 20 per 10 min per IP
const uploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: 'Too many uploads, please try again later.' },
});

// Officer doc view limit — 60 per hour per IP (prevents bulk exfiltration)
const viewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  message: { error: 'Too many document views, please try again later.' },
});
app.use(cors({ origin: true, credentials: true }));
app.use(globalLimiter);
app.use(express.json());
app.use(cookieParser());
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/documents/upload', uploadLimiter);
app.use('/api/v1/officer/documents', viewLimiter);
app.use('/api/v1/documents', documentRoutes);
app.use('/api/v1/applications', applicationRoutes);
app.use('/api/v1/officer', officerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/bank-admin', bankAdminRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok' }));
app.use(notFound);
if (process.env.SENTRY_DSN) Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);
app.listen(PORT, () => console.log('API running on port ' + PORT));
