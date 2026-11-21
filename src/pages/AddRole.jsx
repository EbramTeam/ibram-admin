import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, errorText, ApiError } from '../lib/api.js';
import { fetchPermissions, groupPermissions } from '../lib/users.js';
import { TAG_LABEL } from '../rolesData.js';
import { arabicError } from '../masterStore.jsx';
import Cbx from '../components/Cbx.jsx';
import { IdCardIcon, ClipboardUserIcon, SearchIcon, SelectAllIcon, ChevronDownIcon, ShieldIcon } from '../components/Icons.jsx';

// New roles are always custom: the system roles come with the platform and can't be created here.
const TYPES = [
  { key: 'custom', title: 'مخصص', sub: 'مرن وقابل للتعديل والحذف' },
  { key: 'system', title: 'نظامي', sub: 'أدوار المنصة الأساسية فقط', disabled: true },
];
const STATUSES = [
  { key: 'active', title: 'نشط', sub: 'يمنح صلاحياته فوراً' },
  { key: 'inactive', title: 'غير نشط', sub: 'لا يمنح أي صلاحية حتى تفعيله' },
];

// permissions that deserve a warning label
const TAGS = {
  'users.manage': 'critical',
  'settings.manage': 'critical',
  'purchase_requests.approve': 'sensitive',
  'bid_opening.approve': 'sensitive',
  'budget.verify': 'sensitive',
  'audit.view': 'sensitive',
};

function Choice({ checked, onClick, title, sub, disabled }) {
  const pick = () => !disabled && onClick();
  return (
    <div
      className={'rchoice' + (checked ? ' is-on' : '') + (disabled ? ' is-disabled' : '')}
      role="radio"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onClick={pick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick())}
    >
      <Cbx checked={checked} onChange={pick} radio size={24} label={title} />
      <div>
        <strong>{title}</strong>
        {sub && <span>{sub}</span>}
      </div>
    </div>
  );
}

function PermCard({ item, onToggle }) {
  return (
    <div className={'acard' + (item.tag ? ' acard--' + item.tag : '') + (item.checked ? ' is-checked' : '')} onClick={onToggle}>
      <Cbx checked={item.checked} onChange={onToggle} size={24} label={item.name} />
      <div className="acard__text">
        <div className="acard__title">
          <strong>{item.name}</strong>
          {item.tag && <span className={'atag atag--' + item.tag}>{TAG_LABEL[item.tag]}</span>}
        </div>
        <span className="acard__desc" dir="ltr">{item.desc}</span>
      </div>
    </div>
  );
}

export default function AddRole() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState('active');
  const [groups, setGroups] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [q, setQ] = useState('');
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const topRef = useRef(null);

  const load = () => {
    setLoadError('');
    fetchPermissions()
      .then((list) =>
        setGroups(groupPermissions(list, new Set()).map((g) => ({ ...g, items: g.items.map((i) => ({ ...i, tag: TAGS[i.key] || null })) })))
      )
      .catch((err) => setLoadError(errorText(err)));
  };
  useEffect(load, []);

  const all = groups || [];
  const picked = all.flatMap((g) => g.items.filter((i) => i.checked).map((i) => i.id));
  const bad = { name: !name.trim(), desc: !desc.trim(), perms: !picked.length };
  const invalid = Object.values(bad).some(Boolean);

  const visible = useMemo(() => {
    const t = q.trim().toLowerCase();
    return all
      .map((g) => ({ ...g, shown: g.items.filter((i) => !t || (i.name + ' ' + i.desc + ' ' + g.title).toLowerCase().includes(t)) }))
      .filter((g) => g.shown.length);
  }, [all, q]);
  const visibleIds = new Set(visible.flatMap((g) => g.shown.map((i) => i.id)));
  const allVisibleOn = visibleIds.size > 0 && all.every((g) => g.items.every((i) => !visibleIds.has(i.id) || i.checked));

  const edit = (fn) => setGroups((gs) => gs.map(fn));
  const setItem = (gid, iid) => edit((g) => (g.id !== gid ? g : { ...g, items: g.items.map((i) => (i.id === iid ? { ...i, checked: !i.checked } : i)) }));
  const setGroup = (gid, to) => edit((g) => (g.id !== gid ? g : { ...g, items: g.items.map((i) => (visibleIds.has(i.id) ? { ...i, checked: to } : i)) }));
  const selectAll = () => edit((g) => ({ ...g, items: g.items.map((i) => (visibleIds.has(i.id) ? { ...i, checked: !allVisibleOn } : i)) }));

  const submit = async () => {
    setTried(true);
    setError('');
    if (invalid) {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSaving(true);
    try {
      const role = await api('/roles', {
        method: 'POST',
        body: { label: name.trim(), description: desc.trim(), is_active: status === 'active', permission_ids: picked },
      });
      navigate('/roles', { state: { selectId: role.id } });
    } catch (err) {
      const errs = err instanceof ApiError && err.status === 422 ? err.body?.errors || {} : {};
      if (errs.label) {
        setNameError(arabicError(errs.label[0]));
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setError(err instanceof ApiError && err.status === 422 ? arabicError(Object.values(errs)[0]?.[0] || err.body?.message) : errorText(err));
      }
      setSaving(false);
    }
  };

  return (
    <div className="addrole" ref={topRef}>
      <h1 className="page-title">إضافة دور جديد</h1>
      <p className="page-subtitle">أنشئ دورًا جديدًا وحدد الصلاحيات التي سيتمكن المستخدمون المسند إليهم هذا الدور من استخدامها.</p>

      <section className="acardbox">
        <h2 className="asec">
          <span className="asec__icon"><IdCardIcon size={20} /></span>
          القسم الأول: بيانات وتوصيف الدور
        </h2>
        <label className="alabel">ادخل اسم الدور <b>*</b></label>
        <input
          className={'ainput' + ((tried && bad.name) || nameError ? ' is-bad' : '')}
          placeholder="ادخل اسما واضحا يعبر عن مسؤليات هذا الدور"
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            setNameError('');
          }}
        />
        {nameError && <p className="afield-err" role="alert">{nameError}</p>}
        <label className="alabel">وصف الدور <b>*</b></label>
        <textarea
          className={'aarea' + (tried && bad.desc ? ' is-bad' : '')}
          placeholder="الإشراف المباشر على أرصدة المخزون، وتوثيق استلام المواد الموردة عبر منصة اعتماد، وإصدار أذونات الصرف والترخيص بالفحص المخزني."
          value={desc}
          maxLength={1000}
          onChange={(e) => setDesc(e.target.value)}
        />
        <div className="atwo">
          <div>
            <label className="alabel">نوع الدور</label>
            <div className="achoices" role="radiogroup">
              {TYPES.map((t) => (
                <Choice key={t.key} checked={t.key === 'custom'} onClick={() => {}} title={t.title} sub={t.sub} disabled={t.disabled} />
              ))}
            </div>
          </div>
          <div>
            <label className="alabel">حالة الدور <b>*</b></label>
            <div className="achoices" role="radiogroup">
              {STATUSES.map((t) => (
                <Choice key={t.key} checked={status === t.key} onClick={() => setStatus(t.key)} title={t.title} sub={t.sub} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={'acardbox' + (tried && bad.perms ? ' is-bad' : '')}>
        <div className="asec-row">
          <h2 className="asec">
            <span className="asec__icon"><ClipboardUserIcon size={20} /></span>
            القسم الثاني: تحديد الصلاحيات
          </h2>
          <span className="asec-count">محدد: <b>{picked.length}</b> من {all.reduce((s, g) => s + g.items.length, 0)}</span>
        </div>

        <div className="atools">
          <label className="search-field">
            <SearchIcon size={22} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="البحث في مسميات الصلاحيات أو رموزها" />
          </label>
          <button type="button" className="refresh-btn refresh-btn--text" onClick={selectAll} disabled={!groups}>
            <SelectAllIcon size={20} />
            {allVisibleOn ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
          </button>
        </div>

        <div className="agov">
          <ShieldIcon size={18} />
          <span>تنبيه الحوكمة: الصلاحيات الموسومة بـ (حساسة) تخضع للتوثيق الإلزامي والامتثال وفق ضوابط الأمن السيبراني. الصلاحيات نفسها معرّفة في النظام، ويحدد الدور أيّها يمنح.</span>
        </div>
        {tried && bad.perms && <p className="afield-err" role="alert">اختر صلاحية واحدة على الأقل لهذا الدور</p>}

        <div className="agroups">
          {!groups && (
            <div className={'rlist__none' + (loadError ? ' is-err' : '')}>
              {loadError || 'جارٍ تحميل الصلاحيات...'}
              {loadError && <button type="button" className="btn-outline" onClick={load}>إعادة المحاولة</button>}
            </div>
          )}
          {visible.map((g) => {
            const total = g.items.length;
            const on = g.items.filter((i) => i.checked).length;
            const open = !collapsed[g.id];
            return (
              <div key={g.id} className="agroup">
                <header className="agroup__head">
                  <Cbx checked={on === total} indeterminate={on > 0 && on < total} onChange={() => setGroup(g.id, on !== total)} size={26} label={g.title} />
                  <h3>{g.title}</h3>
                  <span className="agroup__count">{on} من {total} محددة</span>
                  <button
                    type="button"
                    className={'agroup__chev' + (open ? '' : ' is-closed')}
                    aria-label="طي/فتح"
                    aria-expanded={open}
                    onClick={() => setCollapsed((c) => ({ ...c, [g.id]: open }))}
                  >
                    <ChevronDownIcon size={18} />
                  </button>
                </header>
                {open && (
                  <div className="agroup__grid">
                    {g.shown.map((i) => (
                      <PermCard key={i.id} item={i} onToggle={() => setItem(g.id, i.id)} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {groups && visible.length === 0 && <div className="rlist__none">لا توجد نتائج</div>}
        </div>
      </section>

      {error && <p className="afield-err afield-err--foot" role="alert">{error}</p>}
      <div className="afoot">
        <button type="button" className="btn-outline" onClick={() => navigate('/roles')} disabled={saving}>
          إلغاء
        </button>
        <button type="button" className="btn-primary" onClick={submit} disabled={saving || !groups}>
          {saving ? 'جارٍ الإنشاء...' : 'إنشاء الدور وحفظ الصلاحيات'}
        </button>
      </div>
    </div>
  );
}
