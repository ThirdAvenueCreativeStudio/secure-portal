"use client";
import { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href="/"; return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { window.location.href="/dashboard"; return; }
    setUser(u);
    fetch(API+"/api/v1/admin/stats",{headers:{"x-user-id":u.id}}).then(r=>r.json()).then(setStats);
  }, []);

  async function fetchUsers(u:any) {
    const r = await fetch(API+"/api/v1/admin/users",{headers:{"x-user-id":u.id}});
    const d = await r.json(); setUsers(d.users||[]);
  }
  async function fetchLogs(u:any) {
    const r = await fetch(API+"/api/v1/admin/audit-log",{headers:{"x-user-id":u.id}});
    const d = await r.json(); setLogs(d.logs||[]);
  }
  async function inviteOfficer(u:any) {
    if (!inviteEmail) return;
    const r = await fetch(API+"/api/v1/admin/invite-officer",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":u.id},body:JSON.stringify({email:inviteEmail,full_name:inviteName})});
    const d = await r.json();
    setMsg(d.success?"Invite sent to "+inviteEmail:"Error: "+(d.error||"unknown"));
    setInviteEmail(""); setInviteName("");
  }

  function switchTab(t:string, u:any) {
    setTab(t); setMsg("");
    if (t==="users") fetchUsers(u);
    if (t==="audit") fetchLogs(u);
  }

  if (!user) return <main style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",fontFamily:"sans-serif"}}>Loading...</main>;

  const navy="#0F2340";
  const tabs=["stats","users","audit","invite"];
  const tabLabels:any={stats:"Dashboard",users:"Users",audit:"Audit Log",invite:"Invite Officer"};

  return (
    <main style={{fontFamily:"sans-serif",background:"#F4F7FB",minHeight:"100vh"}}>
      <div style={{background:navy,color:"white",padding:"16px 32px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontWeight:700,fontSize:18}}>DocuHogar Admin</span>
        <span style={{fontSize:13,opacity:0.7}}>{user.email}</span>
      </div>
      <div style={{display:"flex",gap:0,borderBottom:"2px solid #e0e7ef",background:"white",padding:"0 32px"}}>
        {tabs.map(t=>(
          <button key={t} onClick={()=>switchTab(t,user)} style={{padding:"14px 20px",border:"none",background:"none",cursor:"pointer",fontWeight:tab===t?700:400,color:tab===t?navy:"#666",borderBottom:tab===t?"2px solid "+navy:"2px solid transparent",fontSize:14}}>{tabLabels[t]}</button>
        ))}
      </div>
      <div style={{padding:32,maxWidth:1100,margin:"0 auto"}}>
        {tab==="stats" && (
          <div>
            <h2 style={{color:"#0F2340",marginBottom:24}}>Overview</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {[["Applications",stats?.applications],["Documents",stats?.documents],["Applicants",stats?.applicants],["Pending Review",stats?.pendingReview]].map(([label,val])=>(
                <div key={label as string} style={{background:"white",borderRadius:12,padding:24,boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                  <div style={{fontSize:13,color:"#666",marginBottom:8}}>{label}</div>
                  <div style={{fontSize:32,fontWeight:700,color:"#0F2340"}}>{val??"-"}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="users" && (<div>
<h2 style={{color:"#0F2340",marginBottom:24}}>Users</h2>
<table style={{width:"100%",borderCollapse:"collapse",background:"white"}}><thead>
<tr><th style={{padding:"12px",textAlign:"left"}}>Email</th>
<th style={{padding:"12px",textAlign:"left"}}>Role</th></tr></thead>
<tbody>{users.map((u:any)=>(<tr key={u.id} style={{borderTop:"1px solid #eee"}}>
<td style={{padding:"12px"}}>{u.email}</td>
<td style={{padding:"12px",fontWeight:600}}>{u.role}</td>
</tr>))}</tbody></table></div>)}
        {tab==="audit" && (<div><h2 style={{color:"#0F2340"}}>Audit Log</h2><table style={{width:"100%",borderCollapse:"collapse",background:"white",fontSize:13}}><thead><tr><th style={{padding:"10px",textAlign:"left"}}>Time</th><th style={{padding:"10px",textAlign:"left"}}>Actor</th><th style={{padding:"10px",textAlign:"left"}}>Action</th></tr></thead><tbody>{logs.map((l:any)=>(<tr key={l.id} style={{borderTop:"1px solid #eee"}}><td style={{padding:"10px",color:"#999"}}>{new Date(l.created_at).toLocaleString()}</td><td style={{padding:"10px"}}>{l.actor_email||"-"}</td><td style={{padding:"10px",fontWeight:600}}>{l.action}</td></tr>))}</tbody></table></div>)}
        {tab==="invite" && (<div><h2 style={{color:"#0F2340",marginBottom:24}}>Invite Officer</h2><div style={{background:"white",padding:32,borderRadius:12,maxWidth:480}}><div style={{marginBottom:16}}><label style={{display:"block",fontWeight:600,marginBottom:6}}>Email</label><input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} style={{width:"100%",padding:"10px",border:"1px solid #ddd",borderRadius:8}} /></div>
<div style={{marginBottom:24}}><label style={{display:"block",fontWeight:600,marginBottom:6}}>Full Name</label><input value={inviteName} onChange={e=>setInviteName(e.target.value)} style={{width:"100%",padding:"10px",border:"1px solid #ddd",borderRadius:8}} /></div>
<button onClick={()=>inviteOfficer(user)} style={{padding:"12px 28px",background:"#0F2340",color:"white",border:"none",borderRadius:8,fontWeight:600,cursor:"pointer"}}>Send Invite</button>
{msg && <p style={{marginTop:16,color:msg.startsWith("Error")?"red":"green"}}>{msg}</p>}
</div></div>)}
      </div>
    </main>
  );
}
