"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const client_s3_1 = require("@aws-sdk/client-s3");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
async function requireOfficer(req, res) {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return null;
    }
    const user = await db_1.pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    if (!user.rows.length || !['officer', 'admin'].includes(user.rows[0].role)) {
        res.status(403).json({ error: 'Officer access required' });
        return null;
    }
    return userId;
}
router.get('/applications', async (req, res) => {
    const userId = await requireOfficer(req, res);
    if (!userId)
        return;
    try {
        const apps = await db_1.pool.query(`
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
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
router.get('/applications/:id', async (req, res) => {
    const userId = await requireOfficer(req, res);
    if (!userId)
        return;
    try {
        const app = await db_1.pool.query('SELECT a.*,u.email,u.full_name,u.phone FROM applications a JOIN users u ON u.id=a.applicant_id WHERE a.id=$1', [req.params.id]);
        if (!app.rows.length)
            return res.status(404).json({ error: 'Not found' });
        const docs = await db_1.pool.query('SELECT * FROM documents WHERE application_id=$1 ORDER BY doc_type', [req.params.id]);
        return res.json({ application: app.rows[0], documents: docs.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
router.patch('/documents/:id', async (req, res) => {
    const userId = await requireOfficer(req, res);
    if (!userId)
        return;
    const { status, rejection_reason } = req.body;
    if (!['approved', 'rejected'].includes(status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        await db_1.pool.query('UPDATE documents SET status=$1,rejection_reason=$2,reviewed_at=NOW(),reviewed_by=$3 WHERE id=$4', [status, rejection_reason || null, userId, req.params.id]);
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)', [userId, 'doc.' + status, 'document', req.params.id]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
router.get('/documents/:id/view', async (req, res) => {
    const userId = await requireOfficer(req, res);
    if (!userId)
        return;
    try {
        const docRes = await db_1.pool.query('SELECT * FROM documents WHERE id=$1', [req.params.id]);
        if (!docRes.rows.length)
            return res.status(404).json({ error: 'Not found' });
        const doc = docRes.rows[0];
        const s3 = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1', credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
        const obj = await s3.send(new client_s3_1.GetObjectCommand({ Bucket: process.env.S3_BUCKET_NAME || 'docuhogar-docs', Key: doc.s3_key }));
        const meta = obj.Metadata || {};
        const key = Buffer.from(meta.key, 'hex');
        const iv = Buffer.from(meta.iv, 'hex');
        const chunks = [];
        const bodyStream = obj.Body;
        for await (const chunk of bodyStream)
            chunks.push(Buffer.from(chunk));
        const payload = Buffer.concat(chunks);
        const authTag = payload.subarray(0, 16);
        const ciphertext = payload.subarray(16);
        const decipher = (0, crypto_1.createDecipheriv)('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id) VALUES ($1,$2,$3,$4)', [userId, 'doc.viewed', 'document', req.params.id]);
        res.setHeader('Content-Type', doc.mime_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('Content-Length', decrypted.length);
        return res.send(decrypted);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to decrypt' });
    }
});
exports.default = router;
