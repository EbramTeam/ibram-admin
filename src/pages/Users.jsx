import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UsersFilters, UsersTable, useUserFilters } from '../components/UsersTable.jsx';
import UserStatusModal from '../components/UserStatusModal.jsx';
import TempPasswordModal from '../components/TempPasswordModal.jsx';
import { api, errorText, ApiError } from '../lib/api.js';
import { fetchAllUsers, fetchDepartments, fetchRoles, toRow } from '../lib/users.js';
import { IdCardIcon, UsersIcon, HourglassIcon, BanIcon } from '../components/Icons.jsx';
import CountUp from '../components/CountUp.jsx';


function Stat({ icon, tint, value, label, sub, subClass }) {
  return (
    <div className="ustat">
      <div className="ustat__text">
        <strong><CountUp value={value} /></strong>
        <span>{label}</span>
        <small className={subClass}>{sub}</small>
      </div>
      <span className="ustat__icon" style={{ background: tint.bg, color: tint.fg }}>
        {icon}
      </span>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const f = useUserFilters();
  const [users, setUsers] = useState(null); // null = loading
  const [roles, setRoles] = useState([]);
  const [depts, setDepts] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [statusFor, setStatusFor] = useState(null); // row being disabled / re-enabled
  const [statusBusy, setStatusBusy] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [resetFor, setResetFor] = useState(null);

  const load = useCallback(async () => {
    setLoadError('');
    setUsers(null);
    try {
      const [list, r, d] = await Promise.all([fetchAllUsers(), fetchRoles(), fetchDepartments()]);
      setUsers(list);
      setRoles(r);
      setDepts(d);
    } catch (err) {
      setLoadError(errorText(err));
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    load();
    f.setChips([]); // the design's sample filter chips do not apply to real data
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const rows = useMemo(() => (users || []).map(toRow), [users]);
  const count = (st) => rows.filter((r) => r.status === st).length;

  async function changeStatus() {
    const row = statusFor;
    const off = row.status !== 'disabled';
    setStatusBusy(true);
    setStatusError('');
    try {
      const updated = await api(`/users/${row.id}/${off ? 'deactivate' : 'activate'}`, { method: 'POST' });
      setUsers((list) => list.map((u) => (u.id === updated.id ? updated : u)));
      setStatusFor(null);
    } catch (err) {
      setStatusError(err instanceof ApiError && err.status === 422 ? err.body.message : errorText(err));
    } finally {
      setStatusBusy(false);
    }
  }

  async function resetPassword() {
    try {
      const res = await api(`/users/${resetFor.id}/reset-password`, { method: 'POST' });
      setUsers((list) => list.map((u) => (u.id === resetFor.id ? { ...u, must_change_password: true } : u)));
      return res.temporary_password;
    } catch (err) {
      throw new Error(err instanceof ApiError && err.status === 422 ? err.body.message : errorText(err));
    }
  }

  return (
    <div className="users-page">
      <div className="page-head">
        <div>
          <h1 className="page-title">إدارة المستخدمين</h1>
          <p className="page-subtitle">التحكم المركزي في حسابات موظفي المشتريات، وتعيين الأدوار التخصصية، ومتابعة النشاط الإداري</p>
        </div>
        <div className="page-head__actions">
          <button type="button" className="btn-outline" onClick={() => navigate('/audit-log')}>
            تصدير تقارير النظام
          </button>
          <button type="button" className="btn-primary" onClick={() => navigate('/users/new')}>
            إضافة مستخدم جديد
          </button>
        </div>
      </div>

      <div className="ustats">
        <Stat
          icon={<IdCardIcon size={26} />}
          tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }}
          value={users ? rows.length : '—'}
          label="إجمالي المستخدمين"
          sub="كل حسابات الجهة"
          subClass="is-green"
        />
        <Stat
          icon={<UsersIcon size={26} />}
          tint={{ bg: '#eefff8', fg: '#0a5c36' }}
          value={users ? count('enabled') : '—'}
          label="المستخدمون النشطون"
          sub="سجّلوا الدخول مرة على الأقل"
          subClass="is-green"
        />
        <Stat
          icon={<HourglassIcon size={26} />}
          tint={{ bg: '#e8f6ff', fg: '#0b2a4a' }}
          value={users ? count('pending') : '—'}
          label="بانتظار التفعيل"
          sub="لم يغيّروا كلمة المرور المؤقتة"
        />
        <Stat
          icon={<BanIcon size={26} />}
          tint={{ bg: '#fff4f4', fg: '#e84a4a' }}
          value={users ? count('disabled') + count('inactive') : '—'}
          label="المقفلة وغير النشطة"
          sub={users ? `${count('disabled')} معطل · ${count('inactive')} لم يدخل بعد` : ''}
          subClass="is-red"
        />
      </div>

      <UsersFilters
        f={f}
        layout="stacked"
        roleNames={roles.map((r) => r.label || r.name)}
        deptNames={depts.map((d) => d.name)}
        showChips={false}
        statusKeys={['enabled', 'pending', 'inactive', 'disabled']}
      />

      {loadError ? (
        <p className="users-msg is-err" role="alert">
          {loadError}
          <button type="button" onClick={load}>إعادة المحاولة</button>
        </p>
      ) : users === null ? (
        <p className="users-msg" role="status">جارٍ تحميل المستخدمين...</p>
      ) : (
        <UsersTable rows={rows} f={f} pageSize={10} onLock={(r) => { setStatusError(''); setStatusFor(r); }} onResetPassword={setResetFor} />
      )}

      {statusFor && (
        <UserStatusModal
          mode={statusFor.status === 'disabled' ? 'activate' : 'deactivate'}
          user={{ name: statusFor.name, email: statusFor.email }}
          askReason={false}
          busy={statusBusy}
          error={statusError}
          onClose={() => setStatusFor(null)}
          onConfirm={changeStatus}
        />
      )}
      {resetFor && <TempPasswordModal user={resetFor} onClose={() => setResetFor(null)} onConfirm={resetPassword} />}
    </div>
  );
}
