'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type App = { id:string; email:string; full_name:string; status:string; total_docs:number; approved_docs:number; created_at:string; updated_at:string; assigned_to:string|null; assigned_name:string|null; assigned_email:string|null; };
type Doc = { id:string; doc_type:string; status:string; rejection_reason:string; };

const API = process.env.NEXT_PUBLIC_API_URL || '';
const sBg:Record<string,string>  = {approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC"};
const sColor:Record<string,string> = {approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626"};

export default function OfficerDashboard() {
  const router = useRouter();
  const [user, setUser]       = useState<any>(null);
  const [apps, setApps]       = useState<App[]>([]);
  const [selected, setSelected] = useState<App|null>(null);
  const [docs, setDocs]       = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'mine'|'unassigned'|'all'>('mine');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (!u) { router.push('/'); return; }
    const p = JSON.parse(u);
    if (!['officer','admin'].includes(p.role)) { router.push('/dashboard'); return; }
    setUser(p);
    fetch(API + '/api/v1/officer/applications', { headers: { 'x-user-id': p.id } })
      .then(r => r.json())
      .then(data => { setApps(data.applications || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function loadApp(app: App) {
    setSelected(app);
    const res = await fetch(API + '/api/v1/officer/applications/' + app.id, { headers: { 'x-user-id': user.id } });
    const data = await res.json();
    setDocs(data.documents || []);
  }

  async function reviewDoc(docId: string, status: string, reason = '') {
    await fetch(API + '/api/v1/officer/documents/' + docId, {
      method: 'PATCH', headers: { 'x-user-id': user.id, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, rejection_reason: reason })
    });
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
    setApps(prev => prev.map(a => {
      if (a.id !== selected?.id) return a;
      const approved = docs.filter(d => d.id === docId ? status === 'approved' : d.status === 'approved').length;
      return { ...a, approved_docs: approved };
    }));
  }

  function logout() { localStorage.removeItem('user'); router.push('/'); }

  async function inviteApplicant() {
    if (!inviteEmail || !user) return;
    setInviting(true); setInviteMsg('');
    const r = await fetch(API+'/api/v1/officer/invite-applicant',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-user-id':user.id},
      body:JSON.stringify({email:inviteEmail,full_name:inviteName,locale:'es'})
    });
    const d = await r.json();
    if (d.success) {
      setInviteMsg('Invitacion enviada a '+inviteEmail);
      setInviteEmail(''); setInviteName('');
      fetch(API+'/api/v1/officer/applications',{headers:{'x-user-id':user.id}}).then(r=>r.json()).then(d=>setApps(d.applications||[]));
      setTimeout(()=>{setShowInvite(false);setInviteMsg('');},2500);
    } else { setInviteMsg('Error: '+(d.error||'unknown')); }
    setInviting(false);
  }

  const mine       = apps.filter(a => a.assigned_to === user?.id);
  const unassigned = apps.filter(a => !a.assigned_to);
  const visible    = section === 'mine' ? mine : section === 'unassigned' ? unassigned : apps;

  if (loading) return <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}><p>Loading...</p></main>;

  return (
    <main style={{ minHeight:'100vh', background:'#FAF8F3', fontFamily:'sans-serif' }}>
      <nav style={{ background:'#0F2340', padding:'0 20px', height:'56px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ color:'white', fontSize:'13px', fontWeight:500 }}>DocuHogar · Loan Officer</span>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ color:'rgba(255,255,255,0.6)', fontSize:'12px' }}>{user?.email}</span>
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <button onClick={()=>setShowInvite(true)} style={{background:'#C8973A',border:'none',color:'#0F2340',padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontWeight:700}}>+ Nueva Solicitud</button>
            <button onClick={logout} style={{background:'transparent',border:'none',color:'rgba(255,255,255,0.6)',cursor:'pointer',fontSize:12}}>Logout</button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth:'960px', margin:'0 auto', padding:'24px 16px' }}>

        {/* Section tabs */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {([['mine','My Applications',mine.length],['unassigned','Unassigned',unassigned.length],['all','All',apps.length]] as [typeof section,string,number][]).map(([id,label,count]) => (
            <button key={id} onClick={() => { setSection(id); setSelected(null); }}
              style={{ padding:'8px 16px', border:'none', borderRadius:20, cursor:'pointer', fontSize:13, fontWeight:section===id?700:400,
                background:section===id?'#0F2340':'white', color:section===id?'white':'#666',
                boxShadow:section===id?'none':'0 1px 3px rgba(0,0,0,0.08)' }}>
              {label} <span style={{ opacity:0.7 }}>({count})</span>
            </button>
          ))}
        </div>

        {/* Unassigned callout */}
        {section === 'mine' && unassigned.length > 0 && (
          <div onClick={() => setSection('unassigned')} style={{ background:'#fffbf0', border:'1px solid #f0d080', borderRadius:10, padding:'10px 16px', marginBottom:16, cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:13, color:'#b7600a', fontWeight:600 }}>⚠ {unassigned.length} unassigned application{unassigned.length>1?'s':''} need an officer</span>
            <span style={{ fontSize:12, color:'#b7600a' }}>View →</span>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap:16 }}>

          {/* App list */}
          <div>
            <p style={{ fontSize:'11px', fontWeight:600, color:'#6B7280', textTransform:'uppercase', marginBottom:12 }}>
              {section==='mine'?'My Applications':section==='unassigned'?'Unassigned Queue':'All Applications'} ({visible.length})
            </p>
            {visible.length === 0 && (
              <div style={{ background:'white', borderRadius:12, padding:24, textAlign:'center', color:'#999', fontSize:14 }}>
                {section==='mine'?'No applications assigned to you yet.':'No applications here.'}
              </div>
            )}
            {visible.map(app => (
              <div key={app.id} onClick={() => loadApp(app)}
                style={{ background:'white', borderRadius:12, padding:'14px 16px', marginBottom:8, cursor:'pointer',
                  border: selected?.id===app.id ? '2px solid #0F2340' : '1px solid rgba(15,35,64,0.1)',
                  transition:'box-shadow 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontSize:14, fontWeight:600 }}>{app.full_name || app.email}</div>
                    <div style={{ fontSize:12, color:'#6B7280' }}>{app.email}</div>
                    <div style={{ fontSize:12, color:'#6B7280', marginTop:4 }}>{app.approved_docs}/{app.total_docs} docs approved</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4 }}>
                    <span style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:sBg[app.status]||'#F3F4F6', color:sColor[app.status]||'#6B7280' }}>{app.status}</span>
                    {app.assigned_to ? (
                      <span style={{ fontSize:10, color:'#1D7A4E', background:'#EAF5EE', padding:'2px 8px', borderRadius:10 }}>
                        👤 {app.assigned_name || app.assigned_email}
                      </span>
                    ) : (
                      <span style={{ fontSize:10, color:'#b7600a', background:'#fffbf0', padding:'2px 8px', borderRadius:10 }}>Unassigned</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Doc review panel */}
          {selected && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <p style={{ fontSize:'11px', fontWeight:600, color:'#6B7280', textTransform:'uppercase', margin:0 }}>
                  Documents — {selected.full_name || selected.email}
                </p>
                <button onClick={() => setSelected(null)} style={{ border:'none', background:'none', cursor:'pointer', color:'#999', fontSize:18 }}>×</button>
              </div>
              {docs.map(doc => (
                <div key={doc.id} style={{ background:'white', borderRadius:12, padding:'14px 16px', marginBottom:8, border:'1px solid rgba(15,35,64,0.1)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:500 }}>{doc.doc_type.replace(/_/g,' ')}</div>
                      <span style={{ fontSize:10, padding:'3px 8px', borderRadius:5, background:sBg[doc.status]||'#F3F4F6', color:sColor[doc.status]||'#6B7280' }}>{doc.status}</span>
                      {doc.rejection_reason && <div style={{ fontSize:11, color:'#9B2626', marginTop:4 }}>{doc.rejection_reason}</div>}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, alignItems:'flex-end' }}>
                      <button onClick={async () => { const r = await fetch(API+'/api/v1/officer/documents/'+doc.id+'/view',{headers:{'x-user-id':user.id}}); const blob=await r.blob(); window.open(URL.createObjectURL(blob),'_blank'); }}
                        style={{ padding:'6px 14px', background:'#EBF0FA', color:'#185FA5', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>View</button>
                      {doc.status === 'uploaded' && (
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => reviewDoc(doc.id,'approved')}
                            style={{ padding:'6px 14px', background:'#EAF5EE', color:'#1D7A4E', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>Approve</button>
                          <button onClick={() => { const r = prompt('Rejection reason:'); if (r) reviewDoc(doc.id,'rejected',r); }}
                            style={{ padding:'6px 14px', background:'#FDECEC', color:'#9B2626', border:'none', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:500 }}>Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {showInvite && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:999}}>
          <div style={{background:'white',borderRadius:16,padding:32,width:440,boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
              <h3 style={{color:'#0F2340',fontSize:18,fontWeight:700}}>Nueva Solicitud</h3>
              <button onClick={()=>{setShowInvite(false);setInviteMsg('');}} style={{border:'none',background:'none',cursor:'pointer',fontSize:20,color:'#999'}}>×</button>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Email *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder='email@banco.com' style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:8,fontSize:14}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder='Maria Garcia' style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:8,fontSize:14}} />
            </div>
            <button onClick={inviteApplicant} disabled={inviting} style={{width:'100%',padding:'12px',background:'#0F2340',color:'white',border:'none',borderRadius:8,fontSize:15,fontWeight:600,cursor:'pointer'}}>{inviting?'Enviando...':'Enviar Invitacion'}</button>
{inviteMsg&&<p style={{marginTop:16,textAlign:'center',fontWeight:500,color:inviteMsg.startsWith('Error')?'#c0392b':'#1a7a4a'}}>{inviteMsg}</p>}
          </div>
        </div>
      )}

    </main>
  );
}

