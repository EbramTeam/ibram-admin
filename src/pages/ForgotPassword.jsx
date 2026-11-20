import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout, { AuthHero, Field, SecureFooterNote } from '../components/AuthLayout.jsx';
import { ShieldCheckIcon } from '../components/Icons.jsx';
import { api, errorText } from '../lib/api.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// "استعادة كلمة المرور" — two states in the design: without and with the security note.
export default function ForgotPassword() {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [sent, setSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const bad = submitted && !EMAIL.test(value.trim());

  // POST /api/forgot-password always answers the same, so nobody can tell which emails exist
  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!EMAIL.test(value.trim())) return;
    setBusy(true);
    try {
      await api('/forgot-password', { method: 'POST', body: { email: value.trim() }, auth: false });
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    // the design shows "© 2025" in the state without the security note and "© 2026" with it
    <AuthLayout year={sent ? 2026 : 2025}>
      <div className="auth-content">
        <AuthHero
          pill="نظام إدارة المشتريات والعقود الذكي"
          title="استعادة كلمة المرور"
          subtitle="أدخل البريد الإلكتروني المسجل في المنظومة، وسنرسل لك رابطاً وتعليمات آمنة لإعادة تعيين كلمة المرور."
          wide
        />
        <form className="auth-card" onSubmit={onSubmit} noValidate>
          {error && <p className="auth-alert" role="alert">{error}</p>}
          <div className="auth-fields">
            <Field
              name="identifier"
              label="البريد الإلكتروني"
              required
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={value}
              onChange={setValue}
              invalid={bad}
              error={bad ? 'يرجى إدخال بريد إلكتروني صحيح' : ''}
            />
          </div>
          {sent && (
            <div className="info-bar">
              <ShieldCheckIcon size={16} className="info-bar__icon" />
              <p>
                <strong>ملاحظة أمنية:</strong> سيتم إرسال رابط التعيين فقط إلى العناوين المعتمدة مسبقاً في سجلات جهتك الحكومية أو المنشأة.
              </p>
            </div>
          )}
          <button type="submit" className="btn-primary btn-primary--lg" disabled={busy}>
            {busy ? 'جارٍ الإرسال...' : 'ارسال رابط الإستعادة'}
          </button>
          <button type="button" className="btn-outline btn-outline--lg" onClick={() => navigate('/login')}>
            العودة لتسجيل الدخول
          </button>
        </form>
        <SecureFooterNote />
      </div>
    </AuthLayout>
  );
}
