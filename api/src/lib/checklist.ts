export const DEFAULT_CHECKLIST = [
  {doc_type:'pasaporte',label_es:'Pasaporte',label_en:'Passport',required:true},
  {doc_type:'comprobante_domicilio',label_es:'Comprobante de domicilio',label_en:'Proof of address',required:true},
  {doc_type:'talon_pago',label_es:'Talones de pago',label_en:'Pay stubs',required:true},
  {doc_type:'estado_cuenta',label_es:'Estados de cuenta',label_en:'Bank statements',required:true},
  {doc_type:'autorizacion_credito',label_es:'Autorizacion de credito',label_en:'Credit authorization',required:true},
  {doc_type:'promesa_venta',label_es:'Promesa de venta',label_en:'Purchase agreement',required:true},
  {doc_type:'nit',label_es:'NIT',label_en:'NIT',required:true},
  {doc_type:'historial_remesas',label_es:'Historial de remesas',label_en:'Remittance history',required:false},
];

export const DEFAULT_DOC_TYPES = DEFAULT_CHECKLIST.map(d=>d.doc_type);

export async function getBankChecklist(pool:any, bankId:string|null): Promise<string[]> {
  if (!bankId) return DEFAULT_DOC_TYPES;
  const r=await pool.query('SELECT doc_type FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order',[bankId]);
  return r.rows.length ? r.rows.map((d:any)=>d.doc_type) : DEFAULT_DOC_TYPES;
}
