"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const mailer_1 = require("../lib/mailer");
const billing_1 = require("../lib/billing");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
async function requireAdmin(req, res) {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return null;
    }
    const u = await db_1.pool.query('SELECT role FROM users WHERE id=$1', [userId]);
    if (!u.rows.length || u.rows[0].role !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return null;
    }
    return userId;
}
// GET /admin/stats — dashboard counts
router.get('/stats', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    try {
        const [apps, docs, users, pending, bankStats, docsByStatus, totalBanks, totalOfficers] = await Promise.all([
            db_1.pool.query('SELECT COUNT(*) FROM applications'),
            db_1.pool.query('SELECT COUNT(*) FROM documents'),
            db_1.pool.query("SELECT COUNT(*) FROM users WHERE role='applicant'"),
            db_1.pool.query("SELECT COUNT(*) FROM documents WHERE status IN ('pending','uploaded')"),
            db_1.pool.query("SELECT b.name,COUNT(a.id) as app_count FROM banks b LEFT JOIN applications a ON a.bank_id=b.id GROUP BY b.id,b.name ORDER BY app_count DESC"),
            db_1.pool.query("SELECT status,COUNT(*) FROM documents GROUP BY status"),
            db_1.pool.query("SELECT COUNT(*) FROM banks"),
            db_1.pool.query("SELECT COUNT(*) FROM users WHERE role IN ('officer','bank_admin')"),
        ]);
        return res.json({
            applications: parseInt(apps.rows[0].count),
            documents: parseInt(docs.rows[0].count),
            applicants: parseInt(users.rows[0].count),
            pendingReview: parseInt(pending.rows[0].count),
            banks: parseInt(totalBanks.rows[0].count),
            officers: parseInt(totalOfficers.rows[0].count),
            bankStats: bankStats.rows,
            docsByStatus: docsByStatus.rows,
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /admin/users
router.get('/users', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    try {
        const users = await db_1.pool.query('SELECT id,email,full_name,role,locale,created_at FROM users ORDER BY created_at DESC');
        return res.json({ users: users.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// POST /admin/invite-officer
router.post('/invite-officer', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { email, full_name } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email required' });
    try {
        const existing = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (!existing.rows.length) {
            await db_1.pool.query("INSERT INTO users (email,full_name,role,locale) VALUES ($1,$2,'officer','es')", [email, full_name || '']);
        }
        else {
            await db_1.pool.query("UPDATE users SET role='officer' WHERE email=$1", [email]);
        }
        const raw = (0, crypto_1.randomBytes)(32).toString('hex');
        const hash = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
        const exp = new Date(Date.now() + 15 * 60 * 1000);
        const u = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        await db_1.pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)', [u.rows[0].id, hash, exp]);
        await (0, mailer_1.sendMagicLink)(email, raw, 'es');
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,metadata) VALUES ($1,$2,$3,$4)', [userId, 'user.invited', 'user', JSON.stringify({ email })]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /admin/audit-log
router.get('/audit-log', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { action, bank_id, lim = 100 } = req.query;
    try {
        let q = 'SELECT al.*,u.email as actor_email FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id WHERE 1=1';
        const params = [];
        if (bank_id) {
            params.push(bank_id);
            q += ` AND al.bank_id=$${params.length}`;
        }
        if (action) {
            params.push(action);
            q += ` AND al.action=$${params.length}`;
        }
        params.push(Math.min(Number(lim), 500));
        q += ` ORDER BY al.created_at DESC LIMIT $${params.length}`;
        const logs = await db_1.pool.query(q, params);
        return res.json({ logs: logs.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// POST /admin/expire-docs
router.post('/expire-docs', async (req, res) => {
    if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET)
        return res.status(401).json({ error: 'Unauthorized' });
    try {
        const r = await db_1.pool.query("UPDATE documents SET status='expired' WHERE expires_at IS NOT NULL AND expires_at<NOW() AND status NOT IN ('expired','approved') RETURNING id");
        return res.json({ expired: r.rowCount });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// PATCH /admin/users/:id/role
router.patch('/users/:id/role', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { role } = req.body;
    if (!['applicant', 'officer', 'admin'].includes(role))
        return res.status(400).json({ error: 'Invalid role' });
    try {
        await db_1.pool.query('UPDATE users SET role=$1 WHERE id=$2', [role, req.params.id]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /admin/documents
router.get('/documents', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    try {
        const docs = await db_1.pool.query(`
      SELECT d.id,d.doc_type,d.status,d.mime_type,d.file_size_bytes,d.uploaded_at,d.reviewed_at,d.rejection_reason,
        u.email,u.full_name
      FROM documents d
      JOIN applications a ON a.id=d.application_id
      JOIN users u ON u.id=a.applicant_id
      ORDER BY d.uploaded_at DESC LIMIT 200
    `);
        return res.json({ docs: docs.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// PATCH /admin/applications/:id/assign
router.patch('/applications/:id/assign', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { officer_id } = req.body;
    try {
        await db_1.pool.query('UPDATE applications SET assigned_to=$1, updated_at=NOW() WHERE id=$2', [officer_id || null, req.params.id]);
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id,metadata) VALUES ($1,$2,$3,$4,(SELECT bank_id FROM applications WHERE id=$4),$5)', [userId, 'app.assigned', 'application', req.params.id, JSON.stringify({ assigned_to: officer_id })]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
// POST /admin/banks
router.post('/banks', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { name, subdomain, contact_email, default_locale } = req.body;
    if (!name)
        return res.status(400).json({ error: 'Name required' });
    try {
        const b = await db_1.pool.query('INSERT INTO banks (name,subdomain,contact_email,default_locale) VALUES ($1,$2,$3,$4) RETURNING *', [name, subdomain || null, contact_email || null, default_locale || 'es']);
        return res.json({ bank: b.rows[0] });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /admin/banks
router.get('/banks', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    try {
        const r = await db_1.pool.query('SELECT b.*,COUNT(u.id) as officer_count FROM banks b LEFT JOIN users u ON u.bank_id=b.id GROUP BY b.id ORDER BY b.created_at DESC');
        return res.json({ banks: r.rows });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed' });
    }
});
// POST /admin/invite-bank-admin
router.post('/invite-bank-admin', async (req, res) => {
    const userId = await requireAdmin(req, res);
    if (!userId)
        return;
    const { email, full_name, bank_id } = req.body;
    if (!email || !bank_id)
        return res.status(400).json({ error: 'Email and bank required' });
    try {
        const ex = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        const bk = await db_1.pool.query('SELECT default_locale FROM banks WHERE id=$1', [bank_id]);
        const loc = bk.rows[0]?.default_locale || 'es';
        if (!ex.rows.length)
            await db_1.pool.query("INSERT INTO users (email,full_name,role,bank_id,locale) VALUES ($1,$2,'bank_admin',$3,$4)", [email, full_name || '', bank_id, loc]);
        else
            await db_1.pool.query("UPDATE users SET role='bank_admin',bank_id=$1 WHERE email=$2", [bank_id, email]);
        const u = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        const raw = (0, crypto_1.randomBytes)(32).toString('hex');
        const hash = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
        const exp = new Date(Date.now() + 15 * 60 * 1000);
        await db_1.pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)', [u.rows[0].id, hash, exp]);
        await (0, mailer_1.sendMagicLink)(email, raw, 'es');
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,bank_id,metadata) VALUES ($1,$2,$3,$4,$5)', [userId, 'bank_admin.invited', 'user', bank_id, JSON.stringify({ email, bank_id })]);
        return res.json({ success: true });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed' });
    }
});
router.post('/billing-report', async (req, res) => {
    const cronSecret = req.headers['x-cron-secret'];
    const validCron = cronSecret === process.env.CRON_SECRET;
    if (!validCron) {
        const u = await requireAdmin(req, res);
        if (!u)
            return;
    }
    const now = new Date();
    const month = parseInt(req.body.month) || (now.getMonth() === 0 ? 12 : now.getMonth());
    const year = parseInt(req.body.year) || (month === 12 ? now.getFullYear() - 1 : now.getFullYear());
    try {
        await (0, billing_1.sendMonthlyBillingReport)(year, month);
        return res.json({ success: true, year, month });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed' });
    }
});
