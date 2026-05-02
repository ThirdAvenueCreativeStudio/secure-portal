'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const NAVY = '#0F2340';
const GOLD = '#C8973A';

type App={id:string;email:string;full_name:string;status:string;total_docs:number;approved_docs:number;created_at:string;updated_at:string;assigned_to:string|null;assigned_name:string|null;assigned_email:string|null;phone?:string};
type Doc={id:string;doc_type:string;status:string;rejection_reason:string;mime_type?:string};
type CL={doc_type:string;label_es:string;label_en:string};

const sBg:Record<string,string>={approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC"};
const sColor:Record<string,string>={approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626"};
const sEs:Record<string,string>={approved:"Aprobado",uploaded:"Subido",pending:"Pendiente",rejected:"Rechazado",in_progress:"En progreso",submitted:"Enviado"};

export default function OfficerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState<App|null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [labels, setLabels] = useState<Record<string,string>>({});
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<"mine"|"unassigned"|"all">("mine");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviting, setInviting] = useState(false);
  const [viewDoc, setViewDoc] = useState<{url:string;mime:string}|null>(null);
  const [rejectId, setRejectId] = useState<string|null>(null);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.push("/"); return; }
    const p = JSON.parse(u);
    if (!["officer","admin"].includes(p.role)) { router.push("/dashboard"); return; }
    setUser(p);
    fetch(API+"/api/v1/officer/applications",{headers:{"x-user-id":p.id}})
      .then(r=>r.json()).then(d=>{setApps(d.applications||[]);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  async function loadApp(app: App) {
    setSelected(app);
    const res = await fetch(API+"/api/v1/officer/applications/"+app.id,{headers:{"x-user-id":user.id}});
    const data = await res.json();
    setDocs(data.documents||[]);
    if (data.checklist) {
      const m:Record<string,string>={};
      data.checklist.forEach((c:CL)=>{m[c.doc_type]=c.label_es;});
      setLabels(m);
    }
  }

  async function reviewDoc(docId:string, status:string, reason="") {
    await fetch(API+"/api/v1/officer/documents/"+docId,{
      method:"PATCH",headers:{"x-user-id":user.id,"Content-Type":"application/json"},
      body:JSON.stringify({status,rejection_reason:reason})
    });
    setDocs(prev=>prev.map(d=>d.id===docId?{...d,status,rejection_reason:reason}:d));
    setApps(prev=>prev.map(a=>{
      if(a.id!==selected?.id)return a;
      const ap=docs.filter(d=>d.id===docId?status==="approved":d.status==="approved").length;
      return{...a,approved_docs:ap};
    }));
    setRejectId(null);setRejectReason("");
  }

  async function viewDocument(docId:string) {
    const r=await fetch(API+"/api/v1/officer/documents/"+docId+"/view",{headers:{"x-user-id":user.id}});
    const ct=r.headers.get("content-type")||"application/pdf";
    const blob=await r.blob();
    setViewDoc({url:URL.createObjectURL(blob),mime:ct});
  }

  function logout(){localStorage.removeItem("user");router.push("/");}

  async function inviteApplicant() {
    if(!inviteEmail||!user)return;
    setInviting(true);setInviteMsg("");
    const r=await fetch(API+"/api/v1/officer/invite-applicant",{method:"POST",headers:{"Content-Type":"application/json","x-user-id":user.id},body:JSON.stringify({email:inviteEmail,full_name:inviteName,locale:"es"})});
    const d=await r.json();
    if(d.success){setInviteMsg("Invitacion enviada");setInviteEmail("");setInviteName("");
      fetch(API+"/api/v1/officer/applications",{headers:{"x-user-id":user.id}}).then(r=>r.json()).then(d=>setApps(d.applications||[]));
      setTimeout(()=>{setShowInvite(false);setInviteMsg("");},2500);
    }else{setInviteMsg("Error: "+(d.error||"unknown"));}
    setInviting(false);
  }

  const mine=apps.filter(a=>a.assigned_to===user?.id);
  const unassigned=apps.filter(a=>!a.assigned_to);
  const visible=section==="mine"?mine:section==="unassigned"?unassigned:apps;
  const docLabel=(dt:string)=>labels[dt]||dt.replace(/_/g," ");

  if(loading)return(<main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><p>Cargando...</p></main>);

  return(
    <main style={{minHeight:"100vh",background:"#FAF8F3",fontFamily:"sans-serif"}}>
      <nav style={{background:NAVY,padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:28,height:28,background:GOLD,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY,fontWeight:600,fontSize:12}}>DH</div>
          <span style={{color:"white",fontSize:13,fontWeight:500}}>DocuHogar</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(100,200,150,0.15)",color:"#6bcf8e",fontWeight:600}}>Oficial</span>
          <span style={{color:"rgba(255,255,255,0.6)",fontSize:12}}>{user?.email}</span>
          <button onClick={()=>setShowInvite(true)} style={{background:GOLD,border:"none",color:NAVY,padding:"8px 16px",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:700}}>+ Nueva Solicitud</button>
          <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12}}>Salir</button>
        </div>
      </nav>

      <div style={{maxWidth:960,margin:"0 auto",padding:"24px 16px"}}>
        <div style={{display:"flex",gap:8,marginBottom:20,flexWrap:"wrap"}}>
          {([["mine","Mis Expedientes",mine.length],["unassigned","Sin Asignar",unassigned.length],["all","Todos",apps.length]] as [typeof section,string,number][]).map(([id,label,count])=>(
            <button key={id} onClick={()=>{setSection(id);setSelected(null);}} style={{padding:"8px 16px",border:"none",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:section===id?700:400,background:section===id?NAVY:"white",color:section===id?"white":"#666"}}>{label} ({count})</button>
          ))}
        </div>

        {section==="mine"&&unassigned.length>0&&(
          <div onClick={()=>setSection("unassigned")} style={{background:"#fffbf0",border:"1px solid #f0d080",borderRadius:10,padding:"10px 16px",marginBottom:16,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#b7600a",fontWeight:600}}>{unassigned.length} solicitud(es) sin asignar</span>
            <span style={{fontSize:12,color:"#b7600a"}}>Ver &rarr;</span>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:selected?"1fr 1fr":"1fr",gap:16}}>
          <div>
            {visible.length===0&&<div style={{background:"white",borderRadius:12,padding:24,textAlign:"center",color:"#999"}}>No hay expedientes</div>}
            {visible.map(app=>{
              const pct=app.total_docs>0?Math.round((app.approved_docs/app.total_docs)*100):0;
              return(
                <div key={app.id} onClick={()=>loadApp(app)} style={{background:"white",borderRadius:12,padding:"14px 16px",marginBottom:8,cursor:"pointer",border:selected?.id===app.id?"2px solid "+NAVY:"1px solid rgba(15,35,64,0.1)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:600}}>{app.full_name||app.email}</div>
                      <div style={{fontSize:12,color:"#6B7280"}}>{app.email}</div>
                    </div>
                    <span style={{fontSize:10,padding:"3px 8px",borderRadius:5,background:sBg[app.status]||"#F3F4F6",color:sColor[app.status]||"#6B7280"}}>{sEs[app.status]||app.status}</span>
                  </div>
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,height:6,background:"#eee",borderRadius:3,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:pct===100?"#1D7A4E":NAVY,borderRadius:3}}/>
                    </div>
                    <span style={{fontSize:12,fontWeight:600,color:pct===100?"#1D7A4E":NAVY}}>{pct}%</span>
                  </div>
                  <div style={{fontSize:11,color:"#999",marginTop:4}}>{app.approved_docs}/{app.total_docs} aprobados</div>
                </div>);
            })}
          </div>

          {selected&&(
            <div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <p style={{fontSize:14,fontWeight:600,color:NAVY,margin:0}}>{selected.full_name||selected.email}</p>
                  <p style={{fontSize:12,color:"#999",margin:"2px 0 0"}}>{selected.email}</p>
                </div>
                <button onClick={()=>setSelected(null)} style={{border:"none",background:"none",cursor:"pointer",color:"#999",fontSize:20}}>x</button>
              </div>

              {docs.map(doc=>(
                <div key={doc.id} style={{background:"white",borderRadius:12,padding:"14px 16px",marginBottom:8,borderLeft:"3px solid "+(sColor[doc.status]||"#ddd")}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:500}}>{docLabel(doc.doc_type)}</div>
                      <span style={{fontSize:11,padding:"2px 8px",borderRadius:5,background:sBg[doc.status]||"#F3F4F6",color:sColor[doc.status]||"#6B7280"}}>{sEs[doc.status]||doc.status}</span>
                      {doc.rejection_reason&&<div style={{fontSize:11,color:"#9B2626",marginTop:4,padding:"4px 8px",background:"#FDECEC",borderRadius:4}}>{doc.rejection_reason}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",gap:6,alignItems:"flex-end"}}>
                      {doc.status!=="pending"&&<button onClick={()=>viewDocument(doc.id)} style={{padding:"6px 14px",background:"#EBF0FA",color:"#185FA5",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500}}>Ver</button>}
                      {doc.status==="uploaded"&&<div style={{display:"flex",gap:6}}>
                        <button onClick={()=>reviewDoc(doc.id,"approved")} style={{padding:"6px 14px",background:"#EAF5EE",color:"#1D7A4E",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500}}>Aprobar</button>
                        <button onClick={()=>setRejectId(doc.id)} style={{padding:"6px 14px",background:"#FDECEC",color:"#9B2626",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:500}}>Rechazar</button>
                      </div>}
                    </div></div></div>
              ))}
            </div>)}
        </div>
      </div>

      {viewDoc&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>setViewDoc(null)}>
          <div style={{background:"white",borderRadius:16,width:"90%",maxWidth:800,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
            <div style={{padding:"12px 20px",borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <span style={{fontWeight:600,color:NAVY}}>Documento</span>
              <button onClick={()=>setViewDoc(null)} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#999"}}>x</button>
            </div>
            <div style={{flex:1,overflow:"auto",padding:16}}>
              {viewDoc.mime.startsWith("image/")?<img src={viewDoc.url} style={{maxWidth:"100%"}} alt="doc"/>:
              <iframe src={viewDoc.url} style={{width:"100%",height:"70vh",border:"none"}} title="doc"/>}
            </div>
          </div>
        </div>
      )}

      {rejectId&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>{setRejectId(null);setRejectReason("");}}>
          <div style={{background:"white",borderRadius:16,padding:24,maxWidth:400,width:"100%"}} onClick={e=>e.stopPropagation()}>
            <h3 style={{color:"#9B2626",fontSize:16,marginBottom:16}}>Rechazar Documento</h3>
            <textarea value={rejectReason} onChange={e=>setRejectReason(e.target.value)} placeholder="Motivo del rechazo..." rows={3}
              style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:14,resize:"none",boxSizing:"border-box"}}/>
            <div style={{display:"flex",gap:12,marginTop:16}}>
              <button onClick={()=>{setRejectId(null);setRejectReason("");}} style={{flex:1,padding:12,background:"#F3F4F6",color:"#6B7280",border:"none",borderRadius:10,cursor:"pointer"}}>Cancelar</button>
              <button onClick={()=>reviewDoc(rejectId,"rejected",rejectReason)} disabled={!rejectReason} style={{flex:1,padding:12,background:rejectReason?"#9B2626":"#ddd",color:"white",border:"none",borderRadius:10,cursor:rejectReason?"pointer":"not-allowed",fontWeight:600}}>Rechazar</button>
            </div>
          </div>
        </div>
      )}

      {showInvite&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:999}}>
          <div style={{background:"white",borderRadius:16,padding:32,width:440,boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
              <h3 style={{color:NAVY,fontSize:18,fontWeight:700}}>Nueva Solicitud</h3>
              <button onClick={()=>{setShowInvite(false);setInviteMsg("");}} style={{border:"none",background:"none",cursor:"pointer",fontSize:20,color:"#999"}}>x</button>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Email *</label>
              <input value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="email@ejemplo.com" style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:24}}>
              <label style={{display:"block",fontSize:13,fontWeight:600,marginBottom:6}}>Nombre</label>
              <input value={inviteName} onChange={e=>setInviteName(e.target.value)} placeholder="Maria Garcia" style={{width:"100%",padding:10,border:"1px solid #ddd",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            </div>
            <button onClick={inviteApplicant} disabled={inviting} style={{width:"100%",padding:12,background:NAVY,color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:600,cursor:"pointer"}}>{inviting?"Enviando...":"Enviar Invitacion"}</button>
            {inviteMsg&&<p style={{marginTop:16,textAlign:"center",fontWeight:500,color:inviteMsg.startsWith("Error")?"#c0392b":"#1a7a4a"}}>{inviteMsg}</p>}
          </div>
        </div>
      )}

    </main>
  );
}
