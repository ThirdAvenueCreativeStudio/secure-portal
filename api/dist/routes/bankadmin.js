"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const checklist_1 = require("../lib/checklist");
const mailer_1 = require("../lib/mailer");
const crypto_1 = require("crypto");
const router = (0, express_1.Router)();
async function requireBankAdmin(req, res) {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({ error: 'Not authenticated' });
        return null;
    }
    const u = await db_1.pool.query('SELECT role,bank_id FROM users WHERE id=$1', [userId]);
    if (!u.rows.length || !['bank_admin', 'admin'].includes(u.rows[0].role)) {
        res.status(403).json({ error: 'Bank admin access required' });
        return null;
    }
    return { userId, bankId: u.rows[0].bank_id };
}
// GET /bank-admin/team
router.get('/team', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    try {
        const users = await db_1.pool.query("SELECT id,email,full_name,role,created_at FROM users WHERE bank_id=$1 AND role='officer' ORDER BY created_at DESC", [auth.bankId]);
        return res.json({ users: users.rows });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /bank-admin/stats
router.get('/stats', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    try {
        const apps = await db_1.pool.query('SELECT COUNT(*) FROM applications WHERE applicant_id IN (SELECT id FROM users WHERE bank_id=$1)', [auth.bankId]);
        const officers = await db_1.pool.query("SELECT COUNT(*) FROM users WHERE bank_id=$1 AND role='officer'", [auth.bankId]);
        return res.json({ applications: parseInt(apps.rows[0].count), officers: parseInt(officers.rows[0].count) });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// POST /bank-admin/invite-officer
router.post('/invite-officer', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    const { email, full_name } = req.body;
    if (!email)
        return res.status(400).json({ error: 'Email required' });
    try {
        const ex = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        if (!ex.rows.length) {
            const bk = await db_1.pool.query("SELECT default_locale FROM banks WHERE id=$1", [auth.bankId]);
            const loc = bk.rows[0]?.default_locale || "es";
            await db_1.pool.query("INSERT INTO users (email,full_name,role,bank_id,locale) VALUES ($1,$2,'officer',$3,$4)", [email, full_name || '', auth.bankId, loc]);
        }
        else {
            await db_1.pool.query("UPDATE users SET role='officer',bank_id=$1 WHERE email=$2", [auth.bankId, email]);
        }
        const u = await db_1.pool.query('SELECT id FROM users WHERE email=$1', [email]);
        const raw = (0, crypto_1.randomBytes)(32).toString('hex');
        const hash = (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
        const exp = new Date(Date.now() + 15 * 60 * 1000);
        await db_1.pool.query('INSERT INTO auth_tokens (user_id,token_hash,expires_at) VALUES ($1,$2,$3)', [u.rows[0].id, hash, exp]);
        await (0, mailer_1.sendMagicLink)(email, raw, 'es');
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,bank_id,metadata) VALUES ($1,$2,$3,$4,$5)', [auth.userId, 'officer.invited', 'user', auth.bankId, JSON.stringify({ email, bank_id: auth.bankId })]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /bank-admin/audit-log
router.get('/audit-log', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    const { action, actor_id, entity_type, date_from, date_to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const perPage = Math.min(200, Math.max(1, parseInt(req.query.per_page) || 50));
    try {
        let where = 'WHERE al.bank_id=$1';
        const params = [auth.bankId];
        if (action) {
            params.push(action);
            where += ` AND al.action=$${params.length}`;
        }
        if (actor_id) {
            params.push(actor_id);
            where += ` AND al.actor_id=$${params.length}`;
        }
        if (entity_type) {
            params.push(entity_type);
            where += ` AND al.entity_type=$${params.length}`;
        }
        if (date_from) {
            params.push(date_from);
            where += ` AND al.created_at >= $${params.length}::timestamptz`;
        }
        if (date_to) {
            params.push(date_to);
            where += ` AND al.created_at <= $${params.length}::timestamptz`;
        }
        const countRes = await db_1.pool.query(`SELECT COUNT(*) FROM audit_log al ${where}`, params);
        const total = parseInt(countRes.rows[0].count);
        const offset = (page - 1) * perPage;
        params.push(perPage, offset);
        const logs = await db_1.pool.query(`SELECT al.*, u.email as actor_email, u.full_name as actor_name, u.role as actor_role
       FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id
       ${where} ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
        return res.json({ data: logs.rows, pagination: { page, per_page: perPage, total, total_pages: Math.ceil(total / perPage) } });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /bank-admin/audit-log/export
router.get('/audit-log/export', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    const { action, actor_id, entity_type, date_from, date_to } = req.query;
    if (!date_from || !date_to)
        return res.status(400).json({ error: 'date_from and date_to required' });
    const diffDays = (new Date(date_to).getTime() - new Date(date_from).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 90)
        return res.status(400).json({ error: 'Max 90-day range' });
    try {
        let where = 'WHERE al.bank_id=$1';
        const params = [auth.bankId];
        params.push(date_from);
        where += ` AND al.created_at >= $${params.length}::timestamptz`;
        params.push(date_to);
        where += ` AND al.created_at <= $${params.length}::timestamptz`;
        if (action) {
            params.push(action);
            where += ` AND al.action=$${params.length}`;
        }
        if (actor_id) {
            params.push(actor_id);
            where += ` AND al.actor_id=$${params.length}`;
        }
        if (entity_type) {
            params.push(entity_type);
            where += ` AND al.entity_type=$${params.length}`;
        }
        const logs = await db_1.pool.query(`SELECT al.created_at, u.full_name as actor_name, u.email as actor_email, u.role as actor_role,
              al.action, al.entity_type, al.entity_id, al.metadata
       FROM audit_log al LEFT JOIN users u ON u.id=al.actor_id
       ${where} ORDER BY al.created_at DESC`, params);
        const header = 'Timestamp,Actor,Email,Role,Action,Entity Type,Entity ID,Metadata';
        const rows = logs.rows.map((r) => {
            const ts = new Date(r.created_at).toISOString();
            const meta = r.metadata ? JSON.stringify(r.metadata).replace(/"/g, '""') : '';
            return ts + ',"' + (r.actor_name || '') + '","' + (r.actor_email || '') + '","' + (r.actor_role || '') + '","' + r.action + '","' + (r.entity_type || '') + '","' + (r.entity_id || '') + '","' + meta + '"';
        });
        const csv = [header, ...rows].join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="audit-log.csv"');
        return res.send(csv);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
// GET /bank-admin/applications
router.get('/applications', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    try {
        const apps = await db_1.pool.query(`
      SELECT a.id,a.status,a.updated_at,
        u.email,u.full_name,
        ou.full_name as assigned_name,
        COUNT(d.id) as total_docs,
        COUNT(CASE WHEN d.status='approved' THEN 1 END) as approved_docs
      FROM applications a
      JOIN users u ON u.id=a.applicant_id
      LEFT JOIN users ou ON ou.id=a.assigned_to
      LEFT JOIN documents d ON d.application_id=a.id
      WHERE u.bank_id=$1
      GROUP BY a.id,u.email,u.full_name,ou.full_name
      ORDER BY a.updated_at DESC
    `, [auth.bankId]);
        return res.json({ applications: apps.rows });
    }
    catch (e) {
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /bank-admin/officer-workload
router.get('/officer-workload', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    try {
        const r = await db_1.pool.query("SELECT u.id,u.email,u.full_name,COUNT(a.id) as total,COUNT(CASE WHEN a.status='in_progress' THEN 1 END) as active FROM users u LEFT JOIN applications a ON a.assigned_to=u.id WHERE u.bank_id=$1 AND u.role='officer' GROUP BY u.id ORDER BY u.full_name", [auth.bankId]);
        return res.json({ officers: r.rows });
    }
    catch (e) {
        return res.status(500).json({ error: 'Failed' });
    }
});
// GET /bank-admin/checklist
router.get('/checklist', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    try {
        const r = await db_1.pool.query('SELECT * FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order', [auth.bankId]);
        const checklist = r.rows.length ? r.rows : checklist_1.DEFAULT_CHECKLIST.map((d, i) => ({ ...d, bank_id: auth.bankId, sort_order: i }));
        return res.json({ checklist });
    }
    catch (e) {
        return res.status(500).json({ error: 'Failed' });
    }
});
// PUT /bank-admin/checklist
router.put('/checklist', async (req, res) => {
    const auth = await requireBankAdmin(req, res);
    if (!auth)
        return;
    const { checklist } = req.body;
    if (!Array.isArray(checklist))
        return res.status(400).json({ error: 'array required' });
    try {
        await db_1.pool.query('DELETE FROM bank_checklists WHERE bank_id=$1', [auth.bankId]);
        for (let i = 0; i < checklist.length; i++) {
            const { doc_type, label_es, label_en, required } = checklist[i];
            await db_1.pool.query('INSERT INTO bank_checklists (bank_id,doc_type,label_es,label_en,required,sort_order) VALUES ($1,$2,$3,$4,$5,$6)', [auth.bankId, doc_type, label_es, label_en, required !== false, i]);
        }
        return res.json({ success: true });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Failed' });
    }
});
