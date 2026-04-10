import { Router, Request, Response } from 'express';
import { randomBytes, createHash } from 'crypto';
import { pool } from '../lib/db';
import { sendMagicLink } from '../lib/mailer';
import { z } from 'zod';
const router = Router();
const schema = z.object({ email: z.string().email(), locale: z.enum(['es','en']).default('es') });
router.post('/request', async (req: Request, res: Response) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Valid email required' });
  const { email, locale } = parsed.data;
  try {
    const rate = await pool.query(
      "SELECT COUNT(*) FROM auth_tokens JOIN users ON users.id=auth_tokens.user_id WHERE users.email=$1 AND auth_tokens.created_at>NOW()-INTERVAL '1 hour'",
      [email]
    );
    if (parseInt(rate.rows[0].count) >= 3) return res.status(429).json({ error: 'Too many requests' });
    const user = await pool.query(
      "INSERT INTO users (email,role,locale) VALUES ($1,'applicant',$2) ON CONFLICT (email) DO UPDATE SET locale=$2 RETURNING id",
      [email, locale]
    );
    const userId = user.rows[0].id;
    const raw = randomBytes(32).toString('hex');
    const hash = createHash('sha256').update(raw).digest('hex');
    const exp = new Date(Date.now() + 15*60*1000);
    await pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)', [userId,hash,exp]);
    await sendMagicLink(email, raw, locale);
    await pool.query("INSERT INTO audit_log (actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'auth.requested','user',$1,$2)", [userId, JSON.stringify({ip:req.ip})]);
    return res.json({ success: true });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Failed to send magic link' }); }
});
router.get('/verify', async (req: Request, res: Response) => {
  const raw = req.query.t as string;
  if (!raw) return res.status(400).json({ error: 'Missing token' });
  try {
    const hash = createHash('sha256').update(raw).digest('hex');
    const result = await pool.query(
      'SELECT at.id,at.user_id,at.expires_at,at.used_at,u.email,u.role,u.locale FROM auth_tokens at JOIN users u ON u.id=at.user_id WHERE at.token_hash=$1',
      [hash]
    );
    if (!result.rows.length) return res.status(401).json({ error: 'Invalid token' });
    const t = result.rows[0];
    if (t.used_at) return res.status(401).json({ error: 'Token already used' });
    if (new Date(t.expires_at) < new Date()) return res.status(401).json({ error: 'Token expired' });
    await pool.query('UPDATE auth_tokens SET used_at=NOW() WHERE id=$1', [t.id]);
    await pool.query("INSERT INTO audit_log (actor_id,action,entity_type,entity_id,metadata) VALUES ($1,'auth.login','user',$1,$2)", [t.user_id, JSON.stringify({ip:req.ip})]);
    res.cookie('session', t.user_id, { httpOnly:true, secure:process.env.NODE_ENV==='production', sameSite:'strict', maxAge:8*60*60*1000 });
    return res.json({ success:true, user:{ id:t.user_id, email:t.email, role:t.role, locale:t.locale } });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Verification failed' }); }
});
router.post('/logout', async (req: Request, res: Response) => {
  const userId = req.cookies?.session;
  if (userId) await pool.query("INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,'auth.logout','user',$1)", [userId]).catch(()=>{});
  res.clearCookie('session');
  return res.json({ success: true });
});
export default router;
