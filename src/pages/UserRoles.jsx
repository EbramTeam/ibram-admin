import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import RoleIcon from '../components/RoleIcon.jsx';
import { SearchIcon, RefreshIcon, RolesIcon } from '../components/Icons.jsx';
import { ROLE_OPTIONS } from './AddUser.jsx';
import { api, ApiError, errorText } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { fetchUser, fetchRoles, initials, permissionGroups, countPermissions, actionError } from '../lib/users.js';

// Edit the roles of one user.
// Left panel: the roles and permissions the user has NOW (read only).
// Right list: pick the NEW roles. A user's permissions come from their roles,
// so the permissions of the picked roles are shown under the list.
// Save = PATCH /api/users/{id} with role_ids.

// the role cards of "add user" step 3 (English name, scope tag), by the backend role name
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

function PermGroups({ groups, empty }) {
  if (!groups.length) return <p className="uroles__empty">{empty}</p>;
  return groups.map((g) => (
    <section className="pgroup" key={g.id}>
      <header>
        <RoleIcon name={g.icon} size={22} />
        <h4>{g.title}</h4>
        <span className="pgroup__count">{g.items.length} مفعلة</span>
      </header>
      {g.items.map((it) => (
        <div className="pitem uroles__pitem" key={it.id}>
          <div className="pitem__text">
            <strong>{it.name}</strong>
            <span dir="ltr">{it.desc}</span>
          </div>
          <em className="pitem__state">مسموح</em>
        </div>
      ))}
    </section>
  ));
}

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function UserRoles() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [roles, setRoles] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [picked, setPicked] = useState([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [u, list] = await Promise.all([fetchUser(id), fetchRoles()]);
      setUser(u);
      setRoles(list);
      setPicked(u.roles.map((r) => r.id));
    } catch (err) {
      setLoadError(err instanceof ApiError && err.status === 404 ? 'هذا المستخدم غير موجود' : errorText(err));
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const byId = useMemo(() => Object.fromEntries((roles || []).map((r) => [r.id, r])), [roles]);
  const current = useMemo(() => (user ? user.roles.map((r) => r.id) : []), [user]);
  const currentPerms = useMemo(() => permissionGroups(current.map((rid) => byId[rid]).filter(Boolean)), [current, byId]);
  const newPerms = useMemo(() => permissionGroups(picked.map((rid) => byId[rid]).filter(Boolean)), [picked, byId]);

  if (loadError) {
    return (
      <div className="roles-page uroles">
        <h1 className="page-title">تعديل أدوار المستخدم</h1>
        <p className="users-msg is-err" role="alert">
          {loadError}
          <button type="button" onClick={load}>إعادة المحاولة</button>
        </p>
      </div>
    );
  }
  if (!user || !roles) {
    return (
      <div className="roles-page uroles">
        <h1 className="page-title">تعديل أدوار المستخدم</h1>
        <p className="users-msg">جارٍ التحميل...</p>
      </div>
    );
  }

  const isMe = me?.id === user.id;
  const added = picked.filter((rid) => !current.includes(rid));
  const removed = current.filter((rid) => !picked.includes(rid));
  const changed = !sameSet(picked, current);
  const term = q.trim();
  // inactive roles can't be given again, but stay visible for whoever already has them
  const list = roles.filter((r) => (r.is_active !== false || current.includes(r.id)) && (!term || [r.label, r.name, r.description].join(' ').includes(term)));

  const toggle = (rid) => {
    setSaved(false);
    setError('');
    setPicked((p) => (p.includes(rid) ? p.filter((x) => x !== rid) : [...p, rid]));
  };

  async function save() {
    if (!picked.length) {
      setError('يجب اختيار دور واحد على الأقل');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await api(`/users/${user.id}`, { method: 'PATCH', body: { role_ids: picked } });
      setUser(updated);
      setPicked(updated.roles.map((r) => r.id));
      setSaved(true);
    } catch (err) {
      setError(actionError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="roles-page uroles">
      <div className="page-head roles-head">
        <div>
          <h1 className="page-title">تعديل أدوار المستخدم</h1>
          <p className="page-subtitle">
            {user.name} · <bdi dir="ltr">{user.email}</bdi>
          </p>
        </div>
        <div className="page-head__actions uroles__actions">
          <button type="button" className="btn-outline" onClick={() => navigate(`/users/${user.id}`)}>
            رجوع
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!changed || saving || isMe}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ الأدوار الجديدة'}
          </button>
        </div>
      </div>

      {isMe && <p className="uroles__msg is-err" role="alert">لا يمكنك تعديل أدوار حسابك بنفسك. اطلب ذلك من مدير نظام آخر.</p>}
      {error && <p className="uroles__msg is-err" role="alert">{error}</p>}
      {saved && <p className="uroles__msg is-ok" role="status">تم حفظ أدوار المستخدم</p>}

      <div className="rcols">
        {/* right (RTL): pick the new roles */}
        <section className="rlist">
          <div className="rfilters">
            <label className="search-field">
              <SearchIcon size={22} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="البحث في مسميات الأدوار أو الوصف" />
            </label>
            <button type="button" className="refresh-btn refresh-btn--text" onClick={() => { setPicked(current); setError(''); setSaved(false); }}>
              <RefreshIcon size={20} />
              تراجع
            </button>
          </div>

          <div className="rlist__meta">
            <span>{picked.length} أدوار محددة</span>
            <em>حدد الأدوار الجديدة للمستخدم</em>
          </div>

          <div className="rolegrid uroles__grid">
            {list.map((r) => {
              const on = picked.includes(r.id);
              const info = CARD_INFO[CARD_KEY[r.name]] || {};
              return (
                <button type="button" key={r.id} className={'rolecard' + (on ? ' is-on' : '')} onClick={() => toggle(r.id)} aria-pressed={on} disabled={isMe}>
                  <span className={'rolecard__cb' + (on ? ' is-on' : '')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <h4>{r.label || r.name}</h4>
                  {info.en && <small className="rolecard__en">{info.en}</small>}
                  <p>{r.description || info.text || ''}</p>
                  <span className="rolecard__foot">
                    <b>{r.permissions.length} صلاحيات معتمدة</b>
                    {info.tag && <i>{info.tag}</i>}
                  </span>
                </button>
              );
            })}
            {list.length === 0 && <div className="rlist__none">لا توجد نتائج</div>}
          </div>

          <div className="uroles__new">
            <div className="rpanel__total">
              <span>الصلاحيات الجديدة بعد الحفظ:</span>
              <strong>{countPermissions(newPerms)} صلاحية</strong>
            </div>
            <div className="uroles__groups">
              <PermGroups groups={newPerms} empty="لم يتم تحديد أي دور" />
            </div>
          </div>
        </section>

        {/* left (RTL): what the user has now */}
        <aside className="rpanel uroles__panel">
          <header className="rpanel__head">
            <span className="rcard__icon rcard__icon--solid uroles__avatar">{initials(user.name)}</span>
            <div className="rpanel__title">
              <div className="rpanel__titlerow">
                <h2>الأدوار والصلاحيات الحالية</h2>
              </div>
              <p>ما يملكه المستخدم الآن قبل التعديل</p>
            </div>
            <span className="rpanel__bigicon uroles__icon" aria-hidden="true">
              <RolesIcon size={22} />
            </span>
          </header>

          <div className="uroles__chips">
            {user.roles.map((r) => (
              <span className="rtag" key={r.id}>{r.label || r.name}</span>
            ))}
          </div>

          <div className="rpanel__total">
            <span>إجمالي الصلاحيات الحالية:</span>
            <strong>{countPermissions(currentPerms)} صلاحية</strong>
          </div>

          {changed && (
            <div className="uroles__diff">
              <strong>التغييرات:</strong>
              {added.map((rid) => <span className="uroles__chg is-add" key={rid}>+ {byId[rid]?.label}</span>)}
              {removed.map((rid) => <span className="uroles__chg is-del" key={rid}>− {byId[rid]?.label}</span>)}
            </div>
          )}

          <div className="rpanel__scroll">
            <PermGroups groups={currentPerms} empty="لا توجد صلاحيات حالية" />
          </div>
        </aside>
      </div>
    </div>
  );
}
