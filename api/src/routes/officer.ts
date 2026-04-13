import { Router, Request, Response } from 'express';
import { pool } from '../lib/db';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const router = Router();

async function requireOfficer(req: Request, res: Response): Promise<string|null> {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) { res.status(401).json({ error: 'Not authenticated' }); return null; }
  const user = await pool.query('SELECT role FROM users WHERE id=$1',[userId]);
  if (!user.rows.length || !['officer','admin'].includes(user.rows[0].role)) {
    res.status(403).json({ error: 'Officer access required' }); return null;
  }
  return userId;
}
router.get('/applications', async (req: Request, res: Response) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  try {
    const apps = await pool.query(`
      SELECT a.id, a.status, a.created_at, a.updated_at, a.loan_amount_usd, a.property_address,
        u.email, u.full_name, u.phone,
        COUNT(d.id) as total_docs,
        COUNT(CASE WHEN d.status='approved' THEN 1 END) as approved_docs
      FROM applications a
      JOIN users u ON u.id=a.applicant_id
      LEFT JOIN documents d ON d.application_id=a.id
      GROUP BY a.id, u.email, u.full_name, u.phone
      ORDER BY a.updated_at DESC
    `);
    return res.json({ applications: apps.rows });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});
router.get('/applications/:id', async (req: Request, res: Response) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  try {
    const app = await pool.query('SELECT a.*,u.email,u.full_name,u.phone FROM applications a JOIN users u ON u.id=a.applicant_id WHERE a.id=$1',[req.params.id]);
    if (!app.rows.length) return res.status(404).json({ error:'Not found' });
    const docs = await pool.query('SELECT * FROM documents WHERE application_id=$1 ORDER BY doc_type',[req.params.id]);
    return res.json({ application:app.rows[0], documents:docs.rows });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});
router.patch('/documents/:id', async (req: Request, res: Response) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  const { status, rejection_reason } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    await pool.query('UPDATE documents SET status=$1,rejection_reason=$2,reviewed_at=NOW(),reviewed_by=$3 WHERE id=$4',[status,rejection_reason||null,userId,req.params.id]);
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)',[userId,'doc.'+status,'document',req.params.id]);
    return res.json({ success:true });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});


router.get('/documents/:id/view', async (req: Request, res: Response) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  try {
    const doc = await pool.query('SELECT * FROM documents WHERE id=$1',[req.params.id]);
    if (!doc.rows.length) return res.status(404).json({ error:'Not found' });
    const s3 = new S3Client({ region: process.env.AWS_REGION||'us-east-1', credentials:{ accessKeyId:process.env.AWS_ACCESS_KEY_ID!, secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY! }});
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME||'docuhogar-docs', Key: doc.rows[0].s3_key }), { expiresIn: 300 });
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)',[userId,'doc.viewed','document',req.params.id]);
    return res.json({ url });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

export default router;
