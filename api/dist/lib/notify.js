"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyOfficerDocUploaded = notifyOfficerDocUploaded;
exports.notifyApplicantDocApproved = notifyApplicantDocApproved;
exports.notifyApplicantDocRejected = notifyApplicantDocRejected;
exports.notifyApplicantIdleReminder = notifyApplicantIdleReminder;
exports.notifyApplicantWelcome = notifyApplicantWelcome;
const resend_1 = require("resend");
const emailTemplate_1 = require("./emailTemplate");
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
async function notifyOfficerDocUploaded(o) {
    const label = o.docType.replace(/_/g, " ");
    const c = (0, emailTemplate_1.emailHeading)("Nuevo Documento") + (0, emailTemplate_1.emailText)("<strong>" + o.applicantName + "</strong> subio: <strong>" + label + "</strong>")
        + (0, emailTemplate_1.emailButton)(emailTemplate_1.APP + "/officer", "Revisar documentos");
    await resend.emails.send({ from: FROM, to: o.officerEmail, subject: "Nuevo documento: " + o.applicantName, html: (0, emailTemplate_1.emailLayout)(c) });
}
async function notifyApplicantDocApproved(o) {
    const es = o.locale !== "en";
    const label = o.docType.replace(/_/g, " ");
    const c = (0, emailTemplate_1.emailHeading)(es ? "Documento Aprobado" : "Document Approved", emailTemplate_1.GREEN)
        + (0, emailTemplate_1.emailBadge)(es ? "Aprobado" : "Approved", "#EAF5EE", emailTemplate_1.GREEN)
        + (0, emailTemplate_1.emailText)("<br><br>" + (es ? "Hola " + o.applicantName + ", su documento <strong>" + label + "</strong> ha sido aprobado." : "Hi " + o.applicantName + ", your <strong>" + label + "</strong> has been approved."))
        + (0, emailTemplate_1.emailButton)(emailTemplate_1.APP + "/dashboard", es ? "Ver mi solicitud" : "View my application", emailTemplate_1.GREEN);
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: (es ? "Aprobado: " : "Approved: ") + label, html: (0, emailTemplate_1.emailLayout)(c) });
}
async function notifyApplicantDocRejected(o) {
    const es = o.locale !== "en";
    const label = o.docType.replace(/_/g, " ");
    const c = (0, emailTemplate_1.emailHeading)(es ? "Accion Requerida" : "Action Required", emailTemplate_1.RED)
        + (0, emailTemplate_1.emailBadge)(es ? "Rechazado" : "Rejected", "#FDECEC", emailTemplate_1.RED)
        + (0, emailTemplate_1.emailText)("<br><br>" + o.applicantName + ": <strong>" + label + "</strong> " + (es ? "rechazado." : "rejected."))
        + (0, emailTemplate_1.emailText)("<strong>" + (es ? "Motivo" : "Reason") + ":</strong> " + (o.reason || "--"))
        + (0, emailTemplate_1.emailButton)(emailTemplate_1.APP + "/dashboard", es ? "Subir nuevamente" : "Re-upload", emailTemplate_1.RED);
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: (es ? "Rechazado: " : "Rejected: ") + label, html: (0, emailTemplate_1.emailLayout)(c) });
}
async function notifyApplicantIdleReminder(o) {
    const es = o.locale !== "en";
    const items = o.pendingDocs.map(d => "&bull; " + d.replace(/_/g, " ")).join("<br>");
    const c = (0, emailTemplate_1.emailHeading)(es ? "Documentos Pendientes" : "Pending Documents", emailTemplate_1.NAVY)
        + (0, emailTemplate_1.emailText)(o.applicantName + (es ? ", tiene documentos pendientes:" : ", you have pending documents:"))
        + (0, emailTemplate_1.emailText)(items)
        + (0, emailTemplate_1.emailButton)(emailTemplate_1.APP + "/dashboard", es ? "Completar ahora" : "Complete now");
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: es ? "Recordatorio: documentos pendientes" : "Reminder: pending documents", html: (0, emailTemplate_1.emailLayout)(c) });
}
async function notifyApplicantWelcome(o) {
    const es = o.locale !== "en";
    const url = emailTemplate_1.APP + "/auth/verify?t=" + o.token;
    const intro = es ? "su oficial ha iniciado su expediente. Acceda para cargar documentos." : "your officer started your file. Upload documents securely.";
    const c = (0, emailTemplate_1.emailHeading)(es ? "Bienvenido" : "Welcome")
        + (0, emailTemplate_1.emailText)((es ? "Hola " : "Hi ") + o.applicantName + ", " + intro)
        + (0, emailTemplate_1.emailButton)(url, es ? "Acceder a mi expediente" : "Access my file")
        + (0, emailTemplate_1.emailNote)(es ? "Enlace expira en 15 min." : "Link expires in 15 min.");
    await resend.emails.send({ from: FROM, to: o.applicantEmail, subject: es ? "Su expediente hipotecario" : "Your mortgage file", html: (0, emailTemplate_1.emailLayout)(c) });
}
