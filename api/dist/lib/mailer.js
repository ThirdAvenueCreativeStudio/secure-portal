"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLink = sendMagicLink;
exports.sendApplicantWelcome = sendApplicantWelcome;
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../../.env.local' });
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
async function sendMagicLink(email, token, locale = 'es') {
    const url = process.env.APP_URL + '/auth/verify?t=' + token;
    const es = locale === 'es';
    const subject = es ? 'Su enlace de acceso seguro' : 'Your secure access link';
    const heading = es ? 'Acceder al Portal Seguro' : 'Access the Secure Portal';
    const body = es ? 'Este enlace expira en 15 minutos.' : 'Expires in 15 minutes.';
    const cta = es ? 'Acceder ahora' : 'Access now';
    await resend.emails.send({
        from: process.env.FROM_EMAIL || 'onboarding@resend.dev',
        to: email,
        subject,
        html: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px"><h2 style="color:#0F2340">' + heading + '</h2><p>' + body + '</p><a href="' + url + '" style="display:inline-block;padding:14px 28px;background:#0F2340;color:white;border-radius:8px;text-decoration:none;font-weight:500">' + cta + ' &rarr;</a></div>',
    });
}
async function sendApplicantWelcome(email, token, name, locale = 'es') {
    const url = process.env.APP_URL + '/auth/verify?t=' + token;
    const es = locale === 'es';
    const subj = es ? 'Su expediente hipotecario en DocuHogar está listo' : 'Your DocuHogar mortgage file is ready';
    const intro = es ? 'Una institución financiera ha iniciado su expediente. Acceda al portal para ver los documentos requeridos y cargarlos de forma segura.' : 'A financial institution has opened your mortgage file. Access the portal to view and upload the required documents securely.';
    const cta = es ? 'Acceder a mi expediente' : 'Access my file';
    const h = '<div style="font-family:sans-serif;padding:32px"><b style="color:#0F2340">DocuHogar</b><br><br><h2 style="color:#0F2340">' + subj + '</h2><p>Hola ' + name + '. ' + intro + '</p><a href="' + url + '" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">' + cta + '</a><p style="color:#999;font-size:12px;margin-top:16px">Expira en 15 min. Cifrado AES-256.</p></div>';
    await resend.emails.send({ from: process.env.FROM_EMAIL || 'onboarding@resend.dev', to: email, subject: subj, html: h });
}
