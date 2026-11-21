import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, errorText } from '../lib/api.js';
import { fetchRoles, fetchPermissions, groupPermissions, actionError } from '../lib/users.js';
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
const CARD_KEY = {
  requester: 'req',
  department_manager: 'mgr',
  finance_officer: 'fin',
  procurement_officer: 'proc',
  committee: 'tender',
  bid_opening_committee: 'tender',
  admin: 'sys',
};
const CARD_INFO = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.key, o]));

function RoleCard({ role, selected, onSelect }) {
  const info = CARD_INFO[CARD_KEY[role.name]] || {};
  return (
    <button
      type="button"
      className={'rolecard' + (selected ? ' is-on' : '')}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className={'rolecard__cb' + (selected ? ' is-on' : '')}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h4>{role.label || role.name}</h4>
      {info.en && <small className="rolecard__en">{info.en}</small>}
      <p>{role.description || info.text || ''}</p>
      <span className="rolecard__foot">
        <b>
          {role.permissions.length} صلاحيات معتمدة · {role.users_count} {role.users_count === 1 ? 'مستخدم' : 'مستخدمين'}
        </b>
        <i className={role.is_active === false ? 'is-off' : ''}>
          {role.is_active === false ? 'غير نشط' : role.is_locked ? 'مقفل' : role.is_system === false ? 'مخصص' : info.tag || 'قياسي'}
        </i>
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

function PermItem({ item, onToggle, locked }) {
  return (
    <div className={'pitem' + (locked ? ' is-locked' : '')}>
      <Cbx checked={item.checked} onChange={locked ? () => {} : onToggle} size={24} label={item.name} />
      <div className="pitem__text">
        <strong>{item.name}</strong>
        <span dir="ltr">{item.desc}</span>
      </div>
      <em className="pitem__state">{item.checked ? 'مسموح' : ''}</em>
    </div>
  );
}

function RolePanel({ role, allPermissions, onSaved, onDeleted, panelRef, flash }) {
  const initial = useMemo(() => groupPermissions(allPermissions, new Set(role.permissions.map((p) => p.id))), [role, allPermissions]);
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => setDraft(initial), [initial]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setSaved(false);
    setError('');
    setConfirmDelete(false);
    setNotice('');
  }, [role.id]);

  const custom = role.is_system === false;
  const inactive = role.is_active === false;

  async function toggleActive() {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await api(`/roles/${role.id}`, { method: 'PATCH', body: { is_active: inactive } });
      onSaved(updated);
      setNotice(inactive ? 'تم تفعيل الدور، وصلاحياته تُطبَّق فوراً على من يحمله' : 'تم تعطيل الدور: لا يمنح أي صلاحية ولا يُسند لمستخدمين جدد');
    } catch (err) {
      setError(actionError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api(`/roles/${role.id}`, { method: 'DELETE' });
      onDeleted(role.id);
    } catch (err) {
      setError(actionError(err));
      setConfirmDelete(false);
      setSaving(false);
    }
  }

  const locked = role.is_locked;
  const items = draft.flatMap((g) => g.items);
  const total = items.length;
  const on = items.filter((i) => i.checked).length;
  const changed = items.some((it, i) => it.checked !== initial.flatMap((g) => g.items)[i]?.checked);

  const toggle = (gi, ii) => {
    setSaved(false);
    setDraft((d) =>
      d.map((g, i) => (i !== gi ? g : { ...g, items: g.items.map((it, j) => (j === ii ? { ...it, checked: !it.checked } : it)) }))
    );
  };
  const setAll = () => {
    const to = on !== total;
    setSaved(false);
    setDraft((d) => d.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, checked: to })) })));
  };

  async function save() {
    setSaving(true);
    setError('');
    try {
      const updated = await api(`/roles/${role.id}/permissions`, {
        method: 'PUT',
        body: { permission_ids: items.filter((i) => i.checked).map((i) => i.id) },
      });
      onSaved(updated);
      setSaved(true);
    } catch (err) {
      setError(actionError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <aside className={'rpanel' + (flash ? ' is-flash' : '')} ref={panelRef} tabIndex={-1} aria-label={role.label}>
      <header className="rpanel__head">
        <span className="rcard__icon rcard__icon--solid">
          <RoleIcon name={role.is_locked ? 'admin' : 'shield'} size={22} />
        </span>
        <div className="rpanel__title">
          <div className="rpanel__titlerow">
            <h2>{role.label || role.name}</h2>
            {locked && <span className="rtag">مقفل</span>}
            {custom && <span className="rtag rtag--custom">مخصص</span>}
            {inactive && <span className="rtag rtag--off">غير نشط</span>}
          </div>
          <p>
            {locked
              ? 'دور مدير النظام يملك كل الصلاحيات ولا يمكن تعديله من هنا'
              : `${role.users_count} ${role.users_count === 1 ? 'مستخدم يحمل' : 'مستخدمين يحملون'} هذا الدور · معاينة وتعديل مصفوفة الصلاحيات`}
          </p>
        </div>
        {!locked && (
          <div className="rpanel__tools">
            <button type="button" className="rpanel__link" onClick={setAll}>
              {on === total ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
            </button>
            <button type="button" className="rpanel__reset" aria-label="تراجع عن التغييرات" onClick={() => setDraft(initial)}>
              <RefreshIcon size={20} />
            </button>
          </div>
        )}
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
              <PermItem key={it.id} item={it} locked={locked} onToggle={() => toggle(gi, ii)} />
            ))}
          </section>
        ))}
      </div>

      {custom && (
        <div className="rpanel__manage">
          <button type="button" className="mini mini--soft" onClick={toggleActive} disabled={saving}>
            {inactive ? 'تفعيل الدور' : 'تعطيل الدور'}
          </button>
          {role.users_count === 0 ? (
            <button type="button" className={'mini mini--soft is-error' + (confirmDelete ? ' is-confirm' : '')} onClick={remove} disabled={saving}>
              {confirmDelete ? 'تأكيد الحذف النهائي' : 'حذف الدور'}
            </button>
          ) : (
            <small>لا يمكن حذف دور يحمله مستخدمون</small>
          )}
          {confirmDelete && (
            <button type="button" className="rpanel__link" onClick={() => setConfirmDelete(false)}>
              تراجع
            </button>
          )}
        </div>
      )}
      {notice && <p className="rpanel__saved" role="status">{notice}</p>}
      {error && <p className="rpanel__error" role="alert">{error}</p>}
      {saved && !changed && <p className="rpanel__saved" role="status">تم حفظ صلاحيات الدور، وتُطبَّق فوراً على كل من يحمله</p>}
      {!locked && (
        <footer className="rpanel__foot">
          <button type="button" className="btn-outline" onClick={() => setDraft(initial)} disabled={!changed || saving}>
            إلغاء التغييرات
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!changed || saving}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ مصفوفة الصلاحيات'}
          </button>
        </footer>
      )}
    </aside>
  );
}

/* ---------- page ---------- */
const TYPE_OPTS = [
  { v: '', t: 'نوع الدور : الكل' },
  { v: 'editable', t: 'نوع الدور : قابل للتعديل' },
  { v: 'locked', t: 'نوع الدور : مقفل' },
  { v: 'custom', t: 'نوع الدور : مخصص' },
  { v: 'inactive', t: 'نوع الدور : غير نشط' },
];
const matchesType = (r, type) =>
  !type ||
  (type === 'locked' && r.is_locked) ||
  (type === 'editable' && !r.is_locked) ||
  (type === 'custom' && r.is_system === false) ||
  (type === 'inactive' && r.is_active === false);

export default function Roles() {
  const location = useLocation();
  const navigate = useNavigate();
  const [roles, setRoles] = useState(null);
  const [allPermissions, setAllPermissions] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [selectedId, setSelectedId] = useState(location.state?.selectId || null);
  // a notification can open a role while this page is already showing
  useEffect(() => {
    if (location.state?.selectId) setSelectedId(location.state.selectId);
  }, [location.state]);
  const [flash, setFlash] = useState(0);
  const panelRef = useRef(null);

  const load = useCallback(() => {
    setLoadError('');
    Promise.all([fetchRoles(), fetchPermissions()])
      .then(([r, p]) => {
        setRoles(r);
        setAllPermissions(p);
      })
      .catch((err) => setLoadError(errorText(err)));
  }, []);
  useEffect(load, [load]);

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

  if (loadError || !roles) {
    return (
      <div className="roles-page">
        <h1 className="page-title">الأدوار والصلاحيات</h1>
        <p className={'users-msg' + (loadError ? ' is-err' : '')} role={loadError ? 'alert' : undefined}>
          {loadError || 'جارٍ التحميل...'}
          {loadError && <button type="button" onClick={load}>إعادة المحاولة</button>}
        </p>
      </div>
    );
  }

  const term = q.trim();
  const list = roles.filter(
    (r) =>
      (!term || [r.label, r.name, r.description].join(' ').includes(term)) &&
      matchesType(r, type)
  );
  const selected = roles.find((r) => r.id === selectedId);
  const reset = () => {
    setQ('');
    setType('');
    load();
  };
  const onSaved = (updated) => setRoles((rs) => rs.map((r) => (r.id === updated.id ? updated : r)));
  const onDeleted = (id) => {
    setRoles((rs) => rs.filter((r) => r.id !== id));
    setSelectedId(null);
  };

  const assignments = roles.reduce((s, r) => s + r.users_count, 0);
  const avg = roles.length ? Math.round(roles.reduce((s, r) => s + r.permissions.length, 0) / roles.length) : 0;
  const areas = groupPermissions(allPermissions).length;
  const locked = roles.filter((r) => r.is_locked).length;
  const empty = roles.filter((r) => !r.users_count).length;

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
          value={roles.length}
          unit="أدوار"
          label="إجمالي الادوار المعرفة"
          sub={`${roles.length - locked} قابلة للتعديل · ${locked} مقفل`}
          subClass="is-green"
        />
        <Stat
          icon={<UsersIcon size={24} />}
          tint={{ bg: '#eefff8', fg: '#0a5c36' }}
          value={assignments}
          unit="تعيين"
          label="المستخدمون المعينون"
          sub="المستخدم الواحد قد يحمل أكثر من دور"
          subClass="is-green"
        />
        <Stat
          icon={<ShieldIcon size={24} />}
          tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }}
          value={avg}
          unit="صلاحية"
          label="متوسط الصلاحيات لكل دور"
          sub={`من أصل ${allPermissions.length} صلاحية موزعة على ${areas} مجالات`}
        />
        <Stat
          icon={<CheckBoxIcon size={24} />}
          tint={{ bg: '#eefff8', fg: '#0a5c36' }}
          value={empty}
          unit={empty === 1 ? 'دور' : 'أدوار'}
          label="أدوار بدون مستخدمين"
          sub={empty ? 'لا يحملها أي مستخدم حالياً' : 'كل الأدوار مستخدمة'}
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
              <select value={type} onChange={(e) => setType(e.target.value)} aria-label="نوع الدور">
                {TYPE_OPTS.map((o) => (
                  <option key={o.v} value={o.v}>
                    {o.t}
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
            <span>عرض {list.length} من أصل {roles.length} أدوار معرفة</span>
            <em>انقر على أي دور لمعاينة مصفوفة الصلاحيات</em>
          </div>

          <div className="rolegrid roles__grid">
            {list.map((r) => (
              <RoleCard key={r.id} role={r} selected={r.id === selectedId} onSelect={() => editRole(r.id)} />
            ))}
            {list.length === 0 && <div className="rlist__none">لا توجد نتائج</div>}
          </div>
        </section>

        {selected ? (
          <RolePanel role={selected} allPermissions={allPermissions} onSaved={onSaved} onDeleted={onDeleted} panelRef={panelRef} flash={flash > 0} />
        ) : (
          <EmptyPanel />
        )}
      </div>
    </div>
  );
}
