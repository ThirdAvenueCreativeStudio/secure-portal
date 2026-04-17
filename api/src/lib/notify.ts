import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.APP_URL || 'https://demo.docuhogar.com';
function brand(body: string) {
  return '<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px"><div style="margin-bottom:24px"><span style="font-size:18px;font-weight:700;color:#0F2340">DocuHogar</span></div>' + body + '<div style="margin-top:32px;padding-top:16px;border-top:1px solid #eee;font-size:12px;color:#999">DocuHogar &mdash; Portal Seguro</div></div>';
}

export async function notifyOfficerDocUploaded(opts:{officerEmail:string;applicantName:string;docType:string}) {
  const label = opts.docType.replace(/_/g,' ');
  await resend.emails.send({ from:FROM, to:opts.officerEmail,
    subject:'New document uploaded — '+opts.applicantName,
    html:brand('<h2 style="color:#0F2340">New Document Ready for Review</h2><p><strong>'+opts.applicantName+'</strong> uploaded a <strong>'+label+'</strong>.</p><a href="'+APP_URL+'/officer" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">Review Documents &rarr;</a>'),
  });
}

export async function notifyApplicantDocApproved(o:{applicantEmail:string;applicantName:string;docType:string;locale?:string}) {
  const es=o.locale!=='en'; const label=o.docType.replace(/_/g,' ');
  const subj=es?'Documento aprobado: '+label:'Document approved: '+label;
  const msg=es?'Su documento '+label+' ha sido aprobado.':'Your '+label+' has been approved.';
  const cta=es?'Ver mi solicitud':'View my application';
  await resend.emails.send({ from:FROM, to:o.applicantEmail, subject:subj,
    html:brand('<h2 style="color:#1a7a4a">'+(es?'Aprobado':'Approved')+' ✓</h2><p>Hola '+o.applicantName+', '+msg+'</p><a href="'+APP_URL+'/dashboard" style="display:inline-block;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">'+cta+'</a>'),
  });
}

export async function notifyApplicantDocRejected(o:{applicantEmail:string;applicantName:string;docType:string;reason:string;locale?:string}) {
  const es=o.locale!=='en'; const label=o.docType.replace(/_/g,' ');
  const subj=es?'Documento rechazado: '+label:'Document rejected: '+label;
  const cta=es?'Subir nuevamente':'Re-upload';
  const body='<h2 style="color:#c0392b">'+(es?'Accion Requerida':'Action Required')+'</h2><p>'+o.applicantName+': '+label+' '+(es?'rechazado':'rejected')+'.</p><p><strong>'+(es?'Motivo':'Reason')+':</strong> '+(o.reason||'--')+'</p><a href="'+APP_URL+'/dashboard" style="display:inline-block;padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">'+cta+'</a>';
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:subj,html:brand(body)});
}

export async function notifyApplicantIdleReminder(o:{applicantEmail:string;applicantName:string;pendingDocs:string[];locale?:string}) {
  const es=o.locale!=='en';
  const subj=es?'Recordatorio: documentos pendientes':'Reminder: pending documents';
  const items=o.pendingDocs.map(d=>'<li>'+d.replace(/_/g,' ')+'</li>').join('');
  const body='<h2>'+(es?'Documentos Pendientes':'Pending Documents')+'</h2><p>'+o.applicantName+(es?': documentos pendientes:':': pending docs:')+'</p><ul>'+items+'</ul><a href="'+APP_URL+'/dashboard" style="padding:12px 24px;background:#0F2340;color:white;border-radius:8px;text-decoration:none">'+(es?'Completar':'Complete')+'</a>';
  await resend.emails.send({from:FROM,to:o.applicantEmail,subject:subj,html:brand(body)});
}

export async function notifyApplicantWelcome(o:{applicantEmail:string;applicantName:string;token:string;locale?:string}) {
  const es=o.locale!=='en';
  const url=process.env.APP_URL+'/auth/verify?t='+o.token;
  const subject=es?'Su expediente hipotecario — Acceso seguro':'Your mortgage file — Secure access';
  const msg=es?'Hola <strong>'+o.applicantName+'</strong>, su oficial ha iniciado su expediente. Acceda al portal para cargar sus documentos.':'Hi <strong>'+o.applicantName+'</strong>, your loan officer has started your mortgage file. Please upload your documents.';
  const cta=es?'Acceder a mi expediente':'Access my file';
  const expire=es?'Este enlace expira en 15 minutos.':'This link expires in 15 minutes.';
  await resend.emails.send({ from:FROM, to:o.applicantEmail, subject,
    html:brand('<h2 style="color:#0F2340">'+( es?'Bienvenido':'Welcome')+'</h2><p>'+msg+'</p><a href="'+url+'" style="display:inline-block;margin-top:16px;padding:14px 28px;background:#0F2340;color:white;border-radius:8px;text-decoration:none;font-weight:600">'+cta+' &rarr;</a><p style="margin-top:16px;font-size:13px;color:#999">'+expire+'</p>'),
  });
}
