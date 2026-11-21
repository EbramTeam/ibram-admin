// Labels for the audit log (GET /api/audit-logs). Event names are the backend ones:
// some are written by hand ("user.created"), others come from the model observers
// ("rfq.status_changed", "purchase_request.submitted"), so unknown names get a label
// built from the subject and the action.

export const EVENT_LABELS = {
  'auth.login': 'تسجيل دخول',
  'auth.logout': 'تسجيل خروج',
  'auth.login_failed': 'محاولة دخول فاشلة',
  'auth.login_blocked': 'حظر مؤقت بعد محاولات فاشلة',
  'auth.password_changed': 'تغيير كلمة المرور',
  'auth.password_change_failed': 'محاولة فاشلة لتغيير كلمة المرور',
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
  'supplier.activated': 'إعادة تفعيل مورد',
  'department.created': 'إضافة إدارة / قسم',
  'department.updated': 'تعديل إدارة / قسم',
  'organization.updated': 'تعديل إعدادات المؤسسة',
  'organization_request.created': 'طلب انضمام مؤسسة جديدة',
  'contact_message.created': 'رسالة تواصل جديدة',
  'bid_opening.prices_corrected': 'تصحيح أسعار في جلسة فتح المظاريف',
  'bid_opening_minute.exported': 'تصدير محضر فتح المظاريف',
};

export const SUBJECT_LABELS = {
  user: 'حساب مستخدم',
  role: 'دور',
  supplier: 'مورد',
  department: 'إدارة',
  purchase_request: 'طلب شراء',
  rfq: 'طلب عرض سعر',
  rfq_recommendation: 'توصية ترسية',
  quotation: 'عرض سعر',
  bid_opening: 'جلسة فتح مظاريف',
  bid_opening_quotation: 'عرض في جلسة فتح المظاريف',
  bid_opening_minute: 'محضر فتح المظاريف',
  attachment: 'مرفق',
  organization: 'المؤسسة',
  organization_request: 'طلب انضمام',
  contact_message: 'رسالة تواصل',
};

const ACTION_LABELS = {
  created: 'إنشاء',
  updated: 'تعديل',
  deleted: 'حذف',
  status_changed: 'تغيير حالة',
  submitted: 'إرسال',
  approved: 'اعتماد',
  rejected: 'رفض',
  returned: 'إرجاع للتعديل',
  cancelled: 'إلغاء',
  reviewed: 'مراجعة',
  verified: 'تحقق مالي',
  signed: 'توقيع',
  exported: 'تصدير',
  completed: 'إغلاق',
  published: 'نشر',
  awarded: 'ترسية',
};

export function eventLabel(event) {
  if (EVENT_LABELS[event]) return EVENT_LABELS[event];
  const [subject, action] = event.split('.');
  if (SUBJECT_LABELS[subject] && ACTION_LABELS[action]) return `${ACTION_LABELS[action]} ${SUBJECT_LABELS[subject]}`;
  return event;
}

// filter groups, sent as ?event= (the backend accepts *)
export const EVENT_GROUPS = [
  { value: 'auth.*', label: 'الدخول والأمان', tone: 'red' },
  { value: 'user.*', label: 'المستخدمون', tone: 'blue' },
  { value: 'role.*', label: 'الأدوار والصلاحيات', tone: 'purple' },
  { value: 'supplier.*', label: 'الموردون', tone: 'green' },
  { value: 'department.*', label: 'البيانات الأساسية', tone: 'gray' },
  { value: 'purchase_request.*', label: 'طلبات الشراء', tone: 'blue' },
  { value: 'rfq*', label: 'طلبات عروض الأسعار والتوصيات', tone: 'purple' },
  { value: 'quotation.*', label: 'عروض الموردين', tone: 'green' },
  { value: 'bid_opening*', label: 'فتح المظاريف والمحاضر', tone: 'amber' },
  { value: 'attachment.*', label: 'المرفقات', tone: 'gray' },
  { value: 'organization*', label: 'الإعدادات وطلبات الانضمام', tone: 'gray' },
  { value: 'contact_message.*', label: 'رسائل التواصل', tone: 'gray' },
];

export function matchesGroup(event, group) {
  if (!group) return true;
  return event.startsWith(group.replace('*', ''));
}

export function groupOf(event) {
  return EVENT_GROUPS.find((g) => matchesGroup(event, g.value)) || { label: 'أخرى', tone: 'gray' };
}
