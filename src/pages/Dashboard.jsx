import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UsersFilters, UsersTable, useUserFilters } from '../components/UsersTable.jsx';
import { api, errorText } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { fetchAllUsers, fetchRoles, fetchDepartments, fetchPermissions, toRow, statusOf, lastSeen } from '../lib/users.js';
import { eventLabel, groupOf, SUBJECT_LABELS } from '../auditData.js';
import {
  IdCardIcon,
  UsersIcon,
  UserCheckIcon,
  ClipboardUserIcon,
  ReportIcon,
  SettingsIcon,
  ShieldCheckIcon,
  GridIcon,
  BanUserIcon,
  SmallUserIcon,
} from '../components/Icons.jsx';
import CountUp from '../components/CountUp.jsx';

// activity icon by event area
const actIcon = (event) => (event.startsWith('user.') ? UsersIcon : event.startsWith('auth.') || event.startsWith('role.') ? ShieldCheckIcon : GridIcon);

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);
const people = (n) => (n === 1 ? 'مستخدم واحد' : n === 2 ? 'مستخدمان' : `${n} مستخدمين`);

function StatCard({ badge, badgeTone, icon, value, label, sub, iconTone }) {
  return (
    <div className="dstat">
      <div className="dstat__top">
        <span className={'dstat__badge dstat__badge--' + badgeTone}>{badge}</span>
        <span className={'dstat__icon dstat__icon--' + iconTone}>{icon}</span>
      </div>
      <strong><CountUp value={value} /></strong>
      <span className="dstat__label">{label}</span>
      <small>{sub}</small>
    </div>
  );
}

function ActionCard({ tag, tagTone, icon, title, text, children }) {
  return (
    <article className="acard">
      <div className="acard__icon acard__icon--red" data-tone={tagTone}>
        {icon}
      </div>
      <div className="acard__body">
        <div className="acard__head">
          <h3>{title}</h3>
          <span className={'acard__tag acard__tag--' + tagTone}>{tag}</span>
        </div>
        <p>{text}</p>
        <div className="acard__btns">{children}</div>
      </div>
    </article>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const f = useUserFilters();
  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [depts, setDepts] = useState([]);
  const [permCount, setPermCount] = useState(0);
  const [activity, setActivity] = useState(null);
  const [today, setToday] = useState(null); // { all, failed }
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    fetchAllUsers()
      .then(setUsers)
      .catch((err) => setLoadError(errorText(err)));
    fetchRoles().then(setRoles).catch(() => {});
    fetchDepartments().then(setDepts).catch(() => {});
    fetchPermissions().then((p) => setPermCount(p.length)).catch(() => {});
    api('/audit-logs?per_page=5')
      .then((r) => setActivity(r.data))
      .catch(() => setActivity([]));
    const day = todayIso();
    Promise.all([
      api(`/audit-logs?from=${day}&to=${day}&per_page=1`),
      api(`/audit-logs?event=auth.login_*&from=${day}&to=${day}&per_page=1`),
    ])
      .then(([a, b]) => setToday({ all: a.total, failed: b.total }))
      .catch(() => {});
  }, []);

  const rows = useMemo(() => (users || []).map(toRow), [users]);
  const list = users || [];
  const total = list.length;
  const counts = { enabled: 0, pending: 0, inactive: 0, disabled: 0 };
  list.forEach((u) => (counts[statusOf(u)] += 1));
  const active = counts.enabled; // signed in and set their own password
  const waiting = counts.pending + counts.inactive;
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const newThisMonth = list.filter((u) => u.created_at && new Date(u.created_at) >= monthStart).length;
  const noRoles = list.filter((u) => !(u.roles || []).length).length;
  const failed = today?.failed ?? 0;
  const urgent = [waiting, noRoles, failed].filter(Boolean).length;

  // users per role area (one user can be in more than one)
  const usersOf = (...names) => roles.filter((r) => names.includes(r.name)).reduce((s, r) => s + r.users_count, 0);
  const dist = [
    { label: 'مديرو نظام كاملون', n: usersOf('admin'), unit: 'مسؤول', bar: 'blue' },
    { label: 'موظفو المشتريات والمالية', n: usersOf('procurement_officer', 'finance_officer'), unit: 'مستخدم', bar: 'green' },
    { label: 'مقدمو الطلبات والمعتمدون', n: usersOf('requester', 'department_manager', 'approver'), unit: 'مستخدم', bar: 'dark' },
  ];
  const v = (n) => (users ? n : '—');

  return (
    <div className="dash">
      <div className="page-head">
        <div>
          <div className="dash__hello">
            <h1 className="page-title">مرحبًا، {me?.name || 'مدير النظام'}</h1>
            <span className="live-pill">
              <i />
              <i />
              النظام متصل وآمن | المزامنة الفورية نشطة
            </span>
          </div>
          <p className="page-subtitle">نظرة عامة على حالة النظام وأهم الإجراءات المطلوبة لحوكمة المنظومة</p>
        </div>
        <div className="page-head__actions dash__actions">
          <button type="button" className="btn-outline" onClick={() => navigate('/audit-log')}>
            تصدير تقارير النظام
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate('/users/new')}>
            إضافة مستخدم جديد
          </button>
        </div>
      </div>

      {loadError && <p className="users-msg is-err" role="alert">{loadError}</p>}

      <div className="dstats">
        <StatCard badge={`+${newThisMonth} هذا الشهر`} badgeTone="blue" iconTone="blue" icon={<IdCardIcon size={26} />} value={v(total)} label="إجمالي المستخدمين" sub="حساب مسجل في المؤسسة" />
        <StatCard
          badge={pct(active, total) >= 80 ? 'حالة سليمة' : 'يتطلب متابعة'}
          badgeTone={pct(active, total) >= 80 ? 'green' : 'gray'}
          iconTone="green"
          icon={<UsersIcon size={26} />}
          value={v(active)}
          label="المستخدمون النشطون"
          sub={`نسبة الحسابات النشطة ${pct(active, total)}%`}
        />
        <StatCard
          badge={waiting + counts.disabled ? 'يتطلب متابعة' : 'لا يوجد'}
          badgeTone="gray"
          iconTone="gray"
          icon={<BanUserIcon size={26} />}
          value={v(waiting + counts.disabled)}
          label="غير النشطين"
          sub={`${waiting} بانتظار أول دخول · ${counts.disabled} معطلة`}
        />
        <StatCard badge="محدثة وفق الدليل" badgeTone="blue" iconTone="blue" icon={<ClipboardUserIcon size={26} />} value={roles.length || '—'} label="الأدوار والصلاحيات" sub={`دور وظيفي · ${permCount} صلاحية`} />
        <StatCard badge="سجل التدقيق نشط" badgeTone="blue" iconTone="blue" icon={<ReportIcon size={26} />} value={today ? today.all : '—'} label="نشاطات النظام" sub="عملية مسجلة اليوم" />
      </div>

      <div className="dcols">
        {/* right column in RTL: actions + distribution */}
        <section className="dcol dcol--actions">
          <div className="dsec-head">
            <h2>
              <span className="dsec-head__alert">!</span>
              يحتاج إلى إجراء
            </h2>
            <span className="urgent-pill">{urgent ? `${urgent} إجراءات ملحة` : 'لا توجد إجراءات ملحة'}</span>
          </div>

          <ActionCard
            tag={waiting ? 'أولوية عالية' : 'مكتمل'}
            tagTone={waiting ? 'red' : 'blue'}
            icon={<UsersIcon size={26} />}
            title="مستخدمون يحتاجون إلى تفعيل"
            text={
              waiting
                ? `${people(waiting)} لم يسجّلوا الدخول بعد أو ما زالوا بكلمة مرور مؤقتة. سلّمهم كلمة المرور المؤقتة أو أعد تعيينها من صفحة المستخدم.`
                : 'كل المستخدمين سجّلوا الدخول وعيّنوا كلمات مرورهم.'
            }
          >
            <button type="button" className="mini mini--solid" onClick={() => navigate('/users')}>
              مراجعة وتفعيل المستخدمين
            </button>
          </ActionCard>

          <ActionCard
            tag={noRoles ? 'أولوية عالية' : 'مكتمل'}
            tagTone={noRoles ? 'red' : 'blue'}
            icon={<UsersIcon size={26} />}
            title="مستخدمون يحتاجون إلى أدوار وصلاحيات"
            text={noRoles ? `${people(noRoles)} بدون أي دور، فلا يستطيعون تنفيذ أي إجراء في المنظومة.` : 'كل المستخدمين لديهم دور واحد على الأقل.'}
          >
            <button type="button" className="mini mini--outline" onClick={() => navigate('/roles')}>
              مراجعة الأدوار والصلاحيات
            </button>
          </ActionCard>

          <ActionCard
            tag="أمن سيبراني"
            tagTone={failed ? 'red' : 'blue'}
            icon={<SettingsIcon size={26} />}
            title="محاولات دخول فاشلة اليوم"
            text={
              failed
                ? `${failed} محاولة دخول فاشلة أو حظر مؤقت اليوم. راجع العناوين والحسابات المستهدفة في سجل التدقيق.`
                : 'لا توجد محاولات دخول فاشلة اليوم.'
            }
          >
            <button type="button" className="mini mini--outline" onClick={() => navigate('/audit-log')}>
              مراجعة سجل التدقيق
            </button>
          </ActionCard>

          <div className="dist">
            <div className="dsec-head dsec-head--plain">
              <h2>توزيع صلاحيات المستخدمين حسب النطاق</h2>
              <span className="auto-note">محدث آلياً</span>
            </div>
            <div className="dist__grid">
              {dist.map((d) => (
                <div className="dist__tile" key={d.label}>
                  <div>
                    <span>{d.label}</span>
                    <strong>
                      {d.n} {d.unit}
                    </strong>
                  </div>
                  <i className={'bar bar--' + d.bar} style={{ '--w': `${Math.max(pct(d.n, total), d.n ? 4 : 0)}%` }} />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* left column in RTL: recent activity */}
        <section className="dcol dcol--activity">
          <div className="dsec-head">
            <h2>
              <span className="dsec-head__icon">
                <SmallUserIcon size={18} />
              </span>
              آخر النشاطات
            </h2>
            <Link to="/audit-log" className="muted-link">
              سجل الرقابة الإدارية
            </Link>
          </div>
          <div className="activity">
            {!activity && <p className="users-msg">جارٍ التحميل...</p>}
            {activity && !activity.length && <p className="users-msg">لا توجد نشاطات مسجلة بعد</p>}
            {(activity || []).map((a) => {
              const Icon = actIcon(a.event);
              const subject = a.subject_type ? `${SUBJECT_LABELS[a.subject_type] || a.subject_type} #${a.subject_id}` : groupOf(a.event).label;
              return (
                <article className="act-item" key={a.id}>
                  <span className="act-item__icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <div className="act-item__top">
                      <h3>{eventLabel(a.event)}</h3>
                      <small>{lastSeen(a.created_at)}</small>
                    </div>
                    <p>
                      {a.user?.name || 'زائر / غير مسجل'} · {subject}
                    </p>
                  </div>
                </article>
              );
            })}
            <button type="button" className="audit-btn" onClick={() => navigate('/audit-log')}>
              عرض كافة سجلات التدقيق (Audit Log)
            </button>
          </div>
        </section>
      </div>

      <UsersFilters
        f={f}
        layout="inline"
        roleNames={roles.map((r) => r.label || r.name)}
        deptNames={depts.map((d) => d.name)}
        showChips={false}
        statusKeys={['enabled', 'pending', 'inactive', 'disabled']}
      />
      <div className="paged">
        {/* lock and password reset open the user's page, where they are confirmed */}
        <UsersTable
          key={users ? 'loaded' : 'loading'}
          rows={rows}
          f={f}
          pageSize={5}
          onLock={(r) => navigate(`/users/${r.id}`)}
          onResetPassword={(r) => navigate(`/users/${r.id}`)}
          emptyText={users ? 'لا يوجد مستخدمون مطابقون للفلاتر' : 'جارٍ تحميل المستخدمين...'}
        />
      </div>
    </div>
  );
}
