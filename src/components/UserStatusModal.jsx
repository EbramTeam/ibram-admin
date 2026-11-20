import { useEffect, useRef, useState } from 'react';
import { CloseCircleIcon, PauseCircleIcon, UserRefreshIcon, ShieldIcon } from './Icons.jsx';

// Disable / re-enable a user account. Same look as the vendor status dialog.
// A reason is required both ways: it goes to the audit log.
export default function UserStatusModal({ mode, user, onClose, onConfirm }) {
  const off = mode === 'deactivate';
  const [reason, setReason] = useState('');
  const [tried, setTried] = useState(false);
  const ta = useRef(null);

  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    ta.current?.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const bad = tried && !reason.trim();
  const submit = (e) => {
    e.preventDefault();
    setTried(true);
    if (reason.trim()) onConfirm(reason.trim());
    else ta.current?.focus();
  };

  return (
    <div className="modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="pmodal vmodal" role="dialog" aria-modal="true" aria-labelledby="usm-title" onSubmit={submit} noValidate>
        <header className="pmodal__head vmodal__head">
          <div className="vmodal__titlebox">
            <span className={'vmodal__icon ' + (off ? 'is-red' : 'is-green')}>
              {off ? <PauseCircleIcon size={24} /> : <UserRefreshIcon size={24} />}
            </span>
            <div>
              <h2 id="usm-title">{off ? 'تعطيل حساب المستخدم؟' : 'إعادة تفعيل حساب المستخدم؟'}</h2>
              <p>{off ? 'إجراء أمني - إيقاف الوصول إلى المنظومة' : 'إجراء أمني - استعادة الوصول إلى المنظومة'}</p>
            </div>
          </div>
          <button type="button" className="pmodal__close" aria-label="إغلاق" onClick={onClose}>
            <CloseCircleIcon size={26} />
          </button>
        </header>
        <div className="vmodal__body">
          <p className="vmodal__l1">
            سيتم تغيير حالة الحساب إلى <b className={off ? 'is-red' : 'is-green'}>{off ? 'معطل' : 'نشط'}</b>
          </p>
          <p className="vmodal__l2">
            {off
              ? 'لن يُحذف الحساب، وتبقى بياناته وسجل عملياته محفوظة للتدقيق.'
              : 'سيتمكن المستخدم من تسجيل الدخول فوراً بأدواره وصلاحياته السابقة.'}
          </p>
          <div className={'vmodal__note ' + (off ? 'is-blue' : 'is-green')}>
            <ShieldIcon size={16} />
            {off ? (
              <p><b>أثر التعطيل الفوري:</b> يُمنع المستخدم من تسجيل الدخول، وتُلغى جلساته المفتوحة على كل الأجهزة.</p>
            ) : (
              <p><b>الأثر المباشر:</b> يعود الحساب إلى قائمة المستخدمين النشطين.</p>
            )}
          </div>
          <div className="vmodal__vendor">
            <div className="vmodal__vtop">
              <strong>{user.name}</strong>
            </div>
            <span>الرقم الوظيفي: <bdi dir="ltr">{user.empId}</bdi></span>
            <span>البريد: <bdi dir="ltr">{user.email}</bdi></span>
          </div>
          <label className="pm-label" htmlFor="usm-reason">{off ? 'سبب التعطيل' : 'سبب إعادة التفعيل'} <b>*</b></label>
          <textarea
            id="usm-reason"
            ref={ta}
            className={'pm-area' + (bad ? ' is-bad' : '')}
            placeholder={off ? 'اكتب سبب تعطيل الحساب ليتم تسجيله في سجل التدقيق...' : 'اكتب سبب إعادة تفعيل الحساب ليتم تسجيله في سجل التدقيق...'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            aria-invalid={bad || undefined}
          />
          {bad && <small className="itile__err" role="alert">هذا الحقل مطلوب</small>}
        </div>
        <footer className="pmodal__foot vmodal__foot">
          <button type="button" className="btn-outline vm-cancel" onClick={onClose}>إلغاء</button>
          <button type="submit" className={off ? 'vm-danger' : 'btn-primary vm-ok'}>{off ? 'تعطيل الحساب' : 'إعادة تفعيل الحساب'}</button>
        </footer>
      </form>
    </div>
  );
}
