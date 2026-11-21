import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorText } from '../lib/api.js';
import { dateTime } from '../lib/users.js';
import { fetchAllSuppliers, crDaysLeft, verifiedOf } from '../lib/suppliers.js';
import {
  IdCardIcon, VerifiedIcon, PauseCircleIcon, SearchIcon, RefreshIcon, ChevronDownIcon, DotsVerticalIcon,
  TrendUpIcon, CircleXIcon, CircleCheckIcon, WarnIcon, PinIcon, MailIcon, PhoneIcon, ShieldCheckIcon,
} from '../components/Icons.jsx';
import CountUp from '../components/CountUp.jsx';

const STATUS_OPTIONS = ['الكل', 'نشط', 'غير نشط / معلق'];
const DEFAULTS = { q: '', status: 'الكل', activity: 'الكل', grade: 'الكل' };

function Stat({ icon, tint, value, label, pill, pillClass }) {
  return (
    <div className="vstat">
      <div className="vstat__text">
        <strong><CountUp value={value} /></strong>
        <span>{label}</span>
        <small className={pillClass}>{pill}</small>
      </div>
      <span className="vstat__icon" style={{ background: tint.bg, color: tint.fg }}>{icon}</span>
    </div>
  );
}

function Sel({ label, value, options, onChange, prefix }) {
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <label className="vsel">
      <select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        {opts.map((o) => (
          <option key={o} value={o}>{prefix ? prefix + o : o}</option>
        ))}
      </select>
      <span className="vsel__txt">{prefix ? prefix + value : value}</span>
      <ChevronDownIcon size={20} className="vsel__chev" />
    </label>
  );
}

// opens upward when there is no room under the row (the table clips what goes past it)
function RowMenu({ onOpen, onEdit }) {
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
    <div className="vkebab" ref={ref}>
      <button
        type="button"
        aria-label="الإجراءات"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          const btn = e.currentTarget.getBoundingClientRect();
          const box = e.currentTarget.closest('.vtable')?.getBoundingClientRect();
          const bottom = Math.min(window.innerHeight, box ? box.bottom : window.innerHeight);
          setUp(bottom - btn.bottom < 110);
          setOpen((o) => !o);
        }}
      >
        <DotsVerticalIcon size={24} />
      </button>
      {open && (
        <div className={'vkebab__menu' + (up ? ' is-up' : '')} onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onOpen}>عرض تفاصيل المورد</button>
          <button type="button" onClick={onEdit}>تعديل المورد</button>
        </div>
      )}
    </div>
  );
}

export default function Vendors() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState(DEFAULTS);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const clear = (k) => set(k, k === 'q' ? '' : 'الكل');

  const load = () => {
    setLoadError('');
    fetchAllSuppliers()
      .then(setVendors)
      .catch((err) => setLoadError(errorText(err)));
  };
  useEffect(load, []);

  const reset = () => {
    setF(DEFAULTS);
    load();
  };

  const list = vendors || [];
  const activities = useMemo(() => ['الكل', ...new Set(list.map((v) => v.activity).filter(Boolean))], [list]);
  const grades = useMemo(() => ['الكل', ...new Set(list.map((v) => v.grade).filter(Boolean))], [list]);

  const q = f.q.trim().toLowerCase();
  const rows = list.filter((v) => {
    if (q && ![v.name, v.commercial_register, v.tax_number, v.email, v.contact_person].some((x) => x && String(x).toLowerCase().includes(q))) return false;
    if (f.status === 'نشط' && !v.is_active) return false;
    if (f.status === 'غير نشط / معلق' && v.is_active) return false;
    if (f.activity !== 'الكل' && v.activity !== f.activity) return false;
    if (f.grade !== 'الكل' && v.grade !== f.grade) return false;
    return true;
  });

  const total = list.length;
  const active = list.filter((v) => v.is_active).length;
  const off = total - active;
  const pct = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0);
  const quarterAgo = Date.now() - 90 * 86400000;
  const newQuarter = list.filter((v) => new Date(v.created_at).getTime() >= quarterAgo).length;
  const renew = list.filter((v) => {
    const d = crDaysLeft(v);
    return d !== null && d <= 30;
  }).length;

  const chips = [
    f.status !== 'الكل' && { k: 'status', t: 'الحالة: ' + f.status },
    f.activity !== 'الكل' && { k: 'activity', t: 'نوع النشاط: ' + f.activity },
    f.grade !== 'الكل' && { k: 'grade', t: 'التصنيف: ' + f.grade },
  ].filter(Boolean);

  return (
    <div className="vendors-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">الموردون</h1>
          <p className="page-subtitle">إدارة وتنظيم البيانات الأساسية والاعتمادات المؤسسية للموردين المعتمدين لدى المنظومة</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn-primary" onClick={() => navigate('/vendors/new')}>إضافة مورد جديد</button>
        </div>
      </div>

      <div className="vstats">
        <Stat icon={<IdCardIcon size={26} />} tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }} value={vendors ? total : '—'} label="إجمالي الموردين المسجلين"
          pill={<>آخر 3 أشهر +{newQuarter} <TrendUpIcon size={14} /></>} pillClass="is-green" />
        <Stat icon={<VerifiedIcon size={26} />} tint={{ bg: '#eefff8', fg: '#0a5c36' }} value={vendors ? active : '—'} label="موردون بحالة نشطة"
          pill={`من الإجمالي ${pct(active)}%`} pillClass="is-green" />
        <Stat icon={<PauseCircleIcon size={26} />} tint={{ bg: '#fff9e8', fg: '#e84a4a' }} value={vendors ? off : '—'} label="موردون معلقون / غير نشطين"
          pill={off ? `مراجعة مطلوبة ${pct(off)}%` : 'لا يوجد'} pillClass="is-red" />
        <Stat icon={<ShieldCheckIcon size={26} />} tint={{ bg: '#eefff8', fg: '#0a5c36' }} value={vendors ? renew : '—'} label="سجلات تجارية تحتاج تجديد"
          pill="منتهية أو تنتهي خلال 30 يوماً" pillClass="is-blue" />
      </div>

      <section className="vfilters">
        <div className="vfilters__row">
          <label className="vsearch">
            <SearchIcon size={22} />
            <input value={f.q} onChange={(e) => set('q', e.target.value)} placeholder="اسم المورد، السجل التجاري، الرقم الضريبي أو البريد" aria-label="بحث عن مورد" />
          </label>
          <Sel label="الحالة" prefix="الحالة: " value={f.status} options={STATUS_OPTIONS} onChange={(v) => set('status', v)} />
          <Sel label="نوع النشاط" prefix="النشاط: " value={f.activity} options={activities} onChange={(v) => set('activity', v)} />
          <Sel label="التصنيف" prefix="التصنيف: " value={f.grade} options={grades} onChange={(v) => set('grade', v)} />
          <button type="button" className="vrefresh" aria-label="تحديث" onClick={reset}>
            <RefreshIcon size={20} />
          </button>
        </div>
        {(chips.length > 0 || f.q) && (
          <div className="vchips">
            <span className="vchips__label">الفلاتر المطبقة:</span>
            {chips.map((c) => (
              <button key={c.k} type="button" className="vchip" onClick={() => clear(c.k)}>
                <CircleXIcon size={16} />
                {c.t}
              </button>
            ))}
            {f.q && (
              <button type="button" className="vchip" onClick={() => clear('q')}>
                <CircleXIcon size={16} />
                بحث: {f.q}
              </button>
            )}
            <button type="button" className="vchips__clear" onClick={() => setF(DEFAULTS)}>مسح الكل</button>
          </div>
        )}
      </section>

      <div className="vtable">
        <table>
          <thead>
            <tr>
              <th>اسم المورد والسجل</th>
              <th>أرقام التوثيق والتسجيل</th>
              <th>نوع النشاط الرئيسي</th>
              <th>التصنيف المرجعي</th>
              <th>بيانات التواصل المعتمدة</th>
              <th>حالة الاعتماد</th>
              <th>آخر تحديث و تدقيق</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} onClick={() => navigate('/vendors/' + v.id)}>
                <td>
                  <div className="vname">
                    <div className="vname__top">
                      <strong>{v.name}</strong>
                      {verifiedOf(v) ? (
                        <em className="vbadge vbadge--ok"><CircleCheckIcon size={13} />موثق</em>
                      ) : (
                        <em className="vbadge vbadge--warn" title="ينقص السجل التجاري أو الرقم الضريبي، أو انتهى السجل"><WarnIcon size={13} />تنبيه</em>
                      )}
                    </div>
                    {v.legal_form && <small>{v.legal_form}</small>}
                  </div>
                </td>
                <td>
                  <div className="vnums">
                    <b>س.ت: {v.commercial_register || '—'}</b>
                    <span>الضريبي: {v.tax_number || '—'}</span>
                  </div>
                </td>
                <td>{v.activity ? <span className="vtype">{v.activity}</span> : '—'}</td>
                <td><strong className="vgrade">{v.grade || '—'}</strong></td>
                <td>
                  <div className="vcontact">
                    {v.city && <span><PinIcon size={15} />{v.city}</span>}
                    {v.email && <span><MailIcon size={15} />{v.email}</span>}
                    {v.phone && <span><PhoneIcon size={15} /><bdi dir="ltr">{v.phone}</bdi></span>}
                    {!v.city && !v.email && !v.phone && '—'}
                  </div>
                </td>
                <td>
                  <span className={'vstatus' + (v.is_active ? '' : ' is-off')}>
                    <i />
                    {v.is_active ? 'نشط ومطابق' : 'غير نشط / معلق'}
                  </span>
                </td>
                <td>
                  <div className="vupd">
                    <b>{dateTime(v.updated_at)}</b>
                    {v.creator?.name && <span>أضافه: {v.creator.name}</span>}
                  </div>
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <RowMenu onOpen={() => navigate('/vendors/' + v.id)} onEdit={() => navigate('/vendors/' + v.id + '/edit')} />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr className="vtable__empty">
                <td colSpan={8}>
                  {loadError ? (
                    <>
                      {loadError} <button type="button" className="audit__retry" onClick={load}>إعادة المحاولة</button>
                    </>
                  ) : !vendors ? (
                    'جارٍ تحميل الموردين...'
                  ) : total ? (
                    'لا توجد نتائج مطابقة'
                  ) : (
                    'لا يوجد موردون مسجلون بعد'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
