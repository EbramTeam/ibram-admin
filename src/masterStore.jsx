import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, errorText, ApiError } from './lib/api.js';
import { dateTime, longDate } from './lib/users.js';
import { useAuth } from './auth.jsx';

// Master data from the API: departments, item categories, units and items.
// Records are mapped to the shape the pages use (id as text, status 'active'/'off', parent name...).
// add / update / toggle / remove call the API and refresh what changed; they throw on errors.

const Ctx = createContext(null);
export const DEPT_MAIN = 'إدارة رئيسية مستقلة';
export const CAT_MAIN = 'تصنيف رئيسي مستقل';

const PATHS = { departments: '/departments', categories: '/item-categories', units: '/units', items: '/items' };

const common = (r) => ({
  id: String(r.id),
  apiId: r.id,
  status: r.is_active ? 'active' : 'off',
  date: dateTime(r.updated_at),
  by: r.creator?.name || '—',
  created: longDate(r.created_at),
  audited: longDate(r.updated_at),
  updatedAt: r.updated_at,
  raw: r,
});

const mapDepartment = (r) => ({
  ...common(r),
  name: r.name,
  code: r.code,
  level: r.parent_id ? 'sub' : 'main',
  parentId: r.parent_id ? String(r.parent_id) : '',
  parent: r.parent?.name || DEPT_MAIN,
  sub: r.parent ? 'قسم فرعي · ' + r.parent.name : 'إدارة رئيسية',
  cc: r.cost_center || '',
  desc: r.description || '',
  scope: r.description ? 'نطاق المهام: ' + r.description : '',
  staff: r.active_users_count ?? 0,
  children: r.children_count ?? 0,
});

const mapCategory = (r) => ({
  ...common(r),
  name: r.name,
  full: r.parent ? `${r.parent.name} / ${r.name}` : r.name,
  code: r.code,
  level: r.parent_id ? 2 : 1,
  parentId: r.parent_id ? String(r.parent_id) : '',
  parent: r.parent?.name || CAT_MAIN,
  sub: r.parent_id ? r.description || '' : '(Level 1) مستوى رئيسي',
  count: r.items_count ?? 0,
  children: r.children_count ?? 0,
  cc: r.cost_center || '',
  owner: r.owner_name || '',
  desc: r.description || '',
});

const mapUnit = (r) => ({
  ...common(r),
  name: r.name,
  title: r.name,
  symbol: r.symbol,
  uom: r.code || '',
  group: r.unit_group || '',
  nature: r.nature || '',
  desc: r.description || '',
  longDesc: r.description || '',
  linked: r.items_count ?? 0,
});

const mapItem = (r) => ({
  ...common(r),
  name: r.name,
  code: r.code,
  desc: r.description || '',
  categoryId: r.category_id ? String(r.category_id) : '',
  category: r.category ? (r.category.parent ? `${r.category.parent.name} / ${r.category.name}` : r.category.name) : '—',
  categoryCode: r.category?.code || '',
  unitId: r.unit_id ? String(r.unit_id) : '',
  unit: r.unit?.name || '—',
  unitSymbol: r.unit?.symbol || '',
  uom: r.unit?.code || '',
});

const MAP = { departments: mapDepartment, categories: mapCategory, units: mapUnit, items: mapItem };

export function MasterProvider({ children }) {
  const { user } = useAuth();
  const [data, setData] = useState({ departments: [], categories: [], units: [], items: [] });
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  const loadKind = useCallback(async (kind) => {
    const res = await api(PATHS[kind]);
    setData((d) => ({ ...d, [kind]: res.data.map(MAP[kind]) }));
  }, []);

  const reload = useCallback(async () => {
    setError('');
    try {
      await Promise.all(Object.keys(PATHS).map(loadKind));
      setLoaded(true);
    } catch (err) {
      setError(errorText(err));
      setLoaded(true);
    }
  }, [loadKind]);

  useEffect(() => {
    if (user) reload();
  }, [user, reload]);

  // counts on related lists change too (items per unit/category, sub departments...)
  const refreshAfter = (kind) => {
    const related = { departments: ['departments'], categories: ['categories'], units: ['units'], items: ['items', 'units', 'categories'] }[kind];
    return Promise.all(related.map(loadKind)).catch(() => {});
  };

  const add = async (kind, body) => {
    const rec = await api(PATHS[kind], { method: 'POST', body });
    await refreshAfter(kind);
    return String(rec.id);
  };
  const update = async (kind, id, body) => {
    await api(`${PATHS[kind]}/${id}`, { method: 'PATCH', body });
    await refreshAfter(kind);
  };
  const toggle = async (kind, id) => {
    const rec = data[kind].find((r) => r.id === String(id));
    await update(kind, id, { is_active: rec?.status !== 'active' });
  };
  const remove = async (kind, id) => {
    await api(`${PATHS[kind]}/${id}`, { method: 'DELETE' });
    await refreshAfter(kind);
  };

  return (
    <Ctx.Provider value={{ ...data, loaded, error, reload, add, update, toggle, remove, DEPT_MAIN }}>
      {children}
    </Ctx.Provider>
  );
}
export const useMaster = () => useContext(Ctx);

export const fmt = (n) => Number(n).toLocaleString('en-US');
export const two = (n) => (n === 0 ? '00' : fmt(n));

// Laravel's validation texts are English: turn the common ones into Arabic (Arabic texts pass as they are)
export function arabicError(text = '') {
  if (/[\u0600-\u06FF]/.test(text)) return text;
  if (/taken/i.test(text)) return 'هذه القيمة مستخدمة من قبل، اختر قيمة أخرى';
  if (/required/i.test(text)) return 'هذا الحقل مطلوب';
  if (/selected .* invalid|exists/i.test(text)) return 'القيمة المختارة غير صالحة';
  if (/alpha|format|must only contain/i.test(text)) return 'استخدم أحرفاً إنجليزية وأرقاماً وشرطة فقط';
  if (/greater than|max|characters/i.test(text)) return 'النص أطول من المسموح';
  return 'قيمة غير صالحة';
}

// message for a failed save/toggle/delete: the server's own words for 422
export function masterError(err) {
  if (err instanceof ApiError && err.status === 422) {
    const first = err.body?.errors && Object.values(err.body.errors)[0]?.[0];
    return arabicError(first || err.body?.message || '') || 'تعذّر الحفظ، تحقق من البيانات';
  }
  return errorText(err);
}

// field errors from a 422, by API field name
export function fieldErrors(err) {
  return err instanceof ApiError && err.status === 422 ? err.body?.errors || {} : {};
}
