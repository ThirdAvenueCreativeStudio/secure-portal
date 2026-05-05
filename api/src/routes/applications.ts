import { Router, Request, Response } from 'express';
import { pool } from '../lib/db';
import { DEFAULT_CHECKLIST } from '../lib/checklist';
import { notifyOfficerApplicationSubmitted, notifyApplicantApplicationSubmitted } from '../lib/notify';
const router = Router();
router.get('/me', async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const app = await pool.query('SELECT * FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT 1',[userId]);
    if (!app.rows.length) return res.json({ application:null, documents:[], checklist: DEFAULT_CHECKLIST });
    const docs = await pool.query('SELECT doc_type,status,rejection_reason FROM documents WHERE application_id=$1',[app.rows[0].id]);
    const bankId = app.rows[0].bank_id;
    let checklist = DEFAULT_CHECKLIST;
    if (bankId) { const bc = await pool.query('SELECT doc_type,label_es,label_en,required FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order',[bankId]); if (bc.rows.length) checklist = bc.rows; }
    return res.json({ application:app.rows[0], documents:docs.rows, checklist });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});
router.patch('/:id/status', async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  const { status } = req.body;
  if (!['submitted','approved','rejected'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    await pool.query('UPDATE applications SET status=$1,updated_at=NOW() WHERE id=$2',[status,req.params.id]);
    const appRes2 = await pool.query('SELECT bank_id FROM applications WHERE id=$1',[req.params.id]);
    const bankId = appRes2.rows[0]?.bank_id || null;
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)',[userId,'app.status_changed','application',req.params.id,bankId,JSON.stringify({status})]);
    if (status === 'submitted') {
      try {
        const details = await pool.query(
          'SELECT u.email,u.full_name,u.locale,ou.email as officer_email FROM applications a JOIN users u ON u.id=a.applicant_id LEFT JOIN users ou ON ou.id=a.assigned_to WHERE a.id=$1',
          [req.params.id]
        );
        if (details.rows.length) {
          const d = details.rows[0];
          await notifyApplicantApplicationSubmitted({applicantEmail:d.email,applicantName:d.full_name||d.email,locale:d.locale});
          if (d.officer_email) await notifyOfficerApplicationSubmitted({officerEmail:d.officer_email,applicantName:d.full_name||d.email,applicantEmail:d.email,appId:String(req.params.id)});
        }
      } catch(ne){ console.error('submit notify err',ne); }
    }
    return res.json({ success:true });

  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

export default router;
