import { Router, Request, Response } from 'express';
import { pool } from '../lib/db';
const router = Router();
router.get('/me', async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const app = await pool.query('SELECT * FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT 1',[userId]);
    if (!app.rows.length) return res.json({ application:null, documents:[] });
    const docs = await pool.query('SELECT doc_type,status,rejection_reason FROM documents WHERE application_id=$1',[app.rows[0].id]);
    return res.json({ application:app.rows[0], documents:docs.rows });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});
router.patch('/:id/status', async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const { status } = req.body;
  if (!['submitted','approved','rejected'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    await pool.query('UPDATE applications SET status=$1,updated_at=NOW() WHERE id=$2',[status,req.params.id]);
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5)',[userId,'app.status_changed','application',req.params.id,JSON.stringify({status})]);
    return res.json({ success:true });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

export default router;
