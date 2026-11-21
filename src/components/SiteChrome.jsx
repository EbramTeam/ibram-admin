import { Link } from 'react-router-dom';
import LangButton from './LangButton.jsx';
import { MailIcon, PinIcon } from './Icons.jsx';

// Header and footer of the public website, used by the terms & privacy page so it looks like the design.
// The site's own pages (home, about, features...) live on the public website: set VITE_SITE_URL to link to them.
// Without it, those links are left out instead of pointing nowhere.
const SITE_URL = (import.meta.env.VITE_SITE_URL || '').replace(/\/+$/, '');
const CONTACT_EMAIL = 'info@ibram.com';
const CONTACT_PLACE = 'فلسطين، غزة';

const SITE_LINKS = [
  ['الرئيسية', '/'],
  ['من نحن', '/#about'],
  ['المميزات', '/#features'],
  ['الباقات', '/#plans'],
  ['تواصل معنا', '/#contact'],
];

const siteHref = (path) => SITE_URL + path;

export function SiteHeader() {
  return (
    <header className="site-head">
      <div className="site-head__bar">
        <div className="site-head__inner">
          <span className="site-head__contact">
            <a href={'mailto:' + CONTACT_EMAIL}><MailIcon size={14} />{CONTACT_EMAIL}</a>
            <span><PinIcon size={14} />{CONTACT_PLACE}</span>
          </span>
        </div>
      </div>
      <div className="site-head__inner site-head__main">
        <a className="site-head__logo" href={SITE_URL || '/login'}>
          <img src="/assets/ibram-logo.png" alt="IBRAM" />
        </a>
        {SITE_URL && (
          <nav className="site-head__nav">
            {SITE_LINKS.map(([t, p], i) => (
              <a key={p} href={siteHref(p)} className={i === 0 ? 'is-on' : ''}>{t}</a>
            ))}
          </nav>
        )}
        <div className="site-head__tools">
          <LangButton size={13} />
          <Link to="/login" className="site-head__cta">ابدأ الآن</Link>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-foot">
      <div className="site-foot__inner">
        <div className="site-foot__about">
          <img src="/assets/ibram-logo.png" alt="IBRAM" />
          <p>منصة إبرام لإدارة المشتريات، تأسست لتطوير تجربة المشتريات الرقمية، ونسعى لتبسيط الإجراءات وتعزيز الكفاءة والشفافية من خلال حلول ذكية ومتكاملة.</p>
        </div>
        {SITE_URL && (
          <div className="site-foot__col">
            <h3>روابط سريعة</h3>
            <ul>
              {SITE_LINKS.map(([t, p]) => (
                <li key={p}><a href={siteHref(p)}>« {t}</a></li>
              ))}
            </ul>
          </div>
        )}
        <div className="site-foot__col">
          <h3>تواصل معنا</h3>
          <ul>
            <li><a href={'mailto:' + CONTACT_EMAIL}><MailIcon size={15} />{CONTACT_EMAIL}</a></li>
            <li><span><PinIcon size={15} />{CONTACT_PLACE}</span></li>
          </ul>
        </div>
      </div>
      <div className="site-foot__bottom">
        <div className="site-foot__inner site-foot__bar">
          <span>© جميع الحقوق محفوظة <b>IBRAM</b> {year}</span>
          <span className="site-foot__legal">
            <a href="#privacy">سياسة الخصوصية</a>
            <a href="#terms">شروط الاستخدام</a>
          </span>
          <button type="button" className="site-foot__top" aria-label="العودة للأعلى" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 12l5-5 5 5M7 18l5-5 5 5" />
            </svg>
          </button>
        </div>
      </div>
    </footer>
  );
}
