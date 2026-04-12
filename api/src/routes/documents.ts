import { Router, Request, Response } from 'express';
import multer from 'multer';
import { randomBytes, createCipheriv } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '../lib/db';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

const s3 = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_MIMES = ['application/pdf','image/jpeg','image/png','image/jpg'];
const BUCKET = process.env.S3_BUCKET_NAME || 'docuhogar-docs';

router.post('/upload', upload.single('file'), async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  const { doc_type } = req.body;
  if (!doc_type) return res.status(400).json({ error: 'doc_type required' });

  if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. PDF, JPG, PNG only.' });
  }

  try {
    const iv = randomBytes(16);
    const key = randomBytes(32);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    const payload = Buffer.concat([authTag, encrypted]);
    const s3Key = 'docs/' + userId + '/' + doc_type + '/' + Date.now();
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      Body: payload,
      ContentType: 'application/octet-stream',
      Metadata: { iv: iv.toString('hex'), key: key.toString('hex'), originalMime: req.file.mimetype },
    }));
    const appResult = await pool.query(
      'SELECT id FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    let applicationId;
    if (appResult.rows.length === 0) {
      const newApp = await pool.query(
        'INSERT INTO applications (applicant_id,status) VALUES ($1,$2) RETURNING id',
        [userId, 'in_progress']
      );
      applicationId = newApp.rows[0].id;
    } else {
      applicationId = appResult.rows[0].id;
    }
    await pool.query(
      'INSERT INTO documents (application_id,doc_type,status,s3_key,s3_iv,original_filename,file_size_bytes,mime_type,uploaded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT DO NOTHING',
      [applicationId, doc_type, 'uploaded', s3Key, iv.toString('hex'), req.file.originalname, req.file.size, req.file.mimetype]
    );
    await pool.query(
      'INSERT INTO audit_log (actor_id,action,entity_type,metadata) VALUES ($1,$2,$3,$4)',
      [userId, 'doc.uploaded', 'document', JSON.stringify({doc_type, size: req.file.size})]
    );
    return res.json({ success: true, doc_type, status: 'uploaded' });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Upload failed' }); }
});

router.get('/:id/view', async (req: Request, res: Response) => {
  const userId = req.cookies?.session || req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const doc = await pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
    if (!doc.rows.length) return res.status(404).json({ error: 'Not found' });
    const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: doc.rows[0].s3_key }), { expiresIn: 300 });
    await pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)', [userId,'doc.viewed','document',req.params.id]);
    return res.json({ url });
  } catch(err) { console.error(err); return res.status(500).json({ error: 'Failed' }); }
});

export default router;
