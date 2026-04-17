"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
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
        const users = await db_1.pool.query('SELECT id,email,full_name,role,created_at FROM users WHERE bank_id=$1 AND role IN ($2,$3) ORDER BY created_at DESC', [auth.bankId, 'officer', 'bank_admin']);
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
        const officers = await db_1.pool.query("SELECT COUNT(*) FROM users WHERE bank_id=$1 AND role IN ('officer','bank_admin')", [auth.bankId]);
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
            await db_1.pool.query("INSERT INTO users (email,full_name,role,bank_id,locale) VALUES ($1,$2,'officer',$3,'es')", [email, full_name || '', auth.bankId]);
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
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,metadata) VALUES ($1,$2,$3,$4)', [auth.userId, 'officer.invited', 'user', JSON.stringify({ email, bank_id: auth.bankId })]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
