// Audit log entries, shaped like the backend's GET /api/audit-logs rows:
// { id, created_at, event, user: {id, name} | null, subject_type, subject_id, details, ip_address }
// Mock data until the page is connected to the API. Event names are the real backend ones.

export const EVENT_LABELS = {
  'auth.login': 'تسجيل دخول',
  'auth.logout': 'تسجيل خروج',
  'auth.login_failed': 'محاولة دخول فاشلة',
  'auth.login_blocked': 'حظر مؤقت بعد محاولات فاشلة',
  'auth.password_changed': 'تغيير كلمة المرور',
  'auth.password_reset_requested': 'طلب استعادة كلمة المرور',
  'auth.password_reset': 'استعادة كلمة المرور',
  'user.created': 'إنشاء مستخدم',
  'user.updated': 'تعديل بيانات مستخدم',
  'user.roles_changed': 'تغيير أدوار مستخدم',
  'user.deactivated': 'تعطيل حساب',
  'user.activated': 'إعادة تفعيل حساب',
  'user.password_reset': 'إعادة تعيين كلمة مرور مستخدم',
  'role.permissions_changed': 'تعديل صلاحيات دور',
  'supplier.created': 'إضافة مورد',
  'supplier.updated': 'تعديل بيانات مورد',
  'supplier.deactivated': 'تعليق مورد',
  'department.created': 'إضافة إدارة / قسم',
  'department.updated': 'تعديل إدارة / قسم',
  'purchase_request.created': 'إنشاء طلب شراء',
  'purchase_request.submitted': 'إرسال طلب شراء',
  'purchase_request.approved': 'اعتماد طلب شراء',
  'bid_opening.completed': 'إغلاق جلسة فتح المظاريف',
  'bid_opening_minute.exported': 'تصدير محضر فتح المظاريف',
  'organization.updated': 'تعديل إعدادات المؤسسة',
};

// filter groups, as the backend accepts them in ?event= (with *)
export const EVENT_GROUPS = [
  { value: 'auth.*', label: 'الدخول والأمان', tone: 'red' },
  { value: 'user.*', label: 'المستخدمون', tone: 'blue' },
  { value: 'role.*', label: 'الأدوار والصلاحيات', tone: 'purple' },
  { value: 'supplier.*', label: 'الموردون', tone: 'green' },
  { value: 'department.*', label: 'البيانات الأساسية', tone: 'gray' },
  { value: 'purchase_request.*', label: 'طلبات الشراء', tone: 'blue' },
  { value: 'bid_opening*', label: 'فتح المظاريف والمحاضر', tone: 'amber' },
  { value: 'organization.*', label: 'الإعدادات', tone: 'gray' },
];

export const SUBJECT_LABELS = {
  user: 'حساب مستخدم',
  role: 'دور',
  supplier: 'مورد',
  department: 'إدارة',
  purchase_request: 'طلب شراء',
  bid_opening: 'جلسة فتح مظاريف',
  bid_opening_minute: 'محضر',
  organization: 'المؤسسة',
};

export function matchesGroup(event, group) {
  if (!group) return true;
  const prefix = group.replace('*', '');
  return event.startsWith(prefix);
}

export function groupOf(event) {
  return EVENT_GROUPS.find((g) => matchesGroup(event, g.value)) || { label: 'أخرى', tone: 'gray' };
}

const USERS = [
  { id: 1, name: 'د. محمد كسبة' },
  { id: 2, name: 'د. عبدالله المنصور' },
  { id: 3, name: 'سارة بنت خالد العتيبي' },
  { id: 4, name: 'م. فهد بن إبراهيم السليمان' },
  { id: 5, name: 'د. حسام بن عبدالعزيز السويلم' },
];

// [minutes ago, event, user index | null, subject type, subject id, details, ip]
const SEED = [
  [6, 'auth.login', 0, null, null, null, '10.240.12.8'],
  [14, 'user.roles_changed', 0, 'user', 5, { added: ['مدير القسم'], removed: ['المالية / الموازنة'] }, '10.240.12.8'],
  [22, 'role.permissions_changed', 0, 'role', 3, { role: 'المالية / الموازنة', added: [], removed: ['عرض المستخدمين'] }, '10.240.12.8'],
  [35, 'auth.login_failed', null, null, null, { email: 'unknown@procure.gov.sa' }, '185.44.10.2'],
  [36, 'auth.login_failed', null, null, null, { email: 'unknown@procure.gov.sa' }, '185.44.10.2'],
  [37, 'auth.login_blocked', null, null, null, { email: 'unknown@procure.gov.sa', minutes: 15 }, '185.44.10.2'],
  [58, 'supplier.created', 3, 'supplier', 12, { name: 'شركة النور للتجهيزات' }, '10.20.14.88'],
  [72, 'purchase_request.submitted', 2, 'purchase_request', 41, { reference: 'PR-2026-0041', title: 'تجهيز مختبر الحاسوب' }, '10.20.14.31'],
  [95, 'user.updated', 0, 'user', 5, { fields: ['phone', 'department_id'] }, '10.240.12.8'],
  [130, 'auth.logout', 1, null, null, null, '10.240.12.9'],
  [180, 'bid_opening_minute.exported', 3, 'bid_opening_minute', 1, { format: 'pdf' }, '10.20.14.88'],
  [240, 'bid_opening.completed', 4, 'bid_opening', 1, { rfq: 'RFQ-2026-0002', quotations: 4 }, '10.20.14.88'],
  [300, 'purchase_request.approved', 1, 'purchase_request', 39, { reference: 'PR-2026-0039' }, '10.240.12.9'],
  [360, 'auth.password_changed', 2, null, null, null, '10.20.14.31'],
  [420, 'user.created', 0, 'user', 18, { name: 'ريم الحربي', roles: ['الجهة الطالبة'] }, '10.240.12.8'],
  [600, 'department.created', 0, 'department', 7, { name: 'وحدة الفحص المحاسبي' }, '10.240.12.8'],
  [900, 'supplier.deactivated', 3, 'supplier', 4, { reason: 'انتهاء السجل التجاري' }, '10.20.14.88'],
  [1300, 'user.deactivated', 0, 'user', 11, { reason: 'انتهاء التكليف' }, '10.240.12.8'],
  [1500, 'auth.password_reset_requested', null, null, null, { email: 's.alotaibi@procure.gov.sa' }, '10.20.14.31'],
  [1520, 'auth.password_reset', 2, null, null, null, '10.20.14.31'],
  [1700, 'organization.updated', 0, 'organization', 1, { fields: ['logo', 'currency'] }, '10.240.12.8'],
  [2000, 'purchase_request.created', 2, 'purchase_request', 41, { reference: 'PR-2026-0041' }, '10.20.14.31'],
  [2400, 'user.activated', 0, 'user', 9, null, '10.240.12.8'],
  [2900, 'supplier.updated', 3, 'supplier', 12, { fields: ['email', 'phone'] }, '10.20.14.88'],
  [3200, 'department.updated', 0, 'department', 3, { fields: ['name'] }, '10.240.12.8'],
  [3600, 'auth.login', 3, null, null, null, '10.20.14.88'],
  [4100, 'user.password_reset', 0, 'user', 7, null, '10.240.12.8'],
  [4300, 'auth.login', 2, null, null, null, '10.20.14.31'],
];

// a fixed "now" keeps the mock data stable between reloads
const NOW = new Date('2026-11-20T18:30:00+02:00').getTime();

export const AUDIT_LOGS = (() => {
  const rows = [];
  // repeat the seed over a few days so paging has something to show
  for (let day = 0; day < 3; day++) {
    SEED.forEach(([min, event, ui, st, sid, details, ip], i) => {
      rows.push({
        id: 1000 - (day * SEED.length + i),
        created_at: new Date(NOW - (min + day * 1440) * 60000).toISOString(),
        event,
        user: ui === null ? null : USERS[ui],
        subject_type: st,
        subject_id: sid,
        details,
        ip_address: ip,
      });
    });
  }
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
})();

export const AUDIT_USERS = USERS;
