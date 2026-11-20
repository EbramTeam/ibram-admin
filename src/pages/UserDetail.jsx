import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KebabMenu } from '../components/UsersTable.jsx';
import UserStatusModal from '../components/UserStatusModal.jsx';
import { LockOpenIcon } from '../components/MIcons.jsx';
import {
  LockIcon,
  PencilIcon,
  BuildingIcon,
  CalendarIcon,
  VerifiedIcon,
  SlidersIcon,
  IdCardIcon,
  CopyIcon,
  SyncIcon,
  ShieldCheckIcon,
} from '../components/Icons.jsx';

const SCENARIOS = [
  { key: 'new', label: 'مستخدم جديد (بدون نشاط)', dot: '#555' },
  { key: 'lead', label: 'مستخدم نشط وقيادي', dot: '#1a8cff' },
  { key: 'disabled', label: 'حساب معطل', dot: '#e53030' },
  { key: 'multi', label: 'أدوار متعددة', dot: '#1a8cff' },
];

const ROLES = [
  {
    main: true,
    title: 'رئيس لجنة فحص العروض',
    text: 'صلاحية كاملة لترؤس جلسات فتح وفحص العروض الفنية والمالية، ومصادقة التوصيات الفنية قبل الرفع للجنة الشراء المركزية.',
    meta: 'مستوى الحوكمة: لجان المشتريات الاستراتيجية • مفعل منذ 15 يوماً',
  },
  {
    title: 'معتمد طلبات الصرف المالي (حق 500,000 ر.س)',
    text: 'حق اعتماد استمارات أوامر الشراء والارتباط المالي للمشاريع المعتمدة ضمن الموازنة التشغيلية المخصصة للإدارة.',
    meta: 'المستوى المالي الثالث • صلاحية صرف ومصادقة',
  },
  {
    title: 'أخصائي منافسات استراتيجية',
    text: 'إعداد كراسات الشروط والمواصفات، ومراجعة متطلبات الموردين ومطابقتها للمعايير والأنظمة الوطنية المعتمدة.',
    meta: 'إدارة العقود والتوريد والمنافسات العامة',
  },
];

function InfoTile({ label, children, extra }) {
  return (
    <div className="itile">
      <span className="itile__label">{label}</span>
      <div className="itile__value">
        <strong>{children}</strong>
        {extra}
      </div>
    </div>
  );
}

// tile in edit mode: same label and input as the login screen (field__label / field__input)
function EditTile({ id, label, value, onChange, error, type = 'text', dir, placeholder }) {
  return (
    <div className="field itile--edit">
      <label className="field__label" htmlFor={id}>
        {label} <span className="field__req field__req--tight">*</span>
      </label>
      <input
        id={id}
        className={'field__input' + (error ? ' is-invalid' : '')}
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + '-err' : undefined}
      />
      {error && <small className="itile__err" id={id + '-err'}>{error}</small>}
    </div>
  );
}

const INITIAL_INFO = {
  name: 'د. حسام بن عبدالعزيز السويلم',
  email: 'h.suwailem@procure.gov.sa',
  phone: '+966 50 123 4567',
  dept: 'الإدارة العامة للمنافسات والعقود',
  unit: 'وحدة فحص العروض والترسية',
};

function validate(d) {
  const e = {};
  if (!d.name.trim()) e.name = 'هذا الحقل مطلوب';
  if (!d.email.trim()) e.email = 'هذا الحقل مطلوب';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'يرجى إدخال بريد إلكتروني صحيح';
  if (!d.phone.trim()) e.phone = 'هذا الحقل مطلوب';
  else if (!/^\+?[\d\s-]{7,20}$/.test(d.phone.trim())) e.phone = 'يرجى إدخال رقم هاتف صحيح';
  if (!d.dept.trim()) e.dept = 'هذا الحقل مطلوب';
  if (!d.unit.trim()) e.unit = 'هذا الحقل مطلوب';
  return e;
}

export default function UserDetail() {
  const navigate = useNavigate();
  const [scenario, setScenario] = useState('lead');
  const [copied, setCopied] = useState(false);
  const [info, setInfo] = useState(INITIAL_INFO);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(INITIAL_INFO);
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [locked, setLocked] = useState(false);
  const [statusModal, setStatusModal] = useState(null); // 'deactivate' | 'activate' | null
  const [statusMsg, setStatusMsg] = useState('');
  const infoRef = useRef(null);

  function confirmStatus() {
    // TODO: send to the API (PATCH /api/users/{id} with is_active and the reason) when connected to the backend
    const off = statusModal === 'deactivate';
    setLocked(off);
    setStatusModal(null);
    setStatusMsg(off ? 'تم تعطيل الحساب' : 'تم إعادة تفعيل الحساب');
  }
  const email = info.email;

  function startEdit() {
    setDraft(info);
    setErrors({});
    setSaved(false);
    setEditing(true);
    requestAnimationFrame(() => {
      infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      infoRef.current?.querySelector('input')?.focus({ preventScroll: true });
    });
  }

  function cancelEdit() {
    setEditing(false);
    setErrors({});
  }

  function saveEdit() {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      infoRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    // TODO: send to the API (PATCH /api/users/{id}) when the page is connected to the backend
    setInfo({ ...draft, name: draft.name.trim(), email: draft.email.trim(), phone: draft.phone.trim(), dept: draft.dept.trim(), unit: draft.unit.trim() });
    setEditing(false);
    setSaved(true);
  }

  const setField = (k) => (v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function copyEmail() {
    try {
      navigator.clipboard?.writeText(email);
    } catch (e) {
      /* clipboard may be unavailable */
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="detail">
      <h1 className="page-title">إدارة المستخدمين</h1>
      <p className="page-subtitle">التحكم المركزي في حسابات موظفي المشتريات، وتعيين الأدوار التخصصية، ومتابعة النشاط الإداري</p>

      <div className="detail__top">
        {/* profile card (right in RTL) */}
        <section className="dcard profile">
          <div className="profile__main">
            <span className="profile__avatar">د.ح</span>
            <div className="profile__info">
              <div className="profile__row">
                <span className="pill pill--id">EMP-04821</span>
              </div>
              <h2>{info.name}</h2>
              <p className="profile__meta">
                <BuildingIcon size={18} />
                {info.dept}
              </p>
              <p className="profile__meta">
                <CalendarIcon size={18} />
                تاريخ الانضمام: 01 اكتوبر 2026 (منذ أقل من شهر)
              </p>
              <p className="profile__meta profile__meta--ok">
                <VerifiedIcon size={18} />
                مصادقة الهوية عبر النفاذ الوطني الموحد (IAM)
              </p>
            </div>
          </div>
          <div className="profile__side">
            <div className="profile__side-top">
              {locked ? (
                <span className="status st-disabled">
                  <i className="status__dot" />
                  حساب معطل
                </span>
              ) : (
                <span className="status st-active st-active--soft">
                  <i className="status__dot" />
                  حساب نشط وموثق
                </span>
              )}
              <KebabMenu placement="above" />
            </div>
            <div className="profile__actions">
              <button type="button" className="act act--edit act--lg" aria-label="تعديل" onClick={startEdit}>
                <PencilIcon size={22} />
              </button>
              {locked ? (
                <button type="button" className="act act--unlock act--lg" aria-label="إعادة تفعيل الحساب" title="إعادة تفعيل الحساب" onClick={() => setStatusModal('activate')}>
                  <LockOpenIcon size={22} />
                </button>
              ) : (
                <button type="button" className="act act--lock act--lg" aria-label="تعطيل الحساب" title="تعطيل الحساب" onClick={() => setStatusModal('deactivate')}>
                  <LockIcon size={22} />
                </button>
              )}
            </div>
            {statusMsg && <small className="profile__status-msg" role="status">{statusMsg}</small>}
          </div>
        </section>

        {/* sandbox (left) */}
        <section className="dcard sandbox">
          <div className="sandbox__head">
            <span className="sandbox__icon">
              <SlidersIcon size={22} />
            </span>
            <div>
              <h3>محاكي حالات المستخدم <bdi dir="ltr">(Audit &amp; Governance Sandbox)</bdi></h3>
              <p>تنقل بين السيناريوهات الإدارية لمراجعة الحساب والصلاحيات الرقابية</p>
            </div>
          </div>
          <div className="sandbox__chips">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={'schip' + (scenario === s.key ? ' is-on' : '')}
                onClick={() => setScenario(s.key)}
              >
                <i style={{ background: s.dot }} />
                {s.label}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="detail__mid">
        <section className={'dcard info' + (editing ? ' is-editing' : '')} ref={infoRef}>
          <div className="dcard__head">
            <h3>
              <IdCardIcon size={26} className="dcard__head-icon" />
              المعلومات الوظيفية والأساسية
            </h3>
            {editing ? (
              <div className="info__edit-actions">
                <button type="button" className="btn-outline info__btn" onClick={cancelEdit}>إلغاء</button>
                <button type="button" className="btn-primary info__btn" onClick={saveEdit}>حفظ التعديلات</button>
              </div>
            ) : (
              <span className="soft-pill">سجل مركزي موثق</span>
            )}
          </div>
          {editing ? (
            <div className="info__grid">
              <EditTile id="ud-name" label="الاسم الكامل" value={draft.name} onChange={setField('name')} error={errors.name} />
              <EditTile id="ud-email" label="البريد الإلكتروني الحكومي" type="email" dir="ltr" value={draft.email} onChange={setField('email')} error={errors.email} />
              <div className="field itile--edit">
                <label className="field__label" htmlFor="ud-empid">الرقم الوظيفي</label>
                <input id="ud-empid" className="field__input field__input--locked" dir="ltr" value="EMP-04821" disabled aria-describedby="ud-empid-hint" />
                <small className="itile__hint" id="ud-empid-hint">يُدار من الموارد البشرية</small>
              </div>
              <EditTile id="ud-phone" label="رقم الهاتف المحمول" type="tel" dir="ltr" value={draft.phone} onChange={setField('phone')} error={errors.phone} />
              <EditTile id="ud-dept" label="الإدارة / القسم" value={draft.dept} onChange={setField('dept')} error={errors.dept} />
              <EditTile id="ud-unit" label="الوحدة التنظيمية الفرعية" value={draft.unit} onChange={setField('unit')} error={errors.unit} />
            </div>
          ) : (
          <div className="info__grid">
            <InfoTile label="الاسم الكامل">{info.name}</InfoTile>
            <InfoTile
              label="البريد الإلكتروني الحكومي"
              extra={
                <button type="button" className="icon-btn" onClick={copyEmail} aria-label="نسخ البريد">
                  {copied ? <ShieldCheckIcon size={18} /> : <CopyIcon size={18} />}
                </button>
              }
            >
              <span dir="ltr">{info.email}</span>
            </InfoTile>
            <InfoTile label="الرقم الوظيفي" extra={<span className="tag tag--hr">مفعل في HR</span>}>
              <span className="pill pill--id" dir="ltr">EMP-04821</span>
            </InfoTile>
            <InfoTile
              label="رقم الهاتف المحمول"
              extra={
                <span className="tag tag--small">
                  <VerifiedIcon size={11} />
                  موثق نفاذ
                </span>
              }
            >
              <span dir="ltr">{info.phone}</span>
            </InfoTile>
            <InfoTile label="الإدارة / القسم">{info.dept}</InfoTile>
            <InfoTile label="الوحدة التنظيمية الفرعية">{info.unit}</InfoTile>
          </div>
          )}
          <div className="info__sync">
            <span>
              <SyncIcon size={18} />
              تتم مزامنة البيانات الشخصية والوظيفية آلياً مع منصة الموارد البشرية المركزية.
            </span>
            {saved ? <small className="info__saved" role="status">تم حفظ التعديلات</small> : <small>تحديث: منذ ساعتين</small>}
          </div>
        </section>

        <section className="dcard account">
          <div className="dcard__head">
            <h3>
              <ShieldCheckIcon size={26} className="dcard__head-icon" />
              بيانات الحساب والأمان
            </h3>
            <span className="tag tag--ok">
              <i />
              متوافق مع ضوابط NCA
            </span>
          </div>
          <dl className="account__list">
            <div>
              <dt>حالة الحساب</dt>
              <dd className="is-ok">
                <i /> نشط (معتمد وموثق عبر IAM)
              </dd>
            </div>
            <div>
              <dt>المصادقة الثنائية (2FA)</dt>
              <dd>
                <span className="tag tag--ok-soft">مفعلة إلزامياً (NCA-CCC)</span>
              </dd>
            </div>
            <div>
              <dt>تاريخ إنشاء الحساب</dt>
              <dd className="plain">01 رجب 1446 هـ (09:30 ص)</dd>
            </div>
            <div>
              <dt>منشئ الحساب</dt>
              <dd className="plain">
                <a
                  href="/users/EMP-04821"
                  className="auth-link"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/users/a.almansour');
                  }}
                >
                  د. عبدالله المنصور (مدير النظام)
                </a>
              </dd>
            </div>
            <div>
              <dt>آخر تسجيل دخول</dt>
              <dd className="plain two">
                <span>اليوم 10:45 ص</span>
                <small dir="ltr">IP: 10.20.14.88 (غزة)</small>
              </dd>
            </div>
            <div>
              <dt>آخر تحديث بيانات</dt>
              <dd className="plain">أمس 02:15 م (عبر الموارد البشرية)</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="dcard roles">
        <div className="dcard__head">
          <h3>
            <ShieldCheckIcon size={26} className="dcard__head-icon" />
            الأدوار والصلاحيات المعتمدة
          </h3>
          <div className="roles__head-actions">
            <span className="soft-pill">3 أدوار معتمدة</span>
            <button type="button" className="btn-outline roles__edit" onClick={() => navigate('/users/EMP-04821/permissions')}>
              تعديل الأدوار
            </button>
          </div>
        </div>
        <div className="roles__grid">
          {ROLES.map((r) => (
            <article key={r.title} className={'urole' + (r.main ? ' urole--main' : '')}>
              <div className="urole__head">
                <h4>{r.title}</h4>
                {r.main && <span className="urole__badge">الدور الرئيسي</span>}
              </div>
              <p>{r.text}</p>
              <small className="urole__meta">{r.meta}</small>
            </article>
          ))}
        </div>
      </section>
      {statusModal && (
        <UserStatusModal
          mode={statusModal}
          user={{ name: info.name, empId: 'EMP-04821', email: info.email }}
          onClose={() => setStatusModal(null)}
          onConfirm={confirmStatus}
        />
      )}
    </div>
  );
}
