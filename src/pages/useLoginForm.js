import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth, ADMIN_PERMISSION } from '../auth.jsx';
import { ApiError, errorText } from '../lib/api.js';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Shared by the admin and employee login screens: POST /api/login, then go where the user belongs.
export default function useLoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, logout } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(location.state?.notAdmin ? 'هذه اللوحة مخصصة لمدير النظام فقط.' : '');

  const emailBad = submitted && !EMAIL.test(email.trim());
  const passBad = submitted && !password;

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (!EMAIL.test(email.trim()) || !password) return;
    setBusy(true);
    try {
      const user = await login(email.trim(), password, remember);
      if (user.must_change_password) {
        navigate('/first-login-password', { replace: true });
      } else if (!user.permissions?.includes(ADMIN_PERMISSION)) {
        await logout();
        setError('هذه اللوحة مخصصة لمدير النظام فقط. استخدم بوابة الموظفين لإدارة طلباتك.');
      } else {
        navigate(location.state?.from || '/', { replace: true });
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      else if (err instanceof ApiError && err.status === 403) setError('هذا الحساب معطل. تواصل مع مدير النظام.');
      else if (err instanceof ApiError && err.status === 422) setError('يرجى إدخال بريد إلكتروني صحيح');
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return { email, setEmail, password, setPassword, remember, setRemember, emailBad, passBad, busy, error, onSubmit };
}
