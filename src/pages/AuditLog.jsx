import { useCallback, useEffect, useRef, useState } from 'react';
import CountUp from '../components/CountUp.jsx';
import { exportXlsx } from '../lib/exportXlsx.js';
import { SearchIcon, RefreshIcon, ChevronDownIcon, LogsIcon, ShieldLockIcon, WarnIcon, RolesIcon, ExportIcon } from '../components/Icons.jsx';
import { EVENT_GROUPS, eventLabel, groupOf, subjectLabel } from '../auditData.js';
import { api, errorText } from '../lib/api.js';
import { fetchAllUsers } from '../lib/users.js';

// Audit log (read only), from GET /api/audit-logs.
// Filters go to the server: search, event (with *), user_id, from, to. 25 rows per page.

const PER_PAGE = 25;
const EXPORT_MAX_PAGES = 50; // 50 x 100 = up to 5000 rows in one Excel file

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
  status: 'الحالة',
  from_status: 'من حالة',
  to_status: 'إلى حالة',
  note: 'ملاحظة',
  changes: 'التغييرات',
  permissions: 'الصلاحيات',
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
  if (v === null || v === undefined || v === '') return '—';
  if (Array.isArray(v)) {
    if (!v.length) return '—';
    return v.map((x) => (key === 'fields' ? FIELD_LABELS[x] || x : typeof x === 'object' ? JSON.stringify(x) : x)).join('، ');
  }
  if (typeof v === 'object') {
    // {from, to} -> "old ← new", and {field: {from, to}} -> "field: old ← new"
    if ('from' in v || 'to' in v) return `${v.from ?? '—'} ← ${v.to ?? '—'}`;
    return Object.entries(v)
      .map(([k, x]) => `${FIELD_LABELS[k] || k}: ${typeof x === 'object' && x !== null ? detailValue(k, x) : x ?? '—'}`)
      .join('، ');
  }
  return String(v);
}
const detailsText = (details) =>
  details ? Object.entries(details).map(([k, v]) => `${DETAIL_LABELS[k] || k}: ${detailValue(k, v)}`).join('  •  ') : '';
const subjectText = subjectLabel;

// page numbers around the current one: 1 … 4 5 [6] 7 8 … 20
function pageList(cur, pages) {
  const set = new Set([1, pages, cur - 2, cur - 1, cur, cur + 1, cur + 2].filter((n) => n >= 1 && n <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out = [];
  sorted.forEach((n, i) => {
    if (i && n - sorted[i - 1] > 1) out.push('…' + n);
    out.push(n);
  });
  return out;
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function query(params) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v !== '' && v !== null && v !== undefined && q.set(k, v));
  return '/audit-logs?' + q.toString();
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
  const [search, setSearch] = useState(''); // q after a short pause, sent to the server
  const [group, setGroup] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  const [data, setData] = useState(null); // { data, total, last_page }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const filters = { search, event: group, user_id: userId, from, to };

  // type in the search box, the request goes 400ms after the last key
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(q.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api(query({ ...filters, page, per_page: PER_PAGE }))
      .then((res) => alive && setData(res))
      .catch((err) => alive && setError(errorText(err)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, group, userId, from, to, page, reloadKey]);

  // today's numbers: one small request each, we only read "total"
  const loadStats = useCallback(() => {
    const day = todayIso();
    const count = (event) => api(query({ event, from: day, to: day, per_page: 1 })).then((r) => r.total);
    Promise.all([count(''), count('auth.login'), count('auth.login_*'), count('user.roles_changed'), count('role.permissions_changed')])
      .then(([today, logins, failed, roles, perms]) => setStats({ today, logins, failed, perms: roles + perms }))
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    loadStats();
    fetchAllUsers()
      .then((list) => setUsers(list.map((u) => ({ value: String(u.id), label: u.name }))))
      .catch(() => {});
  }, [loadStats]);

  const reset = () => {
    setQ('');
    setSearch('');
    setGroup('');
    setUserId('');
    setFrom('');
    setTo('');
    setPage(1);
    setReloadKey((k) => k + 1);
    loadStats();
  };

  const rows = data?.data || [];
  const total = data?.total || 0;
  const pages = Math.max(1, data?.last_page || 1);
  const cur = Math.min(page, pages);

  async function exportFile() {
    setExporting(true);
    setExportError('');
    try {
      const all = [];
      for (let p = 1; p <= EXPORT_MAX_PAGES; p++) {
        const res = await api(query({ ...filters, page: p, per_page: 100 }));
        all.push(...res.data);
        if (p >= res.last_page) break;
      }
      await exportXlsx(
        `ibram-audit-log-${todayIso()}`,
        ['التاريخ', 'الوقت', 'المستخدم', 'العملية', 'الحدث', 'العنصر', 'التفاصيل', 'عنوان IP'],
        all.map((r) => {
          const { date, time } = fmtDate(r.created_at);
          return [date, time, r.user?.name || 'زائر / غير مسجل', eventLabel(r.event), r.event, subjectText(r), detailsText(r.details), r.ip_address || ''];
        }),
        { sheet: 'سجل التدقيق' }
      );
    } catch (err) {
      setExportError(errorText(err));
    } finally {
      setExporting(false);
    }
  }

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
          <button type="button" className="btn-primary" onClick={exportFile} disabled={!total || exporting}>
            <ExportIcon size={20} />
            {exporting ? 'جارٍ تجهيز الملف...' : 'تصدير السجل (Excel)'}
          </button>
        </div>
      </div>

      {exportError && <p className="users-msg is-err" role="alert">{exportError}</p>}

      <div className="ustats">
        {[
          { icon: <LogsIcon size={26} />, bg: '#e8f6ff', fg: '#0b2a4a', value: stats?.today, label: 'عمليات اليوم', sub: 'كل الأحداث المسجلة' },
          { icon: <ShieldLockIcon size={26} />, bg: '#eefff8', fg: '#0a5c36', value: stats?.logins, label: 'عمليات دخول ناجحة', sub: 'اليوم', subClass: 'is-green' },
          { icon: <WarnIcon size={26} />, bg: '#fff4f4', fg: '#e84a4a', value: stats?.failed, label: 'محاولات دخول فاشلة', sub: 'تتطلب متابعة أمنية', subClass: 'is-red' },
          { icon: <RolesIcon size={26} />, bg: '#e8f6ff', fg: '#0b2a4a', value: stats?.perms, label: 'تغييرات صلاحيات', sub: 'أدوار وصلاحيات اليوم' },
        ].map((s) => (
          <div className="ustat" key={s.label}>
            <div className="ustat__text">
              <strong>{s.value === undefined ? '—' : <CountUp value={s.value} />}</strong>
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
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث باسم المستخدم، العملية، عنوان IP أو التفاصيل..." />
          </label>
          <button type="button" className="refresh-btn refresh-btn--text" onClick={reset}>
            <RefreshIcon size={20} />
            تحديث
          </button>
        </div>
        <div className="filters__row filters__row--selects audit__selects">
          <Select label="نوع العملية" value={group} onChange={setFilter(setGroup)} placeholder="كل أنواع العمليات" options={EVENT_GROUPS} />
          <Select label="المستخدم" value={userId} onChange={setFilter(setUserId)} placeholder="كل المستخدمين" options={users} />
          <DateField label="من تاريخ" value={from} max={to || undefined} onChange={setFilter(setFrom)} />
          <DateField label="إلى تاريخ" value={to} min={from || undefined} onChange={setFilter(setTo)} />
        </div>
      </section>

      <section className={'audit__table' + (loading && data ? ' is-loading' : '')} aria-label="سجل العمليات" aria-busy={loading}>
        <div className="audit__head" role="row">
          <span>التاريخ والوقت</span>
          <span>المستخدم</span>
          <span>العملية</span>
          <span>العنصر</span>
          <span>التفاصيل</span>
          <span>عنوان IP</span>
        </div>
        {rows.map((r) => {
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
                <i className={'audit__tag audit__tag--' + g.tone}>{eventLabel(r.event)}</i>
                <small className="audit__code"><bdi dir="ltr">{r.event}</bdi></small>
              </span>
              <span>{r.subject_type ? subjectText(r) : <span className="audit__muted">—</span>}</span>
              <span className="audit__det">
                <Details details={r.details} />
              </span>
              <span className="audit__ip"><bdi dir="ltr">{r.ip_address || '—'}</bdi></span>
            </div>
          );
        })}
        {!rows.length && (
          <div className="audit__empty" role={error ? 'alert' : undefined}>
            {error ? (
              <>
                {error}{' '}
                <button type="button" className="audit__retry" onClick={() => setReloadKey((k) => k + 1)}>إعادة المحاولة</button>
              </>
            ) : loading ? (
              'جارٍ تحميل السجل...'
            ) : (
              'لا توجد عمليات مطابقة للفلاتر'
            )}
          </div>
        )}
        <div className="pager">
          <span>
            عرض {total ? (cur - 1) * PER_PAGE + 1 : 0} إلى {Math.min(cur * PER_PAGE, total)} من أصل {total} عملية
          </span>
          <div className="pager__ctrl">
            <button type="button" onClick={() => setPage(cur - 1)} disabled={cur === 1 || loading} aria-label="السابق">‹</button>
            {pageList(cur, pages).map((n) =>
              typeof n === 'string' ? (
                <span key={n} className="pager__gap">…</span>
              ) : (
                <button type="button" key={n} className={n === cur ? 'is-on' : ''} onClick={() => setPage(n)} aria-current={n === cur ? 'page' : undefined} disabled={loading && n !== cur}>
                  {n}
                </button>
              )
            )}
            <button type="button" onClick={() => setPage(cur + 1)} disabled={cur === pages || loading} aria-label="التالي">›</button>
          </div>
        </div>
      </section>
    </div>
  );
}
