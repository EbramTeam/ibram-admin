import { api, getToken, API_URL, ApiError, errorText } from './api.js';

// Suppliers: GET/POST /api/suppliers, GET/PATCH /api/suppliers/{id},
// GET /api/suppliers/{id}/activity, and documents through /api/suppliers/{id}/attachments.

export async function fetchAllSuppliers() {
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const res = await api(`/suppliers?per_page=100&page=${page}`);
    all.push(...res.data);
    if (page >= res.last_page) break;
  }
  return all;
}

export const fetchSupplier = (id) => api(`/suppliers/${id}`);
export const fetchSupplierActivity = (id) => api(`/suppliers/${id}/activity`).then((r) => r.data);
export const fetchSupplierFiles = (id) => api(`/suppliers/${id}/attachments`).then((r) => r.data);

export function uploadSupplierFile(id, file) {
  const form = new FormData();
  form.append('file', file);
  return api(`/suppliers/${id}/attachments`, { method: 'POST', body: form });
}
export const deleteFile = (fileId) => api(`/attachments/${fileId}`, { method: 'DELETE' });

// download with the token, then hand the file to the browser
export async function downloadFile(file) {
  const res = await fetch(`${API_URL}/api/attachments/${file.id}/download`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError(res.status, null);
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = file.original_name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// reference code shown in the design: SUP-000012
export const supplierRef = (s) => 'SUP-' + String(s.id).padStart(6, '0');

export function sizeLabel(b) {
  return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
}
export const fileType = (mime = '') => (mime.includes('pdf') ? 'PDF' : mime.includes('png') ? 'PNG' : mime.includes('jp') ? 'JPG' : 'FILE');

// days until the commercial register expires (negative = expired, null = no date)
export function crDaysLeft(s) {
  if (!s.cr_expires_at) return null;
  const end = new Date(s.cr_expires_at + 'T00:00:00');
  return Math.ceil((end - new Date()) / 86400000);
}

// "موثق" when the register and tax numbers are there and the register has not expired
export function verifiedOf(s) {
  const days = crDaysLeft(s);
  return Boolean(s.commercial_register && s.tax_number && (days === null || days >= 0));
}

// fingerprint of the current record (SHA-256 of its main fields), shown on the detail page
export async function fingerprint(s) {
  const keys = ['id', 'name', 'commercial_register', 'tax_number', 'activity', 'grade', 'legal_form', 'cr_expires_at', 'contact_person', 'email', 'phone', 'city', 'address', 'is_active', 'updated_at'];
  const text = JSON.stringify(keys.map((k) => s[k] ?? null));
  if (!crypto?.subtle) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 422 from create/update: field errors, or the duplicate suppliers list
export function supplierErrors(err) {
  if (!(err instanceof ApiError)) return { message: errorText(err) };
  const body = err.body || {};
  if (err.status === 422 && body.duplicates) {
    return { message: 'يوجد مورد مسجل بنفس الاسم أو الرقم الضريبي أو البريد: ' + body.duplicates.map((d) => d.name).join('، ') };
  }
  if (err.status === 422 && body.errors) return { fields: body.errors, message: '' };
  return { message: body.message && err.status === 422 ? body.message : errorText(err) };
}
