"use client";
import { useState, useEffect } from "react";
const API = process.env.NEXT_PUBLIC_API_URL || "";
const NAVY = "#0F2340";

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [officers, setOfficers] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [pending, setPending] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (!stored) { window.location.href = "/"; return; }
    const u = JSON.parse(stored);
    if (u.role !== "admin") { window.location.href = "/dashboard"; return; }
    setUser(u);
    fetch(API + "/api/v1/admin/stats", { headers: { "x-user-id": u.id } })
      .then(r => r.json()).then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch(API + "/api/v1/admin/users", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setOfficers((d.users||[]).filter((u:any)=>["officer","admin"].includes(u.role)))).catch(console.error);
    if (tab === "users") fetch(API + "/api/v1/admin/users", { headers: { "x-user-id": user.id } }).then(r => r.json()).then(d => setUsers(d.users || [])).catch(console.error);
    if (tab === "documents") fetch(API + "/api/v1/admin/documents", { headers: { "x-user-id": user.id } }).then(r=>r.json()).then(d=>setDocs(d.docs||[])).catch(console.error);
    if (tab === "applications" || tab === "pending") fetch(API + "/api/v1/officer/applications", { headers: { "x-user-id": user.id } }).then(r => r.json()).then(d => setApps(d.applications || [])).catch(console.error);
    if (tab === "audit") fetch(API + "/api/v1/admin/audit-log", { headers: { "x-user-id": user.id } }).then(r => r.json()).then(d => setLogs(d.logs || [])).catch(console.error);
  }, [tab, user]);
  async function assignOfficer(appId:string, officerId:string) {
    if (!user) return;
    await fetch(API + "/api/v1/admin/applications/"+appId+"/assign", {
      method:"PATCH", headers:{"Content-Type":"application/json","x-user-id":user.id},
      body:JSON.stringify({officer_id:officerId||null})
    });
    setApps(prev=>prev.map((a:any)=>a.id===appId?{...a,assigned_to:officerId,assigned_email:officers.find((o:any)=>o.id===officerId)?.email}:a));
  }

  async function inviteOfficer() {
    if (!inviteEmail || !user) return;
    const r = await fetch(API + "/api/v1/admin/invite-officer", { method: "POST", headers: { "Content-Type": "application/json", "x-user-id": user.id }, body: JSON.stringify({ email: inviteEmail, full_name: inviteName }) });
    const d = await r.json();
    setMsg(d.success ? "Invite sent to " + inviteEmail : "Error: " + (d.error || "unknown"));
    setInviteEmail(""); setInviteName("");
  }

  if (!user) return <main style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif" }}>Loading...</main>;

  const TABS = [{ id: "stats", label: "Dashboard" },{ id: "applications", label: "Applications" },{ id: "documents", label: "Documents" },{ id: "users", label: "Users" },{ id: "pending", label: "Pending Review" },{ id: "audit", label: "Audit Log" },{ id: "invite", label: "Invite Officer" }];
  return (
    <main style={{ fontFamily:"sans-serif", background:"#F4F7FB", minHeight:"100vh" }}>
      <div style={{ background:NAVY, color:"white", padding:"16px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontWeight:700, fontSize:18 }}>DocuHogar Admin</span>
        <span style={{ fontSize:13, opacity:0.7 }}>{user.email}</span>
      </div>
      <div style={{ display:"flex", background:"white", borderBottom:"2px solid #e0e7ef", padding:"0 32px" }}>
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
        {tab==="stats" && (
          <div>
            <h2 style={{color:NAVY,marginBottom:24}}>Overview</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
              {([
                {label:"Applications",val:stats?.applications,dest:"applications",color:"#0F2340"},
                {label:"Documents",val:stats?.documents,dest:"documents",color:"#1a7a4a"},
                {label:"Applicants",val:stats?.applicants,dest:"users",color:"#0F2340"},
                {label:"Pending Review",val:stats?.pendingReview,dest:"pending",color:"#c0392b"},
              ]).map(({label,val,dest,color})=>(
                <div key={label} onClick={()=>{setTab(dest);setMsg("");}}
                  style={{background:"white",borderRadius:12,padding:24,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.07)"}}>
                  <div style={{fontSize:13,color:"#666",marginBottom:8}}>{label}</div>
                  <div style={{fontSize:32,fontWeight:700,color}}>{val??"-"}</div>
                  <div style={{fontSize:11,color:"#aaa",marginTop:6}}>Click to view</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab==="users" && (<div><h2 style={{color:NAVY}}>Users</h2><table style={{width:"100%",borderCollapse:"collapse",background:"white"}}><thead><tr><th style={{padding:"12px",textAlign:"left"}}>Email</th><th style={{padding:"12px",textAlign:"left"}}>Role</th><th style={{padding:"12px",textAlign:"left"}}>Joined</th></tr></thead><tbody>{users.map((u:any)=>(<tr key={u.id} style={{borderTop:"1px solid #eee"}}><td style={{padding:"12px"}}>{u.email}</td><td style={{padding:"12px",fontWeight:600}}>{u.role}</td><td style={{padding:"12px",fontSize:12,color:"#999"}}>{new Date(u.created_at).toLocaleDateString()}</td></tr>))}</tbody></table></div>)}
        {tab==="audit" && (<div>
          <h2 style={{color:NAVY,marginBottom:16}}>Audit Log</h2>
          <table style={{width:'100%',borderCollapse:'collapse',background:'white'}}>
            <thead><tr style={{background:'#F4F7FB'}}>
              <th style={{padding:'10px',textAlign:'left'}}>Time</th>
              <th style={{padding:'10px',textAlign:'left'}}>Actor</th>
              <th style={{padding:'10px',textAlign:'left'}}>Action</th>
            </tr></thead>
            <tbody>{logs.map((l:any)=>(
              <tr key={l.id} style={{borderTop:'1px solid #eee'}}>
                <td style={{padding:'10px',color:'#999',fontSize:12}}>{new Date(l.created_at).toLocaleString()}</td>
                <td style={{padding:'10px'}}>{l.actor_email||'-'}</td>
                <td style={{padding:'10px',fontWeight:600,color:NAVY}}>{l.action}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>)}
        {tab==="documents" && (<div>
          <h2 style={{color:"#0F2340",marginBottom:16}}>All Documents</h2>
          <table style={{width:"100%",borderCollapse:"collapse",background:"white"}}>
            <thead><tr style={{background:"#F4F7FB"}}>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Applicant</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Type</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Status</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Uploaded</th>
            </tr></thead>
            <tbody>{docs.map((d:any)=>(
              <tr key={d.id} style={{borderTop:"1px solid #eee"}}>
                <td style={{padding:"12px",fontSize:13}}>{d.full_name||d.email}</td>
                <td style={{padding:"12px",fontWeight:600,color:"#0F2340"}}>{(d.doc_type||"").replace(/_/g," ")}</td>
                <td style={{padding:"12px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600}}>{d.status}</span></td>
                <td style={{padding:"12px",fontSize:12,color:"#999"}}>{d.uploaded_at?new Date(d.uploaded_at).toLocaleDateString():"-"}</td>
              </tr>
            ))}</tbody></table></div>)}
        {(tab==="applications"||tab==="pending") && (<div>
          <h2 style={{color:"#0F2340",marginBottom:16}}>{tab==="pending"?"Pending Review":"Applications"}</h2>
          <table style={{width:"100%",borderCollapse:"collapse",background:"white",borderRadius:12}}>
            <thead><tr style={{background:"#F4F7FB"}}>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Applicant</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Status</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Docs</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Assigned To</th>
              <th style={{padding:"12px",textAlign:"left",fontSize:12}}>Updated</th>
            </tr></thead>
            <tbody>{apps.filter((a:any)=>tab!=="pending"||(a.total_docs-a.approved_docs)>0).map((a:any)=>(
              <tr key={a.id} style={{borderTop:"1px solid #eee"}}>
                <td style={{padding:"12px"}}><div style={{fontWeight:600}}>{a.full_name||a.email}</div><div style={{fontSize:12,color:"#999"}}>{a.email}</div></td>
                <td style={{padding:"12px"}}><span style={{padding:"3px 10px",borderRadius:20,fontSize:12,fontWeight:600,background:a.status==="approved"?"#f0fff4":a.status==="rejected"?"#fff0f0":"#f0f4ff",color:a.status==="approved"?"#1a7a4a":a.status==="rejected"?"#c0392b":"#0F2340"}}>{a.status}</span></td>
                <td style={{padding:"12px"}}>{a.approved_docs}/{a.total_docs} docs</td>
                <td style={{padding:"12px"}}><select value={a.assigned_to||""} onChange={e=>assignOfficer(a.id,e.target.value)} style={{padding:"6px 10px",border:"1px solid #ddd",borderRadius:6,fontSize:13,cursor:"pointer"}}><option value="">Unassigned</option>{officers.map((o:any)=>(<option key={o.id} value={o.id}>{o.full_name||o.email}</option>))}</select></td>
                <td style={{padding:"12px",fontSize:12,color:"#999"}}>{new Date(a.updated_at).toLocaleDateString()}</td>
              </tr>
            ))}</tbody></table></div>)}
        {tab==="invite" && (<div>
          <h2 style={{color:NAVY,marginBottom:24}}>Invite Officer</h2>
          <div style={{background:'white',padding:32,borderRadius:12,maxWidth:480,boxShadow:'0 1px 4px rgba(0,0,0,0.07)'}}>
            <div style={{marginBottom:16}}>
              <label style={{display:'block',fontWeight:600,marginBottom:6,fontSize:13}}>Email *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder='officer@bank.com'
                style={{width:'100%',padding:'10px 12px',border:'1px solid #ddd',borderRadius:8,fontSize:14,boxSizing:'border-box' as any}} />
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:'block',fontWeight:600,marginBottom:6}}>Full Name</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)}
                style={{width:'100%',padding:'10px',border:'1px solid #ddd',borderRadius:8}} />
            </div>
            <button onClick={inviteOfficer}
              style={{padding:'12px 28px',background:NAVY,color:'white',border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer'}}>
              Send Invite
            </button>
            {msg && <p style={{marginTop:16,color:msg.startsWith('Error')?'#c0392b':'#1a7a4a',fontWeight:500}}>{msg}</p>}
          </div>
        </div>)}
      </div>
    </main>
  );
}
