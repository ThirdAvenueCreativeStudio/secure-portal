'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type App = { id:string; email:string; full_name:string; status:string; total_docs:number; approved_docs:number; created_at:string; };
type Doc = { id:string; doc_type:string; status:string; rejection_reason:string; s3_key:string; };

export default function OfficerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [selected, setSelected] = useState<App|null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const API = process.env.NEXT_PUBLIC_API_URL;
  useEffect(()=>{
    const u=localStorage.getItem("user");
    if(!u){router.push("/");return;}
    const p=JSON.parse(u);
    if(!["officer","admin"].includes(p.role)){router.push("/dashboard");return;}
    setUser(p);
    fetch(API+"/api/v1/officer/applications",{credentials:"include",headers:{"x-user-id":p.id}})
    .then(r=>r.json()).then(data=>{setApps(data.applications||[]);setLoading(false);})
    .catch(()=>setLoading(false));
  },[]);
  async function loadApp(app:App){
    setSelected(app);
    const res=await fetch(API+"/api/v1/officer/applications/"+app.id,{credentials:"include",headers:{"x-user-id":user.id}});
    const data=await res.json();
    setDocs(data.documents||[]);
  }

  async function reviewDoc(docId:string,status:string,reason=""){
    await fetch(API+"/api/v1/officer/documents/"+docId,{method:"PATCH",credentials:"include",headers:{"x-user-id":user.id,"Content-Type":"application/json"},body:JSON.stringify({status,rejection_reason:reason})});
    setDocs(prev=>prev.map(d=>d.id===docId?{...d,status}:d));
  }

  function logout(){localStorage.removeItem("user");router.push("/");}
  const sBg:Record<string,string>={approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC"};
  const sColor:Record<string,string>={approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626"};
  if(loading)return <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center"}}><p>Loading...</p></main>;
  return(<main style={{minHeight:"100vh",background:"#FAF8F3",fontFamily:"sans-serif"}}>
    <nav style={{background:"#0F2340",padding:"0 20px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{color:"white",fontSize:"13px",fontWeight:500}}>DocuHogar · Loan Officer</span>
      <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"12px"}}>Logout</button>
    </nav>
    <div style={{maxWidth:"900px",margin:"0 auto",padding:"24px 16px"}}>
      <p style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase",marginBottom:"12px"}}>Applications ({apps.length})</p>
      {apps.length===0&&<p style={{color:"#6B7280"}}>No applications yet.</p>}
      {apps.map(app=>(<div key={app.id} onClick={()=>loadApp(app)} style={{background:"white",borderRadius:"12px",padding:"14px 16px",marginBottom:"8px",cursor:"pointer",border:selected?.id===app.id?"2px solid #0F2340":"1px solid rgba(15,35,64,0.1)"}}>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <div><div style={{fontSize:"14px",fontWeight:500}}>{app.email}</div><div style={{fontSize:"12px",color:"#6B7280"}}>{app.approved_docs}/{app.total_docs} docs approved</div></div>
          <span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"5px",background:sBg[app.status]||"#F3F4F6",color:sColor[app.status]||"#6B7280"}}>{app.status}</span>
        </div></div>))}
      {selected&&(<div style={{marginTop:"24px"}}>
        <p style={{fontSize:"11px",fontWeight:600,color:"#6B7280",textTransform:"uppercase",marginBottom:"12px"}}>Documents - {selected.email}</p>
        {docs.map(doc=>(<div key={doc.id} style={{background:"white",borderRadius:"12px",padding:"14px 16px",marginBottom:"8px",border:"1px solid rgba(15,35,64,0.1)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div><div style={{fontSize:"14px",fontWeight:500}}>{doc.doc_type.replace(/_/g," ")}</div>
            <span style={{fontSize:"10px",padding:"3px 8px",borderRadius:"5px",background:sBg[doc.status]||"#F3F4F6",color:sColor[doc.status]||"#6B7280"}}>{doc.status}</span></div>
            <div style={{display:"flex",gap:"8px"}}><button onClick={async()=>{const r=await fetch(API+"/api/v1/officer/documents/"+doc.id+"/view",{credentials:"include",headers:{"x-user-id":user.id}});const d=await r.json();if(d.url)window.open(d.url,"_blank");}} style={{padding:"6px 14px",background:"#EBF0FA",color:"#185FA5",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:500}}>View</button></div>
            {doc.status==="uploaded"&&(<div style={{display:"flex",gap:"8px"}}>
              <button onClick={()=>reviewDoc(doc.id,"approved")} style={{padding:"6px 14px",background:"#EAF5EE",color:"#1D7A4E",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:500}}>Approve</button>
              <button onClick={()=>{const r=prompt("Rejection reason:");if(r)reviewDoc(doc.id,"rejected",r);}} style={{padding:"6px 14px",background:"#FDECEC",color:"#9B2626",border:"none",borderRadius:"8px",cursor:"pointer",fontSize:"12px",fontWeight:500}}>Reject</button>
            </div>)}
          </div></div>))}
      </div>)}
    </div>
  </main>);
}
