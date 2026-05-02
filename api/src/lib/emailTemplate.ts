const NAVY = '#0F2340';
const GOLD = '#C8973A';
const GREEN = '#1D7A4E';
const RED = '#9B2626';
const APP = process.env.APP_URL || 'https://demo.docuhogar.com';

export function emailLayout(content: string, footer = true) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f2ed;font-family:sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ed;padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:white;border-radius:16px;overflow:hidden">
<!-- Header -->
<tr><td style="background:${NAVY};padding:24px 32px;text-align:center">
  <span style="font-size:22px;font-weight:700;color:white;letter-spacing:-0.5px">Docu</span><span style="font-size:22px;font-weight:700;color:${GOLD};letter-spacing:-0.5px">Hogar</span>
  <div style="font-size:11px;color:rgba(255,255,255,0.5);margin-top:4px">Portal Seguro de Documentos</div>
</td></tr>
<!-- Content -->
<tr><td style="padding:32px">${content}</td></tr>
${footer ? `<!-- Footer -->
<tr><td style="padding:16px 32px;background:#f9f8f5;border-top:1px solid #eee;text-align:center">
  <p style="font-size:11px;color:#999;margin:0">DocuHogar &mdash; Cifrado AES-256 &bull; Todos los documentos protegidos</p>
  <p style="font-size:11px;color:#bbb;margin:4px 0 0">Este es un correo automatico. No responda a este mensaje.</p>
</td></tr>` : ""}
</table></td></tr></table></body></html>`;
}

export function emailButton(url: string, label: string, color = NAVY) {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:14px 32px;background:${color};color:white;border-radius:10px;text-decoration:none;font-weight:600;font-size:15px">${label} &rarr;</a>`;
}

export function emailHeading(text: string, color = NAVY) {
  return `<h2 style="color:${color};font-size:20px;margin:0 0 12px;font-weight:700">${text}</h2>`;
}

export function emailText(text: string) {
  return `<p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 8px">${text}</p>`;
}

export function emailBadge(label: string, bg: string, color: string) {
  return `<span style="display:inline-block;padding:4px 14px;background:${bg};color:${color};border-radius:20px;font-size:13px;font-weight:600">${label}</span>`;
}

export function emailNote(text: string) {
  return `<p style="font-size:12px;color:#999;margin-top:20px">${text}</p>`;
}

export { NAVY, GOLD, GREEN, RED, APP };
