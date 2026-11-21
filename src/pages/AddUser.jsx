import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from '../components/AuthLayout.jsx';
import TempPasswordModal from '../components/TempPasswordModal.jsx';
import { api, ApiError, errorText } from '../lib/api.js';
import { fetchRoles, fetchDepartments, permissionGroups, countPermissions } from '../lib/users.js';
import {
  IdCardIcon,
  ClipboardUserIcon,
  RolesIcon,
  ReportIcon,
  SparkIcon,
  FingerprintIcon,
  GavelIcon,
  ScalesIcon,
  InfoCircleIcon,
  CheckBoxIcon,
  CalendarIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
  ShieldLockIcon,
  UsersIcon,
  HandshakeIcon,
  DocIcon,
  CloseCircleIcon,
  PencilIcon,
  CopyIcon,
  VerifiedIcon,
  SearchIcon,
} from '../components/Icons.jsx';

/* ---------- static content copied from the design ---------- */
const STEPS = [
  { n: 1, title: 'المعلومات الأساسية', sub: 'البيانات الوظيفية والهوية', icon: IdCardIcon },
  { n: 2, title: 'بيانات الدخول', sub: 'الحساب وكلمة المرور المؤقتة', icon: ClipboardUserIcon },
  { n: 3, title: 'الأدوار والصلاحيات', sub: 'مستويات الحوكمة والاعتماد', icon: RolesIcon },
  { n: 4, title: 'المراجعة والاعتماد', sub: 'التحقق والاعتماد النهائي', icon: ReportIcon },
];

export const ROLE_OPTIONS = [
  {
    key: 'req',
    ar: 'الجهة الطالبة',
    en: 'Requesting Entity',
    text: 'تقديم طلبات الشراء، متابعة احتياجات القسم، وتأكيد استلام وتسلّم المواد والخدمات الميدانية.',
    perms: 8,
    permsLabel: '8 صلاحيات تنفيذية',
    tag: 'نطاق القسم',
  },
  {
    key: 'mgr',
    ar: 'مدير القسم',
    en: 'Department Manager',
    text: 'اعتماد طلبات الشراء المبدئية للقسم، مراجعة المبررات الفنية والمالية، وإحالة الاحتياجات لإدارة المشتريات.',
    perms: 14,
    permsLabel: '14 صلاحية اعتماد',
    tag: 'اشراف فرعي',
  },
  {
    key: 'fin',
    ar: 'المالية / الموازنة',
    en: 'Finance & Budgeting',
    text: 'التحقق من توفر بنود الميزانية، حجز الارتباط المالي المسبق، ومطابقة أوامر الصرف والفواتير المستحقات.',
    perms: 18,
    permsLabel: '18 صلاحية مالية',
    tag: 'تدقيق مالي',
  },
  {
    key: 'proc',
    ar: 'قسم المشتريات',
    en: 'Procurement Department',
    text: 'إعداد كراسات الشروط، طرح المنافسات والممارسات، التواصل مع الموردين، وإصدار أوامر الشراء الرسمية.',
    perms: 32,
    permsLabel: '32 صلاحية مشتريات',
    tag: 'عقود كاملة',
  },
  {
    key: 'tender',
    ar: 'لجنة فتح العطاءات',
    en: 'Tender Opening Committee',
    text: 'فتح المظاريف والعروض الفنية والمالية في المواعيد المحددة نظاماً، وتحرير المحاضر وتوثيق الضمانات.',
    perms: 18,
    permsLabel: '18 صلاحية مالية',
    tag: 'محاضر لجان',
  },
  {
    key: 'sys',
    ar: 'مدير النظام',
    en: 'System Administrator',
    text: 'إدارة الحسابات، ضبط الإعدادات العامة للمنظومة، إسناد الصلاحيات، والاطلاع على سجلات التدقيق الرقابي.',
    perms: 32,
    permsLabel: '32 صلاحية مشتريات',
    tag: 'تحكم كامل',
  },
];
// the design's role cards (English name, scope tag), by the backend role name
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
const cardInfo = (role) => CARD_INFO[CARD_KEY[role.name]] || {};

const SUB_UNITS = ['المركز الرئيسي', 'لجنة فتح المظاريف', 'وحدة الفحص المحاسبي'];
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- stepper ---------- */
function Stepper({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s) => {
        const done = s.n < current;
        const isCurrent = s.n === current;
        const Icon = s.icon;
        let label = 'الخطوة ' + s.n;
        if (done && s.n === 3) label = '3'; // as in the design (review screen)
        if (isCurrent && s.n === 1) label = 'الخطوة 1 · قيد التحرير';

        if (done) {
          return (
            <div className="step step--done" key={s.n}>
              <span className="step__check">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
              <div className="step__text">
                <small>{label}</small>
                <strong>{s.title}</strong>
                <em>{s.sub}</em>
              </div>
            </div>
          );
        }
        return (
          <div className={'step' + (isCurrent ? ' step--current' : '')} key={s.n}>
            <div className="step__row">
              <span className="step__icon">{isCurrent ? <Icon size={22} /> : s.n}</span>
              {s.n < 4 && <i className="step__line" />}
            </div>
            <div className="step__text">
              <small>{label}</small>
              <strong>{s.title}</strong>
              <em>{s.sub}</em>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- little form helpers ---------- */
function FieldError({ id, text }) {
  return text ? <small className="itile__err" id={id + '-err'} role="alert">{text}</small> : null;
}
function TextField({ id, label, req, tight, value, onChange, placeholder, error, left, type = 'text', dir, list, children }) {
  return (
    <div className="wfield">
      <label htmlFor={id}>
        {req && !tight && <span className="field__req">*</span>}
        {label}
        {req && tight && <span className="field__req field__req--tight">*</span>}
      </label>
      <div className={'winput' + (error ? ' is-invalid' : '')}>
        {left}
        <input
          id={id}
          type={type}
          dir={dir}
          list={list}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? id + '-err' : undefined}
        />
        {children}
      </div>
      <FieldError id={id} text={error} />
    </div>
  );
}
// Real date picker: the native <input type="date"> sits invisibly over the field and
// the chosen date is shown in the design's format ("الأربعاء . 21 أكتوبر 2026").
function formatDate(iso) {
  const [y, m, day] = iso.split('-').map(Number);
  const parts = new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(new Date(y, m - 1, day));
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get('weekday')} . ${get('day')} ${get('month')} ${get('year')}`;
}
function DateField({ id, label, value, onChange, placeholder, error }) {
  const ref = useRef(null);
  return (
    <div className="wfield">
      <label htmlFor={id}>{label}</label>
      <div className={'winput winput--date' + (error ? ' is-invalid' : '')} onClick={() => ref.current?.showPicker?.()}>
        <CalendarIcon size={22} className="winput__cal" />
        <span className={value ? 'winput__val' : 'winput__ph'}>{value ? formatDate(value) : placeholder}</span>
        <input id={id} ref={ref} type="date" max={today()} className="winput__native" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
      </div>
      <FieldError id={id} text={error} />
    </div>
  );
}
function SelectField({ id, label, value, onChange, placeholder, options, error }) {
  return (
    <div className="wfield">
      <label htmlFor={id}>{label}</label>
      <div className={'winput winput--select' + (error ? ' is-invalid' : '')}>
        <ChevronDownIcon size={18} className="winput__chev" />
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={error ? true : undefined}>
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <FieldError id={id} text={error} />
    </div>
  );
}

function HeadBar({ dot, title, sub, children }) {
  return (
    <div className="hbar">
      <div className="hbar__text">
        <h2>
          <i style={{ background: dot }} />
          {title}
        </h2>
        {sub && <p>{sub}</p>}
      </div>
      <div className="hbar__side">{children}</div>
    </div>
  );
}

/* ---------- validation ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_RE = /^\+?[0-9][0-9\s-]{6,28}$/;
const REQUIRED = 'هذا الحقل مطلوب';

function step1Errors(d) {
  const e = {};
  if (!d.name.trim()) e.name = REQUIRED;
  if (!d.employee_number.trim()) e.employee_number = REQUIRED;
  if (!d.email.trim()) e.email = REQUIRED;
  else if (!EMAIL_RE.test(d.email.trim())) e.email = 'يرجى إدخال بريد إلكتروني صحيح';
  if (!d.phone.trim()) e.phone = REQUIRED;
  else if (!PHONE_RE.test(d.phone.trim())) e.phone = 'يرجى إدخال رقم جوال صحيح';
  if (!d.job_title.trim()) e.job_title = REQUIRED;
  if (d.joined_at && d.joined_at > today()) e.joined_at = 'تاريخ الانضمام لا يكون في المستقبل';
  return e;
}

// server validation (422) -> our messages, per field
function serverErrors(body) {
  const f = body?.errors || {};
  const has = (k) => Boolean(f[k]);
  const text = (k) => String(f[k] || '');
  const e = {};
  if (has('name')) e.name = 'يرجى إدخال اسم صحيح';
  if (has('email')) e.email = /taken|مستخدم|مسجل/.test(text('email')) ? 'هذا البريد مستخدم في حساب آخر' : 'يرجى إدخال بريد إلكتروني صحيح';
  if (has('employee_number')) e.employee_number = /taken|مستخدم|مسجل/.test(text('employee_number')) ? 'هذا الرقم الوظيفي مستخدم لموظف آخر' : 'يرجى إدخال رقم وظيفي صحيح';
  if (has('phone')) e.phone = 'يرجى إدخال رقم جوال صحيح';
  if (has('job_title')) e.job_title = 'يرجى إدخال مسمى وظيفي صحيح';
  if (has('sub_unit')) e.sub_unit = 'يرجى إدخال وحدة صحيحة';
  if (has('joined_at')) e.joined_at = 'يرجى إدخال تاريخ انضمام صحيح';
  if (has('department_id')) e.department_id = text('department_id') || 'يرجى اختيار الإدارة';
  if (has('role_ids') || Object.keys(f).some((k) => k.startsWith('role_ids.'))) e.role_ids = 'يرجى اختيار دور صحيح';
  return e;
}
const STEP1_FIELDS = ['name', 'employee_number', 'email', 'phone', 'department_id', 'sub_unit', 'job_title', 'joined_at'];

/* ---------- step 1 ---------- */
function Step1({ d, set, errors, departments }) {
  const filled = [d.name, d.employee_number, d.email, d.phone, d.department_id, d.sub_unit, d.job_title, d.joined_at].filter((v) => v && String(v).trim()).length;
  const pct = Math.round((filled / 8) * 100);
  return (
    <>
      <HeadBar
        dot="#1a8cff"
        title="الخطوة 1: المعلومات الأساسية والوظيفية"
        sub="يجب تعبئة الحقول الأساسية للموظف. الحقول المؤشرة بعلامة ( * ) إلزامية لاستكمال التسجيل."
      >
        <span className="wbadge wbadge--green">
          <ReportIcon size={14} />
          تدقيق تلقائي للبيانات
        </span>
      </HeadBar>
      <div className="wgrid">
        <TextField id="au-name" label="ادخل اسم المستخدم كامل" req value={d.name} onChange={(v) => set('name', v)} placeholder="الاسم الرباعي" error={errors.name} />
        <TextField id="au-emp" label="ادخل الرقم الوظيفي" req tight dir="ltr" value={d.employee_number} onChange={(v) => set('employee_number', v)} placeholder="EMP-09842" error={errors.employee_number} />
        <TextField id="au-email" label="ادخل البريد الإلكتروني الرسمي" req type="email" dir="ltr" value={d.email} onChange={(v) => set('email', v)} placeholder="name@organization.edu" error={errors.email} />
        <TextField
          id="au-phone"
          label="رقم الهاتف المحمول"
          req
          type="tel"
          dir="ltr"
          value={d.phone}
          onChange={(v) => set('phone', v)}
          placeholder="059 123 4567"
          error={errors.phone}
          left={
            <span className="phone-code">
              <svg className="flag" viewBox="0 0 24 16" width="24" height="16" aria-hidden="true">
                <rect width="24" height="5.34" fill="#111" />
                <rect y="5.33" width="24" height="5.34" fill="#fff" />
                <rect y="10.66" width="24" height="5.34" fill="#007a3d" />
                <path d="M0 0L10 8L0 16Z" fill="#ce1126" />
              </svg>
              +970
            </span>
          }
        />
        <SelectField
          id="au-dept"
          label="الإدارة / القسم"
          value={d.department_id}
          onChange={(v) => set('department_id', v)}
          placeholder="بدون إدارة"
          options={departments.map((x) => ({ value: String(x.id), label: x.name }))}
          error={errors.department_id}
        />
        <TextField id="au-unit" label="الوحدة / القسم الفرعي" list="au-units" value={d.sub_unit} onChange={(v) => set('sub_unit', v)} placeholder="اختر أو اكتب اسم الوحدة" error={errors.sub_unit}>
          <datalist id="au-units">
            {SUB_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </TextField>
        <TextField id="au-title" label="المسمى الوظيفي الداخلي" req value={d.job_title} onChange={(v) => set('job_title', v)} placeholder="أخصائي مشتريات" error={errors.job_title} />
        <DateField id="au-joined" label="ادخل التاريخ الإنضمام" value={d.joined_at} onChange={(v) => set('joined_at', v)} placeholder="اختر التاريخ" error={errors.joined_at} />
      </div>
      <div className="readybar">
        <span className="readybar__icon">
          <FingerprintIcon size={26} />
        </span>
        <div className="readybar__text">
          <h3>
            ملف الموظف جاهز لإنشاء الحساب
            <span className="tag tag--ready">{pct === 100 ? 'البيانات مكتملة' : 'قيد التعبئة'}</span>
          </h3>
          <p>سيتم إنشاء حساب بكلمة مرور مؤقتة تظهر لك مرة واحدة، ويُطلب من الموظف تغييرها عند أول دخول.</p>
        </div>
        <div className="readybar__pct">
          <span className="ring" style={{ '--p': pct }}>
            <svg viewBox="0 0 36 36" width="44" height="44">
              <circle cx="18" cy="18" r="16" fill="none" stroke="#cfe3f2" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="16" fill="none" stroke="#0a5c36" strokeWidth="2.5" strokeDasharray={`${(pct / 100) * 100.5} 100.5`} strokeLinecap="round" transform="rotate(-90 18 18)" />
            </svg>
            <ShieldCheckIcon size={0} />
          </span>
          <div>
            <small>اكتمال ملف الخطوة</small>
            <strong>{pct}% مكتمل</strong>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- step 2: how the new user signs in ---------- */
function Step2({ d }) {
  return (
    <>
      <HeadBar dot="#3b3bd8" title="الخطوة 2: بيانات الدخول" sub="كيف سيدخل الموظف إلى المنظومة لأول مرة">
        <span className="wbadge wbadge--green">
          <ShieldCheckIcon size={14} />
          كلمة مرور مؤقتة لمرة واحدة
        </span>
      </HeadBar>
      <div className="infostrip">
        <InfoCircleIcon size={22} className="infostrip__icon" />
        <p>
          لا يكتب المسؤول كلمة مرور الموظف. عند اعتماد الحساب تُنشئ المنظومة كلمة مرور مؤقتة قوية وتعرضها لك <b>مرة واحدة فقط</b> لتسلّمها للموظف بطريقة آمنة، ثم يُلزم الموظف بتعيين كلمة مرور جديدة عند أول دخول.
        </p>
      </div>

      <div className="wfield wfield--wide">
        <label htmlFor="au-login">اسم الدخول إلى المنظومة (البريد الإلكتروني)</label>
        <div className="winput">
          <input id="au-login" dir="ltr" value={d.email} readOnly />
        </div>
        <div className="uname-hint">
          <span>يدخل الموظف ببريده الإلكتروني الرسمي. لتغييره ارجع إلى الخطوة 1.</span>
          {d.email.trim() && (
            <span className="uname-ok">
              <ShieldCheckIcon size={18} />
              <bdi dir="ltr">{d.email}</bdi>
            </span>
          )}
        </div>
      </div>

      <div className="rules-box rules-box--wide">
        <h3>شروط كلمة المرور التي سيعيّنها الموظف عند أول دخول:</h3>
        <div className="rules-box__grid rules-box__grid--wiz">
          <Check checked readOnly>8 خانات على الأقل</Check>
          <Check checked readOnly>رقم واحد على الأقل (0-9)</Check>
          <Check checked readOnly>حرف كبير واحد (A-Z)</Check>
          <Check checked readOnly>رمز خاص واحد (!@#$%^&*)</Check>
        </div>
      </div>

      <div className="delivery">
        <h3>إعدادات الأمان والتسليم المبدئي</h3>
        <label className="delivery__item">
          <Check checked readOnly />
          <span>
            <strong>إلزام المستخدم بتغيير كلمة المرور فور تسجيل الدخول الأول</strong>
            <small>مفعّل دائماً لكل حساب جديد ولا يمكن إيقافه</small>
          </span>
        </label>
        <label className="delivery__item">
          <Check checked readOnly />
          <span>
            <strong>
              عرض كلمة المرور المؤقتة للمسؤول مرة واحدة بعد الاعتماد
              <span className="tag tag--secret">سري وآمن</span>
            </strong>
            <small>لا تُحفظ كلمة المرور في سجل التدقيق ولا يمكن عرضها مرة أخرى</small>
          </span>
        </label>
      </div>
    </>
  );
}

/* ---------- role card (steps 3 and 4) ---------- */
function RoleCard({ role, on, onClick, as = 'button' }) {
  const info = cardInfo(role);
  const Tag = as;
  const props = as === 'button' ? { type: 'button', onClick, 'aria-pressed': on } : {};
  return (
    <Tag className={'rolecard' + (on ? ' is-on' : '') + (as === 'button' ? '' : ' rolecard--static')} {...props}>
      <span className={'rolecard__cb' + (on ? ' is-on' : '')}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <h4>{role.label || role.name}</h4>
      {info.en && <small className="rolecard__en">{info.en}</small>}
      <p>{role.description || info.text || ''}</p>
      <span className="rolecard__foot">
        <b>{role.permissions.length} صلاحيات معتمدة</b>
        {info.tag && <i>{info.tag}</i>}
      </span>
    </Tag>
  );
}

/* ---------- step 3 ---------- */
function Step3({ d, set, roles, error }) {
  const selected = roles.filter((r) => d.role_ids.includes(r.id));
  const n = selected.length;
  const groups = permissionGroups(selected);
  const perms = countPermissions(groups);
  const toggle = (id) => set('role_ids', d.role_ids.includes(id) ? d.role_ids.filter((x) => x !== id) : [...d.role_ids, id]);
  const countLabel = n === 1 ? 'دور مختار' : n === 2 ? 'دوران مختاران' : `${n} أدوار مختارة`;
  return (
    <>
      <HeadBar
        dot="#4a3fd8"
        title="الخطوة 3 :تعيين الأدوار والصلاحيات الوظيفية"
        sub="يمكن للمستخدم امتلاك أكثر من دور حسب مسؤولياته داخل المؤسسة. صلاحيات المستخدم هي مجموع صلاحيات أدواره."
      >
        <span className="wbadge wbadge--green">
          <ShieldCheckIcon size={14} />
          حوكمة مشتريات معتمدة
        </span>
      </HeadBar>

      {error && <p className="uroles__msg is-err" role="alert">{error}</p>}

      <div className="rolesplit">
        <section className="rolepanel">
          <div className="rolepanel__head">
            <h3>
              الأدوار الوظيفية المتاحة <small>(اختر واحداً أو أكثر)</small>
            </h3>
            <span className="rolepanel__count">
              <i />
              محدد حالياً: <b>{n}</b> من {roles.length}
            </span>
          </div>
          <div className="rolegrid">
            {roles.map((r) => (
              <RoleCard key={r.id} role={r} on={d.role_ids.includes(r.id)} onClick={() => toggle(r.id)} />
            ))}
          </div>
          <div className="govnote">
            <div className="govnote__text">
              <h4>إشعار الأمان والحوكمة</h4>
              <p>تُسجَّل عملية إنشاء الحساب والأدوار الممنوحة في سجل التدقيق.</p>
              <ShieldLockIcon size={20} className="govnote__icon" />
            </div>
            {/* opens the roles screen in a new tab so the wizard keeps what was typed */}
            <a className="mini mini--solid" href="/roles" target="_blank" rel="noopener">
              دليل مصفوفة الصلاحيات
            </a>
          </div>
        </section>

        <aside className="sumcol">
          <section className="sumcard">
            <div className="sumcard__head">
              <h3>ملخص الصلاحيات</h3>
              {n > 0 && <span className="sumcard__badge">{countLabel}</span>}
            </div>
            <div className="sumtiles">
              <div>
                <UsersIcon size={26} />
                <span>
                  <b>{n}</b>
                  <small>الادوار المحددة</small>
                </span>
              </div>
              <div>
                <ShieldCheckIcon size={26} />
                <span>
                  <b>{perms}</b>
                  <small>الصلاحيات</small>
                </span>
              </div>
              <div>
                <HandshakeIcon size={26} />
                <span>
                  <b>{groups.length}</b>
                  <small>مجالات العمل</small>
                </span>
              </div>
            </div>
            {n === 0 ? (
              <div className="sumempty">
                <strong>لم يتم تحديد أي دور بعد</strong>
                <span>اختر دور واحد أو أكثر من القائمة</span>
                <img src="/assets/desk-illustration.png" alt="" />
              </div>
            ) : (
              <div className="sumsel">
                <h4>الادوار المختارة</h4>
                {selected.map((r) => (
                  <div className="selitem" key={r.id}>
                    <span className="selitem__icon">
                      <DocIcon size={22} />
                    </span>
                    <span className="selitem__text">
                      <b>{r.label || r.name}</b>
                      <small>{r.permissions.length} صلاحية</small>
                    </span>
                    <button type="button" aria-label="إزالة" onClick={() => toggle(r.id)}>
                      <CloseCircleIcon size={22} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section className="regnote">
            <div className="regnote__head">
              <InfoCircleIcon size={26} className="regnote__icon" />
              <h4>ملاحظة تنظيمية</h4>
            </div>
            <p>دور «مقدم طلب شراء» يحتاج أن يكون الموظف تابعاً لإدارة، لأن طلباته تُرفع باسم إدارته.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

/* ---------- step 4 ---------- */
function Section({ icon, title, sub, onEdit, children }) {
  return (
    <section className="rsec">
      <div className="rsec__head">
        <div className="rsec__title">
          <span className="rsec__icon">{icon}</span>
          <div>
            <h3>{title}</h3>
            <p>{sub}</p>
          </div>
        </div>
        <button type="button" className="rsec__edit" onClick={onEdit}>
          <span>
            <PencilIcon size={20} />
          </span>
          تعديل
        </button>
      </div>
      {children}
    </section>
  );
}
function RTile({ label, children, extra, wide }) {
  return (
    <div className={'rtile' + (wide ? ' rtile--wide' : '')}>
      <span>{label}</span>
      <div>
        <strong>{children}</strong>
        {extra}
      </div>
    </div>
  );
}

function Step4({ d, set, goTo, showError, roles, departments }) {
  const picked = roles.filter((r) => d.role_ids.includes(r.id));
  const groups = permissionGroups(picked);
  const dept = departments.find((x) => String(x.id) === d.department_id);
  const dash = <span className="audit__muted">—</span>;
  return (
    <div className="review">
      <Section icon={<IdCardIcon size={22} />} title="1. المعلومات الأساسية" sub="الهوية المؤسسية والبيانات الوظيفية للموظف" onEdit={() => goTo(1)}>
        <div className="rgrid rgrid--3">
          <RTile label="الاسم الكامل">{d.name}</RTile>
          <RTile label="الرقم الوظيفي">
            <span className="pill pill--id" dir="ltr">{d.employee_number}</span>
          </RTile>
          <RTile label="البريد الإلكتروني الرسمي">
            <span dir="ltr">{d.email}</span>
          </RTile>
          <RTile label="الوحدة التنظيمية الفرعية">{d.sub_unit || dash}</RTile>
          <RTile label="الإدارة / القسم">{dept?.name || dash}</RTile>
          <RTile label="رقم الهاتف المحمول">
            <span dir="ltr">{d.phone}</span>
          </RTile>
        </div>
        <RTile label="المسمى الوظيفي المعتمد" wide>
          {d.job_title}
          {d.joined_at && <em className="dotsep"> · تاريخ الانضمام: {formatDate(d.joined_at)}</em>}
        </RTile>
      </Section>

      <Section icon={<ClipboardUserIcon size={22} />} title="2. بيانات الدخول وضوابط الأمان" sub="الدخول الأول بكلمة مرور مؤقتة" onEdit={() => goTo(2)}>
        <div className="rgrid rgrid--2">
          <RTile label="اسم الدخول (البريد الإلكتروني)">
            <span dir="ltr">{d.email}</span>
          </RTile>
          <RTile label="كلمة المرور المبدئية" extra={<span className="tag tag--ok-soft">تُنشأ تلقائياً</span>}>
            ••••••••••••
          </RTile>
          <RTile label="سياسة الدخول الأول">إلزام المستخدم بتعيين كلمة مرور جديدة ومطابقة سياسة التعقيد</RTile>
          <RTile label="تسليم كلمة المرور">تظهر لك مرة واحدة بعد الاعتماد لتسلّمها للموظف</RTile>
        </div>
      </Section>

      <Section icon={<DocIcon size={22} />} title="3. الأدوار والصلاحيات الممنوحة" sub="صلاحيات المستخدم هي مجموع صلاحيات أدواره" onEdit={() => goTo(3)}>
        <div className="rgrid rgrid--2 rgrid--roles">
          {picked.map((r) => (
            <RoleCard key={r.id} role={r} on as="article" />
          ))}
        </div>
        <div className="sumtiles sumtiles--row">
          <div>
            <HandshakeIcon size={26} />
            <span>
              <b>{groups.length}</b>
              <small>مجالات العمل</small>
            </span>
          </div>
          <div>
            <ShieldCheckIcon size={26} />
            <span>
              <b>{countPermissions(groups)}</b>
              <small>الصلاحيات</small>
            </span>
          </div>
          <div>
            <UsersIcon size={26} />
            <span>
              <b>{picked.length}</b>
              <small>الادوار المحددة</small>
            </span>
          </div>
        </div>
      </Section>

      <section className="rsec rsec--gov">
        <div className="govblock">
          <ScalesIcon size={26} />
          <div>
            <h3>إقرار مسؤولية الحوكمة والتدقيق الرقابي</h3>
            <p>تُسجَّل عملية إنشاء هذا الحساب والأدوار الممنوحة له في سجل التدقيق باسمك، وتتحمل الجهة المعتمدة مسؤولية دقة البيانات المدخلة.</p>
          </div>
        </div>
        <label className={'confirm' + (showError && !d.confirmed ? ' is-invalid' : '')}>
          <Check checked={d.confirmed} onChange={(v) => set('confirmed', v)} />
          <span>
            <strong>أؤكد أن بيانات المستخدم صحيحة ومطابقة لملف الموارد البشرية واللوائح التنظيمية المعتمدة</strong>
            <small>بتفعيل هذا الإقرار، أنت توافق بصفتك مسؤول النظام على إنشاء الحساب ومنحه الأدوار المحددة.</small>
          </span>
        </label>
      </section>
    </div>
  );
}

/* ---------- page ---------- */
const EMPTY = {
  name: '',
  employee_number: '',
  email: '',
  phone: '',
  department_id: '',
  sub_unit: '',
  job_title: '',
  joined_at: '',
  role_ids: [],
  confirmed: false,
};

export default function AddUser() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);
  const [d, setD] = useState(EMPTY);
  const [roles, setRoles] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [server, setServer] = useState({}); // errors from the server (422)
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [created, setCreated] = useState(null); // { user, password }

  useEffect(() => {
    fetchRoles()
      .then(setRoles)
      .catch((err) => setLoadError(errorText(err)));
    fetchDepartments().then(setDepartments).catch(() => {});
  }, []);

  const set = (k, v) => {
    setD((s) => ({ ...s, [k]: v }));
    if (server[k]) setServer((e) => ({ ...e, [k]: undefined }));
  };
  const go = (n) => {
    setShowErrors(false);
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const errors1 = useMemo(() => ({ ...(showErrors ? step1Errors(d) : {}), ...Object.fromEntries(Object.entries(server).filter(([k, v]) => v && STEP1_FIELDS.includes(k))) }), [showErrors, d, server]);
  const rolesError = (showErrors && step === 3 && !d.role_ids.length && 'يجب اختيار دور واحد على الأقل') || server.role_ids || '';

  function next() {
    if (step === 1 && Object.keys(step1Errors(d)).length) {
      setShowErrors(true);
      requestAnimationFrame(() => document.querySelector('.wizard [aria-invalid="true"]')?.focus());
      return;
    }
    if (step === 3 && !d.role_ids.length) {
      setShowErrors(true);
      return;
    }
    go(step + 1);
  }

  async function create() {
    setShowErrors(true);
    if (!d.confirmed) return;
    setSaving(true);
    setSaveError('');
    const body = {
      name: d.name.trim(),
      email: d.email.trim(),
      employee_number: d.employee_number.trim(),
      phone: d.phone.trim(),
      job_title: d.job_title.trim(),
      sub_unit: d.sub_unit.trim() || null,
      joined_at: d.joined_at || null,
      department_id: d.department_id ? Number(d.department_id) : null,
      role_ids: d.role_ids,
    };
    try {
      const res = await api('/users', { method: 'POST', body });
      const { temporary_password: password, ...user } = res;
      setCreated({ user, password });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        const e = serverErrors(err.body);
        setServer(e);
        // go back to the first step that has a problem
        if (STEP1_FIELDS.some((k) => e[k])) go(1);
        else if (e.role_ids) go(3);
        else setSaveError(err.body.message || 'تعذّر إنشاء المستخدم');
      } else {
        setSaveError(errorText(err));
      }
    } finally {
      setSaving(false);
    }
  }

  const footer = {
    1: { next: 'التالي : بيانات الدخول', prev: 'إلغاء والعودة لقائمة المستخدمين' },
    2: { next: 'التالي :الأدوار والصلاحيات', prev: 'السابق :المعلومات الأساسية' },
    3: { next: 'التالي :المراجعة والاعتماد', prev: 'السابق :بيانات الدخول' },
    4: { next: saving ? 'جارٍ إنشاء المستخدم...' : 'إنشاء المستخدم و اعتماد الحساب', prev: 'السابق : الأدوار والصلاحيات' },
  }[step];

  if (loadError) {
    return (
      <div className="wizard">
        <h1 className="page-title">إضافة مستخدم جديد</h1>
        <p className="users-msg is-err" role="alert">
          {loadError}
          <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
        </p>
      </div>
    );
  }

  return (
    <div className="wizard">
      <h1 className="page-title">إضافة مستخدم جديد</h1>
      <p className="page-subtitle">التحكم المركزي في حسابات موظفي المشتريات، وتعيين الأدوار التخصصية، ومتابعة النشاط الإداري</p>

      <section className="wcard wcard--stepper">
        <Stepper current={step} />
      </section>

      {!roles ? (
        <p className="users-msg">جارٍ التحميل...</p>
      ) : step === 4 ? (
        <Step4 d={d} set={set} goTo={go} showError={showErrors} roles={roles} departments={departments} />
      ) : (
        <section className={'wcard wcard--body' + (step === 3 ? ' wcard--plain' : '')}>
          {step === 1 && <Step1 d={d} set={set} errors={errors1} departments={departments} />}
          {step === 2 && <Step2 d={d} />}
          {step === 3 && <Step3 d={d} set={set} roles={roles} error={rolesError} />}
        </section>
      )}

      {saveError && <p className="uroles__msg is-err" role="alert">{saveError}</p>}

      <footer className="wfooter">
        {step === 1 && (
          <p className="wfooter__note">
            <GavelIcon size={20} />
            يتم فحص البيانات قبل الحفظ، والحقول المؤشرة بـ ( * ) إلزامية
          </p>
        )}
        <div className="wfooter__btns">
          <button type="button" className="btn-outline" onClick={() => (step === 1 ? navigate('/users') : go(step - 1))} disabled={saving}>
            {footer.prev}
          </button>
          <button type="button" className="btn-primary wfooter__next" onClick={() => (step === 4 ? create() : next())} disabled={saving || !roles}>
            {footer.next}
          </button>
        </div>
      </footer>

      {created && (
        <TempPasswordModal
          title="تم إنشاء المستخدم"
          user={created.user}
          password={created.password}
          onConfirm={async () => created.password}
          onClose={() => navigate(`/users/${created.user.id}`)}
        />
      )}
    </div>
  );
}
