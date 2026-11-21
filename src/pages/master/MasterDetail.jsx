import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useMaster, masterError } from '../../masterStore.jsx';
import { api } from '../../lib/api.js';
import { dateTime } from '../../lib/users.js';
import { eventLabel } from '../../auditData.js';
import Cbx from '../../components/Cbx.jsx';
import { StatusPill, RowActions } from './Bits.jsx';
import { IdCardIcon, ClockHistoryIcon, ShieldCheckIcon, GavelIcon, CircleCheckIcon, PencilIcon, LockIcon, DotsVerticalIcon, CertIcon, PieIcon, ReportIcon } from '../../components/Icons.jsx';
import { TreeIcon, CubeIcon, ClipboardCheckIcon, CheckBadgeIcon, LinkIcon, ClipboardListIcon, FileTextIcon, AppsIcon, RulerIcon } from '../../components/MIcons.jsx';

const LOADING = <p className="users-msg">جارٍ التحميل...</p>;

// disable / reactivate from a detail page; the server may refuse (e.g. a department with active users)
function useToggle(kind, id) {
  const { toggle } = useMaster();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    setMsg('');
    try {
      await toggle(kind, id);
    } catch (err) {
      setMsg(masterError(err));
    } finally {
      setBusy(false);
    }
  };
  const banner = msg && <p className="users-msg is-err" role="alert">{msg}</p>;
  return { run, busy, banner };
}

// audit log entries about one record
function useHistory(type, id, stamp) {
  const [rows, setRows] = useState(null);
  useEffect(() => {
    api(`/audit-logs?subject_type=${type}&subject_id=${id}&per_page=10`)
      .then((r) => setRows(r.data))
      .catch(() => setRows([]));
  }, [type, id, stamp]);
  return rows;
}
const FIELD_AR = {
  name: 'الاسم', code: 'الرمز', symbol: 'الرمز المختصر', parent_id: 'التبعية', cost_center: 'مركز التكلفة', description: 'الوصف',
  is_active: 'الحالة', category_id: 'التصنيف', unit_id: 'وحدة القياس', unit_group: 'التصنيف القياسي', nature: 'طبيعة الكميات', owner_name: 'المسؤول',
};
const historyText = (r) => {
  const d = r.details || {};
  if (d.changes) return 'الحقول المعدلة: ' + Object.keys(d.changes).map((k) => FIELD_AR[k] || k).join('، ');
  if (r.event.endsWith('.created')) return 'تمت إضافة السجل' + (d.code ? ` برمز ${d.code}` : '') + '.';
  return '';
};

function Head({ title, sub, upd, chips, btns, center }) {
  return (
    <section className="vhead mhead">
      <div className="mhead__main">
        <h1>{title}</h1>
        {sub && <p className="mhead__sub">{sub}</p>}
        <div className="vhead__upd"><ClockHistoryIcon size={14} />آخر تحديث: {upd}</div>
        <div className={'mchips' + (center ? ' is-center' : '')}>
          {chips.map((c, i) => (c.ok ? <span key={i} className="mchip mchip--ok">{c.t}<i /></span> : <span key={i} className="mchip">{c.t}</span>))}
        </div>
      </div>
      <div className="mhead__btns">{btns}</div>
    </section>
  );
}
const Btns = ({ onAdd, addLabel, onEdit, editLabel, off, onToggle, offLabel, onLabel, busy }) => (
  <>
    {onAdd && <button type="button" className="vbtn vbtn--blue" onClick={onAdd}>{addLabel}</button>}
    <button type="button" className="btn-primary vbtn" onClick={onEdit}>{editLabel}</button>
    <button type="button" className={'vbtn ' + (off ? 'vbtn--blue' : 'vbtn--danger')} onClick={onToggle} disabled={busy}>{busy ? 'جارٍ التنفيذ...' : off ? onLabel : offLabel}</button>
  </>
);
const Tile = ({ label, children, wide, className = '' }) => (
  <div className={'mtile' + (wide ? ' is-wide' : '') + ' ' + className}>
    <span className="mtile__label">{label}</span>
    <b className="mtile__value">{children}</b>
  </div>
);
const CardHead = ({ icon, title, tag }) => (
  <header className="mcardhead">
    <span className="mcardhead__icon">{icon}</span>
    <h2>{title}</h2>
    {tag && <span className="vtag">{tag}</span>}
  </header>
);

// ---------- الأقسام ----------
export function DepartmentDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { departments, loaded } = useMaster();
  const T = useToggle('departments', id);
  const d = departments.find((x) => x.id === id);
  if (!loaded) return LOADING;
  if (!d) return <Navigate to="/master-data/departments" replace />;
  const kids = departments.filter((k) => k.parentId === d.id);
  const off = d.status !== 'active';
  const kidsText = (k) => k.scope || 'لا يوجد وصف لمهام هذا القسم بعد';
  const parent = departments.find((x) => x.id === d.parentId);
  return (
    <div className="mdetail">
      <Head
        title={d.name} sub={d.level === 'main' ? 'الهيكل التنظيمي المعتمد · المستوى القيادي الإداري الأول' : 'قسم فرعي تابع لـ ' + d.parent} upd={d.date} center
        chips={[{ t: '#' + d.code }, { t: d.level === 'main' ? 'إدارة رئيسية مستقلة' : 'قسم فرعي تابع' }, { t: off ? 'غير نشط' : 'نشط', ok: !off }, { t: 'مركز التكلفة: ' + (d.cc || '—') }]}
        btns={<Btns onAdd={d.level === 'main' ? () => nav('/master-data/departments/new?parent=' + d.id) : null} addLabel="إضافة قسم فرعي" onEdit={() => nav(`/master-data/departments/${d.id}/edit`)} editLabel="تعديل بيانات القسم" off={off} onToggle={T.run} busy={T.busy} offLabel="تعطيل الإدارة" onLabel="إعادة تفعيل الإدارة" />}
      />
      {T.banner}
      <div className="mcols">
        <div className="mcol">
          <section className="mcard">
            <CardHead icon={<IdCardIcon size={22} />} title="بطاقة المعلومات العامة" tag="بيانات موثوقة" />
            <div className="mgrid">
              <Tile label="اسم الوحدة التنظيمية" wide>{d.name}</Tile>
              <Tile label="الرقم المرجعي">{d.code}</Tile>
              <Tile label="مركز التكلفة">{d.cc || '—'}</Tile>
              <Tile label="الإدارة المشرفة">{parent ? parent.name : 'لا يوجد (إدارة رئيسية)'}</Tile>
              <Tile label="أنشأه">{d.by}</Tile>
              <Tile label="تاريخ الإنشاء">{d.created}</Tile>
              <Tile label="أخر تحديث وتدقيق">{d.audited}</Tile>
            </div>
          </section>
          <section className="mcard">
            <CardHead icon={<CertIcon size={22} />} title="الوصف والمهام التنفيذية" />
            <p className="mdesc">{d.desc || 'لم يُكتب وصف لهذا القسم بعد.'}</p>
            <div className="mgrid3">
              <div className="mfeat"><ShieldCheckIcon size={26} /><b>{d.staff} مستخدم</b><span>حسابات نشطة في القسم</span></div>
              <div className="mfeat"><LinkIcon size={26} /><b>{kids.length} قسم</b><span>أقسام فرعية تابعة</span></div>
              <div className="mfeat"><PieIcon size={26} /><b dir="ltr">{d.cc || '—'}</b><span>مركز التكلفة</span></div>
            </div>
          </section>
        </div>
        <div className="mcol">
          <section className="mcard mside">
            <CardHead icon={<TreeIcon size={22} />} title={'الأقسام الفرعية التابعة' + (kids.length ? ` (${kids.length} أقسام)` : '')} />
            <p className="mside__sub">الوحدات الإدارية الفرعية المسجلة ضمن الهيكل الحالي</p>
            {d.level === 'sub' ? (
              <div className="mempty mempty--small">
                <span className="mempty__icon"><span><TreeIcon size={44} /></span></span>
                <h3>هذا قسم فرعي</h3>
                <p>الهيكل التنظيمي مستويان: إدارة رئيسية وأقسام فرعية تتبعها، فلا يمكن إضافة أقسام تحت قسم فرعي.</p>
                {parent && <button type="button" className="btn-primary" onClick={() => nav('/master-data/departments/' + parent.id)}>عرض الإدارة الرئيسية</button>}
              </div>
            ) : kids.length === 0 ? (
              <div className="mempty mempty--small">
                <span className="mempty__icon"><span><TreeIcon size={44} /></span></span>
                <h3>لا توجد أقسام فرعية تابعة</h3>
                <p>ابدأ بإضافة القسم الفرعي الأول لبناء الهيكل التنظيمي للجهة. يمكنك لاحقاً تفريع الإدارات المساندة وربط مراكز التكلفة لاعتماد مسارات المنافسات والمشتريات آلياً وفق الحوكمة المعتمدة.</p>
                <button type="button" className="btn-primary" onClick={() => nav('/master-data/departments/new?parent=' + d.id)}>إضافة أول قسم</button>
              </div>
            ) : (
              <>
                <div className="mkids">
                  {kids.map((k) => (
                    <div key={k.id} className="mkid" onClick={() => nav('/master-data/departments/' + k.id)}>
                      <div className="mkid__top">
                        <strong>{k.name}</strong>
                        <button type="button" className="mkid__edit" aria-label="تعديل" onClick={(e) => { e.stopPropagation(); nav(`/master-data/departments/${k.id}/edit`); }}><PencilIcon size={14} /></button>
                      </div>
                      <p>{kidsText(k)}</p>
                      <div className="mkid__bottom">
                        <div className="mkid__stats"><span>{k.staff} {k.staff === 1 ? 'مستخدم نشط' : 'مستخدمين نشطين'}</span></div>
                        <span className="mcode">{k.code}</span>
                        <span className={'mkid__st' + (k.status === 'active' ? '' : ' is-off')}>{k.status === 'active' ? 'نشط' : 'غير نشط'}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className="btn-primary mkids__add" onClick={() => nav('/master-data/departments/new?parent=' + d.id)}>إضافة قسم فرعي جديد</button>
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ---------- عمود الحوكمة (الأصناف + الوحدات): بيانات حقيقية ----------
function Gov({ rec, type, usage, statusTitle }) {
  const rows = useHistory(type, rec.apiId, rec.updatedAt);
  const off = rec.status !== 'active';
  return (
    <>
      <section className="mcard mgov">
        <CardHead icon={<CheckBadgeIcon size={22} />} title="الحالة والارتباطات" />
        <div className="mbox">
          <div className="mbox__row"><span>{usage.label}</span><b className="is-b">{usage.value}</b></div>
          <div className="mbar"><i style={{ width: usage.pct + '%', background: '#0077ff' }} /></div>
          <small>{usage.hint}</small>
        </div>
        <div className={'mbox' + (off ? '' : ' mbox--ok')}>
          <div><strong>{statusTitle}</strong><small>{off ? 'غير نشط: لا يظهر في الإدخالات الجديدة' : 'نشط ومتاح في طلبات الشراء والأصناف'}</small></div>
          {!off && <CircleCheckIcon size={26} />}
        </div>
        <div className="mbox mbox--dark">
          <span className="mbox__gavel"><GavelIcon size={22} /></span>
          <div><small>أضافه</small><strong>{rec.by} · {rec.created}</strong></div>
        </div>
      </section>
      <section className="mcard mlog">
        <header className="mcardhead">
          <span className="mcardhead__icon mcardhead__icon--sq"><ClockHistoryIcon size={20} /></span>
          <h2>سجل العمليات والاعتمادات</h2>
          {rows && <span className="mlog__tag">{rows.length} عمليات موثقة</span>}
        </header>
        {rows && !rows.length && <p className="users-msg">لا توجد عمليات مسجلة بعد</p>}
        <ol className="mtl">
          {(rows || []).map((r, i) => (
            <li key={r.id} className={i === 0 ? 'is-blue' : ''}>
              <div className="mtl__top"><small>{dateTime(r.created_at)}</small></div>
              <b>{eventLabel(r.event)}</b>
              <p>{historyText(r)}</p>
              {r.user?.name && <small className="mtl__by">بواسطة: {r.user.name}</small>}
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}

// ---------- الأصناف ----------
export function ItemDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { items, loaded } = useMaster();
  const T = useToggle('items', id);
  const it = items.find((x) => x.id === id);
  if (!loaded) return LOADING;
  if (!it) return <Navigate to="/master-data/items" replace />;
  const off = it.status !== 'active';
  const sameCat = items.filter((i) => i.categoryId === it.categoryId).length;
  return (
    <div className="mdetail">
      <Head
        title={it.name} sub={it.desc ? it.desc.slice(0, 160) + (it.desc.length > 160 ? '…' : '') : ''} upd={it.date}
        chips={[{ t: it.code }, { t: 'التصنيف: ' + it.category }, { t: off ? 'غير نشط' : 'نشط', ok: !off }, { t: 'وحدة القياس: ' + it.unit + (it.uom ? ` (${it.uom})` : '') }]}
        btns={<Btns onEdit={() => nav(`/master-data/items/${it.id}/edit`)} editLabel="تعديل الصنف" off={off} onToggle={T.run} busy={T.busy} offLabel="تعطيل الصنف" onLabel="إعادة تفعيل الصنف" />}
      />
      {T.banner}
      <div className="mcols">
        <div className="mcol">
          <section className="mcard">
            <CardHead icon={<IdCardIcon size={22} />} title="البيانات التعريفية والتشغيلية للصنف" tag="بيانات موثوقة" />
            <div className="mgrid">
              <Tile label="رمز الصنف القياسي (Unique Item Code)">{it.code}</Tile>
              <Tile label="الاسم الرسمي في الدليل">{it.name}</Tile>
              <Tile label="التصنيف المرجعي والتسلسل الهيكلي">{it.categoryCode ? it.categoryCode + ' : ' : ''}{it.category}</Tile>
              <Tile label="وحدة القياس المعتمدة للعقود (UOM)">{it.uom ? it.uom + ' : ' : ''}{it.unit}{it.unitSymbol ? ` (${it.unitSymbol})` : ''}</Tile>
              <Tile label="الحالة التشغيلية في النظام العام" wide>{off ? 'غير نشط: لا يظهر عند إنشاء طلبات شراء جديدة.' : 'متاح بشكل مباشر لجميع طلبات الشراء، كراسات الشروط، والمنافسات التوريدية الجديدة.'}</Tile>
              <Tile label="تاريخ الإنشاء">{it.created}</Tile>
              <Tile label="أخر تحديث وتدقيق">{it.audited}</Tile>
            </div>
          </section>
          <section className="mcard">
            <CardHead icon={<CertIcon size={22} />} title="الوصف والمواصفات المعيارية" />
            <p className="mdesc">{it.desc || 'لا يوجد وصف لهذا الصنف بعد.'}</p>
          </section>
        </div>
        <div className="mcol">
          <Gov rec={it} type="item" statusTitle="حالة الصنف" usage={{ label: 'أصناف في نفس التصنيف', value: sameCat + ' صنف', pct: Math.min(100, sameCat * 10), hint: 'التصنيف: ' + it.category }} />
        </div>
      </div>
    </div>
  );
}

// ---------- وحدات القياس ----------
export function UnitDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { units, items, loaded } = useMaster();
  const T = useToggle('units', id);
  const u = units.find((x) => x.id === id);
  if (!loaded) return LOADING;
  if (!u) return <Navigate to="/master-data/units" replace />;
  const off = u.status !== 'active';
  const linked = items.filter((i) => i.unitId === u.id);
  const total = items.length;
  return (
    <div className="mdetail">
      <Head
        title={u.name + (u.symbol ? ` (${u.symbol})` : '')} sub={u.desc ? u.desc.slice(0, 160) + (u.desc.length > 160 ? '…' : '') : ''} upd={u.date}
        chips={[{ t: 'المعرف الموحد: ' + (u.uom || '—') }, { t: 'التصنيف: ' + (u.group || '—') }, { t: off ? 'غير نشط' : 'نشط', ok: !off }, { t: u.symbol }]}
        btns={<Btns onEdit={() => nav(`/master-data/units/${u.id}/edit`)} editLabel="تعديل الوحدة" off={off} onToggle={T.run} busy={T.busy} offLabel="تعطيل الوحدة" onLabel="إعادة تفعيل الوحدة" />}
      />
      {T.banner}
      <div className="mcols">
        <div className="mcol">
          <section className="mcard">
            <CardHead icon={<IdCardIcon size={22} />} title="بيانات التعريف والحوكمة التشغيلية" tag={u.uom || u.symbol} />
            <div className="mgrid">
              <Tile label="اسم الوحدة باللغة الرسمية">{u.name}</Tile>
              <Tile label="الرمز المختصر (ISO / UN)">{u.symbol}</Tile>
              <Tile label="الحالة التشغيلية ومستوى الإتاحة">{off ? 'مسودة / موقوفة: غير متاحة للأصناف الجديدة' : 'نشط ومتاح للأصناف والمنافسات'}</Tile>
              <Tile label="طبيعة الكميات والتجزئة">{u.nature || '—'}</Tile>
              <Tile label="الوصف المعتمد في كراسات الشروط والتعاقدات:" wide>{u.desc || '—'}</Tile>
              <Tile label="تاريخ الإنشاء">{u.created}</Tile>
              <Tile label="أخر تحديث وتدقيق">{u.audited}</Tile>
            </div>
          </section>
          <section className="mcard">
            <CardHead icon={<CubeIcon size={22} />} title="الأصناف المرتبطة بالوحدة" tag={linked.length + ' صنف مقيد'} />
            {linked.length ? (
              <div className="mmini">
                <table>
                  <thead><tr><th>اسم الصنف والمواصفة</th><th>كود الصنف المؤسسي</th><th>التصنيف</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {linked.slice(0, 10).map((i) => (
                      <tr key={i.id} onClick={() => nav('/master-data/items/' + i.id)}>
                        <td>{i.name}</td><td>{i.code}</td><td>{i.category}</td><td><StatusPill s={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="users-msg">لا توجد أصناف مرتبطة بهذه الوحدة بعد</p>
            )}
          </section>
        </div>
        <div className="mcol">
          <Gov rec={u} type="unit" statusTitle="حالة وحدة القياس" usage={{ label: 'الأصناف المقيدة بالوحدة', value: `${linked.length} من ${total}`, pct: total ? Math.round((linked.length / total) * 100) : 0, hint: 'نسبة أصناف الدليل التي تستخدم هذه الوحدة' }} />
        </div>
      </div>
    </div>
  );
}

// ---------- التصنيفات ----------
export function CategoryDetail() {
  const nav = useNavigate();
  const { id } = useParams();
  const { categories, items, remove, toggle, loaded } = useMaster();
  const T = useToggle('categories', id);
  const [msg, setMsg] = useState('');
  const c = categories.find((x) => x.id === id);
  if (!loaded) return LOADING;
  if (!c) return <Navigate to="/master-data/categories" replace />;
  const off = c.status !== 'active';
  const kids = categories.filter((k) => k.parentId === c.id);
  const ids = new Set([c.id, ...kids.map((k) => k.id)]);
  const catItems = items.filter((i) => ids.has(i.categoryId));
  const activeItems = catItems.filter((i) => i.status === 'active').length;
  const parent = categories.find((x) => x.id === c.parentId);
  const run = (fn) => fn().catch((err) => setMsg(masterError(err)));
  return (
    <div className="mdetail">
      <Head
        title={c.name} sub={c.level === 1 ? 'تصنيف رئيسي (المستوى الأول - L1)' : 'تصنيف فرعي تابع لـ ' + c.parent} upd={c.date}
        chips={[{ t: 'مركز التكلفة: ' + (c.cc || '—') }, { t: 'المسؤول: ' + (c.owner || '—') }, { t: off ? 'غير نشط' : 'نشط', ok: !off }, { t: c.code }]}
        btns={<Btns onEdit={() => nav(`/master-data/categories/${c.id}/edit`)} editLabel="تعديل التصنيف" off={off} onToggle={T.run} busy={T.busy} offLabel="تعطيل التصنيف" onLabel="إعادة تفعيل التصنيف" />}
      />
      {T.banner}
      {msg && <p className="users-msg is-err" role="alert">{msg}</p>}
      <div className="mstats3">
        <div className="vstat"><div className="vstat__text"><div className="vstat__row"><strong>{kids.length}</strong><em>تصنيف فرعي</em></div><span>التصنيفات الفرعية التابعة</span><small className="is-text">{kids.filter((k) => k.status === 'active').length} منها نشط</small></div><span className="vstat__icon" style={{ background: '#e8f6ff', color: '#0b2a4a' }}><AppsIcon size={20} /></span></div>
        <div className="vstat"><div className="vstat__text"><div className="vstat__row"><strong>{catItems.length}</strong><em>صنف مفهرس</em></div><span>اجمالي الأصناف المرتبطة</span><small className="is-text">يشمل أصناف التصنيفات الفرعية <CircleCheckIcon size={14} /></small></div><span className="vstat__icon" style={{ background: '#f1f1f1', color: '#222' }}><ClipboardListIcon size={20} /></span></div>
        <div className="vstat"><div className="vstat__text"><div className="vstat__row"><strong>{activeItems}</strong><em>صنف نشط</em></div><span>الأصناف المتاحة للطلبات</span><small className="is-blue">{catItems.length ? Math.round((activeItems / catItems.length) * 100) : 0}% من أصناف التصنيف</small></div><span className="vstat__icon" style={{ background: '#eefff8', color: '#0a5c36' }}><ReportIcon size={20} /></span></div>
      </div>
      <div className="mcols mcols--cat">
        <div className="mcol">
          <section className="mcard">
            <header className="mcardhead mcardhead--cat">
              <h2>{c.level === 1 ? 'قائمة التصنيفات الفرعية التابعة' : 'الأصناف المرتبطة بالتصنيف'}</h2>
              {c.level === 1 && <button type="button" className="btn-primary vbtn" onClick={() => nav('/master-data/categories/new?parent=' + c.id)}>إضافة فئة</button>}
            </header>
            {c.level === 1 ? (
              kids.length ? (
                <div className="mtable2">
                  <table>
                    <thead><tr><th className="mcb" /><th>اسم التصنيف</th><th>الرمز</th><th>الأصناف المرتبطة</th><th>الحالة</th><th>آخر تحديث</th><th>الإجراءات</th></tr></thead>
                    <tbody>
                      {kids.map((k) => (
                        <tr key={k.id} onClick={() => nav('/master-data/categories/' + k.id)}>
                          <td className="mcb" />
                          <td><div className="vname"><strong className="mname">{k.name}</strong><small>{k.desc}</small></div></td>
                          <td><span className="mcode mcode--plain">{k.code}</span></td>
                          <td className="mtxt">{k.count} صنف</td>
                          <td><StatusPill s={k.status} now /></td>
                          <td><div className="vupd"><b>{k.date}</b><span>{k.by}</span></div></td>
                          <td>
                            <RowActions
                              off={k.status !== 'active'}
                              onEdit={() => nav(`/master-data/categories/${k.id}/edit`)}
                              onLock={() => run(() => toggle('categories', k.id))}
                              onView={() => nav('/master-data/categories/' + k.id)}
                              onDelete={k.count ? undefined : () => window.confirm(`حذف «${k.name}» نهائياً؟`) && run(() => remove('categories', k.id))}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="users-msg">لا توجد تصنيفات فرعية بعد. اضغط «إضافة فئة» لإضافة أول تصنيف فرعي.</p>
              )
            ) : catItems.length ? (
              <div className="mmini">
                <table>
                  <thead><tr><th>اسم الصنف</th><th>الرمز</th><th>وحدة القياس</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {catItems.slice(0, 15).map((i) => (
                      <tr key={i.id} onClick={() => nav('/master-data/items/' + i.id)}><td>{i.name}</td><td>{i.code}</td><td>{i.unit}</td><td><StatusPill s={i.status} /></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="users-msg">لا توجد أصناف في هذا التصنيف بعد</p>
            )}
          </section>
        </div>
        <div className="mcol">
          <section className="mcard mgovc">
            <header className="mcardhead mcardhead--rev"><ShieldCheckIcon size={20} /><h2>تفاصيل الحوكمة والترميز</h2><span className="mref" dir="ltr">{c.code}</span></header>
            <Tile label="الاسم الكامل للتصنيف" className="is-flat">{c.full}</Tile>
            <div className="mgrid mgrid--tight">
              <Tile label="الرمز المعتمد" className="is-flat">{c.code}</Tile>
              <Tile label="التصنيف الأعلى" className="is-flat">{parent ? parent.name : 'جذري (لا يوجد)'}</Tile>
            </div>
            <Tile label="الوصف المؤسسي ونطاق الشمول" className="is-flat is-desc">{c.desc || '—'}</Tile>
            <Tile label="مركز التكلفة المرتبط" className="is-flat">{c.cc || '—'}</Tile>
            <Tile label="أضافه" className="is-flat">{c.by} · {c.created} <CircleCheckIcon size={16} className="mgreen" /></Tile>
          </section>
        </div>
      </div>
    </div>
  );
}
