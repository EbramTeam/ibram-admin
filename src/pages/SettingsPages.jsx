import { useEffect, useRef, useState } from 'react';
import { api, errorText, getToken, API_URL } from '../lib/api.js';
import { useAuth } from '../auth.jsx';
import { dateTime } from '../lib/users.js';
import { useMaster, fmt, masterError } from '../masterStore.jsx';
import { DatabaseIcon, OrgChartIcon } from '../components/Icons.jsx';
import { CubeIcon } from '../components/MIcons.jsx';
import { eventLabel, subjectLabel } from '../auditData.js';
import { useNavigate } from 'react-router-dom';
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
// The stages are the real workflow enforced by the server. Who does each stage comes live from the roles
// (whoever holds the permission), and the counts are live purchase requests / RFQs at that stage.
const STAGES = [
  { n: 1, icon: <FileTextIcon size={18} />, t: 'إنشاء طلب الشراء وإرساله', perm: ['purchase_requests.create'],
    d: 'تنشئ الإدارة الطالبة الطلب كمسودة بالأصناف والكميات والتكلفة التقديرية، ثم ترسله للمراجعة. الطلب المُعاد للاستكمال يرجع لهذه المرحلة.',
    status: ['needs_revision'], countLabel: 'بحاجة لاستكمال' },
  { n: 2, icon: <ClipboardCheckIcon size={18} />, t: 'مراجعة مدير الإدارة', perm: ['purchase_requests.review'],
    d: 'يراجع مدير الإدارة الطالبة الطلب: يوافق عليه فيُحال للاعتماد، أو يعيده للاستكمال مع ملاحظات، أو يرفضه.',
    status: ['submitted', 'under_review'], countLabel: 'بانتظار المراجعة' },
  { n: 3, icon: <BankIcon size={18} />, t: 'التحقق المالي من توفر المخصصات', perm: ['budget.verify'],
    d: 'تتحقق المالية من توفر المخصص للطلب وتسجّل نتيجة التحقق. يتم ذلك أثناء المراجعة أو قبل الاعتماد النهائي.', parallel: true },
  { n: 4, icon: <ShieldCheckIcon size={18} />, t: 'الاعتماد النهائي للطلب', perm: ['purchase_requests.approve'],
    d: 'تعتمد الجهة المخوّلة الطلب نهائياً أو ترفضه. الطلب المعتمد يصبح جاهزاً لطلب عروض الأسعار.',
    status: ['pending_approval'], countLabel: 'بانتظار الاعتماد' },
  { n: 5, icon: <MegaphoneIcon size={18} />, t: 'طلب عروض الأسعار وإرساله للموردين', perm: ['rfqs.manage'],
    d: 'تُنشئ المشتريات طلب عروض أسعار (RFQ) من الطلب المعتمد، وتختار الموردين وترسله لهم وتحدد موعد استلام العروض.',
    rfq: ['draft', 'ready_to_send', 'sent', 'awaiting_quotations'], countLabel: 'طلب عروض مفتوح' },
  { n: 6, icon: <FolderOpenIcon size={18} />, t: 'استلام العروض وفتح المظاريف', perm: ['quotations.manage', 'bid_opening.manage'], approve: 'bid_opening.approve',
    d: 'تُسجَّل عروض الموردين، ثم تفتحها لجنة فتح المظاريف في جلسة رسمية وتحرر محضراً يُرفع للاعتماد.' },
  { n: 7, icon: <GavelIcon size={18} />, t: 'مقارنة العروض والتوصية', perm: ['quotations.compare'],
    d: 'تُقارن العروض المطابقة فنياً ومالياً، وتُسجَّل التوصية بالمورد الأنسب مع مبرراتها.' },
];

async function countOf(path) {
  try {
    return (await api(path)).total ?? 0;
  } catch {
    return null;
  }
}

export function SettingsProcurement() {
  const nav = useNavigate();
  const [roles, setRoles] = useState(null);
  const [counts, setCounts] = useState({});

  useEffect(() => {
    api('/roles').then((r) => setRoles(r.data.filter((x) => x.is_active !== false))).catch(() => setRoles([]));
    STAGES.forEach((st) => {
      const paths = st.status ? st.status.map((x) => `/purchase-requests?status=${x}`) : st.rfq ? st.rfq.map((x) => `/rfqs?status=${x}`) : null;
      if (!paths) return;
      Promise.all(paths.map(countOf)).then((ns) => setCounts((c) => ({ ...c, [st.n]: ns.some((v) => v === null) ? null : ns.reduce((a, v) => a + v, 0) })));
    });
  }, []);

  // active roles that hold any of the given permissions (admin holds everything, so it is left out to keep the list useful)
  const holders = (perms) =>
    (roles || []).filter((r) => r.name !== 'admin' && r.permissions.some((p) => perms.includes(p.name))).map((r) => r.label || r.name);

  return (
    <div className="sproc">
      <PageHead title="المشتريات وسير العمل" sub="المراحل التي يمر بها طلب الشراء من إنشائه حتى التوصية بالمورد، ومن يتولى كل مرحلة." />
      <section className="sban">
        <span className="sban__icon"><LockOpenIcon size={22} /></span>
        <div>
          <strong>المراحل ثابتة، ومن يتولاها يُحدَّد بالأدوار</strong>
          <p>ترتيب المراحل يفرضه النظام ولا يُعدَّل من هنا. للتحكم بمن يقوم بكل مرحلة، عدّل صلاحيات الأدوار أو أسند الأدوار للمستخدمين.</p>
        </div>
        <button type="button" className="sban__btn" onClick={() => nav('/roles')}>إدارة الأدوار والصلاحيات<ShieldCheckIcon size={14} /></button>
      </section>
      <section className="vcard spath">
        <header className="spath__head">
          <div><h2>دورة المشتريات المعتمدة في النظام</h2><p>الأرقام تعرض ما هو موجود الآن في كل مرحلة</p></div>
          <span className="spath__tot">إجمالي المراحل: <b>{STAGES.length} مراحل</b></span>
        </header>
        <ol className="spath__list">
          {STAGES.map((st) => {
            const who = holders(st.perm);
            const approvers = st.approve ? holders([st.approve]) : [];
            const n = counts[st.n];
            return (
              <li key={st.n}>
                <span className="spath__n">{st.n}</span>
                <div className="spstage">
                  <div className="spstage__top">
                    <strong>{st.t}</strong>
                    {st.parallel && <em>بالتوازي مع المراجعة</em>}
                    {st.countLabel && (
                      <small className={'spstage__count' + (n ? ' is-on' : '')}>
                        {n === undefined ? '...' : n === null ? '—' : `${fmt(n)} ${st.countLabel}`}
                      </small>
                    )}
                  </div>
                  <p>{st.d}</p>
                  <div className="spstage__chips">
                    <span>
                      <SmallUserIcon size={14} />
                      {roles === null ? 'جارٍ التحميل...' : who.length ? 'يتولاها: ' + who.join('، ') : 'لا يوجد دور نشط بهذه الصلاحية غير مدير النظام'}
                    </span>
                    {approvers.length > 0 && <span><CertIcon size={14} />يعتمد المحضر: {approvers.join('، ')}</span>}
                    <span className="spstage__perm" dir="ltr">{st.perm.join(' · ')}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

// ---------- إعدادات الإشعارات ----------
// Personal preferences saved on the server: a muted category is not delivered to this user at all.
// Security alerts and changes to your own roles are always delivered.
const NOTIFS = [
  { k: 'requests', icon: <ClipboardCheckIcon size={24} />, t: 'طلبات الشراء والموافقات', who: 'المراجعون والمعتمدون والمشتريات',
    d: 'طلب شراء جديد بانتظار مراجعتك، أو طلب أُحيل لك للاعتماد، أو اعتماد طلب (لمقدّم الطلب ولمسؤولي طلبات العروض).' },
  { k: 'returns', icon: <ClipboardListIcon size={24} />, t: 'الإرجاع والرفض', who: 'مقدّمو الطلبات ومحررو المحاضر',
    d: 'إعادة طلبك أو محضر فتح العروض للتعديل مع الملاحظات، أو رفض طلب الشراء.' },
  { k: 'bid_opening', icon: <FolderOpenIcon size={24} />, t: 'محاضر فتح العروض', who: 'معتمدو المحاضر ومحرروها',
    d: 'محضر فتح عروض بانتظار اعتمادك، أو اعتماد محضر حررته.' },
  { k: 'administration', icon: <SettingsIcon size={24} />, t: 'أعمال الإدارة', who: 'مدراء المستخدمين والموردين والإعدادات',
    d: 'إضافة مستخدمين وتغيير أدوارهم وتعطيلهم، وتعديل الأدوار والموردين والبيانات الأساسية وبيانات الجهة من قِبل مدير آخر.' },
  { k: 'inbox', icon: <MegaphoneIcon size={24} />, t: 'طلبات التسجيل ورسائل التواصل', who: 'مدراء الإعدادات',
    d: 'طلبات تسجيل المنشآت الجديدة والرسائل الواردة من نموذج الدعم والتواصل.' },
];

export function SettingsNotifications() {
  const nav = useNavigate();
  const [saved, setSaved] = useState(null); // muted list on the server
  const [muted, setMuted] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    api('/notification-preferences')
      .then((r) => { setSaved(r.muted); setMuted(r.muted); })
      .catch((err) => setLoadError(errorText(err)));
  }, []);

  const on = (k) => !muted.includes(k);
  const flip = (k) => {
    setNotice(null);
    setMuted((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  };
  const dirty = saved && (saved.length !== muted.length || saved.some((k) => !muted.includes(k)));

  async function save() {
    setSaving(true);
    setNotice(null);
    try {
      const r = await api('/notification-preferences', { method: 'PUT', body: { muted } });
      setSaved(r.muted);
      setMuted(r.muted);
      setNotice({ ok: true, text: 'تم حفظ تفضيلات الإشعارات. تُطبَّق على الإشعارات الجديدة من الآن.' });
    } catch (err) {
      setNotice({ ok: false, text: masterError(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="snot">
      <PageHead title="إعدادات الإشعارات" sub="اختر الإشعارات التي تصلك داخل النظام. هذه التفضيلات خاصة بحسابك ولا تؤثر على باقي المستخدمين." />
      <section className="snot__ban">
        <span className="sban__icon"><ShieldCheckIcon size={22} /></span>
        <div>
          <strong>ما يصلك يعتمد أيضاً على صلاحياتك</strong>
          <p>لا يصلك إشعار عن مرحلة لا تملك صلاحيتها، ولا عن إجراء قمت به بنفسك. التنبيهات الأمنية (محاولات الدخول الفاشلة) وتغيير أدوار حسابك تصل دائماً ولا يمكن إيقافها.</p>
        </div>
      </section>
      {notice && <p className={'users-msg ' + (notice.ok ? 'is-ok' : 'is-err')} role={notice.ok ? 'status' : 'alert'}>{notice.text}</p>}
      <section className="vcard snot__card">
        <header>
          <div><h2>فئات الإشعارات</h2><p>أوقف الفئة التي لا تريد أن تصلك إشعاراتها</p></div>
          <span className="snot__tot">مفعّل: <b>{saved ? `${NOTIFS.length - muted.length} من ${NOTIFS.length}` : '—'}</b></span>
        </header>
        {!saved ? (
          <p className={'users-msg' + (loadError ? ' is-err' : '')}>{loadError || 'جارٍ التحميل...'}</p>
        ) : (
          <ul>
            {NOTIFS.map((n) => (
              <li key={n.k}>
                <span className="snot__ic">{n.icon}</span>
                <div className="snot__body">
                  <div className="snot__t"><strong>{n.t}</strong><span><i />{n.who}</span></div>
                  <p>{n.d}</p>
                </div>
                <div className="snot__sw">
                  <b>{on(n.k) ? 'مفعّل' : 'موقوف'}</b>
                  <button type="button" role="switch" aria-checked={on(n.k)} aria-label={n.t} className={'sw' + (on(n.k) ? ' is-on' : '')} onClick={() => flip(n.k)}><i /></button>
                </div>
              </li>
            ))}
            <li className="snot__always">
              <span className="snot__ic"><ShieldIcon size={24} /></span>
              <div className="snot__body">
                <div className="snot__t"><strong>التنبيهات الأمنية وتغيير أدوار حسابك</strong><span><i />الجميع</span></div>
                <p>5 محاولات دخول فاشلة على حساب في جهتك (لمدراء المستخدمين)، وتحديث أدوارك وصلاحياتك.</p>
              </div>
              <div className="snot__sw"><b>دائماً</b><span className="sw is-on is-locked" aria-hidden="true"><i /></span></div>
            </li>
          </ul>
        )}
      </section>
      <div className="snot__foot">
        <button type="button" className="btn-outline" onClick={() => nav('/settings')}>رجوع</button>
        <button type="button" className="btn-primary" onClick={save} disabled={!dirty || saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التفضيلات'}</button>
      </div>
    </div>
  );
}
