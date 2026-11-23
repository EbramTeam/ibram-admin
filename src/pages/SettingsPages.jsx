import { useEffect, useRef, useState } from 'react';
import { api, errorText, getToken, API_URL } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { dateTime } from '../lib/users.js';
import { useMaster, fmt, masterError } from '../masterStore.jsx';
import { DatabaseIcon, OrgChartIcon } from '../components/Icons.jsx';
import { CubeIcon } from '../components/MIcons.jsx';
import { eventLabel, subjectLabel } from '../auditData.js';
import { useNavigate } from 'react-router-dom';
import { settings, NOTIF_DEFAULT } from '../settingsStore.js';
import { setLanguage } from '../i18n/translate.js';
import { PageHead } from './master/Bits.jsx';
import Cbx from '../components/Cbx.jsx';
import { SettingsIcon, BellIcon, ShieldIcon, ShieldCheckIcon, UploadIcon, TrashIcon, BanIcon, CalendarIcon, ClockHistoryIcon, InfoCircleIcon, KeyLockIcon, LockIcon, FingerprintIcon, BuildingIcon, SmallUserIcon, DocIcon, GavelIcon, CertIcon, WarnIcon } from '../components/Icons.jsx';
import { WorkflowIcon, ArrowLeftLongIcon, CloudUploadIcon, TranslateIcon, ClockIcon, ClipboardCheckIcon, FolderOpenIcon, MegaphoneIcon, FileTextIcon, CheckBadgeIcon, GlobeIcon2, ClipboardListIcon, LockOpenIcon, BankIcon } from '../components/MIcons.jsx';
import { ChevronDownIcon } from '../components/Icons.jsx';

// ---------- الإعدادات (الرئيسية) ----------
// official board: organization banner, real figures, then the settings sections as a list
const SECTIONS = [
  { to: '/settings/general', icon: <SettingsIcon size={22} />, title: 'الإعدادات العامة', text: 'اسم الجهة وشعارها والعملة ولغة الواجهة.' },
  { to: '/settings/procurement', icon: <WorkflowIcon size={22} />, title: 'المشتريات وسير العمل', text: 'مراحل الطلبات وسلاسل الاعتماد والصلاحيات المالية.' },
  { to: '/settings/notifications', icon: <BellIcon size={22} />, title: 'الإشعارات', text: 'التنبيهات التي تصل للمستخدمين داخل النظام.' },
  { to: '/roles', icon: <ShieldCheckIcon size={22} />, title: 'الأدوار والصلاحيات', text: 'من يستطيع ماذا داخل النظام، وإنشاء الأدوار المخصصة.' },
  { to: '/master-data', icon: <DatabaseIcon size={22} />, title: 'البيانات الأساسية', text: 'الأقسام والتصنيفات ووحدات القياس والأصناف.' },
];

function Stat({ icon, label, value, note, to }) {
  const nav = useNavigate();
  return (
    <button type="button" className="sstat" onClick={() => nav(to)}>
      <span className="sstat__icon">{icon}</span>
      <span className="sstat__label">{label}</span>
      <b className="sstat__value">{value ?? <i className="shcard__wait" />}</b>
      <small>{note}</small>
    </button>
  );
}

export function SettingsHub() {
  const nav = useNavigate();
  const { departments, categories, units, items, loaded } = useMaster();
  const [org, setOrg] = useState(null);
  const [roles, setRoles] = useState(null);
  const [unread, setUnread] = useState(null);
  const [last, setLast] = useState(undefined);

  useEffect(() => {
    api('/organization').then(setOrg).catch(() => setOrg({}));
    api('/roles').then((r) => setRoles(r.data)).catch(() => setRoles([]));
    api('/notifications').then((r) => setUnread(r.unread_count)).catch(() => setUnread(0));
    // logins and logouts aren't changes: show the latest admin action
    api('/audit-logs?per_page=30').then((r) => setLast(r.data.find((x) => !x.event.startsWith('auth.')) || null)).catch(() => setLast(null));
  }, []);

  const lang = document.documentElement.lang === 'en' ? 'English' : 'العربية';
  const activeRoles = roles && roles.filter((r) => r.is_active !== false).length;
  const customRoles = roles && roles.filter((r) => r.is_system === false).length;
  const subDepts = departments.filter((d) => d.level === 'sub').length;

  return (
    <div className="shub shub--board">
      <PageHead title="الإعدادات" sub="لوحة إعدادات الجهة والنظام: نظرة عامة على البيانات المعتمدة، والوصول إلى أقسام الضبط." />

      <section className="shub2__org">
        <span className="shub2__seal"><BuildingIcon size={28} /></span>
        <div className="shub2__orgname">
          <small>الجهة المسجلة</small>
          <strong>{org ? org.name || '—' : '...'}</strong>
        </div>
        <dl className="shub2__orgmeta">
          <div><dt>رمز الجهة</dt><dd dir="ltr">{org?.code || '—'}</dd></div>
          <div><dt>العملة</dt><dd dir="ltr">{org?.currency || '—'}</dd></div>
          <div><dt>الحالة</dt><dd>{org ? (org.is_active === false ? 'موقوفة' : <><i className="shub2__dot" />نشطة</>) : '—'}</dd></div>
          <div><dt>لغة الواجهة</dt><dd>{lang}</dd></div>
        </dl>
      </section>

      <div className="sstats">
        <Stat icon={<OrgChartIcon size={20} />} label="الأقسام والإدارات" value={loaded ? fmt(departments.length) : null} note={loaded ? `منها ${fmt(subDepts)} قسم فرعي` : ''} to="/master-data/departments" />
        <Stat icon={<CubeIcon size={20} />} label="الأصناف المسجلة" value={loaded ? fmt(items.length) : null} note={loaded ? `${fmt(categories.length)} تصنيف · ${fmt(units.length)} وحدة قياس` : ''} to="/master-data/items" />
        <Stat icon={<ShieldCheckIcon size={20} />} label="الأدوار النشطة" value={roles ? fmt(activeRoles) : null} note={roles ? (customRoles ? `منها ${fmt(customRoles)} مخصص` : 'أدوار النظام الأساسية') : ''} to="/roles" />
        <Stat icon={<BellIcon size={20} />} label="إشعارات غير مقروءة" value={unread === null ? null : fmt(unread)} note="الخاصة بحسابك" to="/" />
      </div>

      <section className="slist">
        <header className="slist__head">
          <h2>أقسام الضبط</h2>
          <p>كل تعديل في هذه الأقسام يُسجَّل في سجل التدقيق باسم من نفّذه.</p>
        </header>
        <ul>
          {SECTIONS.map((x, i) => (
            <li key={x.to}>
              <button type="button" onClick={() => nav(x.to)}>
                <span className="slist__no">{String(i + 1).padStart(2, '0')}</span>
                <span className="slist__icon">{x.icon}</span>
                <span className="slist__text"><strong>{x.title}</strong><small>{x.text}</small></span>
                <span className="slist__go"><ArrowLeftLongIcon size={18} /></span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="shub2__audit">
        <span className="shub2__auditicon"><ClockHistoryIcon size={20} /></span>
        <div>
          <strong>آخر تعديل إداري</strong>
          <p>
            {last === undefined
              ? 'جارٍ التحميل...'
              : last
                ? <>{eventLabel(last.event)}{last.subject_type ? ' - ' + subjectLabel(last) : ''} · {last.user?.name || 'النظام'} · {dateTime(last.created_at)}</>
                : 'لا توجد تعديلات مسجلة بعد'}
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={() => nav('/audit-log')}>عرض سجل التدقيق</button>
      </section>
    </div>
  );
}

// ---------- الإعدادات العامة ----------
// organization types: the stored value stays English, the label is Arabic
const ORG_TYPES = [
  ['university', 'جامعة / كلية'], ['education', 'مؤسسة تعليمية'], ['government', 'جهة حكومية'], ['municipality', 'بلدية / هيئة محلية'],
  ['health', 'مؤسسة صحية'], ['company', 'شركة خاصة'], ['nonprofit', 'مؤسسة غير ربحية'], ['other', 'جهة أخرى'],
];
const CURRENCIES = [
  ['ILS', 'شيكل (ILS)'], ['USD', 'دولار أمريكي (USD)'], ['JOD', 'دينار أردني (JOD)'], ['EUR', 'يورو (EUR)'],
  ['EGP', 'جنيه مصري (EGP)'], ['SAR', 'ريال سعودي (SAR)'], ['AED', 'درهم إماراتي (AED)'], ['QAR', 'ريال قطري (QAR)'],
];
const LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

// the logo needs the bearer token, so it is fetched as a blob and shown from an object URL
async function fetchLogo() {
  const res = await fetch(`${API_URL}/api/organization/logo`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) return '';
  return URL.createObjectURL(await res.blob());
}

function Choice({ value, options, onChange, label, disabled }) {
  const shown = options.find(([v]) => v === value)?.[1] || value || '—';
  return (
    <label className={'spsel' + (disabled ? ' is-off' : '')}>
      <select value={value || ''} onChange={(e) => onChange(e.target.value)} aria-label={label} disabled={disabled}>
        {!options.some(([v]) => v === value) && <option value={value || ''}>{value || '—'}</option>}
        {options.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
      </select>
      <span>{shown}</span>
      <ChevronDownIcon size={18} />
    </label>
  );
}

export function SettingsGeneral() {
  const nav = useNavigate();
  const { user } = useAuth();
  const canEdit = (user?.permissions || []).includes('settings.manage');
  const [org, setOrg] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', currency: '' });
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // {ok, text}
  const [nameError, setNameError] = useState('');
  const [logo, setLogo] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [lang, setLang] = useState(document.documentElement.lang === 'en' ? 'en' : 'ar');
  const [last, setLast] = useState(undefined);
  const file = useRef(null);

  const fill = (o) => {
    setOrg(o);
    setForm({ name: o.name || '', type: o.type || '', currency: o.currency || '' });
  };
  const loadLast = () =>
    api('/audit-logs?event=organization.*&per_page=1').then((r) => setLast(r.data[0] || null)).catch(() => setLast(null));

  useEffect(() => {
    api('/organization').then(fill).catch((err) => setLoadError(errorText(err)));
    fetchLogo().then(setLogo).catch(() => {});
    loadLast();
  }, []);
  useEffect(() => () => logo && URL.revokeObjectURL(logo), [logo]);

  const dirty = org && (form.name.trim() !== (org.name || '') || form.type !== (org.type || '') || form.currency !== (org.currency || ''));
  const set = (k) => (v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setNotice(null);
    if (k === 'name') setNameError('');
  };

  async function save() {
    if (!form.name.trim()) {
      setNameError('اسم الجهة مطلوب');
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      fill(await api('/organization', { method: 'PATCH', body: { name: form.name.trim(), type: form.type || null, currency: form.currency || null } }));
      setNotice({ ok: true, text: 'تم حفظ بيانات الجهة، وسُجّل التعديل في سجل التدقيق.' });
      loadLast();
    } catch (err) {
      setNotice({ ok: false, text: masterError(err) });
    } finally {
      setSaving(false);
    }
  }

  async function onFile(e) {
    const fl = e.target.files?.[0];
    e.target.value = '';
    if (!fl) return;
    if (!LOGO_TYPES.includes(fl.type)) return setNotice({ ok: false, text: 'الشعار يجب أن يكون صورة PNG أو JPG أو WEBP.' });
    if (fl.size > 512 * 1024) return setNotice({ ok: false, text: 'حجم الشعار يجب ألا يتجاوز 512 كيلوبايت.' });
    const body = new FormData();
    body.append('logo', fl);
    setLogoBusy(true);
    setNotice(null);
    try {
      setOrg(await api('/organization/logo', { method: 'POST', body }));
      setLogo(await fetchLogo());
      setNotice({ ok: true, text: 'تم تحديث شعار الجهة.' });
      loadLast();
    } catch (err) {
      setNotice({ ok: false, text: masterError(err) });
    } finally {
      setLogoBusy(false);
    }
  }

  async function removeLogo() {
    setLogoBusy(true);
    setNotice(null);
    try {
      setOrg(await api('/organization/logo', { method: 'DELETE' }));
      setLogo('');
      setNotice({ ok: true, text: 'تمت إزالة الشعار.' });
      loadLast();
    } catch (err) {
      setNotice({ ok: false, text: masterError(err) });
    } finally {
      setLogoBusy(false);
    }
  }

  const pickLang = (code) => {
    setLang(code);
    try { localStorage.setItem('ibram-lang', code); } catch (e) {}
    setLanguage(code);
  };

  if (!org) {
    return (
      <div className="sgen">
        <PageHead title="الإعدادات العامة" sub="بيانات الجهة وشعارها والتفضيلات العامة للنظام." />
        <p className={'users-msg' + (loadError ? ' is-err' : '')}>{loadError || 'جارٍ التحميل...'}</p>
      </div>
    );
  }

  return (
    <div className="sgen">
      <PageHead title="الإعدادات العامة" sub="بيانات الجهة وشعارها والتفضيلات العامة للنظام." />
      {!canEdit && <p className="users-msg">يمكنك الاطلاع فقط: تعديل هذه الإعدادات يتطلب صلاحية إدارة الإعدادات.</p>}
      {notice && <p className={'users-msg ' + (notice.ok ? 'is-ok' : 'is-err')} role={notice.ok ? 'status' : 'alert'}>{notice.text}</p>}

      <section className="vcard ssec">
        <header className="ssec__head"><span className="ssec__icon"><BuildingIcon size={24} /></span><div><h2>معلومات الجهة</h2><p>الاسم والنوع كما يظهران في النظام والمراسلات.</p></div><span className="ssec__no">القسم 01</span></header>
        <div className="ssec__cols">
          <div className="sf">
            <h3>اسم الجهة</h3>
            <p>الاسم الرسمي كما يظهر للمستخدمين وفي المستندات الصادرة من النظام.</p>
            <div className={'sname sname--edit' + (nameError ? ' is-bad' : '')}>
              <input value={form.name} onChange={(e) => set('name')(e.target.value)} maxLength={255} readOnly={!canEdit} aria-label="اسم الجهة" />
              <ShieldCheckIcon size={20} />
            </div>
            {nameError && <small className="sf__err" role="alert">{nameError}</small>}
            <div className="sfields">
              <div>
                <h4>نوع الجهة</h4>
                <Choice value={form.type} options={ORG_TYPES} onChange={set('type')} label="نوع الجهة" disabled={!canEdit} />
              </div>
              <div>
                <h4>رمز الجهة</h4>
                <div className="sname sname--ro"><input readOnly value={org.code || '—'} dir="ltr" aria-label="رمز الجهة" /></div>
                <small>الرمز ثابت ولا يُعدَّل.</small>
              </div>
            </div>
          </div>
          <div className="sf">
            <h3>شعار الجهة</h3>
            <p>يظهر في صفحة الإعدادات ويمكن استخدامه في المستندات الصادرة.</p>
            <div className="slogo">
              <div className="slogo__box">
                {logo ? <img src={logo} alt="شعار الجهة" /> : <div className="slogo__none"><BuildingIcon size={36} /><span>لا يوجد شعار</span></div>}
              </div>
              <div className="slogo__side">
                <p><InfoCircleIcon size={14} />الصيغ المدعومة: PNG أو JPG أو WEBP، بحجم أقصى 512 كيلوبايت. يُفضّل 512×512 بكسل بخلفية شفافة.</p>
                {canEdit && (
                  <div className="slogo__btns">
                    <button type="button" className="slogo__up" onClick={() => file.current?.click()} disabled={logoBusy}>
                      <CloudUploadIcon size={16} />{logoBusy ? 'جارٍ الرفع...' : org.has_logo ? 'تغيير الشعار' : 'رفع شعار'}
                    </button>
                    {org.has_logo && <button type="button" className="slogo__rm" onClick={removeLogo} disabled={logoBusy}><TrashIcon size={16} />إزالة</button>}
                    <input ref={file} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={onFile} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="vcard ssec">
        <header className="ssec__head"><span className="ssec__icon"><GlobeIcon2 size={24} /></span><div><h2>التفضيلات العامة</h2><p>العملة المعتمدة ولغة الواجهة.</p></div><span className="ssec__no">القسم 02</span></header>
        <div className="sprefs sprefs--two">
          <div className="spref">
            <div className="spref__h"><b><BankIcon size={18} />العملة المعتمدة</b><em dir="ltr">{form.currency || '—'}</em></div>
            <p>العملة التي تُعرض بها المبالغ والتكاليف التقديرية في طلبات الشراء.</p>
            <Choice value={form.currency} options={CURRENCIES} onChange={set('currency')} label="العملة" disabled={!canEdit} />
            <small>تنطبق على كل مستخدمي الجهة.</small>
          </div>
          <div className="spref">
            <div className="spref__h"><b><TranslateIcon size={18} />لغة الواجهة</b></div>
            <p>لغة عرض لوحة الإدارة على هذا المتصفح.</p>
            <Choice value={lang} options={[['ar', 'العربية'], ['en', 'English']]} onChange={pickLang} label="لغة الواجهة" />
            <small>تفضيل شخصي يُحفظ على جهازك فقط، ولا يغيّر لغة باقي المستخدمين.</small>
          </div>
        </div>
      </section>

      <section className="shub2__audit">
        <span className="shub2__auditicon"><ClockHistoryIcon size={20} /></span>
        <div>
          <strong>آخر تعديل على بيانات الجهة</strong>
          <p>
            {last === undefined ? 'جارٍ التحميل...' : last ? <>{last.user?.name || 'النظام'} · {dateTime(last.created_at)}</> : 'لم تُعدَّل بيانات الجهة بعد'}
          </p>
        </div>
        <button type="button" className="btn-outline" onClick={() => nav('/audit-log')}>عرض سجل التدقيق</button>
      </section>

      {dirty && canEdit && (
        <div className="uroles__bar" role="region" aria-label="حفظ التغييرات">
          <span>لم تُحفظ التغييرات بعد</span>
          <button type="button" className="btn-outline" onClick={() => fill(org)} disabled={saving}>تراجع</button>
          <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التغييرات'}</button>
        </div>
      )}
    </div>
  );
}

// ---------- المشتريات وسير العمل ----------
const STAGES = [
  { n: 1, t: 'إنشاء طلب الشراء', b: 'مكتمل آليا', dark: true, d: 'الجهة الطالبة / موظف المشتريات. التحقق الأولي من اكتمال المواصفات وتحديد التصنيف المناسب وضمان وضوح نطاق العمل.', sla: 'SLA: 24 ساعة كحد أقصى', c: [['الجهة المسؤولة: الإدارة الطالبة / مدخل البيانات', <BuildingIcon size={14} />], ['نقطة التحقق: مصفوفة التصنيف الموحد (UNSPSC)', <ClipboardListIcon size={14} />]] },
  { n: 2, t: 'مراجعة واعتماد الطلب', b: 'مستوى إشرافي', d: 'مدير الإدارة الطالبة والمشرف المباشر. مراجعة الجدوى التشغيلية وتوافق الاحتياج مع الخطة السنوية للجهة قبل التصعيد المالي.', sla: 'SLA: 48 ساعة', c: [['الجهة المسؤولة: مدير الإدارة المختصة (Level 1)', <SmallUserIcon size={14} />], ['المصادقة: توقيع رقمي معتمد', <ShieldCheckIcon size={14} />]] },
  { n: 3, t: 'التحقق من الموازنة وتوفر البند المالي', b: 'رقابة مالية إلزامية', d: 'الإدارة المالية والميزانية. التحقق من مطابقة التكاليف التقديرية وتخصيص البند وحجز المخصص المالي السيادي قبل الطرح.', sla: 'SLA: 24 ساعة', c: [['الجهة المسؤولة: الرقابة المالية وإدارة الموازنة', <BankIcon size={14} />], ['الحجز المالي: ارتباط آلي بنظام الخزينة', <LockIcon size={14} />]] },
  { n: 4, t: 'إدارة طلبات عروض الأسعار واستلام العروض', b: 'سلاسل الإمداد', d: 'مسؤولو المشتريات وسلاسل الإمداد. توجيه الدعوات واستلام العروض الفنية والمالية المشفرة والمغلقة عبر المنصة المعتمدة.', sla: 'SLA: 3 - 5 أيام عمل', c: [['الجهة المسؤولة: قسم المشتريات والمنافسات', <DocIcon size={14} />], ['آلية التشفير: مظاريف مغلقة رقمياً', <LockIcon size={14} />]] },
];
export function SettingsProcurement() {
  const nav = useNavigate();
  return (
    <div className="sproc">
      <PageHead title="المشتريات وسير العمل" sub="إدارة إعدادات المشتريات ومراجعة مراحل الطلبات والاعتمادات وفق القواعد المعتمدة للجهة." tag={<span className="stag">حاكمية إجرائية<i /></span>} inline>
        <div className="sprod sprod--ver"><span className="sprod__icon"><ShieldCheckIcon size={20} /></span><div><strong dir="ltr">SYS-PROC-CONF-V1.8</strong><small>سيادي موحد · تدقيق نشط</small></div></div>
      </PageHead>
      <section className="sban">
        <span className="sban__icon"><LockOpenIcon size={22} /></span>
        <div><strong>إعدادات سير العمل غير مهيأة للتعديل</strong><p>يتم تحديد مراحل سير العمل وقواعد الاعتماد تلقائياً وفق المتطلبات المعتمدة للنظام والمسار السيادي المعياري لضمان الشفافية والامتثال المالي الموحد.</p></div>
        <button type="button" className="sban__btn" onClick={() => nav('/audit-log')}>سجل الاعتماد التنظيمي<ShieldCheckIcon size={14} /></button>
      </section>
      <section className="vcard spath">
        <header className="spath__head"><div><h2>المسار المعياري المعتمد لدورة المشتريات</h2><p>تسلسل إلزامي خاضع للرقابة الإدارية والمالية الشاملة</p></div><span className="spath__tot">إجمالي المراحل: <b>6 محطات نظامية</b></span></header>
        <ol className="spath__list">
          {STAGES.map((s) => (
            <li key={s.n}>
              <span className="spath__n">{s.n}</span>
              <div className="spstage">
                <div className="spstage__top"><strong>{s.t}</strong><em className={s.dark ? 'is-dark' : ''}>{s.b}</em><small>{s.sla}</small></div>
                <p>{s.d}</p>
                <div className="spstage__chips">{s.c.map(([t, ic]) => <span key={t}>{ic}{t}</span>)}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

// ---------- إعدادات الإشعارات ----------
const NOTIFS = [
  { k: 'approvals', icon: <ClipboardCheckIcon size={24} />, t: 'الموافقات والإجراءات المطلوبة', tag: 'مستوى التدقيق والاعتماد', who: 'إلزامي للمعتمدين', d: 'إشعارات فورية عند وجود طلب شراء أو اعتماد يتطلب مراجعة المستخدم أو اتخاذ إجراء تنفيذي منه ضمن سلسلة الصلاحيات.' },
  { k: 'returns', icon: <ClipboardListIcon size={24} />, t: 'إرجاع الطلبات والتعليقات', tag: 'التواصل وسير العمل', who: 'حسب دور المستخدم', d: 'إشعارات عند إرجاع طلب للشراء لإعادة الاستيفاء أو إضافة تعليق وملاحظات تدقيق في أو مالي مرتبطة به.' },
  { k: 'rfq', icon: <FileTextIcon size={24} />, t: 'طلبات عروض الأسعار', tag: 'سلاسل الإمداد والتوريد', who: 'مسؤولو المشتريات والتسعير', d: 'إشعارات مرتبطة بإجراءات طلبات عروض الأسعار (RFQ)، إصدار الدعوات وتحديثات مهل تقديم العروض للموردين المعنيين.' },
  { k: 'opening', icon: <FolderOpenIcon size={24} />, t: 'استلام العروض وفتحها', tag: 'اللجان المعتمدة فقط', who: 'لجان المشتريات والمظاريف', d: 'إشعارات مرتبطة بمراحل استلام العروض الفنية والمالية، إغلاق المظاريف، وتحديد جلسات فتح المظاريف (أعضاء لجان الفتح والمخولين فقط).' },
  { k: 'system', icon: <MegaphoneIcon size={24} />, t: 'التحديثات العامة للنظام', tag: 'إعلانات تشغيلية', who: 'كافة المستخدمين', d: 'إشعارات تشغيلية عامة حول صيانة النظام، تحديث لوائح المشتريات التنظيمية، وإعلانات إدارة المنصة.' },
];
export function SettingsNotifications() {
  const nav = useNavigate();
  const [v, setV] = useState({ ...settings.notif });
  const save = () => { settings.notif = { ...v }; nav('/settings'); };
  const cancel = () => { setV({ ...settings.notif }); nav('/settings'); };
  return (
    <div className="snot">
      <PageHead title="إعدادات الإشعارات" sub="إدارة تفضيلات الإشعارات المرتبطة بإجراءات المشتريات وسير العمل في النظام وحوكمة تدفق التنبيهات المعتمدة." tag={<span className="stag stag--blue">تحديث تلقائي للملف الشخصي<ClockIcon size={14} /></span>} />
      <section className="snot__ban"><span className="sban__icon"><ShieldCheckIcon size={22} /></span><div><strong>ملاحظة حوكمية وإشعار الصلاحيات المعتمدة</strong><p>تقتصر الإشعارات المعروضة على المراحل والصلاحيات الممنوحة لحسابك الإداري وفق مصفوفة الأدوار المعتمدة. لن يتم إرسال تنبيهات لإجراءات تقع خارج نطاق اختصاصك الوظيفي، وتُطبّق سياسات التدقيق الآلي والسرية على كافة الرسائل المرسلة من منصة إبرام.</p></div></section>
      <section className="vcard snot__card">
        <header><div><h2>فئات إشعارات سلسلة الإمداد وسير العمل</h2><p>حدد الإشعارات التي ترغب بتلقيها أثناء إدارة عمليات الشراء والمنافسات</p></div><span className="snot__tot">إجمالي الفئات المؤهلة: <b>5 فئات معتمدة</b></span></header>
        <ul>
          {NOTIFS.map((n) => (
            <li key={n.k}>
              <span className="snot__ic">{n.icon}</span>
              <div className="snot__body">
                <div className="snot__t"><strong>{n.t}</strong><em>{n.tag}</em><span><i />{n.who}</span></div>
                <p>{n.d}</p>
              </div>
              <div className="snot__sw">
                <b>{v[n.k] ? 'مفعّل' : 'غير مفعّل'}</b>
                <button type="button" role="switch" aria-checked={v[n.k]} aria-label={n.t} className={'sw' + (v[n.k] ? ' is-on' : '')} onClick={() => setV((p) => ({ ...p, [n.k]: !p[n.k] }))}><i /></button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="snot__foot">
        <button type="button" className="btn-outline" onClick={cancel}>إلغاء</button>
        <button type="button" className="btn-primary" onClick={save}>حفظ و إعتماد التغييرات</button>
      </div>
    </div>
  );
}
