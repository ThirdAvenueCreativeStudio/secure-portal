"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLink = sendMagicLink;
exports.sendApplicantWelcome = sendApplicantWelcome;
const resend_1 = require("resend");
const dotenv_1 = __importDefault(require("dotenv"));
const emailTemplate_1 = require("./emailTemplate");
dotenv_1.default.config({ path: '../../.env.local' });
const resend = new resend_1.Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
async function sendMagicLink(email, token, locale = "es") {
    const url = emailTemplate_1.APP + "/auth/verify?t=" + token;
    const es = locale === "es";
    const subj = es ? "Su enlace de acceso seguro" : "Your secure access link";
    const c = (0, emailTemplate_1.emailHeading)(es ? "Acceso al Portal" : "Portal Access")
        + (0, emailTemplate_1.emailText)(es ? "Use el siguiente enlace para acceder. Expira en 15 minutos." : "Use the link below to access your account. Expires in 15 minutes.")
        + (0, emailTemplate_1.emailButton)(url, es ? "Acceder ahora" : "Access now")
        + (0, emailTemplate_1.emailNote)(es ? "Si no solicito este enlace, ignore este correo." : "If you did not request this, ignore this email.");
    await resend.emails.send({ from: FROM, to: email, subject: subj, html: (0, emailTemplate_1.emailLayout)(c) });
}
async function sendApplicantWelcome(email, token, name, locale = "es") {
    const url = emailTemplate_1.APP + "/auth/verify?t=" + token;
    const es = locale === "es";
    const subj = es ? "Su expediente hipotecario esta listo" : "Your mortgage file is ready";
    const intro = es ? "Su oficial ha iniciado su expediente. Acceda al portal para cargar sus documentos." : "Your officer started your file. Upload your documents securely.";
    const c = (0, emailTemplate_1.emailHeading)(es ? "Bienvenido" : "Welcome") + (0, emailTemplate_1.emailText)("Hola " + name + ". " + intro)
        + (0, emailTemplate_1.emailButton)(url, es ? "Acceder a mi expediente" : "Access my file")
        + (0, emailTemplate_1.emailNote)(es ? "Enlace expira en 15 min." : "Link expires in 15 min.");
    await resend.emails.send({ from: FROM, to: email, subject: subj, html: (0, emailTemplate_1.emailLayout)(c) });
}
