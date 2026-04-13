'use client';
import {useEffect,useState,Suspense} from 'react';
import {useSearchParams,useRouter} from 'next/navigation';

function VerifyInner(){
  const params=useSearchParams();
  const router=useRouter();
  const [status,setStatus]=useState('verifying');
  useEffect(()=>{
    const token=params.get('t');
    if(!token){setStatus('invalid');return;}
    const url=process.env.NEXT_PUBLIC_API_URL+'/api/v1/auth/verify?t='+token;
    fetch(url,{credentials:'include'})
    .then(r=>r.json())
    .then(data=>{
      if(data.success){localStorage.setItem('user',JSON.stringify(data.user));const role=data.user.role;router.push(['officer','admin'].includes(role)?'/officer':'/dashboard');}
      else setStatus(data.error||'invalid');
    }).catch(()=>setStatus('error'));
  },[]);
  const msgs:Record<string,string>={verifying:'Verificando...','Token expired':'Enlace expirado.','Token already used':'Enlace ya usado.',invalid:'Enlace invalido.',error:'Error.'};
  return(<div style={{textAlign:'center',padding:'40px'}}><p style={{color:'#0F2340',fontSize:'16px'}}>{msgs[status]||status}</p>{status!=='verifying'&&<a href='/' style={{display:'block',marginTop:'20px',color:'#0F2340'}}>Volver</a>}</div>);
}
export default function VerifyPage(){
  return(<main style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#FAF8F3',fontFamily:'sans-serif'}}><Suspense fallback={<p>Cargando...</p>}><VerifyInner/></Suspense></main>);
}
