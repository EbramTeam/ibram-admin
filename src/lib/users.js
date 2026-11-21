import { api, ApiError, errorText } from './api.js';

// Users from GET /api/users, turned into the rows the users table already draws.

export async function fetchAllUsers() {
  // organizations are small: load every page (100 per page) and filter on the screen
  const all = [];
  for (let page = 1; page <= 50; page++) {
    const res = await api(`/users?per_page=100&page=${page}`);
    all.push(...res.data);
    if (page >= res.last_page) break;
  }
  return all;
}

export async function fetchPermissions() {
  return (await api('/permissions')).data;
}

export async function fetchRoles() {
  return (await api('/roles')).data;
}

export async function fetchDepartments() {
  return (await api('/departments')).data;
}

export function initials(name) {
  const words = String(name || '')
    .replace(/^(د|م|أ)\.\s*/, '')
    .split(/\s+/)
    .filter(Boolean);
  return (words[0]?.[0] || '') + (words[1]?.[0] || '');
}

export function statusOf(u) {
  if (!u.is_active) return 'disabled';
  if (u.must_change_password) return 'pending';
  return u.last_login_at ? 'enabled' : 'inactive';
}

const two = (n) => String(n).padStart(2, '0');
export function lastSeen(iso) {
  if (!iso) return 'لم يسجّل الدخول بعد';
  const d = new Date(iso);
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'الآن';
  if (min < 60) return `منذ ${min} دقيقة`;
  const h = Math.round(min / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

export function toRow(u) {
  const roles = (u.roles || []).map((r) => r.label || r.name);
  return {
    rowKey: 'u' + u.id,
    id: u.id,
    name: u.name,
    email: u.email,
    handle: '@' + String(u.email || '').split('@')[0],
    dept: u.department?.name || '—',
    unit: u.sub_unit || '',
    empId: u.employee_number || '',
    role: roles.join('، ') || '—',
    roles,
    status: statusOf(u),
    last: lastSeen(u.last_login_at),
    lastSub: u.last_login_ip ? `IP: ${u.last_login_ip}` : '',
    initials: initials(u.name),
    avatar: u.id % 2 ? 'dark' : 'light',
    verified: !!u.last_login_at,
    raw: u,
  };
}

export async function fetchUser(id) {
  return api(`/users/${id}`);
}

// error text for the user actions: the server's own message for 422 (e.g. "you can't disable yourself")
export function actionError(err) {
  return err instanceof ApiError && err.status === 422 && err.body?.message ? err.body.message : errorText(err);
}

const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
export function longDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${two(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export function dateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()} ${two(d.getHours())}:${two(d.getMinutes())}`;
}

// permission names look like "purchase_requests.create": group them by the part before the dot
const PERM_GROUPS = [
  { id: 'pr', title: 'طلبات الشراء', icon: 'doc', prefixes: ['purchase_requests'] },
  { id: 'quotes', title: 'عروض الأسعار والمقارنة', icon: 'hand', prefixes: ['rfqs', 'quotations'] },
  { id: 'bids', title: 'فتح المظاريف والمحاضر', icon: 'shield', prefixes: ['bid_opening'] },
  { id: 'finance', title: 'المالية والموازنة', icon: 'pie', prefixes: ['budget'] },
  { id: 'suppliers', title: 'الموردون', icon: 'group', prefixes: ['suppliers'] },
  { id: 'reports', title: 'التقارير والتدقيق', icon: 'logs', prefixes: ['reports', 'audit'] },
  { id: 'admin', title: 'إدارة المنظومة', icon: 'admin', prefixes: ['users', 'settings'] },
];

// group permissions ({id, name, label}) by area; "checked" marks the ones in checkedIds
export function groupPermissions(list, checkedIds = null) {
  const groups = PERM_GROUPS.map((g) => ({ ...g, items: [] }));
  const other = { id: 'other', title: 'صلاحيات أخرى', icon: 'settings', items: [] };
  list.forEach((p) => {
    const prefix = p.name.split('.')[0];
    (groups.find((g) => g.prefixes.includes(prefix)) || other).items.push({
      id: p.id ?? p.name,
      key: p.name,
      name: p.label || p.name,
      desc: p.name,
      checked: checkedIds ? checkedIds.has(p.id) : true,
    });
  });
  return [...groups, other].filter((g) => g.items.length);
}

// the permissions of a list of roles (from GET /api/roles), grouped, without duplicates
export function permissionGroups(roles) {
  const seen = new Map();
  roles.forEach((r) => (r.permissions || []).forEach((p) => seen.set(p.name, p)));
  return groupPermissions([...seen.values()]);
}
export const countPermissions = (groups) => groups.reduce((s, g) => s + g.items.length, 0);
