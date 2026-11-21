import LangButton from './LangButton.jsx';
import { useMaster } from '../masterStore.jsx';
import { useAuth } from '../auth.jsx';
import { api } from '../lib/api.js';
import { lastSeen } from '../lib/users.js';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../data.js';
import {
  GridIcon, UsersIcon, RolesIcon, VendorsIcon, DatabaseIcon, SettingsIcon,
  SearchIcon, BellIcon, GlobeIcon, ChevronLeftIcon, ShieldLockIcon, UserFilledIcon,
} from './Icons.jsx';

// small dropdown helper: closes on outside click and on Escape
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

// TODO: load from the API (GET /api/notifications) when the panel is connected to the backend
// notifications from GET /api/notifications, checked every minute while the panel is open
const POLL_MS = 60000;
const toneOf = (type) =>
  type.startsWith('security.') ? 'red' : type.startsWith('organization_request.') ? 'amber' : type.startsWith('contact_message.') ? 'green' : 'blue';
// where a notification leads in the admin panel (null = nowhere, it is only marked as read)
const linkOf = (n) => {
  if (n.subject_type === 'user' && n.subject_id) return `/users/${n.subject_id}`;
  if (n.type.startsWith('security.')) return '/audit-log';
  return null;
};

function Bell() {
  const { open, setOpen, ref } = useDropdown();
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    api('/notifications')
      .then((r) => {
        setList(r.notifications.data);
        setUnread(r.unread_count);
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(() => document.visibilityState === 'visible' && load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // opening the menu refreshes it
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const markRead = (n) => {
    if (n.read_at) return;
    setList((l) => l.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
    setUnread((u) => Math.max(0, u - 1));
    api(`/notifications/${n.id}/read`, { method: 'POST' }).catch(() => load());
  };
  const readAll = () => {
    setList((l) => l.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setUnread(0);
    api('/notifications/read-all', { method: 'POST' }).catch(() => load());
  };

  return (
    <div className="bell" ref={ref}>
      <button
        type="button"
        className="topbar__bell"
        aria-label={unread ? `الإشعارات (${unread} غير مقروءة)` : 'الإشعارات'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <BellIcon size={24} />
        {unread > 0 && <span className="bell__count">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="bell__menu" role="menu">
          <header className="bell__head">
            <strong>الإشعارات</strong>
            {unread > 0 && (
              <button type="button" onClick={readAll}>
                تحديد الكل كمقروء
              </button>
            )}
          </header>
          <ul>
            {list.map((n) => {
              const to = linkOf(n);
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={'bell__item' + (n.read_at ? '' : ' is-new')}
                    onClick={() => {
                      markRead(n);
                      if (to) {
                        setOpen(false);
                        navigate(to);
                      }
                    }}
                  >
                    <i className={'bell__dot bell__dot--' + toneOf(n.type)} />
                    <span>
                      <b>{n.title}</b>
                      {n.body && <small>{n.body}</small>}
                      <em>{lastSeen(n.created_at)}</em>
                    </span>
                  </button>
                </li>
              );
            })}
            {loaded && !list.length && <li className="bell__empty">{failed ? 'تعذّر تحميل الإشعارات' : 'لا توجد إشعارات'}</li>}
            {!loaded && <li className="bell__empty">جارٍ التحميل...</li>}
          </ul>
          <Link to="/audit-log" className="bell__all" onClick={() => setOpen(false)}>
            عرض سجل التدقيق
          </Link>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { open, setOpen, ref } = useDropdown();
  const navigate = useNavigate();
  const { logout } = useAuth();
  return (
    <div className="pmenu" ref={ref}>
      <button type="button" className="sidebar__chev" aria-label="قائمة الحساب" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <ChevronLeftIcon size={18} />
      </button>
      {open && (
        <div className="pmenu__menu" role="menu">
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/settings'); }}>
            <SettingsIcon size={18} />
            الإعدادات
          </button>
          <button type="button" role="menuitem" onClick={() => { setOpen(false); navigate('/audit-log'); }}>
            <ShieldLockIcon size={18} />
            سجل التدقيق
          </button>
          <hr />
          <button
            type="button"
            role="menuitem"
            className="is-danger"
            onClick={async () => {
              setOpen(false);
              await logout(); // POST /api/logout, then the token is removed
              navigate('/login', { replace: true });
            }}
          >
            <LogoutIcon size={18} />
            تسجيل الخروج
          </button>
        </div>
      )}
    </div>
  );
}

const LogoutIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l-5-5 5-5M5 12h11" />
  </svg>
);

const ICONS = {
  grid: GridIcon,
  users: UsersIcon,
  roles: RolesIcon,
  vendors: VendorsIcon,
  db: DatabaseIcon,
  settings: SettingsIcon,
};

function crumbsFor(pathname, M) {
  const base = [
    { label: 'نظام إدارة المشتريات - الأزهر', to: '/' },
    { label: 'لوحة التحكم والمتابعة', to: '/', strong: true },
  ];
  if (pathname.startsWith('/master-data')) {
    const BD = { label: 'البيانات الأساسية', to: '/master-data' };
    const m = pathname.match(/^\/master-data\/(departments|items|units|categories)(?:\/(new|[^/]+))?(\/edit)?$/);
    if (!m) return [...base, BD];
    const [, kind, id, edit] = m;
    const isNew = id === 'new';
    const rec = id && !isNew ? M[kind].find((x) => x.id === id) : null;
    const nm = rec ? rec.name : '';
    const L = { departments: '/master-data/departments', items: '/master-data/items', units: '/master-data/units', categories: '/master-data/categories' }[kind];
    if (kind === 'departments') return [...base, BD, ...(!id ? [{ label: 'الأقسام والإدارات', to: L }] : [{ label: isNew ? 'إضافة قسم أو إدارة جديدة' : edit ? 'تعديل قسم أو إدارة جديدة' : nm, to: pathname }])];
    if (kind === 'items') return [...base, BD, ...(!id ? [{ label: 'الأصناف', to: L }] : [{ label: 'الأصناف', to: L }, { label: edit ? 'تعديل بيانات عنصر' : 'إضافة صنف جديد', to: pathname }])];
    if (kind === 'units') return [...base, BD, { label: 'الأصناف', to: '/master-data/items' }, { label: 'وحدات قياس', to: L }, ...(!id ? [] : [{ label: isNew || edit ? 'إضافة وحدة قياس جديدة' : nm, to: pathname }])];
    return [...base, BD, ...(!id ? [{ label: 'التصنيفات', to: L }] : isNew || edit ? [{ label: 'الأصناف', to: '/master-data/items' }, { label: 'إضافة صنف جديد', to: pathname }] : [{ label: 'التصنيفات', to: L }, { label: nm, to: pathname }])];
  }
  if (pathname.startsWith('/settings')) {
    const S = { label: 'الإعدادات', to: '/settings' };
    if (pathname === '/settings/procurement') return [...base, S, { label: 'المشتريات وسير العملية', to: pathname }];
    if (pathname === '/settings/notifications') return [...base, S, { label: 'إعدادات الإشعارات', to: pathname }];
    return [...base, S];
  }
  if (pathname === '/users/new') return [...base, { label: 'إضافة مستخدم', to: '/users/new' }];
  if (pathname === '/roles/new') return [...base, { label: 'اضافة دور جديد', to: '/roles/new' }];
  if (pathname === '/vendors/new') return [...base, { label: 'الموردين', to: '/vendors' }, { label: 'إضافة مورد جديد', to: pathname }];
  if (pathname.startsWith('/vendors/') && pathname.endsWith('/edit')) return [...base, { label: 'الموردين', to: '/vendors' }, { label: 'تعديل بيانات المورد', to: pathname }];
  if (pathname.startsWith('/vendors')) return [...base, { label: 'الموردين', to: '/vendors' }];
  if (pathname.startsWith('/roles')) return [...base, { label: 'الأدوار والصلاحيات', to: '/roles' }];
  if (pathname.endsWith('/permissions')) return [...base, { label: 'إدارة المستخدمين', to: '/users' }, { label: 'تعديل أدوار المستخدم', to: pathname }];
  if (pathname.startsWith('/users')) return [...base, { label: 'إدارة المستخدمين', to: '/users' }];
  if (pathname === '/audit-log') return [...base, { label: 'سجل التدقيق', to: pathname }];
  return base;
}

function Sidebar({ open, onClose }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  return (
    <aside className={'sidebar' + (open ? ' is-open' : '')} onClick={(e) => e.target.closest('a') && onClose()}>
      <div className="sidebar__scroll">
        <Link to="/" className="sidebar__brand">
          <img src="/assets/ibram-logo.png" alt="IBRAM" />
          <span>إبرام للمشتريات</span>
        </Link>
        <div className="sidebar__label">القوائم التشغيلية</div>
        <nav className="sidebar__nav">
          {NAV_ITEMS.map((item) => {
            const Icon = ICONS[item.icon];
            const active = item.to === '/' ? pathname === '/' : pathname === item.to || pathname.startsWith(item.to + '/');
            return (
              <NavLink key={item.key} to={item.to} className={'nav-item' + (active ? ' is-active' : '')}>
                <Icon size={22} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>
      <div className="sidebar__bottom">
        <div className="sidebar__status">
          <ShieldLockIcon size={22} />
          <div>
            <strong>
              النظام متصل وآمن
              <i />
            </strong>
            <small>Sovereign Core v4.2</small>
          </div>
        </div>
        <div className="sidebar__profile">
          <UserFilledIcon size={28} className="sidebar__avatar" />
          <div>
            <strong>{user?.name || 'د. محمد كسبة'}</strong>
            <small>{user?.roles?.map((r) => r.label || r.name).join('، ') || 'مدير النظام العام'}</small>
          </div>
          <ProfileMenu />
        </div>
      </div>
    </aside>
  );
}

function Topbar({ onMenu }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const M = useMaster();
  const crumbs = crumbsFor(pathname, M);
  return (
    <header className="topbar">
      <button type="button" className="topbar__menu" aria-label="القائمة" onClick={onMenu}>
        <span /><span /><span />
      </button>
      <nav className="crumbs" aria-label="breadcrumb">
        {crumbs.map((c, i) => (
          <span key={c.label} className="crumbs__item">
            {i > 0 && <ChevronLeftIcon size={14} className="crumbs__sep" />}
            <Link to={c.to} className={c.strong ? 'is-strong' : ''}>
              {c.label}
            </Link>
          </span>
        ))}
      </nav>
      <form
        className="topbar__search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate('/users');
        }}
      >
        <SearchIcon size={22} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" aria-label="بحث" />
      </form>
      <div className="topbar__tools">
        <Bell />
        <span className="topbar__divider" />
        <LangButton size={13} />
      </div>
    </header>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => setOpen(false), [pathname]);
  return (
    <div className="app">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      {open && <div className="sidebar-back" onClick={() => setOpen(false)} />}
      <div className="app__main">
        <Topbar onMenu={() => setOpen(true)} />
        <div className="app__content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
