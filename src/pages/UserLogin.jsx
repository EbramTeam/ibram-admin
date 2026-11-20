import { Link } from 'react-router-dom';
import useLoginForm from './useLoginForm.js';
import AuthLayout, { AuthHero, Field, Check, SecureFooterNote } from '../components/AuthLayout.jsx';

// Employee login ("تسجيل الدخول" — procurement & smart contracts system)
export default function UserLogin() {
  const f = useLoginForm();

  return (
    <AuthLayout>
      <div className="auth-content">
        <AuthHero
          pill="نظام إدارة المشتريات والعقود الذكي"
          title="تسجيل الدخول"
          subtitle="سجّل الدخول للوصول إلى نظام إدارة المشتريات"
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
        </form>
        <SecureFooterNote />
      </div>
    </AuthLayout>
  );
}
