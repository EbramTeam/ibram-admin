import { useEffect, useRef, useState } from 'react';
import { PencilIcon, LockIcon, DotsVerticalIcon, SearchIcon, RefreshIcon, ChevronDownIcon, CircleXIcon } from '../../components/Icons.jsx';
import CountUp from '../../components/CountUp.jsx';
import { exportXlsx } from '../../lib/exportXlsx.js';

export function PageHead({ title, sub, tag, inline, children }) {
  return (
    <div className="page-head mhead0">
      <div>
        {inline ? <div className="mtitlerow"><h1 className="page-title">{title}</h1>{tag}</div> : <h1 className="page-title">{title}</h1>}
        <p className="page-subtitle">{sub}</p>
      </div>
      <div className="page-head__actions">
        {!inline && tag}
        {children}
      </div>
    </div>
  );
}

export function Stat({ value, unit, label, pill, pillClass, icon, tint }) {
  return (
    <div className="vstat">
      <div className="vstat__text">
        <div className="vstat__row"><strong><CountUp value={value} /></strong>{unit && <em>{unit}</em>}</div>
        <span>{label}</span>
        {pill && <small className={pillClass}>{pill}</small>}
      </div>
      <span className="vstat__icon" style={{ background: tint.bg, color: tint.fg }}>{icon}</span>
    </div>
  );
}

export function Sel({ label, prefix, value, options, onChange }) {
  return (
    <label className="vsel">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {options.map((o) => <option key={o} value={o}>{prefix + o}</option>)}
      </select>
      <span className="vsel__txt">{prefix + value}</span>
      <ChevronDownIcon size={20} className="vsel__chev" />
    </label>
  );
}

// filters + "applied filters" chips. Only filters that differ from the defaults show as chips;
// the refresh button clears the filters and reloads the data from the server.
export function FilterCard({ placeholder, f, setF, defaults, statusOpts, secondLabel, secondOpts, onRefresh }) {
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const chips = [
    f.status !== defaults.status && { k: 'status', t: 'الحالة: ' + f.status },
    f.second !== defaults.second && { k: 'second', t: secondLabel + ': ' + f.second },
    f.q.trim() && { k: 'q', t: 'بحث: ' + f.q.trim() },
  ].filter(Boolean);
  const refresh = async () => {
    setF(defaults);
    if (!onRefresh) return;
    setBusy(true);
    try {
      await onRefresh();
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="vfilters">
      <div className="vfilters__row">
        <label className="vsearch">
          <SearchIcon size={22} />
          <input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder={placeholder} aria-label="بحث" />
        </label>
        <Sel label="الحالة" prefix="الحالة: " value={f.status} options={statusOpts} onChange={(v) => set('status', v)} />
        <Sel label={secondLabel} prefix={secondLabel + ': '} value={f.second} options={secondOpts} onChange={(v) => set('second', v)} />
        <button type="button" className={'vrefresh' + (busy ? ' is-spin' : '')} aria-label="مسح الفلاتر وتحديث البيانات" title="مسح الفلاتر وتحديث البيانات" onClick={refresh} disabled={busy}>
          <RefreshIcon size={20} />
        </button>
      </div>
      {chips.length > 0 && (
        <div className="vchips">
          <span className="vchips__label">الفلاتر المطبقة:</span>
          {chips.map((c) => (
            <button key={c.k} type="button" className="vchip" onClick={() => set(c.k, defaults[c.k])}>
              <CircleXIcon size={16} />
              {c.t}
            </button>
          ))}
          <button type="button" className="vchips__clear" onClick={() => setF(defaults)}>مسح الكل</button>
        </div>
      )}
    </section>
  );
}

export const StatusPill = ({ s, now }) => (
  <span className={'mst' + (s === 'active' ? '' : ' is-off')}><i />{s === 'active' ? (now ? 'نشط الآن' : 'نشط') : 'غير نشط'}</span>
);

// lock button: disable / reactivate. Delete is in the menu only when the record can be deleted.
// The menu opens upward near the bottom of the table so it is not cut off.
export function RowActions({ onEdit, onLock, onView, onDelete, off = false }) {
  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const off = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  return (
    <div className="mact" ref={ref} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="mact__edit" aria-label="تعديل" onClick={onEdit}><PencilIcon size={18} /></button>
      <button type="button" className="mact__lock" aria-label={off ? 'إعادة تفعيل' : 'تعطيل'} title={off ? 'إعادة تفعيل' : 'تعطيل'} onClick={onLock}><LockIcon size={18} /></button>
      <span className="vkebab">
        <button
          type="button"
          aria-label="الإجراءات"
          aria-expanded={open}
          onClick={(e) => {
            const btn = e.currentTarget.getBoundingClientRect();
            const box = e.currentTarget.closest('.vtable, .mtable2')?.getBoundingClientRect();
            setUp(Math.min(window.innerHeight, box ? box.bottom : window.innerHeight) - btn.bottom < 130);
            setOpen((o) => !o);
          }}
        >
          <DotsVerticalIcon size={20} />
        </button>
        {open && (
          <div className={'vkebab__menu' + (up ? ' is-up' : '')}>
            <button type="button" onClick={() => { setOpen(false); onView(); }}>عرض التفاصيل</button>
            <button type="button" onClick={() => { setOpen(false); onEdit(); }}>تعديل</button>
            <button type="button" onClick={() => { setOpen(false); onLock(); }}>{off ? 'إعادة تفعيل' : 'تعطيل'}</button>
            {onDelete && <button type="button" onClick={() => { setOpen(false); onDelete(); }}>حذف</button>}
          </div>
        )}
      </span>
    </div>
  );
}

export function Empty({ icon, title, text, btn, onClick }) {
  return (
    <section className="mempty">
      <span className="mempty__icon"><span>{icon}</span></span>
      <h2>{title}</h2>
      <p>{text}</p>
      <button type="button" className="btn-primary" onClick={onClick}>{btn}</button>
    </section>
  );
}

// تصدير ملف Excel حقيقي (.xlsx): أعمدة بعرض مناسب واتجاه من اليمين لليسار
// file names stay in English: some browsers save Arabic file names as "download"
const FILE_NAMES = { 'الهيكل-التنظيمي': 'org-structure', 'فهرس-الأصناف': 'items', 'وحدات-القياس': 'units', 'التصنيفات': 'categories' };
export function exportCsv(name, headers, rows) {
  const file = `ibram-${FILE_NAMES[name] || 'export'}-${new Date().toISOString().slice(0, 10)}`;
  return exportXlsx(file, headers, rows, { sheet: name.replace(/-/g, ' ') });
}
