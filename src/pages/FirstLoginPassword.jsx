import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { ApiError, api, errorText } from '../lib/api.js';
import AuthLayout, { AuthHero, Field } from '../components/AuthLayout.jsx';
import { RulesBox, MatchBar, evaluate } from '../components/PasswordRules.jsx';
import { ShieldLockIcon } from '../components/Icons.jsx';

// "إنشاء كلمة مرور جديدة" for the first session (temporary password)
export default function FirstLoginPassword() {
  const navigate = useNavigate();
  const { user, loading, reload, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [tempWrong, setTempWrong] = useState(false);
  const [temp, setTemp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const rules = evaluate(password, confirm);
  const valid = temp.trim() && rules.length && rules.upper && rules.digit && rules.special && rules.match;

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    setTempWrong(false);
    if (!valid) return;
    setBusy(true);
    try {
      // POST /api/me/password: the other sessions end, this one stays
      await api('/me/password', {
        method: 'POST',
        body: { current_password: temp, password, password_confirmation: confirm },
      });
      await reload();
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 422) {
        if (err.errors.current_password) setTempWrong(true);
        else if (err.errors.password) setError('كلمة المرور الجديدة غير مقبولة: يجب أن تختلف عن المؤقتة وأن تكون 8 خانات على الأقل');
        else setError(errorText(err));
      } else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (!loading && !user) return <Navigate to="/login" replace />;

  return (
    <AuthLayout>
      <div className="auth-content">
        <AuthHero
          pill="نظام إدارة المشتريات والعقود الذكي"
          title="إنشاء كلمة مرور جديدة"
          subtitle="لأمان حسابك، يجب تغيير كلمة المرور المؤقتة قبل المتابعة إلى بوابة العمليات."
          wide
        />
        <form className="auth-card auth-card--tight" onSubmit={onSubmit} noValidate>
          <div className="mandatory-notice">
            <ShieldLockIcon size={20} className="mandatory-notice__icon" />
            <div>
              <h2>إجراء أمني إلزامي للجلسة الأولى</h2>
              <p>تنتهي صلاحية كلمة المرور المؤقتة بعد التسجيل الأول. يجب تعيين كلمة مرور قوية تلبي الضوابط المؤسسية المعتمدة.</p>
            </div>
          </div>
          {error && <p className="auth-alert" role="alert">{error}</p>}
          <Field
            name="temp-password"
            label="أدخل كلمة المرور المؤقتة"
            required
            type="password"
            placeholder="ادخل كلمة المرور"
            autoComplete="current-password"
            value={temp}
            onChange={(v) => { setTemp(v); setTempWrong(false); }}
            invalid={(submitted && !temp.trim()) || tempWrong}
            error={tempWrong ? 'كلمة المرور المؤقتة غير صحيحة' : ''}
          />
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
            {busy ? 'جارٍ الحفظ...' : 'حفظ والمتابعة إلى المنظومة'}
          </button>
          <button type="button" className="btn-outline btn-outline--lg" onClick={signOut}>
            تسجيل الخروج والعودة لاحقا
          </button>
        </form>
      </div>
    </AuthLayout>
  );
}
