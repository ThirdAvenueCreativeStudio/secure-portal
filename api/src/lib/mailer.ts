import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
export async function sendMagicLink(email: string, token: string, locale = 'es') {
  const url = process.env.APP_URL + '/auth/verify?t=' + token;
  const es = locale === 'es';
  const subject = es ? 'Su enlace de acceso seguro' : 'Your secure access link';
  await transporter.sendMail({
    from: '"Portal Seguro" <' + process.env.SMTP_USER + '>',
    to: email,
    subject,
    html: '<div style="font-family:sans-serif;padding:32px"><h2>' + (es?'Acceder al Portal':'Access Portal') + '</h2><p>' + (es?'Expira en 15 minutos.':'Expires in 15 minutes.') + '</p><a href="' + url + '" style="background:#0F2340;color:white;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block">' + (es?'Acceder':'Access') + '</a></div>',
  });
}
