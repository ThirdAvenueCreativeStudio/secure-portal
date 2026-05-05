import { Resend } from 'resend';
import { emailLayout, emailButton, emailHeading, emailText, emailNote, emailBadge, NAVY, GREEN, RED, APP } from './emailTemplate';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';

export async function notifyOfficerDocUploaded(o:{officerEmail:string;applicantName:string;docType:string}) {
  const label=o.docType.replace(/_/g," ");
  const c=emailHeading("Nuevo Documento")+emailText("<strong>"+o.applicantName+"</strong> subio: <strong>"+label+"</strong>")
    +emailButton(APP+"/officer","Revisar documentos");
  await resend.emails.send({from:FROM,to:o.officerEmail,subject:"Nuevo documento: "+o.applicantName,html:emailLayout(c)});
}

export async function notifyApplicantDocApproved(o:{applicantEmail:string;applicantName:string;docType:string;locale?:string}) {
  const es=o.locale!=="en";const label=o.docType.replace(/_/g," ");
  const c=emailHeading(es?"Documento Aprobado":"Document Approved",GREEN)
    +emailBadge(es?"Aprobado":"Approved","#EAF5EE",GREEN)
    +emailText("<br><br>"+(es?"Hola "+o.applicantName+", su documento <strong>"+label+"</strong> ha sido aprobado.":"Hi "+o.applicantName+", your <strong>"+label+"</strong> has been approved."))
    +emailButton(APP+"/dashboard",es?"Ver mi solicitud":"View my application",GREEN);
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:(es?"Aprobado: ":"Approved: ")+label,html:emailLayout(c)});
}

export async function notifyApplicantDocRejected(o:{applicantEmail:string;applicantName:string;docType:string;reason:string;locale?:string}) {
  const es=o.locale!=="en";const label=o.docType.replace(/_/g," ");
  const c=emailHeading(es?"Accion Requerida":"Action Required",RED)
    +emailBadge(es?"Rechazado":"Rejected","#FDECEC",RED)
    +emailText("<br><br>"+o.applicantName+": <strong>"+label+"</strong> "+(es?"rechazado.":"rejected."))
    +emailText("<strong>"+(es?"Motivo":"Reason")+":</strong> "+(o.reason||"--"))
    +emailButton(APP+"/dashboard",es?"Subir nuevamente":"Re-upload",RED);
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:(es?"Rechazado: ":"Rejected: ")+label,html:emailLayout(c)});
}

export async function notifyApplicantIdleReminder(o:{applicantEmail:string;applicantName:string;pendingDocs:string[];locale?:string}) {
  const es=o.locale!=="en";
  const items=o.pendingDocs.map(d=>"&bull; "+d.replace(/_/g," ")).join("<br>");
  const c=emailHeading(es?"Documentos Pendientes":"Pending Documents",NAVY)
    +emailText(o.applicantName+(es?", tiene documentos pendientes:":", you have pending documents:"))
    +emailText(items)
    +emailButton(APP+"/dashboard",es?"Completar ahora":"Complete now");
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:es?"Recordatorio: documentos pendientes":"Reminder: pending documents",html:emailLayout(c)});
}

export async function notifyApplicantWelcome(o:{applicantEmail:string;applicantName:string;token:string;locale?:string}) {
  const es=o.locale!=="en";
  const url=APP+"/auth/verify?t="+o.token;
  const intro=es?"su oficial ha iniciado su expediente. Acceda para cargar documentos.":"your officer started your file. Upload documents securely.";
  const c=emailHeading(es?"Bienvenido":"Welcome")
    +emailText((es?"Hola ":"Hi ")+o.applicantName+", "+intro)
    +emailButton(url,es?"Acceder a mi expediente":"Access my file")
    +emailNote(es?"Enlace expira en 15 min.":"Link expires in 15 min.");
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:es?"Su expediente hipotecario":"Your mortgage file",html:emailLayout(c)});
}

export async function notifyOfficerApplicationSubmitted(o:{officerEmail:string;applicantName:string;applicantEmail:string;appId:string}) {
  const c=emailHeading("Solicitud Enviada",NAVY)
    +emailBadge("Enviada","#EBF0FA","#185FA5")
    +emailText("<br><br><strong>"+o.applicantName+"</strong> ("+o.applicantEmail+") ha enviado su solicitud.")
    +emailButton(APP+"/officer","Revisar solicitud");
  await resend.emails.send({from:FROM,to:o.officerEmail,subject:"Nueva solicitud: "+o.applicantName,html:emailLayout(c)});
}

export async function notifyApplicantApplicationSubmitted(o:{applicantEmail:string;applicantName:string;locale?:string}) {
  const es=o.locale!=="en";
  const c=emailHeading(es?"Solicitud Enviada":"Application Submitted","#1D7A4E")
    +emailBadge(es?"Enviada":"Submitted","#EAF5EE","#1D7A4E")
    +emailText("<br><br>"+(es?"Hola "+o.applicantName+", tu solicitud fue enviada. El oficial revisara tus documentos y te notificaremos.":"Hi "+o.applicantName+", your application was submitted. The officer will review your documents and we will notify you."))
    +emailButton(APP+"/dashboard",es?"Ver mi solicitud":"View my application","#1D7A4E");
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:es?"Solicitud enviada":"Application submitted",html:emailLayout(c)});
}
