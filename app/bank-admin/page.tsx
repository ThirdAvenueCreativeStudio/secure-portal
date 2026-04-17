"use client";
import { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "";
const NAVY = "#0F2340";
const GOLD = "#C8973A";

export default function BankAdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("team");
  const [team, setTeam] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href="/"; return; }
    const u = JSON.parse(stored);
    if (!["bank_admin","admin"].includes(u.role)) { window.location.href="/dashboard"; return; }
    setUser(u);
    fetch(API+"/api/v1/bank-admin/stats",{headers:{"x-user-id":u.id}}).then(r=>r.json()).then(setStats);
    fetch(API+"/api/v1/bank-admin/team",{headers:{"x-user-id":u.id}}).then(r=>r.json()).then(d=>setTeam(d.users||[]));
  }, []);

  async function inviteOfficer() {
    if (!inviteEmail || !user) return;
    const r = await fetch(API+"/api/v1/bank-admin/invite-officer",{
      method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},
      body:JSON.stringify({email:inviteEmail,full_name:inviteName})
    });
    const d = await r.json();
    setMsg(d.success?"Invitacion enviada a "+inviteEmail:"Error: "+(d.error||"unknown"));
    if (d.success) {
      setInviteEmail(""); setInviteName("");
      fetch(API+"/api/v1/bank-admin/team",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setTeam(d.users||[]));
    }
  }

  if (!user) return <main style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh"}}>Loading...</main>;

  return (
    <main style={{fontFamily:"sans-serif",background:"#F4F7FB",minHeight:"100vh"}}>
      <div style={{background:NAVY,color:"white",padding:"16px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:18}}>DocuHogar <span style={{color:GOLD,fontSize:13,fontWeight:400}}>Portal Bancario</span></span>
        <span style={{fontSize:13,opacity:0.7}}>{user.email}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,padding:"24px 32px"}}>
        {[["Expedientes",stats?.applications],["Oficiales",stats?.officers],["Portal","Activo"]].map(([l,v]:any)=>(
          <div key={l} style={{background:"white",borderRadius:12,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{fontSize:13,color:"#666",marginBottom:8}}>{l}</div>
            <div style={{fontSize:32,fontWeight:700,color:NAVY}}>{v??"-"}</div>
          </div>
        ))}
      </div>
      <div style={{display:"flex",background:"white",borderBottom:"2px solid #e0e7ef",padding:"0 32px"}}>
        {[["team","Mi Equipo"],["invite","Invitar Oficial"]].map(([id,label])=>(
          <button key={id} onClick={()=>{setTab(id);setMsg("");}} style={{padding:"14px 20px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===id?700:400,color:tab===id?NAVY:"#666",borderBottom:tab===id?"2px solid "+NAVY:"2px solid transparent",fontSize:14}}>{label}</button>
        ))}
      </div>
      <div style={{padding:32,maxWidth:900,margin:"0 auto"}}>
        {tab==="team" && (<div>
          <h2 style={{color:NAVY,marginBottom:16}}>Equipo</h2>
          <table style={{width:"100%",borderCollapse:"collapse",background:"white"}}>
            <thead><tr style={{background:"#F4F7FB"}}>
              <th style={{padding:"12px",textAlign:"left"}}>Email</th>
              <th style={{padding:"12px",textAlign:"left"}}>Nombre</th>
              <th style={{padding:"12px",textAlign:"left"}}>Rol</th>
            </tr></thead>
            <tbody>{team.map((u:any)=>(
              <tr key={u.id} style={{borderTop:"1px solid #eee"}}>
                <td style={{padding:"12px",fontSize:14}}>{u.email}</td>
                <td style={{padding:"12px",fontSize:14}}>{u.full_name||"-"}</td>
                <td style={{padding:"12px",fontWeight:600,color:NAVY,fontSize:13}}>{u.role}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>)}
        {tab==="invite" && (<div>
          <h2 style={{color:NAVY,marginBottom:24}}>Invitar Oficial</h2>
          <div style={{background:"white",padding:32,borderRadius:12,maxWidth:480,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontWeight:600,marginBottom:6,fontSize:13}}>Email *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="oficial@banco.com"
                style={{width:"100%",padding:"10px",border:"1px solid #ddd",borderRadius:8,fontSize:14}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontWeight:600,marginBottom:6}}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:8}} />
            </div>
            <button onClick={inviteOfficer} style={{width:'100%',padding:'12px',background:NAVY,color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>Enviar Invitacion</button>
            {msg && <p style={{marginTop:16,fontWeight:500,color:msg.startsWith('Error')?'#c0392b':'#1a7a4a'}}>{msg}</p>}
          </div>
        </div>)}
      </div>
    </main>
  );
}
