import LangButton from './LangButton.jsx';
import { useMaster } from '../masterStore.jsx';
import { useAuth } from '../auth.jsx';
import { useEffect, useRef, useState } from 'react';
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
const NOTIFICATIONS = [
  { id: 1, title: 'محاولات دخول فاشلة متكررة', text: '3 محاولات من عنوان 185.44.10.2 وتم حظره مؤقتاً', time: 'منذ 55 دقيقة', tone: 'red', to: '/audit-log' },
  { id: 2, title: 'دعوات مستخدمين معلقة', text: '12 مستخدماً لم يفعّلوا حساباتهم بعد', time: 'منذ ساعتين', tone: 'amber', to: '/users' },
  { id: 3, title: 'تم تعديل صلاحيات دور', text: 'المالية / الموازنة: أُزيلت صلاحية واحدة', time: 'منذ 3 ساعات', tone: 'blue', to: '/roles' },
  { id: 4, title: 'مورد جديد بانتظار الاعتماد', text: 'شركة النور للتجهيزات', time: 'أمس', tone: 'green', to: '/vendors' },
];

function Bell() {
  const { open, setOpen, ref } = useDropdown();
  const navigate = useNavigate();
  const [read, setRead] = useState([]);
  const unread = NOTIFICATIONS.filter((n) => !read.includes(n.id)).length;
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
        {unread > 0 && <span className="bell__count">{unread}</span>}
      </button>
      {open && (
        <div className="bell__menu" role="menu">
          <header className="bell__head">
            <strong>الإشعارات</strong>
            {unread > 0 && (
              <button type="button" onClick={() => setRead(NOTIFICATIONS.map((n) => n.id))}>
                تحديد الكل كمقروء
              </button>
            )}
          </header>
          <ul>
            {NOTIFICATIONS.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  role="menuitem"
                  className={'bell__item' + (read.includes(n.id) ? '' : ' is-new')}
                  onClick={() => {
                    setRead((r) => [...new Set([...r, n.id])]);
                    setOpen(false);
                    navigate(n.to);
                  }}
                >
                  <i className={'bell__dot bell__dot--' + n.tone} />
                  <span>
                    <b>{n.title}</b>
                    <small>{n.text}</small>
                    <em>{n.time}</em>
                  </span>
                </button>
              </li>
            ))}
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
