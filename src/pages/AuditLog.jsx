import { useEffect, useMemo, useRef, useState } from 'react';
import CountUp from '../components/CountUp.jsx';
import { exportXlsx } from '../lib/exportXlsx.js';
import { SearchIcon, RefreshIcon, ChevronDownIcon, LogsIcon, ShieldLockIcon, WarnIcon, RolesIcon, ExportIcon } from '../components/Icons.jsx';
import { AUDIT_LOGS, AUDIT_USERS, EVENT_GROUPS, EVENT_LABELS, SUBJECT_LABELS, groupOf, matchesGroup } from '../auditData.js';

// Audit log (read only). Same filters as the backend's GET /api/audit-logs:
// event (with *), user_id, from, to, and 25 rows per page.
// TODO: load from the API instead of auditData.js when the panel is connected to the backend.

const PER_PAGE = 25;

const DETAIL_LABELS = {
  added: 'أُضيف',
  removed: 'أُزيل',
  fields: 'الحقول المعدلة',
  email: 'البريد',
  reason: 'السبب',
  name: 'الاسم',
  reference: 'المرجع',
  title: 'العنوان',
  format: 'الصيغة',
  rfq: 'طلب عرض السعر',
  quotations: 'عدد العروض',
  minutes: 'مدة الحظر (دقيقة)',
  role: 'الدور',
  roles: 'الأدوار',
};
const FIELD_LABELS = {
  phone: 'رقم الجوال',
  department_id: 'الإدارة',
  email: 'البريد',
  name: 'الاسم',
  logo: 'الشعار',
  currency: 'العملة',
  employee_number: 'الرقم الوظيفي',
  job_title: 'المسمى الوظيفي',
  sub_unit: 'الوحدة الفرعية',
  joined_at: 'تاريخ الانضمام',
};

// numbers only, so it reads the same in Arabic and English
function fmtDate(iso) {
  const d = new Date(iso);
  const two = (n) => String(n).padStart(2, '0');
  return {
    date: `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`,
    time: `${two(d.getHours())}:${two(d.getMinutes())}`,
  };
}

function detailValue(key, v) {
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    return v.map((x) => (key === 'fields' ? FIELD_LABELS[x] || x : x)).join('، ');
  }
  return String(v);
}

function Details({ details }) {
  if (!details) return <span className="audit__muted">—</span>;
  return (
    <dl className="audit__details">
      {Object.entries(details).map(([k, v]) => (
        <div key={k}>
          <dt>{DETAIL_LABELS[k] || k}:</dt>
          <dd>{detailValue(k, v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Select({ value, onChange, placeholder, options, label }) {
  return (
    <label className="sel">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon size={18} className="sel__chev" />
    </label>
  );
}

// Chrome draws the Arabic day/month/year hint of an empty date field backwards,
// so the field shows our own hint while empty and becomes a real date field on focus.
function DateField({ label, value, onChange, min, max }) {
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const asDate = focused || !!value;
  useEffect(() => {
    if (focused && ref.current?.type === 'date') {
      try {
        ref.current.showPicker?.();
      } catch {
        /* showPicker needs a user gesture in some browsers */
      }
    }
  }, [focused]);
  return (
    <label className="audit__date">
      <span>{label}</span>
      <input
        ref={ref}
        type={asDate ? 'date' : 'text'}
        value={value}
        min={min}
        max={max}
        placeholder="يوم / شهر / سنة"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
      />
    </label>
  );
}


export default function AuditLog() {
  const [q, setQ] = useState('');
  const [group, setGroup] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);

  const reset = () => {
    setQ('');
    setGroup('');
    setUserId('');
    setFrom('');
    setTo('');
    setPage(1);
  };

  const rows = useMemo(() => {
    const term = q.trim();
    return AUDIT_LOGS.filter((r) => {
      if (!matchesGroup(r.event, group)) return false;
      if (userId && String(r.user?.id) !== userId) return false;
      const day = r.created_at.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (term) {
        const hay = [r.user?.name, EVENT_LABELS[r.event], r.event, r.ip_address, JSON.stringify(r.details || {})].join(' ');
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [q, group, userId, from, to]);

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PER_PAGE, cur * PER_PAGE);

  const today = AUDIT_LOGS[0]?.created_at.slice(0, 10);
  const todayRows = AUDIT_LOGS.filter((r) => r.created_at.startsWith(today));
  const stats = {
    today: todayRows.length,
    logins: todayRows.filter((r) => r.event === 'auth.login').length,
    failed: todayRows.filter((r) => r.event === 'auth.login_failed' || r.event === 'auth.login_blocked').length,
    perms: todayRows.filter((r) => r.event === 'user.roles_changed' || r.event === 'role.permissions_changed').length,
  };

  const exportCsv = () =>
    exportXlsx(
      `ibram-audit-log-${new Date().toISOString().slice(0, 10)}`,
      ['التاريخ', 'الوقت', 'المستخدم', 'العملية', 'الحدث', 'العنصر', 'التفاصيل', 'عنوان IP'],
      rows.map((r) => {
        const { date, time } = fmtDate(r.created_at);
        return [
          date,
          time,
          r.user?.name || 'زائر / غير مسجل',
          EVENT_LABELS[r.event] || r.event,
          r.event,
          r.subject_type ? `${SUBJECT_LABELS[r.subject_type] || r.subject_type} #${r.subject_id}` : '',
          r.details ? Object.entries(r.details).map(([k, v]) => `${DETAIL_LABELS[k] || k}: ${detailValue(k, v)}`).join('  •  ') : '',
          r.ip_address,
        ];
      }),
      { sheet: 'سجل التدقيق' }
    );

  const setFilter = (fn) => (v) => {
    fn(v);
    setPage(1);
  };

  return (
    <div className="audit">
      <div className="page-head">
        <div>
          <h1 className="page-title">سجل التدقيق (Audit Log)</h1>
          <p className="page-subtitle">كل العمليات التي تمت على المنظومة: من نفّذها، ومتى، ومن أي جهاز. السجل للقراءة فقط ولا يمكن تعديله أو حذفه.</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn-primary" onClick={exportCsv} disabled={!rows.length}>
            <ExportIcon size={20} />
            تصدير السجل (Excel)
          </button>
        </div>
      </div>

      <div className="ustats">
        {[
          { icon: <LogsIcon size={26} />, bg: '#e8f6ff', fg: '#0b2a4a', value: stats.today, label: 'عمليات اليوم', sub: 'كل الأحداث المسجلة' },
          { icon: <ShieldLockIcon size={26} />, bg: '#eefff8', fg: '#0a5c36', value: stats.logins, label: 'عمليات دخول ناجحة', sub: 'اليوم', subClass: 'is-green' },
          { icon: <WarnIcon size={26} />, bg: '#fff4f4', fg: '#e84a4a', value: stats.failed, label: 'محاولات دخول فاشلة', sub: 'تتطلب متابعة أمنية', subClass: 'is-red' },
          { icon: <RolesIcon size={26} />, bg: '#e8f6ff', fg: '#0b2a4a', value: stats.perms, label: 'تغييرات صلاحيات', sub: 'أدوار وصلاحيات' },
        ].map((s) => (
          <div className="ustat" key={s.label}>
            <div className="ustat__text">
              <strong><CountUp value={s.value} /></strong>
              <span>{s.label}</span>
              <small className={s.subClass}>{s.sub}</small>
            </div>
            <span className="ustat__icon" style={{ background: s.bg, color: s.fg }}>{s.icon}</span>
          </div>
        ))}
      </div>

      <section className="filters filters--stacked">
        <div className="filters__row">
          <label className="search-field">
            <SearchIcon size={22} />
            <input value={q} onChange={(e) => setFilter(setQ)(e.target.value)} placeholder="بحث باسم المستخدم، العملية، عنوان IP أو التفاصيل..." />
          </label>
          <button type="button" className="refresh-btn refresh-btn--text" onClick={reset}>
            <RefreshIcon size={20} />
            تحديث
          </button>
        </div>
        <div className="filters__row filters__row--selects audit__selects">
          <Select label="نوع العملية" value={group} onChange={setFilter(setGroup)} placeholder="كل أنواع العمليات" options={EVENT_GROUPS} />
          <Select label="المستخدم" value={userId} onChange={setFilter(setUserId)} placeholder="كل المستخدمين" options={AUDIT_USERS.map((u) => ({ value: String(u.id), label: u.name }))} />
          <DateField label="من تاريخ" value={from} max={to || undefined} onChange={setFilter(setFrom)} />
          <DateField label="إلى تاريخ" value={to} min={from || undefined} onChange={setFilter(setTo)} />
        </div>
      </section>

      <section className="audit__table" aria-label="سجل العمليات">
        <div className="audit__head" role="row">
          <span>التاريخ والوقت</span>
          <span>المستخدم</span>
          <span>العملية</span>
          <span>العنصر</span>
          <span>التفاصيل</span>
          <span>عنوان IP</span>
        </div>
        {shown.map((r) => {
          const { date, time } = fmtDate(r.created_at);
          const g = groupOf(r.event);
          const isOpen = open === r.id;
          return (
            <div
              key={r.id}
              className={'audit__row' + (isOpen ? ' is-open' : '')}
              role="row"
              tabIndex={0}
              onClick={() => setOpen(isOpen ? null : r.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setOpen(isOpen ? null : r.id);
                }
              }}
              aria-expanded={isOpen}
            >
              <span className="audit__when">
                <b>{time}</b>
                <small>{date}</small>
              </span>
              <span className="audit__who">{r.user?.name || <em>زائر / غير مسجل</em>}</span>
              <span>
                <i className={'audit__tag audit__tag--' + g.tone}>{EVENT_LABELS[r.event] || r.event}</i>
                <small className="audit__code"><bdi dir="ltr">{r.event}</bdi></small>
              </span>
              <span>{r.subject_type ? `${SUBJECT_LABELS[r.subject_type] || r.subject_type} #${r.subject_id}` : <span className="audit__muted">—</span>}</span>
              <span className="audit__det">
                <Details details={r.details} />
              </span>
              <span className="audit__ip"><bdi dir="ltr">{r.ip_address}</bdi></span>
            </div>
          );
        })}
        {!shown.length && <div className="audit__empty">لا توجد عمليات مطابقة للفلاتر</div>}
        <div className="pager">
          <span>
            عرض {rows.length ? (cur - 1) * PER_PAGE + 1 : 0} إلى {Math.min(cur * PER_PAGE, rows.length)} من أصل {rows.length} عملية
          </span>
          <div className="pager__ctrl">
            <button type="button" onClick={() => setPage(cur - 1)} disabled={cur === 1} aria-label="السابق">‹</button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
              <button type="button" key={n} className={n === cur ? 'is-on' : ''} onClick={() => setPage(n)} aria-current={n === cur ? 'page' : undefined}>
                {n}
              </button>
            ))}
            <button type="button" onClick={() => setPage(cur + 1)} disabled={cur === pages} aria-label="التالي">›</button>
          </div>
        </div>
      </section>
    </div>
  );
}
