"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMagicLink = sendMagicLink;
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
