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
    if (tab === "team") {
      fetch(API+"/api/v1/bank-admin/team", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setTeam(d.users||[]));
      fetch(API+"/api/v1/bank-admin/officer-workload", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setWorkload(d.officers||[]));
    }
  }, [tab, user]);

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

  const TABS = [
    { id: "dashboard", label: "Dashboard" },
    { id: "applications", label: "Expedientes" },
    { id: "team", label: "Mi Equipo" },
    { id: "invite", label: "Invitar Oficial" },
    { id: "checklist", label: "Checklist" },
  ];

  const statusColor: Record<string,string> = { approved:"#1a7a4a", rejected:"#c0392b", in_progress:"#185FA5" };
  const statusBg: Record<string,string> = { approved:"#f0fff4", rejected:"#fff0f0", in_progress:"#f0f4ff" };

  return (
    <main style={{ fontFamily:"sans-serif", background:"#F4F7FB", minHeight:"100vh" }}>
      <div style={{ background:NAVY, color:"white", padding:"16px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:700, fontSize:18 }}>DocuHogar <span style={{ color:GOLD, fontSize:13, fontWeight:400 }}>Portal Bancario</span></span>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ fontSize:13, opacity:0.7 }}>{user.email}</span>
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
      </div>
    </main>
  );
}
