"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_DOC_TYPES = exports.DEFAULT_CHECKLIST = void 0;
exports.getBankChecklist = getBankChecklist;
exports.DEFAULT_CHECKLIST = [
    { doc_type: 'pasaporte', label_es: 'Pasaporte', label_en: 'Passport', required: true },
    { doc_type: 'comprobante_domicilio', label_es: 'Comprobante de domicilio', label_en: 'Proof of address', required: true },
    { doc_type: 'talon_pago', label_es: 'Talones de pago', label_en: 'Pay stubs', required: true },
    { doc_type: 'estado_cuenta', label_es: 'Estados de cuenta', label_en: 'Bank statements', required: true },
    { doc_type: 'autorizacion_credito', label_es: 'Autorizacion de credito', label_en: 'Credit authorization', required: true },
    { doc_type: 'promesa_venta', label_es: 'Promesa de venta', label_en: 'Purchase agreement', required: true },
    { doc_type: 'nit', label_es: 'NIT', label_en: 'NIT', required: true },
    { doc_type: 'historial_remesas', label_es: 'Historial de remesas', label_en: 'Remittance history', required: false },
];
exports.DEFAULT_DOC_TYPES = exports.DEFAULT_CHECKLIST.map(d => d.doc_type);
async function getBankChecklist(pool, bankId) {
    if (!bankId)
        return exports.DEFAULT_DOC_TYPES;
    const r = await pool.query('SELECT doc_type FROM bank_checklists WHERE bank_id=$1 ORDER BY sort_order', [bankId]);
    return r.rows.length ? r.rows.map((d) => d.doc_type) : exports.DEFAULT_DOC_TYPES;
}
