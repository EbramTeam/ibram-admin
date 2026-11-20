import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useRoles } from '../rolesStore.jsx';
import { countAll, countChecked } from '../rolesData.js';
import Cbx from '../components/Cbx.jsx';
import RoleIcon from '../components/RoleIcon.jsx';
import {
  SearchIcon,
  RefreshIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UsersIcon,
  FingerprintIcon,
  DocIcon,
  CheckBoxIcon,
  RolesIcon,
} from '../components/Icons.jsx';
import CountUp from '../components/CountUp.jsx';
import { ROLE_OPTIONS } from './AddUser.jsx';

/* ---------- stat card ---------- */
function Stat({ icon, tint, value, unit, label, sub, subClass }) {
  return (
    <div className="ustat rstat">
      <div className="ustat__text">
        <div className="rstat__top">
          <strong><CountUp value={value} /></strong>
          <span>{unit}</span>
        </div>
        <b className="rstat__label">{label}</b>
        <small className={subClass}>{sub}</small>
      </div>
      <span className="ustat__icon" style={{ background: tint.bg, color: tint.fg }}>
        {icon}
      </span>
    </div>
  );
}

/* ---------- ⋮ menu on a role card (no design: reuses the card's own two actions) ---------- */
/* ---------- role card (same design as the role picker in "add user") ---------- */
const CARD_KEY = { requester: 'req', 'dept-manager': 'mgr', finance: 'fin', procurement: 'proc', committee: 'tender', sysadmin: 'sys' };
const CARD_INFO = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.key, o]));

function RoleCard({ role, selected, onSelect }) {
  const info = CARD_INFO[CARD_KEY[role.id]] || {};
  const off = role.status !== 'active';
  return (
    <button
      type="button"
      className={'rolecard' + (selected ? ' is-on' : '') + (off ? ' is-off' : '')}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={'rolecard__cb' + (selected ? ' is-on' : '')}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h4>{role.title}</h4>
      {info.en && <small className="rolecard__en">{info.en}</small>}
      <p>{role.desc}</p>
      <span className="rolecard__foot">
        <b>{role.perms} صلاحيات معتمدة</b>
        <i>{info.tag || role.tag}</i>
      </span>
    </button>
  );
}

/* ---------- side panel ---------- */
function EmptyPanel() {
  return (
    <aside className="rpanel rpanel--empty">
      <span className="rpanel__bigicon">
        <RolesIcon size={44} />
      </span>
      <h2>إدارة الأدوار والصلاحيات</h2>
      <p>اختر دورًا من القائمة لعرض تفاصيله ومراجعة صلاحياته وإدارتها.</p>
      <p>اختر أحد الأدوار من القائمة المجاورة</p>
    </aside>
  );
}

function PermItem({ item, onToggle }) {
  return (
    <div className={'pitem' + (item.tag ? ' is-hot' : '')}>
      <Cbx checked={item.checked} onChange={onToggle} size={24} label={item.name} />
      <div className="pitem__text">
        <strong>{item.name}</strong>
        <span>{item.desc}</span>
      </div>
      <em className="pitem__state">{item.checked ? 'مسموح' : ''}</em>
    </div>
  );
}

function RolePanel({ role, onSave, panelRef, flash }) {
  const [draft, setDraft] = useState(role.groups);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraft(role.groups), [role.id, role.groups]);
  useEffect(() => setSaved(false), [role.id]);

  const total = countAll(draft);
  const on = countChecked(draft);
  const toggle = (gi, ii) => {
    setSaved(false);
    setDraft((d) =>
      d.map((g, i) => (i !== gi ? g : { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, checked: !it.checked } : it)) }))
    );
  };
  const setAll = () => {
    const to = on !== total;
    setDraft((d) => d.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, checked: to })) })));
  };

  return (
    <aside className={'rpanel' + (flash ? ' is-flash' : '')} ref={panelRef} tabIndex={-1} aria-label={role.title}>
      <header className="rpanel__head">
        <span className="rcard__icon rcard__icon--solid">
          <RoleIcon name={role.icon || 'shield'} size={22} />
        </span>
        <div className="rpanel__title">
          <div className="rpanel__titlerow">
            <h2>{role.title}</h2>
            {role.panelTag && <span className="rtag">{role.panelTag}</span>}
          </div>
          <p>{role.panelSub || 'معاينة وتعديل مصفوفة الصلاحيات الممنوحة'}</p>
        </div>
        <div className="rpanel__tools">
          <button type="button" className="rpanel__link" onClick={setAll}>
            تحديد الكل
          </button>
          <button type="button" className="rpanel__reset" aria-label="تحديث" onClick={() => setDraft(role.groups)}>
            <RefreshIcon size={20} />
          </button>
        </div>
      </header>

      <div className="rpanel__total">
        <span>إجمالي الصلاحيات المفعلة:</span>
        <strong>
          {on} / {total} صلاحية
        </strong>
      </div>

      <div className="rpanel__scroll">
        {draft.map((g, gi) => (
          <section className="pgroup" key={g.id}>
            <header>
              <RoleIcon name={g.icon} size={22} />
              <h4>{g.title}</h4>
              <span className="pgroup__count">
                {g.items.filter((i) => i.checked).length} / {g.items.length} مفعلة
              </span>
            </header>
            {g.items.map((it, ii) => (
              <PermItem key={it.id} item={it} onToggle={() => toggle(gi, ii)} />
            ))}
          </section>
        ))}
      </div>

      {saved && <p className="rpanel__saved" role="status">تم حفظ صلاحيات الدور</p>}
      <footer className="rpanel__foot">
        <button type="button" className="btn-outline" onClick={() => setDraft(role.groups)}>
          إلغاء التغييرات
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            onSave(role.id, draft);
            setSaved(true);
          }}
        >
          حفظ مصفوفة الصلاحيات
        </button>
      </footer>
    </aside>
  );
}

/* ---------- page ---------- */
const STATUS_OPTS = [
  { v: '', t: 'الحالة : الكل' },
  { v: 'active', t: 'الحالة : نشط' },
  { v: 'inactive', t: 'الحالة : غير نشط' },
];

export default function Roles() {
  const { roles, saveGroups } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('active');
  const [type, setType] = useState('');
  const [selectedId, setSelectedId] = useState(location.state?.selectId || null);
  const [flash, setFlash] = useState(0);
  const panelRef = useRef(null);
  const editRole = (id) => {
    setSelectedId(id);
    setFlash((n) => n + 1);
    // on narrow screens the panel is under the list: bring it into view
    requestAnimationFrame(() => {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      panelRef.current?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(0), 900);
    return () => clearTimeout(t);
  }, [flash]);

  const types = useMemo(() => [...new Set(roles.map((r) => r.tag))], [roles]);
  const list = roles.filter(
    (r) =>
      (!q.trim() || (r.title + ' ' + r.desc + ' ' + r.tag).includes(q.trim())) &&
      (!status || r.status === status) &&
      (!type || r.tag === type)
  );
  const selected = roles.find((r) => r.id === selectedId);
  const reset = () => {
    setQ('');
    setStatus('active');
    setType('');
  };
  const created = roles.filter((r) => r.custom);
  const createdActive = created.filter((r) => r.status === 'active').length;
  // the design says "6 of 8": two roles are not part of the screens we were given
  const hiddenInDesign = 2;
  const totalDefined = roles.length + hiddenInDesign;

  return (
    <div className="roles-page">
      <div className="page-head roles-head">
        <div>
          <h1 className="page-title">الأدوار والصلاحيات</h1>
          <p className="page-subtitle">إدارة أدوار المستخدمين والتحكم في مصفوفة صلاحيات الوصول وفق معايير الحوكمة</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn-primary" onClick={() => navigate('/roles/new')}>
            إضافة دور جديد
          </button>
        </div>
      </div>

      <div className="ustats">
        <Stat
          icon={<FingerprintIcon size={26} />}
          tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }}
          value={8 + createdActive}
          unit="أدوار مفعلة"
          label="إجمالي الادوار المعرفة"
          sub={`6 قياسية . ${2 + created.length} أدوار مخصصة للجان`}
          subClass="is-green"
        />
        <Stat
          icon={<UsersIcon size={24} />}
          tint={{ bg: '#eefff8', fg: '#0a5c36' }}
          value="148"
          unit="مستخدم موثوق"
          label="اجمالي المستخدمين المعينين"
          sub="(مربوطين بالهوية الوطنية الموحدة (نفاذ"
          subClass="is-green"
        />
        <Stat
          icon={<ShieldIcon size={24} />}
          tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }}
          value="21"
          unit="صلاحية إجرائية"
          label="متوسط الصلاحيات لكل دور"
          sub="موزعة عبر 5 وحدات نظام مركزية"
        />
        <Stat
          icon={<CheckBoxIcon size={24} />}
          tint={{ bg: '#eefff8', fg: '#0a5c36' }}
          value="100%"
          unit="متوافق بالكامل"
          label="المقفلة وغير النشطة"
          sub="صفر تعارض صلاحيات"
          subClass="is-green"
        />
      </div>

      <div className="rcols">
        <section className="rlist">
          <div className="rfilters">
            <label className="search-field">
              <SearchIcon size={22} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="البحث في مسميات الأدوار , الوصف أو الرموز" />
            </label>
            <label className="sel">
              <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="الحالة">
                {STATUS_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.t}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={18} className="sel__chev" />
            </label>
            <label className="sel">
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع الدور">
                <option value="">نوع الدور : الكل</option>
                {types.map((t) => (
                  <option key={t} value={t}>
                    نوع الدور : {t}
                  </option>
                ))}
              </select>
              <ChevronDownIcon size={18} className="sel__chev" />
            </label>
            <button type="button" className="refresh-btn refresh-btn--text" onClick={reset}>
              <RefreshIcon size={20} />
              تحديث
            </button>
          </div>

          <div className="rlist__meta">
            <span>عرض {list.length} من أصل {totalDefined} أدوار معرفة</span>
            <em>انقر على أي دور لمعاينة مصفوفة الصلاحيات</em>
          </div>

          <div className="rolegrid roles__grid">
            {list.map((r) => (
              <RoleCard key={r.id} role={r} selected={r.id === selectedId} onSelect={() => editRole(r.id)} />
            ))}
            {list.length === 0 && <div className="rlist__none">لا توجد نتائج</div>}
          </div>
        </section>

        {selected ? <RolePanel role={selected} onSave={saveGroups} panelRef={panelRef} flash={flash > 0} /> : <EmptyPanel />}
      </div>
    </div>
  );
}
