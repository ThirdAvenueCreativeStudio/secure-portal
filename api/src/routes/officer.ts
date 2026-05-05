import { Router, Request, Response } from 'express';
import { pool } from '../lib/db';
import { DEFAULT_CHECKLIST } from '../lib/checklist';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { notifyApplicantDocApproved, notifyApplicantDocRejected, notifyApplicantIdleReminder } from '../lib/notify';
import { sendApplicantWelcome } from '../lib/mailer';
import { getBankChecklist } from '../lib/checklist';
import { randomBytes, createDecipheriv, createHash } from 'crypto';
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
    const officer = await pool.query('SELECT bank_id,role FROM users WHERE id=$1',[userId]);
    const bankId = officer.rows[0]?.bank_id;
    const isGlobalAdmin = officer.rows[0]?.role === 'admin';
    const hasBank = !isGlobalAdmin && bankId;
    const bankFilter = hasBank ? "AND u.bank_id=$1" : '';
    const params:any[] = hasBank ? [bankId] : [];
    const apps = await pool.query(`
      SELECT a.id, a.status, a.created_at, a.updated_at,
        a.assigned_to, u.email, u.full_name, u.phone,
        ou.email as assigned_email, ou.full_name as assigned_name,
        COUNT(d.id) as total_docs,
        COUNT(CASE WHEN d.status='approved' THEN 1 END) as approved_docs
      FROM applications a
      JOIN users u ON u.id=a.applicant_id
      LEFT JOIN users ou ON ou.id=a.assigned_to
      LEFT JOIN documents d ON d.application_id=a.id
      WHERE 1=1 ${bankFilter}
      GROUP BY a.id, u.email, u.full_name, u.phone, ou.email, ou.full_name
      ORDER BY a.updated_at DESC
    `, params);
    return res.json({ applications: apps.rows });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

router.get('/applications/:id', async (req, res) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  try {
    const app = await pool.query('SELECT a.*,u.email,u.full_name,u.phone FROM applications a JOIN users u ON u.id=a.applicant_id WHERE a.id=$1',[req.params.id]);
    if (!app.rows.length) return res.status(404).json({ error:'Not found' });
    const docs = await pool.query('SELECT * FROM documents WHERE application_id=$1 ORDER BY doc_type',[req.params.id]);
    const bankId=app.rows[0].bank_id; let checklist=DEFAULT_CHECKLIST; if(bankId){const bc=await pool.query("SELECT doc_type,label_es,label_en FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order",[bankId]);if(bc.rows.length)checklist=bc.rows;} return res.json({application:app.rows[0],documents:docs.rows,checklist});
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

router.patch('/documents/:id', async (req, res) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  const { status, rejection_reason } = req.body;
  if (!['approved','rejected'].includes(status)) return res.status(400).json({ error:'Invalid status' });
  try {
    await pool.query('UPDATE documents SET status=$1,rejection_reason=$2,reviewed_at=NOW(),reviewed_by=$3 WHERE id=$4',[status,rejection_reason||null,userId,req.params.id]);
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id) VALUES ($1,$2,$3,$4,(SELECT a.bank_id FROM documents d2 JOIN applications a ON a.id=d2.application_id WHERE d2.id=$4))',[userId,'doc.'+status,'document',req.params.id]);
    try {
      const r = await pool.query('SELECT d.doc_type,u.email,u.full_name,u.locale FROM documents d JOIN applications a ON a.id=d.application_id JOIN users u ON u.id=a.applicant_id WHERE d.id=$1',[req.params.id]);
      if (r.rows.length) {
        const { doc_type,email,full_name,locale } = r.rows[0];
        if (status==='approved') await notifyApplicantDocApproved({applicantEmail:email,applicantName:full_name,docType:doc_type,locale});
        else await notifyApplicantDocRejected({applicantEmail:email,applicantName:full_name,docType:doc_type,reason:rejection_reason||'',locale});
      }
    } catch(ne){ console.error('notify err',ne); }
    // 90% billing threshold check
    if (status === 'approved') {
      try {
        const appRes = await pool.query('SELECT application_id FROM documents WHERE id=$1', [req.params.id]);
        const appId = appRes.rows[0]?.application_id;
        if (appId) {
          const billableCheck = await pool.query('SELECT billable_at FROM applications WHERE id=$1', [appId]);
          if (!billableCheck.rows[0]?.billable_at) {
            const counts = await pool.query(
              "SELECT COUNT(*) as total, COUNT(CASE WHEN status='approved' THEN 1 END) as approved FROM documents WHERE application_id=$1",
              [appId]
            );
            const total = parseInt(counts.rows[0].total);
            const approved = parseInt(counts.rows[0].approved);
            if (total > 0 && approved / total >= 0.9) {
              await pool.query('UPDATE applications SET billable_at=NOW() WHERE id=$1', [appId]);
              await pool.query(
                'INSERT INTO audit_log (actor_id,action,entity_type,entity_id,metadata) VALUES ($1,$2,$3,$4,$5)',
                [userId, 'billing.threshold_reached', 'application', appId, JSON.stringify({approved, total, pct: Math.round(approved/total*100)})]
              );
              console.log(`Billing threshold reached for application ${appId}: ${approved}/${total} docs approved`);
            }
          }
        }
      } catch(be){ console.error('billing threshold err',be); }
    }
    return res.json({ success:true });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});


router.get('/documents/:id/view', async (req, res) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  try {
    const docRes = await pool.query('SELECT * FROM documents WHERE id=$1',[req.params.id]);
    if (!docRes.rows.length) return res.status(404).json({ error:'Not found' });
    const doc = docRes.rows[0];
    const s3 = new S3Client({ region: process.env.AWS_REGION||'us-east-1', credentials:{ accessKeyId:process.env.AWS_ACCESS_KEY_ID, secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY }});
    const obj = await s3.send(new GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME||'docuhogar-docs', Key: doc.s3_key }));
    const meta = obj.Metadata || {};
    const key = Buffer.from(meta.key, 'hex');
    const iv = Buffer.from(meta.iv, 'hex');
    const chunks = [];
    const bodyStream = obj.Body as any;
    for await (const chunk of bodyStream) chunks.push(Buffer.from(chunk));
    const payload = Buffer.concat(chunks);
    const authTag = payload.subarray(0,16);
    const ciphertext = payload.subarray(16);
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id) VALUES ($1,$2,$3,$4,(SELECT a.bank_id FROM documents d2 JOIN applications a ON a.id=d2.application_id WHERE d2.id=$4))',[userId,'doc.viewed','document',req.params.id]);
    res.setHeader('Content-Type', doc.mime_type||'application/octet-stream');
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', decrypted.length);
    return res.send(decrypted);
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed to decrypt' }); }
});

// POST /officer/notify/idle
router.post('/notify/idle', async (req, res) => {
  if (req.headers['x-cron-secret']!==process.env.CRON_SECRET) return res.status(401).json({error:'Unauthorized'});
  try {
    const idle=await pool.query("SELECT u.email,u.full_name,u.locale,a.id as app_id FROM applications a JOIN users u ON u.id=a.applicant_id WHERE a.updated_at<NOW()-INTERVAL '48 hours' AND a.status='in_progress'");
    let sent=0;
    for (const row of idle.rows) {
      const docs=await pool.query("SELECT doc_type FROM documents WHERE application_id=$1 AND status IN ('pending','rejected')",[row.app_id]);
      if (!docs.rows.length) continue;
      await notifyApplicantIdleReminder({applicantEmail:row.email,applicantName:row.full_name,pendingDocs:docs.rows.map((d:any)=>d.doc_type),locale:row.locale});
      sent++;
    }
    return res.json({sent});
  } catch(err){ console.error(err); return res.status(500).json({error:'Failed'}); }
});

// POST /officer/invite-applicant
router.post('/invite-applicant', async (req, res) => {
  const userId = await requireOfficer(req, res); if (!userId) return;
  let { email, full_name, locale } = req.body; if(!locale){const ub=await pool.query("SELECT bank_id FROM users WHERE id=$1",[userId]);const bid=ub.rows[0]?.bank_id;if(bid){const bk=await pool.query("SELECT default_locale FROM banks WHERE id=$1",[bid]);locale=bk.rows[0]?.default_locale||"es";}} if(!locale)locale="es";
  if (!email || !full_name) return res.status(400).json({ error:'Email and name required' });
  try {
    let applicantId:string;
    const existing = await pool.query('SELECT id FROM users WHERE email=$1',[email]);
    if (existing.rows.length) {
      applicantId = existing.rows[0].id;
    } else {
      const nu = await pool.query("INSERT INTO users (email,full_name,role,locale) VALUES ($1,$2,'applicant',$3) RETURNING id",[email,full_name,locale]);
      applicantId = nu.rows[0].id;
    }
    const app = await pool.query("INSERT INTO applications (applicant_id,assigned_to,status) VALUES ($1,$2,'in_progress') RETURNING id",[applicantId,userId]);
    const appId = app.rows[0].id;
    const docTypes = ['passport', 'us_address_proof', 'pay_stub', 'bank_statement', 'credit_auth', 'promesa_venta', 'nit', 'remittance_history'];
    for (const dt of docTypes) {
      await pool.query('INSERT INTO documents (application_id,doc_type,status) VALUES ($1,$2,$3)',[appId,dt,'pending']);
    }
    const raw=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(raw).digest('hex');
    const exp=new Date(Date.now()+15*60*1000);
    await pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)',[applicantId,hash,exp]);
    await sendApplicantWelcome(email,raw,full_name||email,locale);
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id,metadata) VALUES ($1,$2,$3,$4,(SELECT bank_id FROM applications WHERE id=$4),$5)',[userId,'app.created','application',appId,JSON.stringify({applicant_email:email})]);
    return res.json({ success:true, application_id:appId });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

const DOC_TYPES=['passport','us_address_proof','pay_stub','bank_statement','credit_auth','promesa_venta','nit','remittance_history'];

// POST /officer/invite-applicant
router.post('/invite-applicant', async (req, res) => {
  const userId = await requireOfficer(req, res);
  if (!userId) return;
  const { email, full_name, locale='es' } = req.body;
  if (!email) return res.status(400).json({ error:'Email required' });
  try {
    let uRes=await pool.query('SELECT id FROM users WHERE email=$1',[email]);
    if (!uRes.rows.length) {
      await pool.query("INSERT INTO users (email,full_name,role,locale) VALUES ($1,$2,'applicant',$3)",[email,full_name||"",locale]);
      uRes=await pool.query('SELECT id FROM users WHERE email=$1',[email]);
    }
    const applicantId=uRes.rows[0].id;
    const appRes=await pool.query('INSERT INTO applications (applicant_id,status) VALUES ($1,$2) RETURNING id',[applicantId,'in_progress']);
    const appId=appRes.rows[0].id;
    // Get bank's custom checklist or fall back to default
    const officer2=await pool.query('SELECT bank_id FROM users WHERE id=$1',[userId]);
    const bankId=officer2.rows[0]?.bank_id||null;
    const docTypes=await getBankChecklist(pool,bankId);
    for (const dt of docTypes) await pool.query('INSERT INTO documents (application_id,doc_type,status) VALUES ($1,$2,$3)',[appId,dt,'pending']);
    const raw=randomBytes(32).toString('hex');
    const hash=createHash('sha256').update(raw).digest('hex');
    const exp=new Date(Date.now()+15*60*1000);
    await pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)',[applicantId,hash,exp]);
    await sendApplicantWelcome(email,raw,full_name||email,locale);
    return res.json({ success:true, applicationId:appId });
  } catch(err){ console.error(err); return res.status(500).json({ error:'Failed' }); }
});

export default router;
