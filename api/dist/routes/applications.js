"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../lib/db");
const checklist_1 = require("../lib/checklist");
const router = (0, express_1.Router)();
router.get('/me', async (req, res) => {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId)
        return res.status(401).json({ error: 'Not authenticated' });
    try {
        const app = await db_1.pool.query('SELECT * FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT 1', [userId]);
        if (!app.rows.length)
            return res.json({ application: null, documents: [] });
        const docs = await db_1.pool.query('SELECT doc_type,status,rejection_reason FROM documents WHERE application_id=$1', [app.rows[0].id]);
        const bankId = app.rows[0].bank_id;
        let checklist = checklist_1.DEFAULT_CHECKLIST;
        if (bankId) {
            const bc = await db_1.pool.query('SELECT doc_type,label_es,label_en,required FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order', [bankId]);
            if (bc.rows.length)
                checklist = bc.rows;
        }
        return res.json({ application: app.rows[0], documents: docs.rows, checklist });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
router.patch('/:id/status', async (req, res) => {
    const userId = req.cookies?.session || req.headers['x-user-id'];
    if (!userId)
        return res.status(401).json({ error: 'Not authenticated' });
    const { status } = req.body;
    if (!['submitted', 'approved', 'rejected'].includes(status))
        return res.status(400).json({ error: 'Invalid status' });
    try {
        await db_1.pool.query('UPDATE applications SET status=$1,updated_at=NOW() WHERE id=$2', [status, req.params.id]);
        const appRes2 = await db_1.pool.query('SELECT bank_id FROM applications WHERE id=$1', [req.params.id]);
        const bankId = appRes2.rows[0]?.bank_id || null;
        await db_1.pool.query('INSERT INTO audit_log (actor_id,action,entity_type,entity_id,bank_id,metadata) VALUES ($1,$2,$3,$4,$5,$6)', [userId, 'app.status_changed', 'application', req.params.id, bankId, JSON.stringify({ status })]);
        return res.json({ success: true });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed' });
    }
});
exports.default = router;
