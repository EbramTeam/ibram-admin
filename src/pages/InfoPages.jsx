import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout, { AuthHero, Field, SecureFooterNote } from '../components/AuthLayout.jsx';
import { api, errorText, ApiError } from '../lib/api.js';
import {
  ShieldLockIcon, ShieldCheckIcon, KeyLockIcon, UserCheckIcon, LogsIcon, FingerprintIcon,
  BuildingIcon, HeadsetIcon, InfoCircleIcon, WarnIcon, ClockHistoryIcon,
} from '../components/Icons.jsx';
import { LockOpenIcon } from '../components/MIcons.jsx';

// Public pages linked from the login footer: technical support, privacy and cyber compliance.
// Everything said here describes what the system actually does; nothing is promised that the code doesn't do.

function InfoShell({ title, subtitle, children }) {
  return (
    <AuthLayout>
      <div className="auth-content infopage">
        <AuthHero pill="نظام إدارة المشتريات والعقود" title={title} subtitle={subtitle} wide />
        {children}
        <div className="infopage__back">
          <Link to="/login" className="btn-outline btn-outline--lg">العودة لتسجيل الدخول</Link>
        </div>
        <SecureFooterNote />
      </div>
    </AuthLayout>
  );
}

function Section({ icon, title, children }) {
  return (
    <section className="infocard">
      <h2 className="infocard__title">
        <span className="infocard__icon">{icon}</span>
        {title}
      </h2>
      <div className="infocard__body">{children}</div>
    </section>
  );
}

function Points({ items }) {
  return (
    <ul className="infolist">
      {items.map(([icon, title, text]) => (
        <li key={title}>
          <span className="infolist__icon">{icon}</span>
          <div>
            <strong>{title}</strong>
            <p>{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------- technical support ---------- */

const FAQ = [
  ['نسيت كلمة المرور', <>استخدم صفحة <Link to="/forgot-password">استعادة كلمة المرور</Link> وأدخل بريدك المسجل. إذا لم يصلك الرابط، اطلب من مسؤول النظام في جهتك إصدار كلمة مرور مؤقتة لك.</>],
  ['أول دخول للنظام', 'يُطلب منك عند أول دخول بكلمة مرور مؤقتة تعيين كلمة مرور جديدة خاصة بك (8 أحرف على الأقل) قبل استخدام النظام.'],
  ['الحساب معطّل أو لا يسمح بالدخول', 'الحسابات المعطّلة لا يمكنها الدخول. تواصل مع مسؤول النظام في جهتك لمراجعة حالة الحساب وإعادة تفعيله.'],
  ['لا أرى صفحة أو إجراءً أحتاجه', 'ما يظهر لك يعتمد على الأدوار والصلاحيات المسندة لحسابك. اطلب من مسؤول النظام مراجعة أدوارك.'],
  ['تم إيقاف الدخول مؤقتاً بعد محاولات خاطئة', 'يحدّ النظام من محاولات الدخول المتتالية لحماية الحساب. انتظر قليلاً ثم حاول مجدداً، أو استعد كلمة المرور.'],
];

export function Support() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(0);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const bad = {
    name: !form.name.trim(),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim()),
    message: form.message.trim().length < 10,
  };

  async function onSubmit(e) {
    e.preventDefault();
    setTried(true);
    setError('');
    if (Object.values(bad).some(Boolean)) return;
    setBusy(true);
    try {
      await api('/contact-messages', { method: 'POST', body: form });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setError('استقبال رسائل الدعم غير مفعّل على هذه النسخة من النظام. تواصل مع مسؤول النظام في جهتك مباشرة.');
      else if (err instanceof ApiError && err.status === 429) setError('أرسلت عدة رسائل خلال وقت قصير. انتظر دقيقة ثم حاول مجدداً.');
      else if (err instanceof ApiError && err.status === 422) setError('تحقق من البيانات المدخلة ثم أعد المحاولة.');
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <InfoShell title="الدعم الفني" subtitle="إجابات سريعة لأكثر المشكلات شيوعاً، ونموذج لإرسال طلب دعم لفريق إدارة النظام.">
      <Section icon={<InfoCircleIcon size={20} />} title="أسئلة شائعة">
        <div className="faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={'faq__item' + (open === i ? ' is-open' : '')}>
              <button type="button" className="faq__q" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {q}
                <span className="faq__sign" aria-hidden="true">{open === i ? '−' : '+'}</span>
              </button>
              {open === i && <p className="faq__a">{a}</p>}
            </div>
          ))}
        </div>
      </Section>

      <Section icon={<HeadsetIcon size={20} />} title="إرسال طلب دعم">
        {sent ? (
          <div className="infosent" role="status">
            <ShieldCheckIcon size={28} />
            <strong>تم استلام رسالتك</strong>
            <p>سيراجعها فريق إدارة النظام ويتواصل معك على البريد الذي أدخلته.</p>
            <button type="button" className="btn-outline" onClick={() => { setSent(false); setTried(false); setForm({ name: '', email: '', message: '', website: '' }); }}>
              إرسال رسالة أخرى
            </button>
          </div>
        ) : (
          <form className="infoform" onSubmit={onSubmit} noValidate>
            {error && <p className="auth-alert" role="alert">{error}</p>}
            <div className="infoform__row">
              <Field name="name" label="الاسم" required value={form.name} onChange={set('name')} placeholder="الاسم الكامل" invalid={tried && bad.name} error={tried && bad.name ? 'أدخل اسمك' : ''} />
              <Field name="email" label="البريد الإلكتروني" required type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="name@example.com" invalid={tried && bad.email} error={tried && bad.email ? 'أدخل بريداً إلكترونياً صحيحاً' : ''} />
            </div>
            <div className="field">
              <label className="field__label" htmlFor="message"><span className="field__req">*</span>وصف المشكلة</label>
              <textarea
                id="message"
                className={'field__input infoform__area' + (tried && bad.message ? ' is-invalid' : '')}
                value={form.message}
                maxLength={3000}
                onChange={(e) => set('message')(e.target.value)}
                placeholder="اشرح ما حدث، والصفحة التي كنت تستخدمها، ورسالة الخطأ إن وُجدت. لا تكتب كلمة المرور."
              />
              {tried && bad.message && <small className="field__err" role="alert">اكتب وصفاً لا يقل عن 10 أحرف</small>}
            </div>
            {/* hidden from people; bots fill it and get rejected */}
            <input className="infoform__trap" tabIndex={-1} autoComplete="off" aria-hidden="true" value={form.website} onChange={(e) => set('website')(e.target.value)} name="website" />
            <div className="info-bar">
              <WarnIcon size={16} className="info-bar__icon" />
              <p>لن يطلب منك فريق الدعم كلمة المرور أبداً، ولا ترسلها في أي رسالة.</p>
            </div>
            <button type="submit" className="btn-primary btn-primary--lg" disabled={busy}>
              {busy ? 'جارٍ الإرسال...' : 'إرسال طلب الدعم'}
            </button>
          </form>
        )}
      </Section>
    </InfoShell>
  );
}

/* ---------- terms of use, privacy and copyright (text from the design) ---------- */

const LEGAL = [
  {
    title: 'شروط الاستخدام',
    intro: 'مرحبًا بك في منصة إبرام لإدارة المشتريات. باستخدامك للمنصة، فإنك توافق على الالتزام بشروط الاستخدام والأحكام الموضحة أدناه. يرجى قراءتها بعناية قبل استخدام خدماتنا.',
    parts: [
      ['استخدام المنصة', 'تتيح منصة إبرام للمؤسسات والشركات والجامعات والمستشفيات وغيرها من الجهات تنظيم وإدارة عمليات المشتريات إلكترونيًا، بما يشمل طلبات الشراء والاعتمادات وعروض الأسعار ومتابعة الإجراءات المرتبطة بها. يُلزم المستخدم باستخدام المنصة للأغراض المشروعة والمتوافقة مع الأنظمة المعمول بها، وعدم إساءة استخدامها أو محاولة الوصول غير المصرح به إلى بياناتها أو خدماتها.'],
      ['حقوق الملكية الفكرية', 'جميع المحتويات والعناصر الخاصة بمنصة إبرام، بما في ذلك النصوص والتصاميم والشعارات والأيقونات والواجهات والرسومات والمواد البرمجية، هي ملكية خاصة للمنصة أو لأصحاب الحقوق المعنيين، وتخضع لقوانين حماية الملكية الفكرية وحقوق النشر والعلامات التجارية.'],
      ['المسؤولية', 'تسعى منصة إبرام إلى توفير بيئة رقمية تساعد على تنظيم إجراءات المشتريات وتحسين كفاءة إدارتها، دون ضمان خلو المنصة من الأخطاء التقنية أو الانقطاعات. وتتحمل الجهة المستخدمة مسؤولية دقة البيانات والمعلومات التي تدخلها، وصحة الإجراءات والقرارات التي تتخذها بناءً عليها، وفقًا لصلاحياتها والأنظمة المعمول بها.'],
      ['التعديلات على شروط الاستخدام', 'تحتفظ منصة إبرام بالحق في تحديث شروط الاستخدام أو تعديلها عند الحاجة، وتُنشر التعديلات على هذه الصفحة، مع توضيح تاريخ سريانها عند الاقتضاء. ويُنصح المستخدمون بمراجعة الشروط بشكل دوري للاطلاع على أي تحديثات.'],
    ],
  },
  {
    title: 'سياسة الخصوصية',
    intro: 'تولي منصة إبرام أهمية كبيرة لخصوصية المستخدمين وسرية البيانات. توضح هذه السياسة أنواع المعلومات التي قد نجمعها، وكيفية استخدامها وحمايتها عند استخدام المنصة وخدماتها.',
    parts: [
      ['المعلومات التي نجمعها', 'قد تجمع المنصة المعلومات اللازمة لإنشاء الحسابات وإدارة المؤسسات والمستخدمين، مثل الاسم والبريد الإلكتروني وبيانات التواصل والمعلومات المتعلقة بالجهة المستخدمة، بالإضافة إلى البيانات المرتبطة بطلبات الشراء والاعتمادات وعروض الأسعار والإجراءات الإدارية التي تتم عبر المنصة.'],
      ['كيفية استخدام المعلومات', 'تُستخدم المعلومات التي يتم جمعها للأغراض التالية:', [
        'إنشاء الحسابات وإدارتها والتحقق من هوية المستخدمين.',
        'توفير خدمات إدارة المشتريات وتنظيم الإجراءات ومتابعة حالاتها.',
        'إرسال الإشعارات والتحديثات المتعلقة بالطلبات والمعاملات.',
        'تحسين أداء المنصة وتطوير خدماتها ومعالجة المشكلات التقنية.',
        'التواصل مع المستخدمين بشأن الدعم الفني والاستفسارات والتحديثات المهمة.',
      ]],
      ['حماية البيانات وسريتها', 'تعمل منصة إبرام على اتخاذ التدابير التقنية والتنظيمية المناسبة لحماية البيانات من الوصول غير المصرح به أو الاستخدام أو التعديل أو الإفصاح غير المشروع. كما يُتوقع من المستخدمين المحافظة على سرية بيانات الدخول الخاصة بهم، وعدم مشاركتها مع أشخاص غير مخولين.'],
      ['مشاركة المعلومات', 'لا تتم مشاركة البيانات الشخصية أو بيانات المؤسسات مع أطراف خارجية إلا عند الحاجة إلى تقديم الخدمات، أو بموافقة الجهة المعنية، أو عند وجود التزام قانوني يقتضي ذلك، وتُراعى صلاحيات الوصول المحددة لكل مستخدم، بما يتناسب مع دوره داخل الجهة التي يتبع لها.'],
      ['ملفات تعريف الارتباط', 'قد تستخدم المنصة ملفات تعريف الارتباط (Cookies) والتقنيات المشابهة لتحسين تجربة المستخدم، وتسهيل تسجيل الدخول، وتحليل استخدام الموقع عند الاقتضاء. ويمكن للمستخدم إدارة إعدادات ملفات تعريف الارتباط من خلال متصفحه، مع العلم أن تعطيل بعضها قد يؤثر في عمل بعض الخدمات.'],
      ['التعديلات على سياسة الخصوصية', 'تحتفظ منصة إبرام بالحق في تحديث سياسة الخصوصية بما يتناسب مع تطوير خدماتها أو التغييرات القانونية والتنظيمية، وسيتم نشر النسخة المحدثة على هذه الصفحة، ويُنصح المستخدمون بمراجعتها بشكل دوري.'],
    ],
  },
  {
    title: 'حقوق النشر',
    lines: [
      'جميع الحقوق المتعلقة بمنصة إبرام ومحتوياتها، بما في ذلك النصوص والتصاميم والشعارات والأيقونات والواجهات والرسومات والمواد البرمجية، محفوظة للمنصة أو لأصحاب الحقوق المعنيين.',
      'لا يجوز نسخ أي جزء من محتوى المنصة أو إعادة إنتاجه أو نشره أو تعديله أو توزيعه أو استخدامه لأغراض تجارية دون الحصول على إذن خطي مسبق من صاحب الحق، ما لم تسمح القوانين المعمول بها بخلاف ذلك.',
      'وتظل أسماء المنتجات والشعارات والعلامات التجارية الخاصة بالأطراف الأخرى ملكًا لأصحابها.',
      'إذا كان لديك استفسار يتعلق بشروط الاستخدام أو سياسة الخصوصية أو حقوق الملكية الفكرية، يمكنك التواصل مع فريق إبرام عبر قنوات التواصل الرسمية المعتمدة للمنصة.',
    ],
  },
];

export function Privacy() {
  return (
    <AuthLayout>
      <article className="legal">
        {LEGAL.map((doc) => (
          <section key={doc.title} className="legal__doc">
            <h1>{doc.title}</h1>
            {doc.intro && <p>{doc.intro}</p>}
            {doc.parts?.map(([title, text, list]) => (
              <div key={title} className="legal__part">
                <h2>{title}</h2>
                <p>{text}</p>
                {list && (
                  <ul>
                    {list.map((li) => (
                      <li key={li}>{li}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {doc.lines?.map((line) => (
              <p key={line} className="legal__line">{line}</p>
            ))}
          </section>
        ))}
        <div className="infopage__back">
          <Link to="/login" className="btn-outline btn-outline--lg">العودة لتسجيل الدخول</Link>
        </div>
      </article>
    </AuthLayout>
  );
}

/* ---------- cyber compliance ---------- */

export function CyberCompliance() {
  return (
    <InfoShell title="الامتثال السيبراني" subtitle="ضوابط الحماية المطبقة فعلياً في النظام لحماية الحسابات والبيانات.">
      <Section icon={<KeyLockIcon size={20} />} title="حماية الحسابات">
        <Points
          items={[
            [<KeyLockIcon size={18} />, 'كلمات مرور مشفّرة', 'لا تُحفظ كلمات المرور كنص؛ تُخزَّن بتشفير أحادي الاتجاه (hash) ولا يستطيع أحد قراءتها، بما في ذلك مسؤولو النظام.'],
            [<LockOpenIcon size={18} />, 'كلمة مرور مؤقتة لأول دخول', 'الحسابات الجديدة تبدأ بكلمة مرور مؤقتة، ويُلزم المستخدم بتغييرها (8 أحرف على الأقل) قبل استخدام النظام.'],
            [<ClockHistoryIcon size={18} />, 'الحد من محاولات الدخول', 'تُقيَّد محاولات الدخول وطلبات استعادة كلمة المرور المتكررة، وعند 5 محاولات فاشلة خلال 15 دقيقة يُنبَّه مسؤولو المستخدمين في الجهة.'],
            [<UserCheckIcon size={18} />, 'تعطيل الحسابات', 'الحساب المعطّل يُمنع من الدخول فوراً، وتُسجَّل محاولته في سجل التدقيق.'],
          ]}
        />
      </Section>
      <Section icon={<ShieldLockIcon size={20} />} title="الصلاحيات والرقابة">
        <Points
          items={[
            [<ShieldLockIcon size={18} />, 'صلاحيات حسب الدور', 'كل إجراء يتحقق منه الخادم بحسب صلاحيات أدوار المستخدم، والدور المعطّل لا يمنح أي صلاحية.'],
            [<BuildingIcon size={18} />, 'عزل بيانات الجهات', 'لا يستطيع مستخدم جهة الوصول إلى بيانات جهة أخرى.'],
            [<LogsIcon size={18} />, 'سجل تدقيق شامل', 'الدخول والخروج وتغيير كلمات المرور والأدوار والصلاحيات وتعديل البيانات كلها تُسجَّل مع المنفّذ والوقت وعنوان IP، ويمكن تصديرها.'],
          ]}
        />
      </Section>
      <Section icon={<FingerprintIcon size={20} />} title="حماية الملفات والاتصال">
        <Points
          items={[
            [<FingerprintIcon size={18} />, 'ضوابط المرفقات', 'لا تُقبل إلا أنواع محددة من الملفات (مستندات PDF والصور وملفات وورد وإكسل) بحجم أقصى 10 ميغابايت، وتُحفظ في مخزن خاص لا يُنزَّل منه إلا لمن يملك الصلاحية.'],
            [<ShieldCheckIcon size={18} />, 'اتصال مشفّر', 'يتم الوصول إلى النظام عبر اتصال HTTPS مشفّر بين المتصفح والخادم.'],
          ]}
        />
      </Section>
      <p className="infopage__note">
        للإبلاغ عن ثغرة أو نشاط مريب، استخدم صفحة <Link to="/support">الدعم الفني</Link> أو تواصل مع مسؤول النظام في جهتك.
      </p>
    </InfoShell>
  );
}
