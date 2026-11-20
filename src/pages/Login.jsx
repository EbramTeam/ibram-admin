import { Link } from 'react-router-dom';
import useLoginForm from './useLoginForm.js';
import AuthLayout, { AuthHero, Field, Check } from '../components/AuthLayout.jsx';
import { ShieldLockIcon } from '../components/Icons.jsx';

// Admin portal login (design: "Login", Figma node 713:307)
export default function Login() {
  const f = useLoginForm();

  return (
    <AuthLayout>
      <div className="auth-content">
        <AuthHero
          pill="بوابة مدير النظام (System Administrator)"
          title="تسجيل الدخول إلى لوحة تحكم المنظومة"
          subtitle="نظام إبرام الموحد لإدارة المشتريات والمنافسات الحكومية. يرجى إدخال بيانات الاعتماد المخصصة للرقابة والتشغيل."
          wide
        />
        <form className="auth-card" onSubmit={f.onSubmit} noValidate>
          {f.error && <p className="auth-alert" role="alert">{f.error}</p>}
          <div className="auth-fields auth-fields--login">
            <Field
              name="email"
              label="البريد الإلكتروني"
              required
              type="email"
              autoComplete="username"
              placeholder="name@example.com"
              value={f.email}
              onChange={f.setEmail}
              invalid={f.emailBad}
              error={f.emailBad ? 'يرجى إدخال بريد إلكتروني صحيح' : ''}
            />
            <Field
              name="password"
              label="كلمة المرور"
              required
              type="password"
              autoComplete="current-password"
              placeholder="ادخل كلمة المرور"
              value={f.password}
              onChange={f.setPassword}
              invalid={f.passBad}
            />
          </div>
          <div className="auth-options">
            <Check checked={f.remember} onChange={f.setRemember}>
              تذكرني
            </Check>
            <Link to="/forgot-password" className="auth-link">
              هل نسيت كلمة المرور؟
            </Link>
          </div>
          <button type="submit" className="btn-primary btn-primary--lg" disabled={f.busy}>
            {f.busy ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
          </button>
          <div className="security-notice">
            <ShieldLockIcon size={14} className="security-notice__icon" />
            <div className="security-notice__body">
              <h2>إشعار أمني رقابي ملزم</h2>
              <p>
                هذه المنصة مخصصة حصرياً للمفوضين رسمياً بإدارة منظومة إبرام. كل عملية دخول أو محاولة مصادقة فاشلة يتم تدوينها ومطابقتها لحظياً مع السجل الجنائي الرقمي وضوابط الهيئة الوطنية للأمن السيبراني.
              </p>
            </div>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
}
