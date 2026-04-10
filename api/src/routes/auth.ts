import { Router, Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { pool } from '../lib/db';
import { sendMagicLink } from '../lib/mailer';
import { z } from 'zod';
const router = Router();
const schema = z.object({ email: z.string().email(), locale: z.enum(['es','en']).default('es') });
export default router;