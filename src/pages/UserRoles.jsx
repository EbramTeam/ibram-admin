import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '../rolesStore.jsx';
import RoleIcon from '../components/RoleIcon.jsx';
import { SearchIcon, RefreshIcon, RolesIcon } from '../components/Icons.jsx';
import { ROLE_OPTIONS } from './AddUser.jsx';

// same role cards as step 3 of "add user": English name, permissions label and scope tag
const CARD_KEY = { requester: 'req', 'dept-manager': 'mgr', finance: 'fin', procurement: 'proc', committee: 'tender', sysadmin: 'sys' };
const CARD_INFO = Object.fromEntries(ROLE_OPTIONS.map((o) => [o.key, o]));

// Edit the roles of one user.
// Left panel: the roles and permissions the user has NOW (read only).
// Right list: pick the NEW roles. A user's permissions come from their roles,
// so the permissions of the picked roles are shown under the list.
// Local state only for now: saving does not reach the backend yet.

// TODO: replace with the user loaded from the API (GET /api/users/{id})
const USER = { name: 'د. حسام بن عبدالعزيز السويلم', initials: 'د.ح', empId: 'EMP-04821' };
const CURRENT_ROLE_IDS = ['committee', 'finance', 'procurement'];

// permissions of a set of roles, grouped like the roles screen, without duplicates
function permissionsOf(roles) {
  const groups = new Map();
  roles.forEach((r) =>
    (r.groups || []).forEach((g) => {
      if (!groups.has(g.id)) groups.set(g.id, { id: g.id, icon: g.icon, title: g.title, items: new Map() });
      g.items.filter((i) => i.checked).forEach((i) => groups.get(g.id).items.set(i.id, i));
    })
  );
  return [...groups.values()]
    .map((g) => ({ ...g, items: [...g.items.values()] }))
    .filter((g) => g.items.length);
}
const countPerms = (groups) => groups.reduce((s, g) => s + g.items.length, 0);

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
        <div className={'pitem uroles__pitem' + (it.tag ? ' is-hot' : '')} key={it.id}>
          <div className="pitem__text">
            <strong>{it.name}</strong>
            <span>{it.desc}</span>
          </div>
          <em className="pitem__state">مسموح</em>
        </div>
      ))}
    </section>
  ));
}

export default function UserRoles() {
  const navigate = useNavigate();
  const { roles } = useRoles();
  const [current, setCurrent] = useState(CURRENT_ROLE_IDS);
  const [picked, setPicked] = useState(CURRENT_ROLE_IDS);
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const byId = useMemo(() => Object.fromEntries(roles.map((r) => [r.id, r])), [roles]);
  const currentRoles = current.map((id) => byId[id]).filter(Boolean);
  const pickedRoles = picked.map((id) => byId[id]).filter(Boolean);
  const currentPerms = useMemo(() => permissionsOf(currentRoles), [currentRoles]);
  const newPerms = useMemo(() => permissionsOf(pickedRoles), [pickedRoles]);

  const added = picked.filter((id) => !current.includes(id));
  const removed = current.filter((id) => !picked.includes(id));
  const changed = added.length > 0 || removed.length > 0;

  const list = roles.filter((r) => r.status === 'active' && (!q.trim() || (r.title + ' ' + r.desc).includes(q.trim())));

  const toggle = (id) => {
    setSaved(false);
    setError('');
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const save = () => {
    if (!picked.length) {
      setError('يجب اختيار دور واحد على الأقل');
      return;
    }
    // TODO: send to the API (PUT /api/users/{id} with role_ids) when connected to the backend
    setCurrent(picked);
    setSaved(true);
  };

  return (
    <div className="roles-page uroles">
      <div className="page-head roles-head">
        <div>
          <h1 className="page-title">تعديل أدوار المستخدم</h1>
          <p className="page-subtitle">
            {USER.name} · <bdi dir="ltr">{USER.empId}</bdi>
          </p>
        </div>
        <div className="page-head__actions uroles__actions">
          <button type="button" className="btn-outline" onClick={() => navigate(`/users/${USER.empId}`)}>
            رجوع
          </button>
          <button type="button" className="btn-primary" onClick={save} disabled={!changed}>
            حفظ الأدوار الجديدة
          </button>
        </div>
      </div>

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
              const info = CARD_INFO[CARD_KEY[r.id]] || {};
              return (
                <button type="button" key={r.id} className={'rolecard' + (on ? ' is-on' : '')} onClick={() => toggle(r.id)} aria-pressed={on}>
                  <span className={'rolecard__cb' + (on ? ' is-on' : '')}>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  </span>
                  <h4>{r.title}</h4>
                  {info.en && <small className="rolecard__en">{info.en}</small>}
                  <p>{info.text || r.desc}</p>
                  <span className="rolecard__foot">
                    <b>{r.perms} صلاحيات معتمدة</b>
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
              <strong>{countPerms(newPerms)} صلاحية</strong>
            </div>
            <div className="uroles__groups">
              <PermGroups groups={newPerms} empty="لم يتم تحديد أي دور" />
            </div>
          </div>
        </section>

        {/* left (RTL): what the user has now */}
        <aside className="rpanel uroles__panel">
          <header className="rpanel__head">
            <span className="rcard__icon rcard__icon--solid uroles__avatar">{USER.initials}</span>
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
            {currentRoles.map((r) => (
              <span className="rtag" key={r.id}>{r.title}</span>
            ))}
          </div>

          <div className="rpanel__total">
            <span>إجمالي الصلاحيات الحالية:</span>
            <strong>{countPerms(currentPerms)} صلاحية</strong>
          </div>

          {changed && (
            <div className="uroles__diff">
              <strong>التغييرات:</strong>
              {added.map((id) => <span className="uroles__chg is-add" key={id}>+ {byId[id]?.title}</span>)}
              {removed.map((id) => <span className="uroles__chg is-del" key={id}>− {byId[id]?.title}</span>)}
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
