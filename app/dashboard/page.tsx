'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || '';
const NAVY = '#0F2340';
const GOLD = '#C8973A';

type User = { id: string; email: string; role: string; locale: string; full_name?: string };
type DocItem = { doc_type: string; label_es: string; label_en: string; required: boolean };
type DocRecord = { doc_type: string; status: string; rejection_reason?: string };

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [locale, setLocale] = useState("es");
  const [checklist, setChecklist] = useState<DocItem[]>([]);
  const [docStatus, setDocStatus] = useState<Record<string, DocRecord>>({});
  const [appId, setAppId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) { router.push("/"); return; }
    const p = JSON.parse(u);
    setUser(p);
    setLocale(p.locale || "es");
    fetch(API + "/api/v1/applications/me", { credentials: "include", headers: { "x-user-id": p.id } })
      .then(r => r.json()).then(data => {
        if (data.documents) {
          const s: Record<string, DocRecord> = {};
          data.documents.forEach((d: DocRecord) => { s[d.doc_type] = d; });
          setDocStatus(s);
        }
        if (data.checklist) setChecklist(data.checklist);
        if (data.application?.id) setAppId(data.application.id);
      }).catch(() => {});
  }, []);
  const required = checklist.filter(d => d.required);
  const approved = required.filter(d => docStatus[d.doc_type]?.status === "approved").length;
  const total = required.length;
  const pct = total > 0 ? Math.round((approved / total) * 100) : 0;

  async function handleUpload(docKey: string, file: File) {
    setUploading(docKey); setUploadProgress(0);
    const fd = new FormData(); fd.append("file", file); fd.append("doc_type", docKey);
    try {
      const pi = setInterval(() => { setUploadProgress(prev => prev >= 90 ? 90 : prev + 10); }, 200);
      const res = await fetch(API + "/api/v1/documents/upload", { method: "POST", credentials: "include", headers: { "x-user-id": user?.id || "" }, body: fd });
      clearInterval(pi); setUploadProgress(100);
      const data = await res.json();
      if (data.success) setDocStatus(prev => ({ ...prev, [docKey]: { doc_type: docKey, status: "uploaded" } }));
      else alert(data.error || "Upload failed");
    } catch { alert(locale === "es" ? "Error al subir" : "Upload failed"); }
    setTimeout(() => { setUploading(null); setUploadProgress(0); setPreview(null); }, 500);
  }

  function triggerUpload(k: string) { if (docStatus[k]?.status === "approved") return; setActiveDoc(k); fileInputRef.current?.click(); }

  function onFileSelected(file: File, docKey: string) {
    if (file.size > 20*1024*1024) { alert(locale==="es"?"Archivo muy grande. Max 20MB.":"File too large. Max 20MB."); return; }
    const vt = ["application/pdf","image/jpeg","image/png","image/jpg"];
    if (!vt.includes(file.type)) { alert(locale==="es"?"Formato no valido. PDF, JPG, PNG.":"Invalid format."); return; }
    setPreview({ file, url: URL.createObjectURL(file) }); setActiveDoc(docKey);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) { const file=e.target.files?.[0]; if(file&&activeDoc)onFileSelected(file,activeDoc); e.target.value=""; }

  const onDrop = useCallback((e: React.DragEvent, docKey: string) => { e.preventDefault(); setDragOver(null); const file=e.dataTransfer.files[0]; if(file)onFileSelected(file,docKey); }, []);

  function logout() { localStorage.removeItem("user"); fetch(API+"/api/v1/auth/logout",{method:"POST",credentials:"include"}); router.push("/"); }

  async function submitApplication() {
    if (!appId || pct < 100) return;
    try { await fetch(API+"/api/v1/applications/"+appId+"/status",{ method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json","x-user-id":user?.id||""},body:JSON.stringify({status:"submitted"}) });
      alert(locale==="es"?"Solicitud enviada":"Application submitted");
    } catch { alert("Error"); }
  }

  const sI=(s:string)=>{ const p={approved:"#1D7A4E",uploaded:"#185FA5",rejected:"#9B2626"};
    if(s==="approved")return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.approved} strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>;
    if(s==="uploaded")return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={p.uploaded} strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>;
    if(s==="rejected")return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9B2626" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
    return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
  };

  const sBg:Record<string,string>={approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC"};
  const sColor:Record<string,string>={approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626"};
  const sLabel:Record<string,Record<string,string>>={
    approved:{es:"Aprobado",en:"Approved"},uploaded:{es:"En revision",en:"In review"},
    pending:{es:"Pendiente",en:"Pending"},rejected:{es:"Rechazado",en:"Rejected"}
  };

  if(!user)return(<main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF8F3"}}><p>Cargando...</p></main>);

  return(<main style={{minHeight:"100vh",background:"#FAF8F3",fontFamily:"sans-serif"}}>
    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={onFileChange}/>

    {preview&&activeDoc&&(
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={()=>{setPreview(null);setActiveDoc(null);}}>
        <div style={{background:"white",borderRadius:16,padding:24,maxWidth:400,width:"100%",textAlign:"center"}} onClick={e=>e.stopPropagation()}>
          <h3 style={{margin:"0 0 16px",color:NAVY,fontSize:16}}>{locale==="es"?"Confirmar archivo":"Confirm file"}</h3>
          {preview.file.type.startsWith("image/")?(
            <img src={preview.url} alt="preview" style={{maxWidth:"100%",maxHeight:200,borderRadius:8,marginBottom:16,objectFit:"contain"}}/>
          ):(
            <div style={{background:"#F3F4F6",borderRadius:8,padding:24,marginBottom:16}}>
              <p style={{fontSize:13,color:"#6B7280"}}>{preview.file.name}</p>
            </div>
          )}
          <p style={{fontSize:12,color:"#9CA3AF",marginBottom:16}}>{(preview.file.size/1024/1024).toFixed(1)} MB</p>
          <div style={{display:"flex",gap:12}}>
            <button onClick={()=>{setPreview(null);setActiveDoc(null);}} style={{flex:1,padding:12,background:"#F3F4F6",color:"#6B7280",border:"none",borderRadius:10,fontSize:14,cursor:"pointer"}}>{locale==="es"?"Cancelar":"Cancel"}</button>
            <button onClick={()=>handleUpload(activeDoc,preview.file)} disabled={uploading!==null} style={{flex:1,padding:12,background:GOLD,color:NAVY,border:"none",borderRadius:10,fontSize:14,fontWeight:600,cursor:"pointer"}}>{uploading?(uploadProgress+"%"):locale==="es"?"Subir":"Upload"}</button>
          </div>
        </div>
      </div>
    )}

    <nav style={{background:NAVY,padding:"0 20px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:28,height:28,background:GOLD,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:NAVY,fontWeight:600,fontSize:12}}>DH</div>
        <span style={{color:"white",fontSize:13,fontWeight:500}}>DocuHogar</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:6,padding:2}}>
          {["es","en"].map(l=>(<button key={l} onClick={()=>setLocale(l)} style={{padding:"3px 10px",border:"none",borderRadius:4,background:locale===l?GOLD:"transparent",color:locale===l?NAVY:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12,fontWeight:500}}>{l.toUpperCase()}</button>))}
        </div>
        <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:12}}>{locale==="es"?"Salir":"Logout"}</button>
      </div>
    </nav>

    <div style={{background:NAVY,padding:"0 20px 24px"}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:4}}>
        <span style={{color:"white",fontSize:16,fontWeight:600}}>{user.full_name||user.email}</span>
        <span style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(100,180,255,0.15)",color:"#7ec8f8",fontWeight:600}}>{locale==="es"?"Solicitante":"Applicant"}</span>
      </div>
      <p style={{color:"rgba(255,255,255,0.5)",fontSize:12,marginBottom:16}}>{user.email}</p>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{flex:1,height:8,background:"rgba(255,255,255,0.1)",borderRadius:4,overflow:"hidden"}}>
          <div style={{height:"100%",width:pct+"%",background:pct===100?"#4CAF50":GOLD,borderRadius:4,transition:"width 0.5s ease"}}/>
        </div>
        <span style={{color:pct===100?"#4CAF50":GOLD,fontSize:14,fontWeight:700,minWidth:50,textAlign:"right"}}>{pct}%</span>
      </div>
      <p style={{color:"rgba(255,255,255,0.4)",fontSize:11,marginTop:6}}>{approved}/{total} {locale==="es"?"documentos aprobados":"documents approved"}</p>
    </div>

    <div style={{maxWidth:480,margin:"0 auto",padding:"20px 16px"}}>
      <p style={{fontSize:13,color:"#9CA3AF",marginBottom:16}}>{locale==="es"?"Toque un documento para subir o tome una foto":"Tap a document to upload or take a photo"}</p>

      {checklist.map(doc=>{
        const record=docStatus[doc.doc_type];
        const s=record?.status||"pending";
        const isUp=uploading===doc.doc_type;
        const isDrag=dragOver===doc.doc_type;
        return(
          <div key={doc.doc_type} onClick={()=>triggerUpload(doc.doc_type)}
            onDragOver={e=>{e.preventDefault();if(s!=="approved")setDragOver(doc.doc_type);}}
            onDragLeave={()=>setDragOver(null)} onDrop={e=>onDrop(e,doc.doc_type)}
            style={{background:isDrag?"#EBF0FA":"white",borderRadius:12,padding:14,marginBottom:8,display:"flex",gap:12,cursor:s==="approved"?"default":"pointer",borderLeft:"3px solid "+sColor[s],transition:"all 0.15s",opacity:isUp?0.7:1}}>
            <div style={{width:40,height:40,borderRadius:8,background:sBg[s]||"#F3F4F6",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              {isUp?<div style={{width:18,height:18,border:"2px solid #185FA5",borderTopColor:"transparent",borderRadius:"50%",animation:"spin 1s linear infinite"}}/>:sI(s)}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:14,fontWeight:500,color:"#1F2937"}}>
                {locale==="es"?doc.label_es:doc.label_en}
                {!doc.required&&<span style={{fontSize:11,color:"#9CA3AF",fontWeight:400,marginLeft:6}}>({locale==="es"?"opcional":"optional"})</span>}
              </div>
              <div style={{fontSize:12,color:sColor[s]||"#6B7280",marginTop:2}}>{isUp?(locale==="es"?"Subiendo...":"Uploading..."):sLabel[s]?.[locale]||s}</div>
              {s==="rejected"&&record?.rejection_reason&&(
                <div style={{fontSize:12,color:"#9B2626",marginTop:6,padding:"6px 10px",background:"#FDECEC",borderRadius:6,lineHeight:1.4}}>
                  <strong>{locale==="es"?"Motivo: ":"Reason: "}</strong>{record.rejection_reason}
                </div>
              )}
            </div>
            {s!=="approved"&&s!=="uploaded"&&!isUp&&(
              <div style={{display:"flex",alignItems:"center",flexShrink:0}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
            )}
          </div>
        );
      })}

      <button onClick={submitApplication} disabled={pct<100} style={{width:"100%",padding:14,background:pct===100?GOLD:"#F3F4F6",color:pct===100?NAVY:"#9CA3AF",border:"none",borderRadius:10,fontSize:14,fontWeight:600,marginTop:20,cursor:pct===100?"pointer":"not-allowed"}}>
        {locale==="es"?"Enviar solicitud al banco":"Submit application to bank"}
      </button>
      <p style={{fontSize:11,color:"#C0C0C0",textAlign:"center",marginTop:12}}>{locale==="es"?"PDF, JPG, PNG — maximo 20MB":"PDF, JPG, PNG — max 20MB"}</p>
    </div>
    <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
  </main>);
}
