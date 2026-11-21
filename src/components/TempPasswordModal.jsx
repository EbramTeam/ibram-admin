import { useEffect, useState } from 'react';
import { CloseCircleIcon, KeyLockIcon, CopyIcon } from './Icons.jsx';

// Reset a user's password (POST /api/users/{id}/reset-password).
// The server answers with a temporary password that is shown ONCE here.
export default function TempPasswordModal({ user, onClose, onConfirm, password: given = '', title = 'إعادة تعيين كلمة المرور' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState(given);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, busy]);

  async function run() {
    setBusy(true);
    setError('');
    try {
      setPassword(await onConfirm());
    } catch (err) {
      setError(err.message || 'تعذّر تنفيذ الطلب');
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="pmodal vmodal" role="dialog" aria-modal="true" aria-labelledby="tpm-title">
        <header className="pmodal__head vmodal__head">
          <div className="vmodal__titlebox">
            <span className="vmodal__icon is-red"><KeyLockIcon size={24} /></span>
            <div>
              <h2 id="tpm-title">{title}</h2>
              <p>{user.name} · <bdi dir="ltr">{user.email}</bdi></p>
            </div>
          </div>
          <button type="button" className="pmodal__close" aria-label="إغلاق" onClick={onClose} disabled={busy}>
            <CloseCircleIcon size={26} />
          </button>
        </header>
        <div className="vmodal__body">
          {!password ? (
            <>
              <p className="vmodal__l1">سيتم إنشاء كلمة مرور مؤقتة جديدة لهذا المستخدم.</p>
              <p className="vmodal__l2">تنتهي كل جلساته المفتوحة فوراً، ويُطلب منه تغيير كلمة المرور عند أول دخول.</p>
            </>
          ) : (
            <>
              <p className="vmodal__l1">كلمة المرور المؤقتة (تظهر <b className="is-red">مرة واحدة فقط</b>):</p>
              <div className="tpm__box">
                <code dir="ltr">{password}</code>
                <button type="button" className="btn-outline tpm__copy" onClick={copy}>
                  <CopyIcon size={18} /> {copied ? 'تم النسخ' : 'نسخ كلمة المرور'}
                </button>
              </div>
              <p className="vmodal__l2">سلّمها للمستخدم بطريقة آمنة، ولا تُرسلها في مجموعة عامة.</p>
            </>
          )}
          {error && <p className="auth-alert" role="alert">{error}</p>}
        </div>
        <footer className="pmodal__foot vmodal__foot">
          {!password ? (
            <>
              <button type="button" className="btn-outline vm-cancel" onClick={onClose} disabled={busy}>إلغاء</button>
              <button type="button" className="vm-danger" onClick={run} disabled={busy}>{busy ? 'جارٍ التنفيذ...' : 'إعادة التعيين'}</button>
            </>
          ) : (
            <button type="button" className="btn-primary vm-ok" onClick={onClose}>إغلاق</button>
          )}
        </footer>
      </div>
    </div>
  );
}
