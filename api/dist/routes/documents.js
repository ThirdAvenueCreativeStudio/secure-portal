"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notify_1 = require("../lib/notify");
const multer_1 = __importDefault(require("multer"));
const crypto_1 = require("crypto");
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const db_1 = require("../lib/db");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
const s3 = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const ALLOWED_MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
const BUCKET = process.env.S3_BUCKET_NAME || 'docuhogar-docs';
router.post('/upload', upload.single('file'), async (req, res) => {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId)
        return res.status(401).json({ error: 'Not authenticated' });
    if (!req.file)
        return res.status(400).json({ error: 'No file provided' });
    const { doc_type } = req.body;
    if (!doc_type)
        return res.status(400).json({ error: 'doc_type required' });
    if (!ALLOWED_MIMES.includes(req.file.mimetype)) {
        return res.status(400).json({ error: 'Invalid file type. PDF, JPG, PNG only.' });
    }
    try {
        const iv = (0, crypto_1.randomBytes)(16);
        const key = (0, crypto_1.randomBytes)(32);
        const cipher = (0, crypto_1.createCipheriv)('aes-256-gcm', key, iv);
        const encrypted = Buffer.concat([cipher.update(req.file.buffer), cipher.final()]);
        const authTag = cipher.getAuthTag();
        const payload = Buffer.concat([authTag, encrypted]);
        const s3Key = 'docs/' + userId + '/' + doc_type + '/' + Date.now();
        await s3.send(new client_s3_1.PutObjectCommand({
            Bucket: BUCKET,
            Key: s3Key,
            Body: payload,
            ContentType: 'application/octet-stream',
            Metadata: { iv: iv.toString('hex'), key: key.toString('hex'), originalMime: req.file.mimetype },
        }));
        const appResult = await db_1.pool.query('SELECT id,bank_id FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT 1', [userId]);
        let applicationId;
        let bankId = null;
        if (appResult.rows.length === 0) {
            const newApp = await db_1.pool.query('INSERT INTO applications (applicant_id,status) VALUES ($1,$2) RETURNING id', [userId, 'in_progress']);
            applicationId = newApp.rows[0].id;
        }
        else {
            applicationId = appResult.rows[0].id;
            bankId = appResult.rows[0].bank_id || null;
        }
        await db_1.pool.query('INSERT INTO documents (application_id,doc_type,status,s3_key,s3_iv,original_filename,file_size_bytes,mime_type,uploaded_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW()) ON CONFLICT DO NOTHING', [applicationId, doc_type, 'uploaded', s3Key, iv.toString('hex'), req.file.originalname, req.file.size, req.file.mimetype]);
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,bank_id,metadata) VALUES ($1,$2,$3,$4,$5)', [userId, 'doc.uploaded', 'document', bankId, JSON.stringify({ doc_type, size: req.file.size })]);
        // Notify officer — find any officer/admin for this bank (or globally)
        try {
            const officers = await db_1.pool.query("SELECT u.email, u.full_name FROM users u WHERE u.role IN ('officer','admin') LIMIT 5");
            const applicant = await db_1.pool.query('SELECT full_name FROM users WHERE id=$1', [userId]);
            const name = applicant.rows[0]?.full_name || 'Applicant';
            for (const officer of officers.rows) {
                await (0, notify_1.notifyOfficerDocUploaded)({ officerEmail: officer.email, applicantName: name, docType: doc_type });
            }
        }
        catch (ne) {
            console.error('notify error', ne);
        }
        return res.json({ success: true, doc_type, status: 'uploaded' });
    }
    catch (err) {
        console.error('UPLOAD ERR:', err?.message);
        return res.status(500).json({ error: 'Upload failed' });
    }
});
router.get('/:id/view', async (req, res) => {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId)
        return res.status(401).json({ error: 'Not authenticated' });
    try {
        const doc = await db_1.pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
        if (!doc.rows.length)
            return res.status(404).json({ error: 'Not found' });
        const url = await (0, s3_request_presigner_1.getSignedUrl)(s3, new client_s3_1.GetObjectCommand({ Bucket: BUCKET, Key: doc.rows[0].s3_key }), { expiresIn: 300 });
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id) VALUES ($1,$2,$3,$4,(SELECT a.bank_id FROM documents d2 JOIN applications a ON a.id=d2.application_id WHERE d2.id=$4))', [userId, 'doc.viewed', 'document', req.params.id]);
        return res.json({ url });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
