import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { KebabMenu } from '../components/UsersTable.jsx';
import UserStatusModal from '../components/UserStatusModal.jsx';
import TempPasswordModal from '../components/TempPasswordModal.jsx';
import { LockOpenIcon } from '../components/MIcons.jsx';
import { api, ApiError, errorText } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { fetchUser, fetchRoles, fetchDepartments, initials, statusOf, lastSeen, longDate, dateTime, actionError } from '../lib/users.js';
import { STATUS } from '../data.js';
import { eventLabel } from '../auditData.js';
import {
  LockIcon,
  PencilIcon,
  BuildingIcon,
  CalendarIcon,
  VerifiedIcon,
  SlidersIcon,
  IdCardIcon,
  CopyIcon,
  ShieldCheckIcon,
} from '../components/Icons.jsx';

// One user, from GET /api/users/{id}. Edit = PATCH /api/users/{id} (name, email, department_id).
// Roles are changed on /users/{id}/permissions.

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
function EditTile({ id, label, value, onChange, error, type = 'text', dir, required = true, max }) {
  return (
    <div className="field itile--edit">
      <label className="field__label" htmlFor={id}>
        {label} {required && <span className="field__req field__req--tight">*</span>}
      </label>
      <input
        id={id}
        className={'field__input' + (error ? ' is-invalid' : '')}
        type={type}
        dir={dir}
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? id + '-err' : undefined}
      />
      {error && <small className="itile__err" id={id + '-err'}>{error}</small>}
    </div>
  );
}

function validate(d) {
  const e = {};
  if (!d.name.trim()) e.name = 'هذا الحقل مطلوب';
  if (!d.email.trim()) e.email = 'هذا الحقل مطلوب';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'يرجى إدخال بريد إلكتروني صحيح';
  if (d.phone.trim() && !/^\+?[0-9][0-9\s-]{6,28}$/.test(d.phone.trim())) e.phone = 'يرجى إدخال رقم جوال صحيح';
  if (d.joined_at && d.joined_at > new Date().toISOString().slice(0, 10)) e.joined_at = 'تاريخ الانضمام لا يكون في المستقبل';
  return e;
}

const SCENARIOS = [
  { key: 'new', label: 'مستخدم جديد (بدون نشاط)', dot: '#555' },
  { key: 'lead', label: 'مستخدم نشط وقيادي', dot: '#1a8cff' },
  { key: 'disabled', label: 'حساب معطل', dot: '#e53030' },
  { key: 'multi', label: 'أدوار متعددة', dot: '#1a8cff' },
];
function scenarioOf(u) {
  if (!u.is_active) return 'disabled';
  if (!u.last_login_at) return 'new';
  if ((u.roles || []).length > 1) return 'multi';
  return 'lead';
}

// What each sandbox chip shows, from the real account and the audit log
function ScenarioPanel({ kind, user, roleInfo }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const needsLog = kind !== 'multi';

  useEffect(() => {
    if (!needsLog) return undefined;
    let alive = true;
    setRows(null);
    setError('');
    const q =
      kind === 'lead'
        ? `user_id=${user.id}&per_page=5`
        : kind === 'new'
          ? `subject_type=user&subject_id=${user.id}&event=user.created&per_page=1`
          : `subject_type=user&subject_id=${user.id}&event=user.*activated&per_page=5`;
    api('/audit-logs?' + q)
      .then((res) => alive && setRows(res.data))
      .catch((err) => alive && setError(errorText(err)));
    return () => {
      alive = false;
    };
  }, [kind, user.id, user.is_active, needsLog]);

  const loading = needsLog && !rows && !error;
  const who = (r) => r?.user?.name || 'النظام';

  let body;
  if (error) body = <p className="scen__muted">{error}</p>;
  else if (loading) body = <p className="scen__muted">جارٍ التحميل...</p>;
  else if (kind === 'new') {
    const made = rows[0];
    body = (
      <ul className="scen__list">
        <li><span>أُنشئ الحساب</span><b>{dateTime(user.created_at)}</b></li>
        <li><span>أنشأه</span><b>{made ? who(made) : '—'}</b></li>
        <li><span>أول تسجيل دخول</span><b>{user.last_login_at ? dateTime(user.last_login_at) : 'لم يسجّل الدخول بعد'}</b></li>
        <li><span>كلمة المرور</span><b>{user.must_change_password ? 'مؤقتة، بانتظار التغيير' : 'غيّرها المستخدم'}</b></li>
      </ul>
    );
  } else if (kind === 'lead') {
    body = rows.length ? (
      <ul className="scen__list">
        {rows.map((r) => (
          <li key={r.id}>
            <span>{eventLabel(r.event)}</span>
            <b>{dateTime(r.created_at)}</b>
          </li>
        ))}
      </ul>
    ) : (
      <p className="scen__muted">لا يوجد نشاط مسجّل لهذا المستخدم بعد</p>
    );
  } else if (kind === 'disabled') {
    body = (
      <>
        <p className={'scen__state ' + (user.is_active ? 'is-ok' : 'is-off')}>
          {user.is_active ? 'الحساب نشط حالياً' : 'الحساب معطل حالياً ولا يستطيع تسجيل الدخول'}
        </p>
        {rows.length ? (
          <ul className="scen__list">
            {rows.map((r) => (
              <li key={r.id}>
                <span>{r.event === 'user.deactivated' ? 'عطّله' : 'أعاد تفعيله'} {who(r)}</span>
                <b>{dateTime(r.created_at)}</b>
              </li>
            ))}
          </ul>
        ) : (
          <p className="scen__muted">لم يُعطَّل هذا الحساب من قبل</p>
        )}
      </>
    );
  } else {
    const roles = user.roles || [];
    const unique = new Set(roles.flatMap((r) => (roleInfo[r.id]?.permissions || []).map((p) => p.name)));
    body = (
      <>
        <ul className="scen__list">
          {roles.map((r) => (
            <li key={r.id}>
              <span>{r.label || r.name}</span>
              <b>{roleInfo[r.id] ? `${roleInfo[r.id].permissions.length} صلاحية` : '—'}</b>
            </li>
          ))}
        </ul>
        <p className="scen__muted">
          {roles.length > 1
            ? `${roles.length} أدوار تمنحه ${unique.size} صلاحية مختلفة (الصلاحيات المشتركة تُحسب مرة واحدة)`
            : 'لديه دور واحد فقط'}
        </p>
      </>
    );
  }

  return (
    <div className="scen" aria-live="polite">
      {body}
    </div>
  );
}

const STATUS_TEXT = {
  enabled: 'نشط',
  pending: 'نشط، بانتظار تغيير كلمة المرور المؤقتة',
  inactive: 'نشط، لم يسجّل الدخول بعد',
  disabled: 'معطل (لا يستطيع تسجيل الدخول)',
};

export default function UserDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const [user, setUser] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [departments, setDepartments] = useState([]);
  const [roleInfo, setRoleInfo] = useState({}); // role id -> role from /api/roles (description, permissions)
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);
  const [statusModal, setStatusModal] = useState(null); // 'deactivate' | 'activate' | null
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [scenario, setScenario] = useState(null);
  const infoRef = useRef(null);

  const load = useCallback(async () => {
    setLoadError('');
    setUser(null);
    try {
      setUser(await fetchUser(id));
    } catch (err) {
      setLoadError(err instanceof ApiError && err.status === 404 ? 'هذا المستخدم غير موجود' : errorText(err));
    }
  }, [id]);

  useEffect(() => {
    load();
    // lookups only make the page nicer: the page still works if they fail
    fetchDepartments().then(setDepartments).catch(() => {});
    fetchRoles()
      .then((list) => setRoleInfo(Object.fromEntries(list.map((r) => [r.id, r]))))
      .catch(() => {});
  }, [load]);

  if (loadError) {
    return (
      <div className="detail">
        <h1 className="page-title">إدارة المستخدمين</h1>
        <p className="users-msg is-err" role="alert">
          {loadError}
          <button type="button" onClick={() => navigate('/users')}>رجوع إلى المستخدمين</button>
        </p>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="detail">
        <h1 className="page-title">إدارة المستخدمين</h1>
        <p className="users-msg">جارٍ تحميل بيانات المستخدم...</p>
      </div>
    );
  }

  const status = statusOf(user);
  const locked = !user.is_active;
  const isMe = me?.id === user.id;
  const roles = user.roles || [];

  function startEdit() {
    setDraft({
      name: user.name,
      email: user.email,
      employee_number: user.employee_number || '',
      phone: user.phone || '',
      job_title: user.job_title || '',
      department_id: user.department?.id ? String(user.department.id) : '',
      sub_unit: user.sub_unit || '',
      joined_at: user.joined_at || '',
    });
    setErrors({});
    setSaveError('');
    setSaved(false);
    setEditing(true);
    requestAnimationFrame(() => {
      infoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      infoRef.current?.querySelector('input')?.focus({ preventScroll: true });
    });
  }

  async function saveEdit() {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length) {
      infoRef.current?.querySelector('[aria-invalid="true"]')?.focus();
      return;
    }
    // send only what changed
    const body = {};
    if (draft.name.trim() !== user.name) body.name = draft.name.trim();
    if (draft.email.trim() !== user.email) body.email = draft.email.trim();
    for (const k of ['employee_number', 'phone', 'job_title', 'sub_unit']) {
      const v = draft[k].trim() || null;
      if (v !== (user[k] || null)) body[k] = v;
    }
    if ((draft.joined_at || null) !== (user.joined_at || null)) body.joined_at = draft.joined_at || null;
    const dept = draft.department_id ? Number(draft.department_id) : null;
    if (dept !== (user.department?.id ?? null)) body.department_id = dept;
    if (!Object.keys(body).length) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      setUser(await api(`/users/${user.id}`, { method: 'PATCH', body }));
      setEditing(false);
      setSaved(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
        const f = err.body.errors;
        setErrors({
          name: f.name && 'يرجى إدخال اسم صحيح',
          email: f.email && (/taken|مستخدم/.test(String(f.email)) ? 'هذا البريد مستخدم في حساب آخر' : 'يرجى إدخال بريد إلكتروني صحيح'),
          employee_number: f.employee_number && (/taken|مستخدم/.test(String(f.employee_number)) ? 'هذا الرقم الوظيفي مستخدم لموظف آخر' : 'يرجى إدخال رقم وظيفي صحيح'),
          phone: f.phone && 'يرجى إدخال رقم جوال صحيح',
          job_title: f.job_title && 'يرجى إدخال مسمى وظيفي صحيح',
          sub_unit: f.sub_unit && 'يرجى إدخال وحدة صحيحة',
          joined_at: f.joined_at && 'يرجى إدخال تاريخ انضمام صحيح',
        });
        if (f.department_id) setSaveError('الإدارة المختارة غير موجودة');
      } else {
        setSaveError(actionError(err));
      }
    } finally {
      setSaving(false);
    }
  }

  async function confirmStatus() {
    const off = statusModal === 'deactivate';
    setStatusBusy(true);
    setStatusError('');
    try {
      setUser(await api(`/users/${user.id}/${off ? 'deactivate' : 'activate'}`, { method: 'POST' }));
      setStatusModal(null);
      setStatusMsg(off ? 'تم تعطيل الحساب' : 'تم إعادة تفعيل الحساب');
    } catch (err) {
      setStatusError(actionError(err));
    } finally {
      setStatusBusy(false);
    }
  }

  async function resetPassword() {
    try {
      const res = await api(`/users/${user.id}/reset-password`, { method: 'POST' });
      setUser((u) => ({ ...u, must_change_password: true }));
      return res.temporary_password;
    } catch (err) {
      throw new Error(actionError(err));
    }
  }

  const setField = (k) => (v) => {
    setDraft((d) => ({ ...d, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function copyEmail() {
    try {
      navigator.clipboard?.writeText(user.email);
    } catch {
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
            <span className="profile__avatar">{initials(user.name)}</span>
            <div className="profile__info">
              <div className="profile__row">
                <span className="pill pill--id" dir="ltr">{user.employee_number || '#' + user.id}</span>
              </div>
              <h2>{user.name}</h2>
              <p className="profile__meta">
                <BuildingIcon size={18} />
                {user.department?.name || 'بدون إدارة'}
                {user.job_title && ` · ${user.job_title}`}
              </p>
              <p className="profile__meta">
                <CalendarIcon size={18} />
                تاريخ الانضمام: {longDate(user.joined_at || user.created_at)}
              </p>
              {user.last_login_at && (
                <p className="profile__meta profile__meta--ok">
                  <VerifiedIcon size={18} />
                  آخر دخول: {lastSeen(user.last_login_at)}
                </p>
              )}
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
                <span className={'status ' + STATUS[status].cls + (status === 'enabled' ? ' st-active--soft' : '')}>
                  <i className="status__dot" />
                  {STATUS[status].label}
                </span>
              )}
              <KebabMenu id={user.id} placement="above" onResetPassword={isMe ? undefined : () => setResetOpen(true)} />
            </div>
            <div className="profile__actions">
              <button type="button" className="act act--edit act--lg" aria-label="تعديل" title="تعديل البيانات" onClick={startEdit}>
                <PencilIcon size={22} />
              </button>
              {!isMe &&
                (locked ? (
                  <button type="button" className="act act--unlock act--lg" aria-label="إعادة تفعيل الحساب" title="إعادة تفعيل الحساب" onClick={() => { setStatusError(''); setStatusModal('activate'); }}>
                    <LockOpenIcon size={22} />
                  </button>
                ) : (
                  <button type="button" className="act act--lock act--lg" aria-label="تعطيل الحساب" title="تعطيل الحساب" onClick={() => { setStatusError(''); setStatusModal('deactivate'); }}>
                    <LockIcon size={22} />
                  </button>
                ))}
            </div>
            {statusMsg && <small className="profile__status-msg" role="status">{statusMsg}</small>}
          </div>
        </section>

        {/* sandbox (left): the chip that matches this account is picked first */}
        <section className="dcard sandbox">
          <div className="sandbox__head">
            <span className="sandbox__icon">
              <SlidersIcon size={22} />
            </span>
            <div>
              <h3>محاكي حالات المستخدم <bdi dir="ltr">(Audit &amp; Governance Sandbox)</bdi></h3>
              <p>اختر حالة لعرض بياناتها الحقيقية لهذا الحساب من السجل</p>
            </div>
          </div>
          <div className="sandbox__chips">
            {SCENARIOS.map((s) => (
              <button
                key={s.key}
                type="button"
                className={'schip' + ((scenario || scenarioOf(user)) === s.key ? ' is-on' : '')}
                onClick={() => setScenario(s.key)}
              >
                <i style={{ background: s.dot }} />
                {s.label}
              </button>
            ))}
          </div>
          <ScenarioPanel kind={scenario || scenarioOf(user)} user={user} roleInfo={roleInfo} />
        </section>
      </div>

      <div className="detail__mid">
        <section className={'dcard info' + (editing ? ' is-editing' : '')} ref={infoRef}>
          <div className="dcard__head">
            <h3>
              <IdCardIcon size={26} className="dcard__head-icon" />
              المعلومات الأساسية
            </h3>
            {editing ? (
              <div className="info__edit-actions">
                <button type="button" className="btn-outline info__btn" onClick={() => setEditing(false)} disabled={saving}>إلغاء</button>
                <button type="button" className="btn-primary info__btn" onClick={saveEdit} disabled={saving}>
                  {saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            ) : (
              <span className="soft-pill">بيانات الحساب</span>
            )}
          </div>
          {editing ? (
            <div className="info__grid">
              <EditTile id="ud-name" label="الاسم الكامل" value={draft.name} onChange={setField('name')} error={errors.name} />
              <EditTile id="ud-email" label="البريد الإلكتروني" type="email" dir="ltr" value={draft.email} onChange={setField('email')} error={errors.email} />
              <EditTile id="ud-emp" label="الرقم الوظيفي" dir="ltr" required={false} value={draft.employee_number} onChange={setField('employee_number')} error={errors.employee_number} />
              <EditTile id="ud-phone" label="رقم الهاتف المحمول" type="tel" dir="ltr" required={false} value={draft.phone} onChange={setField('phone')} error={errors.phone} />
              <div className="field itile--edit">
                <label className="field__label" htmlFor="ud-dept">الإدارة / القسم</label>
                <select id="ud-dept" className="field__input" value={draft.department_id} onChange={(e) => setField('department_id')(e.target.value)}>
                  <option value="">بدون إدارة</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <EditTile id="ud-unit" label="الوحدة التنظيمية الفرعية" required={false} value={draft.sub_unit} onChange={setField('sub_unit')} error={errors.sub_unit} />
              <EditTile id="ud-title" label="المسمى الوظيفي" required={false} value={draft.job_title} onChange={setField('job_title')} error={errors.job_title} />
              <EditTile id="ud-joined" label="تاريخ الانضمام" type="date" required={false} max={new Date().toISOString().slice(0, 10)} value={draft.joined_at} onChange={setField('joined_at')} error={errors.joined_at} />
            </div>
          ) : (
            <div className="info__grid">
              <InfoTile label="الاسم الكامل">{user.name}</InfoTile>
              <InfoTile
                label="البريد الإلكتروني"
                extra={
                  <button type="button" className="icon-btn" onClick={copyEmail} aria-label="نسخ البريد">
                    {copied ? <ShieldCheckIcon size={18} /> : <CopyIcon size={18} />}
                  </button>
                }
              >
                <span dir="ltr">{user.email}</span>
              </InfoTile>
              <InfoTile label="الرقم الوظيفي">
                {user.employee_number ? <span className="pill pill--id" dir="ltr">{user.employee_number}</span> : '—'}
              </InfoTile>
              <InfoTile label="رقم الهاتف المحمول">{user.phone ? <span dir="ltr">{user.phone}</span> : '—'}</InfoTile>
              <InfoTile label="الإدارة / القسم">{user.department?.name || '—'}</InfoTile>
              <InfoTile label="الوحدة التنظيمية الفرعية">{user.sub_unit || '—'}</InfoTile>
              <InfoTile label="المسمى الوظيفي">{user.job_title || '—'}</InfoTile>
              <InfoTile label="تاريخ الانضمام">{user.joined_at ? longDate(user.joined_at) : '—'}</InfoTile>
            </div>
          )}
          <div className="info__sync">
            {saveError ? <span className="itile__err" role="alert">{saveError}</span> : <span>تُحفظ التعديلات مباشرة وتُسجَّل في سجل التدقيق.</span>}
            {saved ? <small className="info__saved" role="status">تم حفظ التعديلات</small> : <small>آخر تحديث: {dateTime(user.updated_at)}</small>}
          </div>
        </section>

        <section className="dcard account">
          <div className="dcard__head">
            <h3>
              <ShieldCheckIcon size={26} className="dcard__head-icon" />
              بيانات الحساب والأمان
            </h3>
          </div>
          <dl className="account__list">
            <div>
              <dt>حالة الحساب</dt>
              <dd className={locked ? 'plain' : 'is-ok'}>
                {!locked && <i />} {STATUS_TEXT[status]}
              </dd>
            </div>
            <div>
              <dt>كلمة المرور</dt>
              <dd className="plain">{user.must_change_password ? 'مؤقتة، يجب تغييرها عند أول دخول' : 'تم تعيينها من المستخدم'}</dd>
            </div>
            <div>
              <dt>تاريخ إنشاء الحساب</dt>
              <dd className="plain">{dateTime(user.created_at)}</dd>
            </div>
            <div>
              <dt>آخر تسجيل دخول</dt>
              <dd className="plain two">
                <span>{lastSeen(user.last_login_at)}</span>
                {user.last_login_ip && <small dir="ltr">IP: {user.last_login_ip}</small>}
              </dd>
            </div>
            <div>
              <dt>آخر تحديث بيانات</dt>
              <dd className="plain">{dateTime(user.updated_at)}</dd>
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
            <span className="soft-pill">{roles.length} {roles.length === 1 ? 'دور معتمد' : 'أدوار معتمدة'}</span>
            {!isMe && (
              <button type="button" className="btn-outline roles__edit" onClick={() => navigate(`/users/${user.id}/permissions`)}>
                تعديل الأدوار
              </button>
            )}
          </div>
        </div>
        <div className="roles__grid">
          {roles.map((r, i) => {
            const full = roleInfo[r.id];
            return (
              <article key={r.id} className={'urole' + (i === 0 ? ' urole--main' : '')}>
                <div className="urole__head">
                  <h4>{r.label || r.name}</h4>
                  {i === 0 && roles.length > 1 && <span className="urole__badge">الدور الرئيسي</span>}
                </div>
                {full?.description && <p>{full.description}</p>}
                <small className="urole__meta">
                  {full ? `${full.permissions.length} صلاحيات • ` : ''}
                  <bdi dir="ltr">{r.name}</bdi>
                </small>
              </article>
            );
          })}
          {!roles.length && <p className="uroles__empty">لا توجد أدوار لهذا المستخدم</p>}
        </div>
      </section>
      {statusModal && (
        <UserStatusModal
          mode={statusModal}
          user={{ name: user.name, email: user.email }}
          askReason={false}
          busy={statusBusy}
          error={statusError}
          onClose={() => setStatusModal(null)}
          onConfirm={confirmStatus}
        />
      )}
      {resetOpen && <TempPasswordModal user={user} onClose={() => setResetOpen(false)} onConfirm={resetPassword} />}
    </div>
  );
}
