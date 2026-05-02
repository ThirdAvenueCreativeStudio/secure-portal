import { Resend } from 'resend';
import dotenv from 'dotenv';
import { emailLayout, emailButton, emailHeading, emailText, emailNote, APP } from './emailTemplate';
dotenv.config({ path: '../../.env.local' });
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export async function sendMagicLink(email: string, token: string, locale = "es") {
  const url = APP + "/auth/verify?t=" + token;
  const es = locale === "es";
  const subj = es ? "Su enlace de acceso seguro" : "Your secure access link";
  const c = emailHeading(es?"Acceso al Portal":"Portal Access")
    + emailText(es?"Use el siguiente enlace para acceder. Expira en 15 minutos.":"Use the link below to access your account. Expires in 15 minutes.")
    + emailButton(url, es?"Acceder ahora":"Access now")
    + emailNote(es?"Si no solicito este enlace, ignore este correo.":"If you did not request this, ignore this email.");
  await resend.emails.send({from:FROM,to:email,subject:subj,html:emailLayout(c)});
}

export async function sendApplicantWelcome(email:string,token:string,name:string,locale="es") {
  const url=APP+"/auth/verify?t="+token;
  const es=locale==="es";
  const subj=es?"Su expediente hipotecario esta listo":"Your mortgage file is ready";
  const intro=es?"Su oficial ha iniciado su expediente. Acceda al portal para cargar sus documentos.":"Your officer started your file. Upload your documents securely.";
  const c = emailHeading(es?"Bienvenido":"Welcome")+emailText("Hola "+name+". "+intro)
    +emailButton(url,es?"Acceder a mi expediente":"Access my file")
    +emailNote(es?"Enlace expira en 15 min.":"Link expires in 15 min.");
  await resend.emails.send({from:FROM,to:email,subject:subj,html:emailLayout(c)});
}
