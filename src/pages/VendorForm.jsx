import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, errorText } from '../lib/api.js';
import { dateTime } from '../lib/users.js';
import {
  fetchSupplier, fetchSupplierFiles, uploadSupplierFile, deleteFile, supplierRef, verifiedOf, supplierErrors, sizeLabel as apiSize, fileType,
} from '../lib/suppliers.js';
import Cbx from '../components/Cbx.jsx';
import { CertIcon, IdCardIcon, SendMailIcon, ShieldCheckIcon, UploadIcon, FileBadgeIcon, TrashIcon, ChevronDownIcon, CopyIcon, CircleCheckIcon, ClockHistoryIcon } from '../components/Icons.jsx';

const MAX = 10 * 1024 * 1024;
const OK_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

function sizeLabel(b) {
  return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
}

function Field({ label, req, children, bad, error }) {
  return (
    <div className={'vf' + (bad || error ? ' is-bad' : '')}>
      <label className="vf__label">{label}{req && <b>*</b>}</label>
      {children}
      {error && <small className="itile__err" role="alert">{error}</small>}
    </div>
  );
}

// what the system really checks when a supplier is saved
const RULES = [
  'رقم السجل التجاري من 10 أرقام، ولا يتكرر لموردين داخل نفس المؤسسة.',
  'فحص التكرار بالاسم والرقم الضريبي والبريد قبل الحفظ، وعرض الموردين المطابقين.',
  'تسجيل الإضافة وكل تعديل وتعطيل في سجل التدقيق باسم من نفّذه.',
];

const EMPTY = {
  name: '', cr: '', activity: '', vat: '', grade: '', legal: '', crExpiry: '',
  rep: '', title: '', phone: '', office: '', mail: '', city: '', addr: '',
};
const fromSupplier = (v) => ({
  name: v.name || '', cr: v.commercial_register || '', activity: v.activity || '', vat: v.tax_number || '', grade: v.grade || '',
  legal: v.legal_form || '', crExpiry: v.cr_expires_at || '', rep: v.contact_person || '', title: v.contact_title || '',
  phone: v.phone || '', office: v.office_phone || '', mail: v.email || '', city: v.city || '', addr: v.address || '',
});
// form key -> API field
const API_FIELD = {
  name: 'name', cr: 'commercial_register', activity: 'activity', vat: 'tax_number', grade: 'grade', legal: 'legal_form',
  crExpiry: 'cr_expires_at', rep: 'contact_person', title: 'contact_title', phone: 'phone', office: 'office_phone',
  mail: 'email', city: 'city', addr: 'address',
};
const GRADES = ['الدرجة الأولى (أ) - مشاريع كبرى واستراتيجية', 'الدرجة الأولى - ب', 'الدرجة الثانية', 'الدرجة الثالثة', 'تأهيل معتمد'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


export default function VendorForm({ edit }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [v, setV] = useState(null); // the supplier being edited
  const [loadError, setLoadError] = useState('');
  const [f, setF] = useState(EMPTY);
  const [active, setActive] = useState('active');
  const [reason, setReason] = useState('');
  const [oldFiles, setOldFiles] = useState([]); // already on the server
  const [removed, setRemoved] = useState([]); // server files to delete on save
  const [newFiles, setNewFiles] = useState([]); // picked here, uploaded on save
  const [tried, setTried] = useState(false);
  const [drag, setDrag] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const [errors, setErrors] = useState({});
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const pick = useRef(null);

  useEffect(() => {
    if (!edit) return;
    fetchSupplier(id)
      .then((s) => {
        setV(s);
        setF(fromSupplier(s));
        setActive(s.is_active ? 'active' : 'off');
      })
      .catch((err) => setLoadError(err instanceof ApiError && err.status === 404 ? 'هذا المورد غير موجود' : errorText(err)));
    fetchSupplierFiles(id).then(setOldFiles).catch(() => {});
  }, [edit, id]);

  const set = (k) => (e) => {
    setF((p) => ({ ...p, [k]: e.target.value }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  function addFiles(list) {
    const next = [];
    let err = '';
    [...list].forEach((file) => {
      if (!OK_TYPES.includes(file.type)) err = 'نوع الملف غير مدعوم';
      else if (file.size > MAX) err = 'حجم الملف أكبر من 10 ميجابايت';
      else next.push({ key: file.name + file.size + Math.random(), file, name: file.name.replace(/\.[^.]+$/, ''), size: sizeLabel(file.size), type: file.type === 'application/pdf' ? 'PDF' : file.type === 'image/png' ? 'PNG' : 'JPG' });
    });
    setUploadErr(err);
    if (next.length) setNewFiles((p) => [...p, ...next]);
  }

  const required = ['name', 'cr', 'activity', 'vat', 'grade', 'rep', 'title', 'phone', 'mail', 'city', 'addr'];
  const bad = (k) => tried && !String(f[k]).trim();
  const wasActive = edit ? v?.is_active : true;
  const needsReason = active === 'off' && wasActive;
  const files = [
    ...oldFiles.filter((x) => !removed.includes(x.id)).map((x) => ({ key: 's' + x.id, serverId: x.id, name: x.original_name.replace(/\.[^.]+$/, ''), size: apiSize(x.size), type: fileType(x.mime_type) })),
    ...newFiles,
  ];
  const filled = required.filter((k) => String(f[k]).trim()).length + (files.length ? 1 : 0);
  const ready = Math.round((filled / (required.length + 1)) * 100);

  function check() {
    const e = {};
    if (f.cr.trim() && !/^\d{10}$/.test(f.cr.trim())) e.cr = 'رقم السجل التجاري 10 أرقام';
    if (f.mail.trim() && !EMAIL_RE.test(f.mail.trim())) e.mail = 'يرجى إدخال بريد إلكتروني صحيح';
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    setTried(true);
    setSaveError('');
    const local = check();
    setErrors(local);
    if (required.some((k) => !String(f[k]).trim()) || Object.keys(local).length || (needsReason && !reason.trim())) {
      requestAnimationFrame(() => document.querySelector('.vf.is-bad input, .vf.is-bad select, .vstatusbox textarea.is-bad')?.focus());
      return;
    }
    // only what changed when editing
    const body = {};
    Object.entries(API_FIELD).forEach(([k, field]) => {
      const val = String(f[k]).trim() || null;
      if (!edit || val !== (v[field] ?? null)) body[field] = val;
    });
    if (edit && active === 'active' && !v.is_active) body.is_active = true;
    if (edit && needsReason) Object.assign(body, { is_active: false, deactivation_reason: reason.trim() });

    setSaving(true);
    try {
      let saved = v;
      if (!edit) saved = await api('/suppliers', { method: 'POST', body });
      else if (Object.keys(body).length) saved = await api(`/suppliers/${v.id}`, { method: 'PATCH', body });
      // a new supplier marked inactive: disable it right after creating it
      if (!edit && active === 'off') {
        saved = await api(`/suppliers/${saved.id}`, { method: 'PATCH', body: { is_active: false, deactivation_reason: reason.trim() } });
      }
      // the supplier is saved now; a failure with its files should say so
      try {
        for (const x of removed) await deleteFile(x);
        for (const x of newFiles) await uploadSupplierFile(saved.id, x.file);
      } catch (fileErr) {
        setSaveError(`تم حفظ بيانات المورد، لكن تعذّر رفع أو حذف الملفات (${errorText(fileErr)}). افتح المورد وحاول مرة أخرى.`);
        if (!edit) setTimeout(() => navigate('/vendors/' + saved.id + '/edit'), 2500);
        return;
      }
      navigate('/vendors/' + saved.id);
    } catch (err) {
      const { fields, message } = supplierErrors(err);
      if (fields) {
        const back = Object.fromEntries(Object.entries(API_FIELD).map(([k, a]) => [a, k]));
        const mapped = {};
        Object.keys(fields).forEach((a) => {
          const k = back[a];
          if (!k) return;
          const taken = /taken|مستخدم/.test(String(fields[a]));
          mapped[k] = a === 'commercial_register' && taken ? 'هذا السجل التجاري مسجل لمورد آخر' : a === 'commercial_register' ? 'رقم السجل التجاري 10 أرقام' : a === 'email' ? 'يرجى إدخال بريد إلكتروني صحيح' : 'قيمة غير صالحة';
        });
        setErrors(mapped);
        setSaveError(fields.deactivation_reason ? 'يرجى كتابة سبب التعطيل' : 'يرجى تصحيح الحقول المؤشرة');
      } else {
        const status = err instanceof ApiError ? err.status : 0;
        setSaveError(
          status >= 500
            ? 'تعذّر حفظ المورد: خطأ في السيرفر (' + status + '). تأكد أن آخر نسخة من الباك إند منشورة وأن الـ migration اشتغلت.'
            : message || 'تعذّر حفظ المورد'
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const input = (k, ph, extra = {}) => (
    <input className="vin" value={f[k]} onChange={set(k)} placeholder={ph} aria-invalid={bad(k) || errors[k] ? true : undefined} {...extra} />
  );

  if (edit && (loadError || !v)) {
    return (
      <div className="vform">
        <h1 className="page-title">تعديل بيانات المورد</h1>
        <p className={'users-msg' + (loadError ? ' is-err' : '')} role={loadError ? 'alert' : undefined}>{loadError || 'جارٍ تحميل بيانات المورد...'}</p>
      </div>
    );
  }

  const ref = v ? supplierRef(v) : '';
  return (
    <form className="vform" onSubmit={submit} noValidate>
      {edit ? (
        <>
          <h1 className="page-title">تعديل بيانات المورد</h1>
          <p className="page-subtitle">حدّث البيانات الأساسية ومعلومات التواصل والوثائق الرسمية الخاصة بالكيان التجاري المعتمد لدى المنظومة.</p>
          <section className="vhead vhead--edit">
            <div className="vhead__main">
              <div className="vhead__title">
                <h1>{v.name}</h1>
                <div className="vhead__badges">
                  {v.is_active ? <em className="vpill-ok"><i />نشط ومؤهل</em> : <em className="vpill-off"><i />غير نشط · معلق</em>}
                  {verifiedOf(v) && <span className="vpill-cr"><CircleCheckIcon size={14} />سجل تجاري ورقم ضريبي مسجلان</span>}
                </div>
              </div>
              <div className="vhead__meta">
                <span>الرقم الضريبي: <bdi dir="ltr">{v.tax_number || '—'}</bdi><CopyIcon size={16} /></span>
                <span>س.ت: <bdi dir="ltr">{v.commercial_register || '—'}</bdi><CopyIcon size={16} /></span>
                <span>رمز المورد المرجعي: <bdi dir="ltr">{ref}</bdi><CopyIcon size={16} /></span>
              </div>
              <div className="vhead__upd"><ClockHistoryIcon size={14} />آخر تحديث: {dateTime(v.updated_at)}</div>
            </div>
          </section>
        </>
      ) : (
        <>
          <h1 className="page-title">إضافة مورد جديد</h1>
          <p className="page-subtitle">أدخل البيانات الأساسية للمورد لإضافته إلى سجل الموردين الرسمي المعتمد لمنظومة المنافسات والعقود.</p>
        </>
      )}

      <div className="vfcols">
        <div className="vfmain">
          <section className="vcard vfcard">
            <header className="vfhead">
              <span className="vfhead__icon"><IdCardIcon size={22} /></span>
              <div><h2>بيانات المورد الأساسية</h2><p>البيانات القانونية والنشاط المصرح به لدى الجهات المنظمة</p></div>
            </header>
            <Field label="اسم المورد / الكيان التجاري" req bad={bad('name')} error={errors.name}>{input('name', 'شركة التقنية المتقدمة للحلول الرقمية ذ.م.م')}</Field>
            <div className="vf2">
              <Field label="رقم السجل التجاري / الرقم الموحد (10 أرقام)" req bad={bad('cr')} error={errors.cr}>
                {input('cr', '1010482910', { inputMode: 'numeric', maxLength: 10, dir: 'ltr' })}
              </Field>
              <Field label="نوع النشاط الرئيسي" req bad={bad('activity')}>{input('activity', 'توريد تقني وتكنولوجيا المعلومات')}</Field>
              <Field label="التصنيف المعتمد" req bad={bad('grade')}>
                <div className="vselect">
                  <select className="vin" value={f.grade} onChange={set('grade')} aria-invalid={bad('grade') || undefined}>
                    <option value="" disabled>اختر التصنيف</option>
                    {[...new Set([f.grade, ...GRADES].filter(Boolean))].map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDownIcon size={20} />
                </div>
              </Field>
              <Field label="الرقم الضريبي (VAT ID)" req bad={bad('vat')} error={errors.vat}>{input('vat', '300948291000003', { inputMode: 'numeric', dir: 'ltr' })}</Field>
              <Field label="الكيان القانوني" error={errors.legal}>{input('legal', 'شركة ذات مسؤولية محدودة')}</Field>
              <Field label="تاريخ انتهاء السجل التجاري" error={errors.crExpiry}>{input('crExpiry', '', { type: 'date' })}</Field>
            </div>
            <div className="vstatusbox">
              <div className="vstatusbox__text">
                <strong>حالة تفعيل حساب المورد في النظام</strong>
                <p>المورد النشط يكون متاحاً فوراً للترشيح وتلقي طلبات عروض الأسعار (RFQs) وتوقيع أوامر الشراء فور الحفظ والاعتماد.</p>
              </div>
              <div className="vstatusbox__opts" role="radiogroup">
                <button type="button" role="radio" aria-checked={active === 'active'} className="vopt" onClick={() => setActive('active')}>
                  <Cbx checked={active === 'active'} onChange={() => setActive('active')} radio size={24} label="نشط ومؤهل" />نشط ومؤهل
                </button>
                <button type="button" role="radio" aria-checked={active === 'off'} className="vopt" onClick={() => setActive('off')}>
                  <Cbx checked={active === 'off'} onChange={() => setActive('off')} radio size={24} label="غير نشط (معلق)" />غير نشط (معلق)
                </button>
              </div>
              {needsReason && (
                <div className="vstatusbox__reason">
                  <label className="pm-label" htmlFor="vf-reason">سبب التعطيل <b>*</b></label>
                  <textarea
                    id="vf-reason"
                    className={'pm-area' + (tried && !reason.trim() ? ' is-bad' : '')}
                    value={reason}
                    maxLength={500}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="اكتب سبب تعطيل المورد ليتم تسجيله في سجل التدقيق..."
                  />
                </div>
              )}
            </div>
          </section>

          <section className="vcard vfcard">
            <header className="vfhead">
              <span className="vfhead__icon"><SendMailIcon size={22} /></span>
              <div><h2>بيانات التواصل والتمثيل النظامي</h2><p>المسؤول المفوض لاستلام خطابات الترسية والاتصالات التعاقدية</p></div>
            </header>
            <div className="vf2">
              <Field label="اسم المفوض / جهة الاتصال الرسمية" req bad={bad('rep')}>{input('rep', 'أ. عبد العزيز فهد السالم')}</Field>
              <Field label="المسمى الوظيفي للمفوض" req bad={bad('title')}>{input('title', 'مدير علاقات الموردين والتعاقدات الحكومية')}</Field>
              <Field label="رقم الجوال" req bad={bad('phone')} error={errors.phone}>
                <div className="vphone">
                  <input className="vin" value={f.phone} onChange={set('phone')} placeholder="059" inputMode="tel" dir="ltr" />
                  <span className="vphone__cc"><i className="vflag" />+970</span>
                </div>
              </Field>
              <Field label="الهاتف المكتبي" error={errors.office}>{input('office', '08 282 0000', { inputMode: 'tel', dir: 'ltr' })}</Field>
              <Field label="البريد الإلكتروني للتعاملات" req bad={bad('mail')} error={errors.mail}>{input('mail', 'procurement@advtech.sa', { type: 'email', dir: 'ltr' })}</Field>
              <Field label="المدينة / المنطقة الرئيسية" req bad={bad('city')}>{input('city', 'غزة (المقر الرئيسي)')}</Field>
              <Field label="عنوان المقر" req bad={bad('addr')}>{input('addr', 'غزة - شارع الكلا')}</Field>
            </div>
          </section>
        </div>

        <aside className="vfside">
          <section className="vcard vfcard vfcard--files">
            <header className="vfhead vfhead--tinted">
              <span className="vfhead__icon"><CertIcon size={22} /></span>
              <div><h2>وثائق الاعتماد والتسجيل</h2><p>السجل التجاري والشهادات الضريبية والتأمينية</p></div>
            </header>
            <div
              className={'vdrop' + (files.length ? ' is-compact' : '') + (drag ? ' is-drag' : '')}
              role="button"
              tabIndex={0}
              onClick={() => pick.current?.click()}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick.current?.click())}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
            >
              <UploadIcon size={24} />
              <strong>اسحب الملفات هنا أو اضغط لإختيار ملف</strong>
              <span>الأنواع المدعومة: PDF, PNG, JPG بحد أقصى 10 ميجابايت للملف الواحد. تُرفع الملفات عند الحفظ.</span>
              <input ref={pick} type="file" hidden multiple accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
            </div>
            {uploadErr && <div className="vdrop__err" role="alert">{uploadErr}</div>}
            {files.length > 0 && (
              <>
                <div className="vfiles__head">
                  <strong>الملفات المرفقة</strong>
                  <span>{files.length} وثائق</span>
                </div>
                <ul className="vfiles">
                  {files.map((fl) => (
                    <li key={fl.key}>
                      <FileBadgeIcon size={30} />
                      <div><strong>{fl.name}</strong><small><bdi dir="ltr">{fl.size} · {fl.type}</bdi>{!fl.serverId && ' · جديد'}</small></div>
                      <button
                        type="button"
                        aria-label="حذف الملف"
                        onClick={() => (fl.serverId ? setRemoved((p) => [...p, fl.serverId]) : setNewFiles((p) => p.filter((x) => x.key !== fl.key)))}
                      >
                        <TrashIcon size={20} />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

          <section className="vcard vfcard">
            <header className="vfhead vfhead--plain">
              <ShieldCheckIcon size={24} />
              <h2>معايير القبول والتأهيل</h2>
            </header>
            <ul className="vrules">
              {RULES.map((r) => (
                <li key={r}><i><svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="10" fill="#0077ff" /><path d="m5.500 10.200 3 3 6-6.200" fill="none" stroke="#fff" strokeWidth="1.800" strokeLinecap="round" strokeLinejoin="round" /></svg></i><span>{r}</span></li>
              ))}
            </ul>
            <div className="vready"><span>اكتمال ملف المورد</span><b>{ready}% {ready === 100 ? 'مكتمل' : 'قيد الاستكمال'}</b></div>
          </section>
        </aside>
      </div>

      {saveError && <p className="uroles__msg is-err" role="alert">{saveError}</p>}
      <div className="vfoot">
        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : edit ? 'حفظ التعديلات' : 'إضافة مورد جديد'}</button>
        <button type="button" className="btn-outline" onClick={() => navigate(edit ? '/vendors/' + v.id : '/vendors')} disabled={saving}>إلغاء</button>
      </div>
    </form>
  );
}
