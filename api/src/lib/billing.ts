import PDFDocument from 'pdfkit';
import { Resend } from 'resend';
import { pool } from './db';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.FROM_EMAIL || 'noreply@docuhogar.com';
const ADMIN_EMAIL = 'info@3rdavenuecs.com';

interface BankReport {
  bankId:string; bankName:string; contactEmail:string;
  completed:number; inProgress:number; abandoned:number; total:number;
}

export async function getBillingData(year:number, month:number): Promise<BankReport[]> {
  const start = new Date(year, month-1, 1);
  const end = new Date(year, month, 1);
  const banks = await pool.query('SELECT id,name,contact_email FROM banks WHERE active=true');
  const reports: BankReport[] = [];
  for (const bank of banks.rows) {
    const c1=await pool.query("SELECT COUNT(DISTINCT a.id) as n FROM applications a JOIN users u ON u.id=a.applicant_id WHERE u.bank_id=$1 AND a.status='submitted' AND a.updated_at>=$2 AND a.updated_at<$3",[bank.id,start,end]);
    const c2=await pool.query("SELECT COUNT(DISTINCT a.id) as n FROM applications a JOIN users u ON u.id=a.applicant_id WHERE u.bank_id=$1 AND a.status='in_progress'",[bank.id]);
    const c3=await pool.query("SELECT COUNT(DISTINCT a.id) as n FROM applications a JOIN users u ON u.id=a.applicant_id WHERE u.bank_id=$1 AND a.status='in_progress' AND a.updated_at<NOW()-INTERVAL '30 days'",[bank.id]);
    const comp=parseInt(c1.rows[0].n);
    const prog=parseInt(c2.rows[0].n);
    const aband=parseInt(c3.rows[0].n);
    reports.push({bankId:bank.id,bankName:bank.name,contactEmail:bank.contact_email||'',completed:comp,inProgress:prog,abandoned:aband,total:comp*75});
  }
  return reports;
}

function generateInvoicePDF(bank: any, month: string, invoiceNum: string): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({margin:50});
    const chunks:Buffer[] = [];
    doc.on('data', (c:Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    // Header
    doc.fontSize(20).fillColor('#0F2340').text('DocuHogar', {continued:true});
    doc.fontSize(10).fillColor('#999').text('  —  3rd Avenue Creative Studio, LLC', {align:'left'});
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('info@docuhogar.com  |  docuhogar.com');
    doc.moveDown(1);
    // Invoice details
    doc.moveTo(50,doc.y).lineTo(562,doc.y).strokeColor('#0F2340').stroke();
    doc.moveDown(0.5);
    doc.fontSize(18).fillColor('#0F2340').text('INVOICE');
    doc.fontSize(10).fillColor('#333');
    doc.text('Invoice #: '+invoiceNum);
    doc.text('Period: '+month);
    doc.text('Date: '+new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}));
    doc.text('Due: Within 30 days');
    doc.moveDown(1);
    // Bill to
    doc.fontSize(11).fillColor('#0F2340').text('Bill To:');
    doc.fontSize(10).fillColor('#333').text(bank.bankName);
    if (bank.contactEmail) doc.text(bank.contactEmail);
    doc.moveDown(1);
    // Table header
    doc.moveTo(50,doc.y).lineTo(562,doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666');
    doc.text('Description',50,doc.y,{width:300});
    doc.text('Qty',350,doc.y-doc.currentLineHeight(),{width:60,align:'center'});
    doc.text('Unit Price',410,doc.y-doc.currentLineHeight(),{width:80,align:'right'});
    doc.text('Total',490,doc.y-doc.currentLineHeight(),{width:70,align:'right'});
    doc.moveDown(0.3);
    doc.moveTo(50,doc.y).lineTo(562,doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#333');
    doc.text('Expedientes completados — '+month,50,doc.y,{width:300});
    doc.text(String(bank.completed),350,doc.y-doc.currentLineHeight(),{width:60,align:'center'});
    doc.text('$75.00',410,doc.y-doc.currentLineHeight(),{width:80,align:'right'});
    doc.text('$'+bank.total.toFixed(2),490,doc.y-doc.currentLineHeight(),{width:70,align:'right'});
    doc.moveDown(1.5);
    doc.fontSize(13).fillColor('#0F2340').text('Total Due: $'+bank.total.toFixed(2),{align:'right'});
    doc.moveDown(2);
    doc.moveTo(50,doc.y).lineTo(562,doc.y).strokeColor('#ddd').stroke();
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('Payment via ACH wire transfer to 3rd Avenue Creative Studio, LLC');
    doc.text('Questions: info@docuhogar.com');
    doc.end();
  });
}

export async function sendMonthlyBillingReport(year:number, month:number) {
  const reports=await getBillingData(year,month);
  const monthName=new Date(year,month-1,1).toLocaleDateString('en-US',{month:'long',year:'numeric'});
  const totalRevenue=reports.reduce((s,r)=>s+r.total,0);
  // Admin summary HTML
  const rows=reports.map(r=>
    `<tr><td style='padding:8px;border-bottom:1px solid #eee'>${r.bankName}</td>`+
    `<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>${r.completed}</td>`+
    `<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>${r.inProgress}</td>`+
    `<td style='padding:8px;border-bottom:1px solid #eee;text-align:center'>${r.abandoned}</td>`+
    `<td style='padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold'>$${r.total.toFixed(2)}</td></tr>`
  ).join('');
  const th="<th style='padding:10px;text-align:";
  const adminHtml='<div style="font-family:sans-serif;max-width:700px;margin:0 auto;padding:32px">'
    +'<h2 style="color:#0F2340">DocuHogar — Reporte Mensual '+monthName+'</h2>'
    +'<table style="width:100%;border-collapse:collapse;margin-top:16px"><thead><tr style="background:#F4F7FB">'
    +th+'left">Banco</th>'+th+'center">Completados</th>'+th+'center">En Progreso</th>'+th+'center">Abandonados</th>'+th+'right">Monto</th></tr></thead>'
    +'<tbody>'+rows+'</tbody></table>'
    +'<p style="margin-top:24px;font-size:18px;font-weight:bold;color:#0F2340">Total a cobrar: $'+totalRevenue.toFixed(2)+'</p>'
    +'</div>';
  await resend.emails.send({from:FROM,to:ADMIN_EMAIL,subject:'DocuHogar — Reporte '+monthName,html:adminHtml});
  for (let i=0;i<reports.length;i++) {
    const r=reports[i];
    if (!r.contactEmail||r.completed===0) continue;
    const num=year+'-'+String(month).padStart(2,'0')+'-'+String(i+1).padStart(3,'0');
    const pdf=await generateInvoicePDF(r,monthName,num);
    const body='<p>Estimado equipo de '+r.bankName+',</p><p>Adjunto la factura para '+monthName+'. Total: $'+r.total.toFixed(2)+'</p><p>Pago via ACH wire transfer en 30 dias.</p><p>DocuHogar — info@docuhogar.com</p>';
    await resend.emails.send({from:FROM,to:r.contactEmail,subject:'DocuHogar Factura '+monthName,html:body,attachments:[{filename:'Factura-'+num+'.pdf',content:pdf}]});
  }
  console.log('Billing done for '+monthName+', total $'+totalRevenue.toFixed(2));
}
