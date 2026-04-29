"use client";
import { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "";
const NAVY = "#0F2340";
const GOLD = "#C8973A";

export default function BankAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState<any>(null);
  const [apps, setApps] = useState<any[]>([]);
  const [team, setTeam] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [msg, setMsg] = useState("");
  const [checklist, setChecklist] = useState<any[]>([]);
  const [checklistMsg, setChecklistMsg] = useState("");

  // Audit log state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditPag, setAuditPag] = useState<any>({page:1,per_page:50,total:0,total_pages:0});
  const [auditF, setAuditF] = useState<any>({action:"",entity_type:"",date_from:"",date_to:""});
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditExp, setAuditExp] = useState<string|null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href = "/"; return; }
    const u = JSON.parse(stored);
    if (!["bank_admin","admin"].includes(u.role)) { window.location.href = "/dashboard"; return; }
    setUser(u);
    fetch(API+"/api/v1/bank-admin/stats", { headers: { "x-user-id": u.id } }).then(r=>r.json()).then(setStats);
  }, []);

  useEffect(() => {
    if (!user) return;
    if (tab === "applications") fetch(API+"/api/v1/bank-admin/applications", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setApps(d.applications||[]));
    if (tab === "audit") fetchAuditLogs(1);
    if (tab === "team") {
      fetch(API+"/api/v1/bank-admin/team", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setTeam(d.users||[]));
      fetch(API+"/api/v1/bank-admin/officer-workload", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setWorkload(d.officers||[]));
    }
  }, [tab, user]);

  async function fetchAuditLogs(page: number) {
    if (!user) return;
    setAuditLoading(true);
    try {
      const p = new URLSearchParams({page:String(page),per_page:"50"});
      if (auditF.action) p.set("action",auditF.action);
      if (auditF.entity_type) p.set("entity_type",auditF.entity_type);
      if (auditF.date_from) p.set("date_from",new Date(auditF.date_from).toISOString());
      if (auditF.date_to) p.set("date_to",new Date(auditF.date_to+"T23:59:59").toISOString());
      const r = await fetch(API+"/api/v1/bank-admin/audit-log?"+p.toString(),{headers:{"x-user-id":user.id}});
      const d = await r.json();
      setAuditLogs(d.data||[]);
      setAuditPag(d.pagination||{page:1,per_page:50,total:0,total_pages:0});
    } catch(e){console.error(e);}
    setAuditLoading(false);
  }

  async function exportAuditLog() {
    if (!user||!auditF.date_from||!auditF.date_to){alert("Seleccione rango de fechas");return;}
    const ep=new URLSearchParams({date_from:new Date(auditF.date_from).toISOString(),date_to:new Date(auditF.date_to+"T23:59:59").toISOString()});
    if(auditF.action)ep.set("action",auditF.action);
    try{
      const r=await fetch(API+"/api/v1/bank-admin/audit-log/export?"+ep.toString(),{headers:{"x-user-id":user.id}});
      if(!r.ok){const d=await r.json();alert(d.error);return;}
      const blob=await r.blob();
      const url=URL.createObjectURL(blob);
      const a=document.createElement("a");a.href=url;a.download="audit-log.csv";a.click();URL.revokeObjectURL(url);
    }catch(e){console.error(e);alert("Error");}
  }

  async function inviteOfficer() {
    if (!inviteEmail || !user) return;
    const r = await fetch(API+"/api/v1/bank-admin/invite-officer", {
      method: "POST", headers: { "Content-Type": "application/json", "x-user-id": user.id },
      body: JSON.stringify({ email: inviteEmail, full_name: inviteName })
    });
    const d = await r.json();
    setMsg(d.success ? "Invitacion enviada a "+inviteEmail : "Error: "+(d.error||"unknown"));
    if (d.success) { setInviteEmail(""); setInviteName(""); }
  }

  async function saveChecklist() {
    if (!user) return;
    const r=await fetch(API+"/api/v1/bank-admin/checklist",{
      method:"PUT",headers:{"Content-Type":"application/json","x-user-id":user.id},
      body:JSON.stringify({checklist})
    });
    const d=await r.json();
    setChecklistMsg(d.success?"Checklist guardado correctamente":"Error: "+(d.error||"unknown"));
    setTimeout(()=>setChecklistMsg(""),3000);
  }

  function logout() { localStorage.removeItem("user"); window.location.href = "/"; }

  if (!user) return <main style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", fontFamily:"sans-serif" }}>Loading...</main>;

  const AL:Record<string,string>={"auth.login":"Inicio sesion","doc.uploaded":"Doc subido","doc.approved":"Doc aprobado","doc.rejected":"Doc rechazado","doc.viewed":"Doc visto","app.created":"Exp creado","app.status_changed":"Estado cambiado","officer.invited":"Oficial invitado","app.assigned":"Exp asignado"};

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "applications", label: "Expedientes" },
    { id: "team", label: "Mi Equipo" },
    { id: "invite", label: "Invitar Oficial" },
    { id: "checklist", label: "Checklist" },
    { id: "audit", label: "Registro" },
  ];

  const statusColor: Record<string,string> = { approved:"#1a7a4a", rejected:"#c0392b", in_progress:"#185FA5" };
  const statusBg: Record<string,string> = { approved:"#f0fff4", rejected:"#fff0f0", in_progress:"#f0f4ff" };

  return (
    <main style={{ fontFamily:"sans-serif", background:"#F4F7FB", minHeight:"100vh" }}>
      <div style={{ background:NAVY, color:"white", padding:"16px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:700, fontSize:18 }}>DocuHogar <span style={{ color:GOLD, fontSize:13, fontWeight:400 }}>Portal Bancario</span></span>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(200,151,58,0.2)",color:"#C8973A",fontWeight:600}}>Admin Banco</span><span style={{ fontSize:13, opacity:0.7 }}>{user.email}</span>
          <button onClick={logout} style={{ background:"transparent", border:"1px solid rgba(255,255,255,0.3)", color:"white", padding:"6px 14px", borderRadius:6, cursor:"pointer", fontSize:12 }}>Logout</button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, padding:"24px 32px 0" }}>
        {([
          { label:"Expedientes", val:stats?.applications, dest:"applications", color:NAVY },
          { label:"Oficiales", val:stats?.officers, dest:"team", color:"#1a7a4a" },
          { label:"Portal", val:"Activo", dest:"dashboard", color:NAVY },
        ] as any[]).map(({label,val,dest,color}) => (
          <div key={label} onClick={()=>setTab(dest)}
            style={{ background:"white", borderRadius:12, padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.07)", cursor:"pointer", transition:"transform 0.15s" }}
            onMouseEnter={e=>(e.currentTarget.style.transform="translateY(-2px)")}
            onMouseLeave={e=>(e.currentTarget.style.transform="translateY(0)")}>
            <div style={{ fontSize:13, color:"#666", marginBottom:8 }}>{label}</div>
            <div style={{ fontSize:32, fontWeight:700, color }}>{val??"-"}</div>
            <div style={{ fontSize:11, color:"#aaa", marginTop:6 }}>Click para ver →</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", background:"white", borderBottom:"2px solid #e0e7ef", padding:"0 32px", marginTop:24 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setMsg(""); }}
            style={{ padding:"14px 20px", border:"none", background:"none", cursor:"pointer",
              fontWeight:tab===t.id?700:400, color:tab===t.id?NAVY:"#666",
              borderBottom:tab===t.id?"2px solid "+NAVY:"2px solid transparent", fontSize:14 }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding:32, maxWidth:1100, margin:"0 auto" }}>

        {/* Dashboard */}
        {tab === "dashboard" && (
          <div>
            <h2 style={{ color:NAVY, marginBottom:16 }}>Resumen</h2>
            <p style={{ color:"#666", fontSize:15 }}>Seleccione una sección del menú o haga clic en las tarjetas para navegar.</p>
          </div>
        )}

        {/* Applications */}
        {tab === "applications" && (
          <div>
            <h2 style={{ color:NAVY, marginBottom:16 }}>Expedientes</h2>
            <div style={{ background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ background:"#F4F7FB" }}>
                    {["Solicitante","Estado","Documentos","Oficial Asignado","Actualizado"].map(h=>(
                      <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, color:"#666", fontWeight:600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.length === 0 && (
                    <tr><td colSpan={5} style={{ padding:24, textAlign:"center", color:"#999" }}>No hay expedientes aún</td></tr>
                  )}
                  {apps.map((a:any) => {
                    const pct = a.total_docs > 0 ? Math.round((a.approved_docs/a.total_docs)*100) : 0;
                    return (
                      <tr key={a.id} style={{ borderTop:"1px solid #f0f0f0" }}>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ fontWeight:600, fontSize:14 }}>{a.full_name||a.email}</div>
                          <div style={{ fontSize:12, color:"#999" }}>{a.email}</div>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600,
                            background:statusBg[a.status]||"#f4f7fb", color:statusColor[a.status]||"#666" }}>
                            {a.status}
                          </span>
                        </td>
                        <td style={{ padding:"12px 16px" }}>
                          <div style={{ fontSize:13, marginBottom:4 }}>{a.approved_docs}/{a.total_docs} aprobados</div>
                          <div style={{ height:6, background:"#eee", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:pct+"%", background:pct===100?"#1a7a4a":NAVY, borderRadius:3 }} />
                          </div>
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:13, color:a.assigned_name?"#333":"#aaa" }}>
                          {a.assigned_name||"Sin asignar"}
                        </td>
                        <td style={{ padding:"12px 16px", fontSize:12, color:"#999" }}>
                          {new Date(a.updated_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Team */}
        {tab === "team" && (
          <div>
            <h2 style={{ color:NAVY, marginBottom:16 }}>Mi Equipo</h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
              {workload.length === 0 && team.length === 0 && (
                <div style={{ gridColumn:"1/-1", background:"white", borderRadius:12, padding:32, textAlign:"center", color:"#999" }}>
                  No hay oficiales aún. Invita a tu primer oficial.
                </div>
              )}
              {workload.map((o:any) => (
                <div key={o.id} style={{ background:"white", borderRadius:12, padding:24, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:15, color:NAVY }}>{o.full_name||o.email}</div>
                      <div style={{ fontSize:12, color:"#999", marginTop:2 }}>{o.email}</div>
                    </div>
                    <span style={{ background:"#f0f4ff", color:NAVY, padding:"4px 12px", borderRadius:20, fontSize:12, fontWeight:600 }}>Oficial</span>
                  </div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={{ background:"#F4F7FB", borderRadius:8, padding:12 }}>
                      <div style={{ fontSize:11, color:"#999", marginBottom:4 }}>Expedientes totales</div>
                      <div style={{ fontSize:24, fontWeight:700, color:NAVY }}>{o.total||0}</div>
                    </div>
                    <div style={{ background:"#F4F7FB", borderRadius:8, padding:12 }}>
                      <div style={{ fontSize:11, color:"#999", marginBottom:4 }}>En progreso</div>
                      <div style={{ fontSize:24, fontWeight:700, color:"#185FA5" }}>{o.active||0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite */}
        {tab === "invite" && (
          <div>
            <h2 style={{ color:NAVY, marginBottom:24 }}>Invitar Oficial</h2>
            <div style={{ background:"white", padding:32, borderRadius:12, maxWidth:480, boxShadow:"0 1px 4px rgba(0,0,0,0.07)" }}>
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, marginBottom:6 }}>Email *</label>
                <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}
                  placeholder="oficial@banco.com"
                  style={{ width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, boxSizing:"border-box" as any }} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ display:"block", fontSize:13, fontWeight:600, marginBottom:6 }}>Nombre</label>
                <input value={inviteName} onChange={e=>setInviteName(e.target.value)}
                  placeholder="Maria Garcia"
                  style={{ width:"100%", padding:"10px 12px", border:"1px solid #ddd", borderRadius:8, fontSize:14, boxSizing:"border-box" as any }} />
              </div>
              <button onClick={inviteOfficer}
                style={{ width:"100%", padding:"12px", background:NAVY, color:"white", border:"none", borderRadius:8, fontSize:15, fontWeight:600, cursor:"pointer" }}>
                Enviar Invitacion
              </button>
              {msg && <p style={{ marginTop:16, fontWeight:500, color:msg.startsWith("Error")?"#c0392b":"#1a7a4a" }}>{msg}</p>}
            </div>
          </div>
        )}

        {tab==="checklist" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h2 style={{color:NAVY}}>Checklist de Documentos</h2>
              <button onClick={saveChecklist} style={{padding:"10px 24px",background:NAVY,color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}}>Guardar Cambios</button>
            </div>
            <p style={{color:"#666",fontSize:13,marginBottom:24}}>Configure los documentos requeridos para nuevos expedientes en su institución.</p>
            <div style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#F4F7FB"}}>
                  <th style={{padding:"12px 16px",textAlign:"left",fontSize:12}}>Documento</th>
                  <th style={{padding:"12px 16px",textAlign:"left",fontSize:12}}>Etiqueta ES</th>
                  <th style={{padding:"12px 16px",textAlign:"left",fontSize:12}}>Etiqueta EN</th>
                  <th style={{padding:"12px 16px",textAlign:"center",fontSize:12}}>Requerido</th>
                </tr></thead>
                <tbody>{checklist.map((doc:any,i:number)=>(<tr key={doc.doc_type} style={{borderTop:"1px solid #f0f0f0"}}>
                  <td style={{padding:"12px 16px",fontSize:13,color:"#999",fontFamily:"monospace"}}>{doc.doc_type}</td>
                  <td style={{padding:"8px 16px"}}><input value={doc.label_es||""} onChange={e=>{const c2=[...checklist];c2[i]={...c2[i],label_es:e.target.value};setChecklist(c2);}} style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}} /></td>
                  <td style={{padding:"8px 16px"}}><input value={doc.label_en||""} onChange={e=>{const c2=[...checklist];c2[i]={...c2[i],label_en:e.target.value};setChecklist(c2);}} style={{width:"100%",padding:"6px 8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}} /></td>
                  <td style={{padding:"8px 16px",textAlign:"center"}}><input type="checkbox" checked={doc.required!==false} onChange={e=>{const c2=[...checklist];c2[i]={...c2[i],required:e.target.checked};setChecklist(c2);}} /></td>
                </tr>))}</tbody>
              </table>
            </div>
{checklistMsg&&<p style={{marginTop:16,fontWeight:500,color:checklistMsg.startsWith("Error")?"#c0392b":"#1a7a4a"}}>{checklistMsg}</p>}
          </div>
        )}
        {tab==="audit" && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h2 style={{color:NAVY,margin:0}}>Registro de Actividad</h2>
              <button onClick={exportAuditLog} style={{padding:"10px 20px",background:"#1a7a4a",color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer",fontSize:13}}>Exportar CSV</button>
            </div>
            <div style={{background:"white",borderRadius:12,padding:20,marginBottom:20,boxShadow:"0 1px 4px rgba(0,0,0,0.07)",display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr auto",gap:12,alignItems:"end"}}>
              <div>
                <label style={{display:"block",fontSize:11,color:"#999",marginBottom:4,fontWeight:600}}>Accion</label>
                <select value={auditF.action} onChange={e=>setAuditF({...auditF,action:e.target.value})} style={{width:"100%",padding:"8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}}>
                  <option value="">Todas</option>
                  {Object.entries(AL).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#999",marginBottom:4,fontWeight:600}}>Tipo</label>
                <select value={auditF.entity_type} onChange={e=>setAuditF({...auditF,entity_type:e.target.value})} style={{width:"100%",padding:"8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}}>
                  <option value="">Todos</option><option value="document">Documento</option><option value="application">Expediente</option>
                </select>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#999",marginBottom:4,fontWeight:600}}>Desde</label>
                <input type="date" value={auditF.date_from} onChange={e=>setAuditF({...auditF,date_from:e.target.value})} style={{width:"100%",padding:"8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}}/>
              </div>
              <div>
                <label style={{display:"block",fontSize:11,color:"#999",marginBottom:4,fontWeight:600}}>Hasta</label>
                <input type="date" value={auditF.date_to} onChange={e=>setAuditF({...auditF,date_to:e.target.value})} style={{width:"100%",padding:"8px",border:"1px solid #ddd",borderRadius:6,fontSize:13}}/>
              </div>
              <button onClick={()=>fetchAuditLogs(1)} style={{padding:"8px 20px",background:NAVY,color:"white",border:"none",borderRadius:6,fontWeight:600,cursor:"pointer",fontSize:13,height:36}}>Filtrar</button>
            </div>
            <div style={{background:"white",borderRadius:12,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead><tr style={{background:"#F4F7FB"}}>
                  {["Fecha","Actor","Accion","Tipo","Detalle"].map(h=><th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:12,color:"#666",fontWeight:600}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {auditLoading && <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#999"}}>Cargando...</td></tr>}
                  {!auditLoading && auditLogs.length===0 && <tr><td colSpan={5} style={{padding:24,textAlign:"center",color:"#999"}}>No hay registros</td></tr>}
                  {!auditLoading && auditLogs.map((log:any)=>{
                    const isX=auditExp===log.id;
                    return <tr key={log.id} onClick={()=>setAuditExp(isX?null:log.id)} style={{borderTop:"1px solid #f0f0f0",cursor:"pointer",background:isX?"#fafbfd":"white"}}>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#666",whiteSpace:"nowrap"}}>{new Date(log.created_at).toLocaleDateString()}<br/><span style={{color:"#aaa"}}>{new Date(log.created_at).toLocaleTimeString()}</span></td>
                      <td style={{padding:"12px 16px"}}><div style={{fontSize:13,fontWeight:500}}>{log.actor_name||log.actor_email||"Sistema"}</div><div style={{fontSize:11,color:"#999"}}>{log.actor_role||""}</div></td>
                      <td style={{padding:"12px 16px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,background:"#f0f4ff",color:NAVY}}>{AL[log.action]||log.action}</span></td>
                      <td style={{padding:"12px 16px",fontSize:13,color:"#666"}}>{log.entity_type||"-"}</td>
                      <td style={{padding:"12px 16px",fontSize:12,color:"#999"}}>{isX&&log.metadata?<pre style={{margin:0,fontSize:11,background:"#f4f7fb",padding:8,borderRadius:6,whiteSpace:"pre-wrap"}}>{JSON.stringify(log.metadata,null,2)}</pre>:<span>{log.entity_id?(log.entity_id as string).slice(0,8)+"...":"-"}</span>}</td>
                    </tr>})}
                </tbody>
              </table>
            </div>
            {auditPag.total_pages>1 && <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:20}}>
              <button disabled={auditPag.page<=1} onClick={()=>fetchAuditLogs(auditPag.page-1)} style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:6,background:"white",cursor:"pointer"}}>Anterior</button>
              <span style={{fontSize:13,color:"#666",lineHeight:"36px"}}>Pagina {auditPag.page} de {auditPag.total_pages} ({auditPag.total})</span>
              <button disabled={auditPag.page>=auditPag.total_pages} onClick={()=>fetchAuditLogs(auditPag.page+1)} style={{padding:"8px 16px",border:"1px solid #ddd",borderRadius:6,background:"white",cursor:"pointer"}}>Siguiente</button>
            </div>}
          </div>
        )}
      </div>
    </main>
  );
}
