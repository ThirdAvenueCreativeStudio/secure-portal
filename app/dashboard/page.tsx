'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
const DOCS=[{key:'passport',es:'Pasaporte',en:'Passport'},{key:'us_address',es:'Comprobante de domicilio (EE.UU.)',en:'US proof of address'},{key:'pay_stub',es:'Ultimos 3 talones de pago',en:'Last 3 pay stubs'},{key:'bank_statement',es:'Estados de cuenta (6 meses)',en:'Bank statements (6 months)'},{key:'credit_auth',es:'Autorizacion de credito',en:'Credit authorization'},{key:'promesa_venta',es:'Promesa de venta',en:'Promesa de venta'},{key:'nit',es:'NIT o solicitud de NIT',en:'NIT or NIT application'},{key:'remittance',es:'Historial de remesas',en:'Remittance history'}];
type User={id:string;email:string;role:string;locale:string};
type DocStatus={[key:string]:string};

export default function Dashboard(){
  const router=useRouter();
  const [user,setUser]=useState<User|null>(null);
  const [locale,setLocale]=useState('es');
  const [docStatus,setDocStatus]=useState<DocStatus>({});
  const [uploading,setUploading]=useState<string|null>(null);
  const [activeDoc,setActiveDoc]=useState<string|null>(null);
  const fileInputRef=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    const u=localStorage.getItem('user');
    if(!u){router.push('/');return;}
    const p=JSON.parse(u);
    setUser(p);
    setLocale(p.locale||'es');
  },[]);

  const approved=Object.values(docStatus).filter(s=>s==='approved').length;
  const total=DOCS.length;
  const pct=Math.round((approved/total)*100);
  async function handleUpload(docKey:string,file:File){
    setUploading(docKey);
    const fd=new FormData();
    fd.append("file",file);
    fd.append("doc_type",docKey);
    try{
      const res=await fetch(process.env.NEXT_PUBLIC_API_URL+"/api/v1/documents/upload",{method:"POST",credentials:"include",body:fd});
      const data=await res.json();
      if(data.success)setDocStatus(prev=>({...prev,[docKey]:"uploaded"}));
    }catch{alert("Upload failed.");}
    setUploading(null);setActiveDoc(null);
  }
  function triggerUpload(k:string){if(docStatus[k]==="approved")return;setActiveDoc(k);fileInputRef.current?.click();}
  function onFileChange(e:React.ChangeEvent<HTMLInputElement>){const file=e.target.files?.[0];if(file&&activeDoc)handleUpload(activeDoc,file);e.target.value="";}
  function logout(){localStorage.removeItem("user");fetch(process.env.NEXT_PUBLIC_API_URL+"/api/v1/auth/logout",{method:"POST",credentials:"include"});router.push("/");}
  const sBg:Record<string,string>={approved:"#EAF5EE",uploaded:"#EBF0FA",pending:"#F3F4F6",rejected:"#FDECEC"};
  const sColor:Record<string,string>={approved:"#1D7A4E",uploaded:"#185FA5",pending:"#6B7280",rejected:"#9B2626"};
  const sLabel:Record<string,Record<string,string>>={approved:{es:"Aprobado",en:"Approved"},uploaded:{es:"En revision",en:"In review"},pending:{es:"Pendiente",en:"Pending"},rejected:{es:"Rechazado",en:"Rejected"}};
  if(!user)return(<main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#FAF8F3"}}><p style={{color:"#6B7280"}}>Cargando...</p></main>);
  return(<main style={{minHeight:"100vh",background:"#FAF8F3",fontFamily:"sans-serif"}}>
    <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{display:"none"}} onChange={onFileChange}/>
    <nav style={{background:"#0F2340",padding:"0 20px",height:"56px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
        <div style={{width:"28px",height:"28px",background:"#C8973A",borderRadius:"6px",display:"flex",alignItems:"center",justifyContent:"center",color:"#0F2340",fontWeight:600,fontSize:"12px"}}>DH</div>
        <span style={{color:"white",fontSize:"13px",fontWeight:500}}>DocuHogar</span>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
        <div style={{display:"flex",background:"rgba(255,255,255,0.1)",borderRadius:"6px",padding:"2px"}}>
          {["es","en"].map(l=>(<button key={l} onClick={()=>setLocale(l)} style={{padding:"3px 10px",border:"none",borderRadius:"4px",background:locale===l?"#C8973A":"transparent",color:locale===l?"#0F2340":"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"12px",fontWeight:500}}>{l.toUpperCase()}</button>))}
        </div>
        <button onClick={logout} style={{background:"transparent",border:"none",color:"rgba(255,255,255,0.6)",cursor:"pointer",fontSize:"12px"}}>{locale==="es"?"Salir":"Logout"}</button>
      </div>
    </nav>
    <div style={{background:"#0F2340",padding:"24px 20px",color:"white"}}>
      <h2 style={{fontSize:"18px"}}>{user.email}</h2>
      <p style={{marginTop:"16px",fontSize:"14px"}}>{pct}% - {approved}/{total} docs</p>
    </div>
    <div style={{maxWidth:"480px",margin:"0 auto",padding:"24px 16px"}}>
      {DOCS.map(doc=>{
        const s=docStatus[doc.key]||"pending";
        return(<div key={doc.key} onClick={()=>triggerUpload(doc.key)} style={{background:"white",borderRadius:"12px",padding:"14px",marginBottom:"8px",display:"flex",gap:"12px",cursor:"pointer",borderLeft:"3px solid "+sColor[s]}}>
          <div style={{width:"36px",height:"36px",borderRadius:"8px",background:sBg[s],display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{s==="approved"?"v":s==="uploaded"?"~":"o"}</div>
          <div style={{flex:1}}><div style={{fontSize:"14px",fontWeight:500}}>{locale==="es"?doc.es:doc.en}</div><div style={{fontSize:"12px",color:"#6B7280"}}>{sLabel[s][locale]}</div></div>
        </div>);
      })}
      <button disabled={pct<100} style={{width:"100%",padding:"14px",background:pct===100?"#C8973A":"#F3F4F6",color:pct===100?"#0F2340":"#9CA3AF",border:"none",borderRadius:"10px",fontSize:"14px",fontWeight:500,marginTop:"16px",cursor:pct===100?"pointer":"not-allowed"}}>
        {locale==="es"?"Enviar solicitud al banco":"Submit application to bank"}
      </button>
    </div>
  </main>);
}
