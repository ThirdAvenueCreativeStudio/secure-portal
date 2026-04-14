"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOfficerDocUploaded = notifyOfficerDocUploaded;
exports.notifyApplicantDocApproved = notifyApplicantDocApproved;
exports.notifyApplicantDocRejected = notifyApplicantDocRejected;
exports.notifyApplicantIdleReminder = notifyApplicantIdleReminder;
const resend_1 = require("resend");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'https://secure-portal-beta.vercel.app';
function brand(body) {
    return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px"><div style="margin-bottom:24px"><span style="font-size:18px;font-weight:700;color:#0F2340">DocuHogar</span></div>' + body + '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999">DocuHogar &mdash; Portal Seguro</div></div>';
}
async function notifyOfficerDocUploaded(opts) {
    const label = opts.docType.replace(/_/g, ' ');
    await resend.emails.send({ from: FROM, to: opts.officerEmail,
        subject: 'New document uploaded — ' + opts.applicantName,
        html: brand('<h2 style="color:#0F2340">New Document Ready for Review</h2><p><strong>' + opts.applicantName + '</strong> uploaded a <strong>' + label + '</strong>.</p><a href="' + APP_URL + '/officer" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">Review Documents &rarr;</a>'),
    });
}
async function notifyApplicantDocApproved(o) {
    const es = o.locale !== 'en';
    const label = o.docType.replace(/_/g, ' ');
    const subj = es ? 'Documento aprobado: ' + label : 'Document approved: ' + label;
    const msg = es ? 'Su documento ' + label + ' ha sido aprobado.' : 'Your ' + label + ' has been approved.';
    const cta = es ? 'Ver mi solicitud' : 'View my application';
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: subj,
        html: brand('<h2 style="color:#1a7a4a">' + (es ? 'Aprobado' : 'Approved') + ' ✓</h2><p>Hola ' + o.applicantName + ', ' + msg + '</p><a href="' + APP_URL + '/dashboard" style="display:inline-block;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">' + cta + '</a>'),
    });
}
async function notifyApplicantDocRejected(o) {
    const es = o.locale !== 'en';
    const label = o.docType.replace(/_/g, ' ');
    const subj = es ? 'Documento rechazado: ' + label : 'Document rejected: ' + label;
    const cta = es ? 'Subir nuevamente' : 'Re-upload';
    const body = '<h2 style="color:#c0392b">' + (es ? 'Accion Requerida' : 'Action Required') + '</h2><p>' + o.applicantName + ': ' + label + ' ' + (es ? 'rechazado' : 'rejected') + '.</p><p><strong>' + (es ? 'Motivo' : 'Reason') + ':</strong> ' + (o.reason || '--') + '</p><a href="' + APP_URL + '/dashboard" style="display:inline-block;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">' + cta + '</a>';
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: subj, html: brand(body) });
}
async function notifyApplicantIdleReminder(o) {
    const es = o.locale !== 'en';
    const subj = es ? 'Recordatorio: documentos pendientes' : 'Reminder: pending documents';
    const items = o.pendingDocs.map(d => '<li>' + d.replace(/_/g, ' ') + '</li>').join('');
    const body = '<h2>' + (es ? 'Documentos Pendientes' : 'Pending Documents') + '</h2><p>' + o.applicantName + (es ? ': documentos pendientes:' : ': pending docs:') + '</p><ul>' + items + '</ul><a href="' + APP_URL + '/dashboard" style="padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">' + (es ? 'Completar' : 'Complete') + '</a>';
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: subj, html: brand(body) });
}
