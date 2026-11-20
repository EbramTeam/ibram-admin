import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, api, errorText } from '../lib/api.js';
import AuthLayout, { AuthHero, Field } from '../components/AuthLayout.jsx';
import { RulesBox, MatchBar, evaluate } from '../components/PasswordRules.jsx';

// "إنشاء كلمة مرور جديدة" (opened from the reset link)
export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const email = params.get('email') || '';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token && email ? '' : 'رابط الاستعادة غير مكتمل. افتح الرابط من البريد الإلكتروني كما هو، أو اطلب رابطاً جديداً.');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const rules = evaluate(password, confirm);
  const valid = rules.length && rules.upper && rules.digit && rules.special && rules.match;

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (!valid || !token || !email) return;
    setError('');
    setBusy(true);
    try {
      // POST /api/reset-password: all sessions end, then sign in with the new password
      await api('/reset-password', {
        method: 'POST',
        body: { token, email, password, password_confirmation: confirm },
        auth: false,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) setError('انتهت صلاحية الرابط أو استُخدم من قبل. اطلب رابطاً جديداً من "هل نسيت كلمة المرور؟".');
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout>
      <div className="auth-content">
        <AuthHero
          pill="نظام إدارة المشتريات والعقود الذكي"
          title="إنشاء كلمة مرور جديدة"
          subtitle="يرجى تعيين كلمة مرور قوية ومطابقة للمعايير الأمنية للوصول إلى حسابك في المنظومة."
          wide
        />
        <form className="auth-card auth-card--tight" onSubmit={onSubmit} noValidate>
          {error && <p className="auth-alert" role="alert">{error}</p>}
          <Field
            name="new-password"
            label="كلمة المرور الجديدة"
            required
            tight
            type="password"
            placeholder="ادخل كلمة المرور"
            value={password}
            onChange={setPassword}
            invalid={submitted && !password}
          />
          <RulesBox rules={rules} />
          <Field
            name="confirm-password"
            label="تأكيد كلمة المرور"
            required
            type="password"
            placeholder="ادخل كلمة المرور"
            value={confirm}
            onChange={setConfirm}
            invalid={submitted && !rules.match}
          />
          <MatchBar matched={rules.match} />
          <button type="submit" className="btn-primary btn-primary--lg btn-gap-top" disabled={busy}>
            {busy ? 'جارٍ الحفظ...' : 'تحديث و حفظ كلمة المرور'}
          </button>
          <button type="button" className="btn-outline btn-outline--lg" onClick={() => navigate('/login')}>
            العودة إلى تسجيل الدخول
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
