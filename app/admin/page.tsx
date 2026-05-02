"use client";
import { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "";
const NAVY = "#0F2340";
const GOLD = "#C8973A";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [newBankName, setNewBankName] = useState("");
  const [newBankEmail, setNewBankEmail] = useState("");
  const [newBankLocale, setNewBankLocale] = useState("es");
  const [bankAdminEmail, setBankAdminEmail] = useState("");
  const [bankAdminName, setBankAdminName] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [bankMsg, setBankMsg] = useState("");
  const [billingMsg, setBillingMsg] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const s=localStorage.getItem("user"); if(!s){window.location.href="/";return;}
    const u=JSON.parse(s); if(u.role!=="admin"){window.location.href="/dashboard";return;}
    setUser(u);
    fetch(API+"/api/v1/admin/stats",{headers:{"x-user-id":u.id}}).then(r=>r.json()).then(setStats);
    fetch(API+"/api/v1/admin/users",{headers:{"x-user-id":u.id}}).then(r=>r.json()).then(d=>setOfficers((d.users||[]).filter((u:any)=>["officer","admin","bank_admin"].includes(u.role))));
  }, []);

  useEffect(() => {
    if(!user) return;
    if(tab==="users") fetch(API+"/api/v1/admin/users",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setUsers(d.users||[]));
    if(tab==="documents") fetch(API+"/api/v1/admin/documents",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setDocs(d.docs||[]));
    if(tab==="applications") fetch(API+"/api/v1/officer/applications",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setApps(d.applications||[]));
    if(tab==="banks") fetch(API+"/api/v1/admin/banks",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setBanks(d.banks||[]));
    if(tab==="audit") fetch(API+"/api/v1/admin/audit-log",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setLogs(d.logs||[]));
  }, [tab, user]);

  async function assignOfficer(appId:string,oid:string) {
    await fetch(API+"/api/v1/admin/applications/"+appId+"/assign",{method:"PATCH",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({officer_id:oid||null})});
    setApps(prev=>prev.map((a:any)=>a.id===appId?{...a,assigned_to:oid}:a));
  }

  async function triggerBilling() {
    setBillingLoading(true);setBillingMsg("");
    const n=new Date();const m=n.getMonth()||12;const y=m===12?n.getFullYear()-1:n.getFullYear();
    const r=await fetch(API+"/api/v1/admin/billing-report",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({month:m,year:y})});
    const d=await r.json();setBillingMsg(d.success?"Reporte enviado":"Error");setBillingLoading(false);
  }

  async function createBank() {
    if(!newBankName||!user)return;
    const r=await fetch(API+"/api/v1/admin/banks",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({name:newBankName,contact_email:newBankEmail,default_locale:newBankLocale})});
    const d=await r.json();
    if(d.bank){setBankMsg("Banco creado");setNewBankName("");setNewBankEmail("");setTab("banks");}
    else setBankMsg("Error");
  }

  async function inviteBankAdmin() {
    if(!bankAdminEmail||!selectedBankId||!user)return;
    const r=await fetch(API+"/api/v1/admin/invite-bank-admin",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({email:bankAdminEmail,full_name:bankAdminName,bank_id:selectedBankId})});
    const d=await r.json();
    setBankMsg(d.success?"Invitacion enviada":"Error");
    if(d.success){setBankAdminEmail("");setBankAdminName("");}
  }

  function logout(){localStorage.removeItem("user");window.location.href="/";}

  if(!user)return(<main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><p>Cargando...</p></main>);

  const TABS=[{id:"stats",label:"Dashboard"},{id:"banks",label:"Bancos"},{id:"applications",label:"Expedientes"},{id:"documents",label:"Documentos"},{id:"users",label:"Usuarios"},{id:"audit",label:"Registro"},{id:"billing",label:"Facturacion"}];

  const sBg:Record<string,string>={approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC",in_progress:"#f0f4ff",submitted:"#EBF0FA"};
  const sColor:Record<string,string>={approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626",in_progress:NAVY,submitted:"#185FA5"};

  return(
    <main style={{fontFamily:"sans-serif",background:"#F4F7FB",minHeight:"100vh"}}>
      <nav style={{background:NAVY,padding:"0 32px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,background:GOLD,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY,fontWeight:600,fontSize:12}}>DH</div>
          <span style={{color:"white",fontSize:15,fontWeight:600}}>DocuHogar</span>
          <span style={{color:"rgba(255,255,255,0.4)",fontSize:12}}>Admin</span>
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center"}}>
          <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(255,77,77,0.15)",color:"#ff6b6b",fontWeight:600}}>Administrador</span>
          <span style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>{user.email}</span>
          <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
      </nav>

      <div style={{display:"flex",background:"white",borderBottom:"2px solid #e0e7ef",padding:"0 32px",overflowX:"auto"}}>
        {TABS.map(t=>(<button key={t.id} onClick={()=>{setTab(t.id);setMsg("");setBankMsg("");}} style={{padding:"14px 20px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===t.id?700:400,color:tab===t.id?NAVY:"#666",borderBottom:tab===t.id?"2px solid "+NAVY:"2px solid transparent",fontSize:14,whiteSpace:"nowrap"}}>{t.label}</button>))}
      </div>

      <div style={{padding:"24px 32px",maxWidth:1100,margin:"0 auto"}}>

        {tab==="stats"&&stats&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,marginBottom:24}}>
            {[{l:"Bancos",v:stats.banks,c:NAVY},{l:"Expedientes",v:stats.applications,c:NAVY},{l:"Documentos",v:stats.documents,c:"#1D7A4E"},
              {l:"Solicitantes",v:stats.applicants,c:NAVY},{l:"Oficiales",v:stats.officers,c:"#185FA5"},{l:"Pendientes",v:stats.pendingReview,c:"#c0392b"}].map(({l,v,c})=>(
              <div key={l} style={{background:"white",borderRadius:12,padding:20,boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:12,color:"#999",marginBottom:6}}>{l}</div>
                <div style={{fontSize:28,fontWeight:700,color:c}}>{v??0}</div>
              </div>))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{background:"white",borderRadius:12,padding:20}}>
              <h3 style={{fontSize:14,color:NAVY,marginBottom:16}}>Documentos por Estado</h3>
              {(stats.docsByStatus||[]).map((d:any)=>{
                const pct=Math.round((parseInt(d.count)/(stats.documents||1))*100);
                return(<div key={d.status} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span>{d.status}</span><span style={{fontWeight:600}}>{d.count}</span></div>
                  <div style={{height:8,background:"#eee",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:pct+"%",background:sColor[d.status]||"#999",borderRadius:4}}/>
                  </div></div>)})}
            </div>
            <div style={{background:"white",borderRadius:12,padding:20}}>
              <h3 style={{fontSize:14,color:NAVY,marginBottom:16}}>Expedientes por Banco</h3>
              {(stats.bankStats||[]).map((b:any)=>(
                <div key={b.name} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:"1px solid #f0f0f0",fontSize:13}}>
                  <span style={{fontWeight:500}}>{b.name}</span>
                  <span style={{fontWeight:700,color:NAVY}}>{b.app_count}</span>
                </div>))}
            </div>
          </div>
        </div>)}

        {tab==="banks"&&(<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:32}}>
            <div style={{background:"white",padding:24,borderRadius:12}}>
              <h3 style={{color:NAVY,marginBottom:16}}>Crear Banco</h3>
              <div style={{marginBottom:12}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Nombre *</label><input value={newBankName} onChange={e=>setNewBankName(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,boxSizing:"border-box"}}/></div>
              <div style={{marginBottom:12}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Email</label><input value={newBankEmail} onChange={e=>setNewBankEmail(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,boxSizing:"border-box"}}/></div>
              <div style={{marginBottom:16}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Idioma</label><select value={newBankLocale} onChange={e=>setNewBankLocale(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8}}><option value="es">ES</option><option value="en">EN</option></select></div>
              <button onClick={createBank} style={{width:"100%",padding:10,background:NAVY,color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}}>Crear Banco</button>
            </div>
            <div style={{background:"white",padding:24,borderRadius:12}}>
              <h3 style={{color:NAVY,marginBottom:16}}>Invitar Bank Admin</h3>
              <div style={{marginBottom:12}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Banco *</label><select value={selectedBankId} onChange={e=>setSelectedBankId(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8}}><option value="">Seleccionar</option>{banks.map((b:any)=>(<option key={b.id} value={b.id}>{b.name}</option>))}</select></div>
              <div style={{marginBottom:12}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Email *</label><input value={bankAdminEmail} onChange={e=>setBankAdminEmail(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,boxSizing:"border-box"}}/></div>
              <div style={{marginBottom:16}}><label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:4}}>Nombre</label><input value={bankAdminName} onChange={e=>setBankAdminName(e.target.value)} style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,boxSizing:"border-box"}}/></div>
              <button onClick={inviteBankAdmin} style={{width:"100%",padding:10,background:"#1D7A4E",color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}}>Invitar</button>
            </div></div>
          {bankMsg&&<p style={{marginTop:12,fontWeight:500,color:"#1D7A4E"}}>{bankMsg}</p>}
        </div>)}

        {tab==="applications"&&(<div>
          <table style={{width:"100%",borderCollapse:"collapse",background:"white",borderRadius:12}}><thead><tr style={{background:"#F4F7FB"}}>
            <th style={{padding:12,textAlign:"left",fontSize:12}}>Solicitante</th><th style={{padding:12,fontSize:12}}>Estado</th><th style={{padding:12,fontSize:12}}>Docs</th><th style={{padding:12,fontSize:12}}>Asignado</th>
          </tr></thead><tbody>{apps.map((a:any)=>(
            <tr key={a.id} style={{borderTop:"1px solid #eee"}}>
              <td style={{padding:12}}><div style={{fontWeight:600}}>{a.full_name||a.email}</div><div style={{fontSize:11,color:"#999"}}>{a.email}</div></td>
              <td style={{padding:12,textAlign:"center"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:600,background:sBg[a.status]||"#f0f0f0",color:sColor[a.status]||"#666"}}>{a.status}</span></td>
              <td style={{padding:12,textAlign:"center"}}>{a.approved_docs}/{a.total_docs}</td>
              <td style={{padding:12}}><select value={a.assigned_to||""} onChange={e=>assignOfficer(a.id,e.target.value)} style={{padding:6,border:"1px solid #ddd",borderRadius:6,fontSize:12}}><option value="">--</option>{officers.map((o:any)=>(<option key={o.id} value={o.id}>{o.full_name||o.email}</option>))}</select></td>
            </tr>))}</tbody></table>
        </div>)}

        {tab==="documents"&&(<div><table style={{width:"100%",borderCollapse:"collapse",background:"white",borderRadius:12}}>
          <thead><tr style={{background:"#F4F7FB"}}><th style={{padding:12,textAlign:"left",fontSize:12}}>Solicitante</th><th style={{padding:12,fontSize:12}}>Tipo</th><th style={{padding:12,fontSize:12}}>Estado</th><th style={{padding:12,fontSize:12}}>Fecha</th></tr></thead>
          <tbody>{docs.map((d:any)=>(<tr key={d.id} style={{borderTop:"1px solid #eee"}}>
            <td style={{padding:12}}>{d.full_name||d.email}</td>
            <td style={{padding:12,textAlign:"center"}}>{(d.doc_type||"").replace(/_/g," ")}</td>
            <td style={{padding:12,textAlign:"center"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,background:sBg[d.status]||"#f0f0f0",color:sColor[d.status]||"#666"}}>{d.status}</span></td>
            <td style={{padding:12,textAlign:"center",fontSize:12,color:"#999"}}>{d.uploaded_at?new Date(d.uploaded_at).toLocaleDateString():"-"}</td>
          </tr>))}</tbody></table></div>)}

        {tab==="users"&&(<div><table style={{width:"100%",borderCollapse:"collapse",background:"white",borderRadius:12}}>
          <thead><tr style={{background:"#F4F7FB"}}><th style={{padding:12,textAlign:"left",fontSize:12}}>Email</th><th style={{padding:12,fontSize:12}}>Rol</th><th style={{padding:12,fontSize:12}}>Fecha</th></tr></thead>
          <tbody>{users.map((u:any)=>(<tr key={u.id} style={{borderTop:"1px solid #eee"}}>
            <td style={{padding:12}}>{u.email}</td>
            <td style={{padding:12,textAlign:"center"}}><span style={{padding:"3px 8px",borderRadius:20,fontSize:11,fontWeight:600}}>{u.role}</span></td>
            <td style={{padding:12,textAlign:"center",fontSize:12,color:"#999"}}>{new Date(u.created_at).toLocaleDateString()}</td>
          </tr>))}</tbody></table></div>)}

        {tab==="audit"&&(<div><table style={{width:"100%",borderCollapse:"collapse",background:"white",borderRadius:12}}>
          <thead><tr style={{background:"#F4F7FB"}}><th style={{padding:12,textAlign:"left",fontSize:12}}>Fecha</th><th style={{padding:12,fontSize:12}}>Actor</th><th style={{padding:12,fontSize:12}}>Accion</th></tr></thead>
          <tbody>{logs.map((l:any)=>(<tr key={l.id} style={{borderTop:"1px solid #eee"}}>
            <td style={{padding:12,fontSize:12,color:"#999"}}>{new Date(l.created_at).toLocaleString()}</td>
            <td style={{padding:12,textAlign:"center"}}>{l.actor_email||"-"}</td>
            <td style={{padding:12,textAlign:"center",fontWeight:600,color:NAVY}}>{l.action}</td>
          </tr>))}</tbody></table></div>)}

        {tab==="billing"&&(<div style={{maxWidth:520}}>
          <div style={{background:"white",padding:32,borderRadius:12}}>
            <h3 style={{color:NAVY,marginBottom:8}}>Reporte de Facturacion</h3>
            <p style={{fontSize:13,color:"#666",marginBottom:20}}>Envia resumen + facturas PDF a cada banco del mes anterior.</p>
            <button onClick={triggerBilling} disabled={billingLoading} style={{padding:"12px 24px",background:NAVY,color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}}>{billingLoading?"Enviando...":"Enviar Reporte"}</button>
            {billingMsg&&<p style={{marginTop:12,color:"#1D7A4E",fontWeight:500}}>{billingMsg}</p>}
          </div>
        </div>)}

      </div>
    </main>
  );
}
