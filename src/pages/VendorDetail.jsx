import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, ApiError, errorText } from '../lib/api.js';
import { dateTime, longDate } from '../lib/users.js';
import { eventLabel } from '../auditData.js';
import { fetchSupplier, fetchSupplierActivity, supplierRef, crDaysLeft, verifiedOf, fingerprint, supplierErrors } from '../lib/suppliers.js';
import { VendorStatusModal } from '../components/VendorModals.jsx';
import {
  CopyIcon, FingerprintIcon, IdCardIcon, SendMailIcon, ClockHistoryIcon, CircleCheckIcon, PhoneIcon,
  GlobeLineIcon, PinIcon, GavelIcon, CalendarIcon,
} from '../components/Icons.jsx';

function Copy({ text }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={'vcopy' + (ok ? ' is-ok' : '')}
      aria-label="نسخ"
      onClick={() => {
        try { navigator.clipboard?.writeText(text); } catch (e) {}
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
    >
      <CopyIcon size={16} />
    </button>
  );
}

function Tile({ label, children, sub, copy, icon }) {
  return (
    <div className={'vtile' + (icon ? ' vtile--icon' : '')}>
      <span className="vtile__label">{label}</span>
      <div className="vtile__value">{children}</div>
      {sub}
      {copy}
      {icon && <span className="vtile__ico">{icon}</span>}
    </div>
  );
}

const FIELD_AR = {
  name: 'الاسم',
  tax_number: 'الرقم الضريبي',
  commercial_register: 'السجل التجاري',
  activity: 'نوع النشاط',
  grade: 'التصنيف',
  legal_form: 'الكيان القانوني',
  cr_expires_at: 'تاريخ انتهاء السجل',
  contact_person: 'المفوض',
  contact_title: 'المسمى الوظيفي للمفوض',
  email: 'البريد',
  phone: 'الجوال',
  office_phone: 'الهاتف المكتبي',
  city: 'المدينة',
  address: 'العنوان',
  notes: 'الملاحظات',
  is_active: 'الحالة',
};

// one line about what an activity entry changed
function activityText(t) {
  const d = t.details || {};
  if (t.event === 'supplier.created') return `تمت إضافة المورد «${d.name || ''}» إلى السجل.`;
  if (t.event === 'supplier.deactivated') return `تم تعطيل المورد. السبب: ${d.reason || '—'}`;
  if (t.event === 'supplier.activated') return 'تمت إعادة تفعيل المورد.';
  if (d.changes) return 'الحقول المعدلة: ' + Object.keys(d.changes).map((k) => FIELD_AR[k] || k).join('، ');
  if (t.event.startsWith('attachment.')) return 'تغيير في وثائق المورد.';
  return '';
}

export default function VendorDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [vendor, setVendor] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [hash, setHash] = useState('');
  const [loadError, setLoadError] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState('');

  const load = useCallback(() => {
    setLoadError('');
    fetchSupplier(id)
      .then(setVendor)
      .catch((err) => setLoadError(err instanceof ApiError && err.status === 404 ? 'هذا المورد غير موجود' : errorText(err)));
    fetchSupplierActivity(id)
      .then(setTimeline)
      .catch(() => setTimeline([]));
  }, [id]);
  useEffect(load, [load]);
  useEffect(() => {
    if (vendor) fingerprint(vendor).then(setHash).catch(() => setHash(''));
  }, [vendor]);

  if (loadError || !vendor) {
    return (
      <div className="vdetail">
        <p className={'users-msg' + (loadError ? ' is-err' : '')} role={loadError ? 'alert' : undefined}>
          {loadError || 'جارٍ تحميل بيانات المورد...'}
          {loadError && <button type="button" onClick={() => navigate('/vendors')}>رجوع إلى الموردين</button>}
        </p>
      </div>
    );
  }

  const off = !vendor.is_active;
  const ref = supplierRef(vendor);
  const days = crDaysLeft(vendor);
  const dash = '—';

  async function changeStatus(reason) {
    setBusy(true);
    setModalError('');
    try {
      const body = modal === 'deactivate' ? { is_active: false, deactivation_reason: reason } : { is_active: true };
      setVendor(await api(`/suppliers/${vendor.id}`, { method: 'PATCH', body }));
      fetchSupplierActivity(vendor.id).then(setTimeline).catch(() => {});
      setModal(null);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setModalError(supplierErrors(err).message || 'تعذّر تغيير حالة المورد');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="vdetail">
      <section className="vhead">
        <div className="vhead__main">
          <div className="vhead__title">
            <h1>{vendor.name}</h1>
            <div className="vhead__badges">
              {off ? <em className="vpill-off"><i />غير نشط · معلق إداريا</em> : <em className="vpill-ok"><i />نشط ومؤهل</em>}
              {verifiedOf(vendor) ? (
                <span className="vpill-cr"><CircleCheckIcon size={14} />سجل تجاري ورقم ضريبي مسجلان</span>
              ) : (
                <span className="vpill-cr vpill-cr--warn">بيانات التسجيل غير مكتملة أو السجل منتهي</span>
              )}
            </div>
          </div>
          <div className="vhead__meta">
            <span>الرقم الضريبي: <bdi dir="ltr">{vendor.tax_number || dash}</bdi>{vendor.tax_number && <Copy text={vendor.tax_number} />}</span>
            <span>س.ت: <bdi dir="ltr">{vendor.commercial_register || dash}</bdi>{vendor.commercial_register && <Copy text={vendor.commercial_register} />}</span>
            <span>رمز المورد المرجعي: <bdi dir="ltr">{ref}</bdi><Copy text={ref} /></span>
          </div>
          <div className="vhead__upd"><ClockHistoryIcon size={14} />آخر تحديث: {dateTime(vendor.updated_at)}</div>
        </div>
        <div className="vhead__btns">
          <button type="button" className="btn-primary vbtn" onClick={() => navigate('/vendors/' + vendor.id + '/edit')}>تعديل المورد</button>
          {off ? (
            <button type="button" className="vbtn vbtn--blue" onClick={() => { setModalError(''); setModal('reactivate'); }}>إعادة تفعيل المورد</button>
          ) : (
            <button type="button" className="vbtn vbtn--danger" onClick={() => { setModalError(''); setModal('deactivate'); }}>تعطيل المورد</button>
          )}
        </div>
      </section>

      {off && (
        <section className="vban">
          <span className="vban__icon"><GavelIcon size={26} /></span>
          <div className="vban__text">
            <div className="vban__top">
              <strong>هذا المورد غير نشط حاليّا</strong>
              <span className="vban__tag">حظر تعاقدي</span>
            </div>
            <p>
              تم تعطيل المورد{vendor.deactivated_at ? ` في ${longDate(vendor.deactivated_at)}` : ''}
              {vendor.deactivator?.name ? ` بواسطة ${vendor.deactivator.name}` : ''}
              {vendor.deactivation_reason ? `. السبب: ${vendor.deactivation_reason}` : ''}. لا يمكن دعوة هذا الكيان للمنافسات أو إصدار أوامر شراء جديدة حتى تتم إعادة تفعيله.
            </p>
          </div>
          <button type="button" className="vbtn vbtn--blue" onClick={() => { setModalError(''); setModal('reactivate'); }}>إعادة تفعيل</button>
        </section>
      )}

      <div className="vcols">
        <div className="vcol vcol--side">
          <section className="vcard">
            <header className="vcard__head"><FingerprintIcon size={26} /><h2>معلومات السجل والرقابة المرجعية</h2></header>
            <div className="vmini">
              <span>الرمز المرجعي للمورد</span>
              <b dir="ltr">{ref}</b>
            </div>
            <div className="vmini">
              <span>تاريخ الإنشاء الأولي بالسجل</span>
              <b>{dateTime(vendor.created_at)}</b>
              {vendor.creator?.name && <small>بواسطة: {vendor.creator.name}</small>}
            </div>
            <div className="vmini">
              <span>بصمة السجل الحالية (SHA-256)</span>
              <b dir="ltr" title={hash}>{hash ? `${hash.slice(0, 20)}…${hash.slice(-4)}` : dash}</b>
              <small className="is-green">تتغير البصمة مع أي تعديل على بيانات المورد</small>
            </div>
          </section>

          <section className="vcard">
            <header className="vcard__head"><ClockHistoryIcon size={26} /><h2>سجل النشاط المرجعي</h2></header>
            {timeline && !timeline.length && <p className="users-msg">لا يوجد نشاط مسجّل بعد</p>}
            <ol className="vtl">
              {(timeline || []).map((t, i) => (
                <li key={t.id} className={i === 0 ? 'is-done' : ''}>
                  <span className="vtl__dot">{i === 0 && <CircleCheckIcon size={20} />}</span>
                  <div className="vtl__top">
                    <strong>{eventLabel(t.event)}</strong>
                    <small>{dateTime(t.created_at)}</small>
                  </div>
                  <p>{activityText(t)}</p>
                  {t.user?.name && <b>المسؤول: {t.user.name}</b>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="vcol vcol--main">
          <section className="vcard">
            <header className="vcard__head vcard__head--tag">
              <IdCardIcon size={26} />
              <h2>المعلومات الوظيفية والأساسية</h2>
              <span className="vtag">سجل مركزي</span>
            </header>
            <div className="vgrid">
              <Tile label="اسم المورد / الكيان التجاري">{vendor.name}</Tile>
              <Tile label="رقم السجل التجاري" copy={vendor.commercial_register && <Copy text={vendor.commercial_register} />}>{vendor.commercial_register || dash}</Tile>
              <Tile label="نوع النشاط المرجعي">{vendor.activity || dash}</Tile>
              <Tile label="التصنيف المعتمد">{vendor.grade || dash}</Tile>
              <Tile label="الكيان القانوني">{vendor.legal_form || dash}</Tile>
              <Tile
                label="تاريخ انتهاء السجل التجاري"
                sub={days !== null && days <= 30 && <small className="vtile__sub is-red">{days < 0 ? 'السجل منتهي' : `ينتهي خلال ${days} يوم`}</small>}
              >
                {vendor.cr_expires_at ? longDate(vendor.cr_expires_at) : dash}
              </Tile>
            </div>
          </section>

          <section className="vcard">
            <header className="vcard__head vcard__head--tag">
              <SendMailIcon size={26} />
              <h2>بيانات التواصل والتمثيل النظامي</h2>
              <span className="vtag">مفوض رسمي</span>
            </header>
            <div className="vgrid">
              <Tile label="المفوض الإداري المعتمد" sub={vendor.contact_title && <small className="vtile__sub">{vendor.contact_title}</small>}>{vendor.contact_person || dash}</Tile>
              <Tile label="أرقام التواصل المعتمدة" icon={<PhoneIcon size={18} />}>
                <div className="vphones">
                  <div><span>الهاتف المكتبي:</span><b dir="ltr">{vendor.office_phone || dash}</b></div>
                  <div><span>الجوال المباشر:</span><b dir="ltr">{vendor.phone || dash}</b></div>
                </div>
              </Tile>
              <Tile label="القنوات الرقمية المعتمدة" icon={<GlobeLineIcon size={18} />}>
                <div className="vphones"><div><span>البريد الإلكتروني:</span><b dir="ltr">{vendor.email || dash}</b></div></div>
              </Tile>
              <Tile label="العنوان المعتمد" icon={<PinIcon size={18} />}>
                <span className="vtile__addr">{[vendor.city, vendor.address].filter(Boolean).join(' - ') || dash}</span>
              </Tile>
            </div>
          </section>
        </div>
      </div>

      {modal && (
        <VendorStatusModal
          mode={modal}
          vendor={{ ...vendor, ref }}
          busy={busy}
          error={modalError}
          onClose={() => setModal(null)}
          onConfirm={changeStatus}
        />
      )}
    </div>
  );
}
