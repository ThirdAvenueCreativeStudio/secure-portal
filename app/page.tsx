'use client';
import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState('es');
  const [stage, setStage] = useState('input');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const copy: Record<string, Record<string, string>> = {
    es: { title: 'Envíe sus documentos de forma segura', sub: 'Cifrado de extremo a extremo.', label: 'Correo electrónico', btn: 'Enviar enlace seguro', note: 'No se necesita contraseña.', sentTitle: 'Revise su correo', sentBody: 'Si su cuenta existe, recibira un enlace de acceso. Expira en 15 minutos.', placeholder: 'nombre@correo.com' },
    en: { title: 'Submit your documents securely', sub: 'End-to-end encrypted.', label: 'Email address', btn: 'Send secure link', note: 'No password needed.', sentTitle: 'Check your email', sentBody: 'If your account exists, you will receive an access link. It expires in 15 minutes.', placeholder: 'name@email.com' },
  };
  const t = copy[locale];

  async function handleSubmit() {
    if (!email || !email.includes('@')) { setError('Please enter a valid email'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(process.env.NEXT_PUBLIC_API_URL + '/api/v1/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (data.success) { setStage('sent'); }
      else { setError(data.error || 'Something went wrong'); }
    } catch { setError('Network error. Please try again.'); }
    setLoading(false);
  }

  if (stage === 'sent') return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF8F3',fontFamily:'sans-serif',padding:'20px'}}>
      <div style={{maxWidth:'400px',width:'100%',textAlign:'center',background:'white',borderRadius:'16px',padding:'36px',border:'1px solid rgba(15,35,64,0.1)'}}>
        <div style={{width:'56px',height:'56px',background:'#EAF5EE',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontSize:'24px'}}>✉</div>
        <h2 style={{color:'#0F2340',marginBottom:'10px',fontSize:'20px'}}>{t.sentTitle}</h2>
        <p style={{color:'#6B7280',fontSize:'14px',lineHeight:'1.6'}}>{t.sentBody}</p>
      </div>
    </main>
  );

  return (
    <main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF8F3',fontFamily:'sans-serif',padding:'20px'}}>
      <div style={{maxWidth:'400px',width:'100%'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{width:'64px',height:'64px',background:'#0F2340',borderRadius:'16px',margin:'0 auto 16px'}}></div>
          <div style={{display:'flex',justifyContent:'center',gap:'8px',marginBottom:'16px'}}>
            {['es','en'].map(l => <button key={l} onClick={()=>setLocale(l)} style={{padding:'4px 12px',borderRadius:'6px',border:'none',background:locale===l?'#C8973A':'#eee',cursor:'pointer'}}>{l.toUpperCase()}</button>)}
          </div>
          <h1 style={{color:'#0F2340',fontSize:'22px',marginBottom:'8px'}}>{t.title}</h1>
          <p style={{color:'#6B7280',fontSize:'14px'}}>{t.sub}</p>
        </div>
        <div style={{background:'white',borderRadius:'16px',padding:'28px'}}>
          <label style={{display:'block',fontSize:'12px',color:'#6B7280',marginBottom:'8px'}}>{t.label}</label>
          <input type='email' value={email} onChange={e=>setEmail(e.target.value)} placeholder={t.placeholder} style={{width:'100%',padding:'12px',border:'1.5px solid #e5e7eb',borderRadius:'10px',fontSize:'15px',boxSizing:'border-box'}} />
          {error && <p style={{color:'red',fontSize:'12px',marginTop:'8px'}}>{error}</p>}
          <button onClick={handleSubmit} disabled={loading} style={{width:'100%',padding:'14px',background:'#0F2340',color:'white',border:'none',borderRadius:'10px',marginTop:'16px',cursor:'pointer'}}>{loading?'...':t.btn}</button>
          <p style={{textAlign:'center',fontSize:'12px',color:'#9CA3AF',marginTop:'12px'}}>{t.note}</p>
        </div>
      </div>
    </main>
  );
}
