import { useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMaster, masterError, fieldErrors, arabicError } from '../../masterStore.jsx';
import { UNIT_GROUPS } from '../../masterData.js';
import { dateTime } from '../../lib/users.js';
import { PageHead } from './Bits.jsx';
import Cbx from '../../components/Cbx.jsx';
import { IdCardIcon, ChevronDownIcon, CertIcon, ShieldCheckIcon, InfoCircleIcon, WarnIcon } from '../../components/Icons.jsx';
import { TreeIcon, FolderIcon, FolderOpenIcon, WandIcon, CubeIcon, PlusCircleIcon } from '../../components/MIcons.jsx';

const Tag = () => <span className="mformtag">سجل البنود القياسي<i /></span>;

function Field({ label, req, bad, hint, link, error, children }) {
  return (
    <div className={'vf' + (bad || error ? ' is-bad' : '')}>
      <div className="mfl">
        <label className="vf__label">{req && <b>*</b>}{label}</label>
        {link}
      </div>
      {children}
      {error && <small className="itile__err" role="alert">{error}</small>}
      {hint && <small className="mhint">{hint}</small>}
    </div>
  );
}
const Input = ({ v, set, ph, ...r }) => <input className="vin" value={v} onChange={(e) => set(e.target.value)} placeholder={ph} {...r} />;
// opts: list of texts, or {value, label}
const Select = ({ v, set, ph, opts, allowEmpty }) => (
  <div className="vselect">
    <select className={'vin' + (v ? '' : ' is-ghost')} value={v} onChange={(e) => set(e.target.value)}>
      <option value="" disabled={!allowEmpty}>{ph}</option>
      {opts.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
    </select>
    <ChevronDownIcon size={20} />
  </div>
);
const Area = ({ v, set, ph, rows = 7 }) => <textarea className="vin vta" rows={rows} value={v} onChange={(e) => set(e.target.value)} placeholder={ph} />;
const Choice = ({ on, set, title, sub }) => (
  <div className={'mchoice' + (on ? ' is-on' : '')} role="radio" aria-checked={on} tabIndex={0} onClick={set} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), set())}>
    <Cbx checked={on} onChange={set} radio size={24} label={title} />
    <div><strong>{title}</strong><span>{sub}</span></div>
  </div>
);
const Card = ({ icon, title, sub, children }) => (
  <section className="vcard vfcard mformcard">
    <header className="vfhead">
      <span className="vfhead__icon">{icon}</span>
      <div><h2>{title}</h2>{sub && <p>{sub}</p>}</div>
    </header>
    {children}
  </section>
);
const Foot = ({ onCancel, saving, error }) => (
  <>
    {error && <p className="uroles__msg is-err" role="alert">{error}</p>}
    <div className="mfoot">
      <button type="button" className="btn-outline" onClick={onCancel} disabled={saving}>إلغاء</button>
      <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
    </div>
  </>
);
// form state + saving through the store. errs: field errors from the server, by form key
function useForm(init) {
  const [f, setF] = useState(init);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errs, setErrs] = useState({});
  const set = (k) => (v) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrs((e) => ({ ...e, [k]: undefined }));
  };
  const bad = (k, on = true) => tried && on && !String(f[k] ?? '').trim();
  const check = (e, keys) => {
    e.preventDefault();
    setTried(true);
    const miss = keys.filter((k) => !String(f[k] ?? '').trim());
    if (miss.length) { setTimeout(() => document.querySelector('.vf.is-bad .vin')?.focus(), 0); return false; }
    return true;
  };
  // keys: form key -> API field, to put server errors under the right field
  const save = async (fn, keys) => {
    setSaving(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      const fe = fieldErrors(err);
      const mapped = {};
      Object.entries(keys).forEach(([k, a]) => fe[a] && (mapped[k] = arabicError(fe[a][0])));
      setErrs(mapped);
      setError(Object.keys(mapped).length ? 'يرجى تصحيح الحقول المؤشرة' : masterError(err));
    } finally {
      setSaving(false);
    }
  };
  return { f, set, bad, check, save, saving, error, errs };
}
const LOADING = <p className="users-msg">جارٍ التحميل...</p>;

// ---------- الأقسام ----------
const DEPT_KEYS = { name: 'name', code: 'code', cc: 'cost_center', parentId: 'parent_id', desc: 'description' };
export function DepartmentForm({ edit }) {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { departments, add, update, loaded } = useMaster();
  const cur = edit ? departments.find((d) => d.id === id) : null;
  const par = !edit && sp.get('parent') ? departments.find((d) => d.id === sp.get('parent')) : null;
  const F = useForm(cur ? { name: cur.name, code: cur.code, cc: cur.cc, level: cur.level, parentId: cur.parentId, desc: cur.desc } : { name: '', code: '', cc: '', level: par ? 'sub' : '', parentId: par?.id || '', desc: '' });
  const { f, set, bad, check } = F;
  if (!loaded) return LOADING;
  if (edit && !cur) return <Navigate to="/master-data/departments" replace />;
  // a department can only report to a main department, never to itself
  const mains = departments.filter((d) => d.level === 'main' && d.id !== cur?.id);
  const ccs = [...new Set(departments.map((d) => d.cc).filter(Boolean))];
  const submit = (e) => {
    if (!check(e, ['name', 'code', 'level', 'desc'].concat(f.level === 'sub' ? ['parentId'] : []))) return;
    const body = {
      name: f.name.trim(),
      code: f.code.trim(),
      cost_center: f.cc.trim() || null,
      parent_id: f.level === 'sub' ? Number(f.parentId) : null,
      description: f.desc.trim() || null,
    };
    F.save(async () => {
      if (edit) { await update('departments', cur.id, body); nav('/master-data/departments/' + cur.id); }
      else { const nid = await add('departments', body); nav('/master-data/departments/' + nid); }
    }, DEPT_KEYS);
  };
  return (
    <form className="vform mform" onSubmit={submit} noValidate>
      <PageHead title={edit ? 'تعديل قسم أو إدارة' : 'إضافة قسم أو إدارة جديدة'} sub={edit ? 'تعديل بيانات وحدة تنظيمية  ضمن الهيكل الإداري للمنظومة وربطها بالصلاحيات ومسارات الشراء.' : 'إنشاء وحدة تنظيمية جديدة ضمن الهيكل الإداري للمنظومة وربطها بالصلاحيات ومسارات الشراء.'} tag={<Tag />} />
      <Card icon={<IdCardIcon size={22} />} title="البيانات الأساسية للقسم" sub="البيانات الإلزامية لتسجيل وتتبع الكود في النظم الحكومية">
        <Field label="اسم القسم أو الإدارة" req bad={bad('name')} error={F.errs.name}><Input v={f.name} set={set('name')} ph="مثال: الإدارة العامة للتحول الرقمي أو قسم الدعم الفني" /></Field>
        <div className="vf2">
          <Field label="رمز القسم المرجعي (Code)" req bad={bad('code')} error={F.errs.code} hint="أحرف إنجليزية وأرقام وشرطة فقط، ولا يتكرر"><Input v={f.code} set={set('code')} ph="مثال: SEC-SUP-02 أو DEPT-DIG-05" dir="ltr" /></Field>
          <Field label="مركز التكلفة المالي المرتبط" error={F.errs.cc}>
            <Input v={f.cc} set={set('cc')} ph="مثال: CC-1010" dir="ltr" list="dept-ccs" />
            <datalist id="dept-ccs">{ccs.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
        </div>
        <Field label="نوع الوحدة التنظيمية (Department Level)" req bad={bad('level')} error={F.errs.parentId}>
          <div className="mchoices">
            <Choice on={f.level === 'main'} set={() => set('level')('main')} title="إدارة رئيسية مستقلة" sub="مستوى أول ترتبط مباشرة بالرئيس التنفيذي أو وكيل الوزارة." />
            <Choice on={f.level === 'sub'} set={() => set('level')('sub')} title="قسم فرعي تابع لإدارة رئيسية" sub="مستوى ثان يتطلب تحديد الإدارة المشرفة لتدفق التواقيع." />
          </div>
        </Field>
        {f.level === 'sub' && (
          <Field label="الإدارة الرئيسية المشرفة" req bad={bad('parentId')}>
            <Select v={f.parentId} set={set('parentId')} ph="اختر الإدارة الرئيسية..." opts={mains.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))} />
          </Field>
        )}
      </Card>
      <Card icon={<CertIcon size={22} />} title="التوصيف والمسؤوليات" sub="نطاق عمل القسم ومسؤولياته في منظومة طلبات الشراء والمنافسات">
        <Field label="وصف القسم واختصاصاته" req bad={bad('desc')} error={F.errs.desc}><Area v={f.desc} set={set('desc')} ph="اكتب نبذة موجزة عن مهام القسم ومسؤولياته في تدقيق واعتماد طلبات المشتريات وفحص العروض الفنية..." /></Field>
      </Card>
      <Foot onCancel={() => nav(edit ? '/master-data/departments/' + cur.id : '/master-data/departments')} saving={F.saving} error={F.error} />
    </form>
  );
}

// ---------- الأصناف ----------
const ITEM_KEYS = { name: 'name', code: 'code', categoryId: 'category_id', unitId: 'unit_id', desc: 'description' };
export function ItemForm({ edit }) {
  const nav = useNavigate();
  const { id } = useParams();
  const { items, units, categories, add, update, loaded } = useMaster();
  const cur = edit ? items.find((d) => d.id === id) : null;
  const F = useForm(cur ? { name: cur.name, code: cur.code, categoryId: cur.categoryId, unitId: cur.unitId, desc: cur.desc } : { name: '', code: '', categoryId: '', unitId: '', desc: '' });
  const { f, set, bad, check } = F;
  if (!loaded) return LOADING;
  if (edit && !cur) return <Navigate to="/master-data/items" replace />;
  // active categories and units (plus the current ones when editing)
  const cats = categories.filter((c) => c.status === 'active' || c.id === f.categoryId).map((c) => ({ value: c.id, label: c.full + ` (${c.code})` }));
  const unitOpts = units.filter((u) => u.status === 'active' || u.id === f.unitId).map((u) => ({ value: u.id, label: `${u.name} (${u.symbol})` }));
  const submit = (e) => {
    if (!check(e, ['name', 'code', 'categoryId', 'unitId', 'desc'])) return;
    const body = { name: f.name.trim(), code: f.code.trim(), category_id: Number(f.categoryId), unit_id: Number(f.unitId), description: f.desc.trim() };
    F.save(async () => {
      if (edit) { await update('items', cur.id, body); nav('/master-data/items/' + cur.id); }
      else { const nid = await add('items', body); nav('/master-data/items/' + nid); }
    }, ITEM_KEYS);
  };
  return (
    <form className="vform mform" onSubmit={submit} noValidate>
      <PageHead title={edit ? 'تعديل بيانات صنف' : 'إضافة صنف جديد'} sub={edit ? 'تعديل بيانات بند توريد أو خدمة  ضمن الدليل المرجعي الموحد لطلبات ومنافسات الشراء الحكومي.' : 'تسجيل بند توريد أو خدمة جديدة ضمن الدليل المرجعي الموحد لطلبات ومنافسات الشراء الحكومي.'} tag={<Tag />} />
      <Card icon={<IdCardIcon size={22} />} title="البيانات الأساسية والتعريفية للصنف" sub="البيانات الإلزامية لتسجيل وتتبع الكود في النظم الحكومية">
        <Field label="اسم الصنف الرسمي" req bad={bad('name')} error={F.errs.name}><Input v={f.name} set={set('name')} ph="أدخل الاسم الرسمي المعتمد للصنف (مثال: محطة عمل حاسوبية احترافية)..." /></Field>
        <div className="vf2">
          <Field label="رمز الصنف المرجعي (SKU / Code)" req bad={bad('code')} error={F.errs.code} hint="أحرف إنجليزية وأرقام وشرطة فقط، ولا يتكرر"><Input v={f.code} set={set('code')} ph="مثال: ITM-SRV-0102" dir="ltr" /></Field>
          <Field label="التصنيف المعتمد" req bad={bad('categoryId')} error={F.errs.categoryId} link={!cats.length && <button type="button" className="mwand" onClick={() => nav('/master-data/categories/new')}>أضف تصنيفاً أولاً</button>}>
            <Select v={f.categoryId} set={set('categoryId')} ph="اختر التصنيف الرئيسي أو الفرعي للصنف..." opts={cats} />
          </Field>
        </div>
        <Field label="وحدة القياس القياسية" req bad={bad('unitId')} error={F.errs.unitId} link={!unitOpts.length && <button type="button" className="mwand" onClick={() => nav('/master-data/units/new')}>أضف وحدة قياس أولاً</button>}>
          <Select v={f.unitId} set={set('unitId')} ph="اختر وحدة القياس المعيارية في جداول الكميات..." opts={unitOpts} />
        </Field>
      </Card>
      <Card icon={<CertIcon size={22} />} title="التوصيف والمواصفات الفنية القياسية" sub="بيان الخصائص والمعايير المطلوب الالتزام بها من الموردين">
        <Field label="وصف الصنف ومحدداته المعيارية" req bad={bad('desc')} error={F.errs.desc}><Area v={f.desc} set={set('desc')} rows={8} ph="اكتب التوصيف الدقيق للبند ومجال استخدامه والمواصفات الفنية المعيارية المطلوبة..." /></Field>
      </Card>
      <Foot onCancel={() => nav(edit ? '/master-data/items/' + cur.id : '/master-data/items')} saving={F.saving} error={F.error} />
    </form>
  );
}

// ---------- وحدات القياس ----------
export function UnitForm({ edit }) {
  const nav = useNavigate();
  const { id } = useParams();
  const { units, add, update, loaded } = useMaster();
  const cur = edit ? units.find((d) => d.id === id) : null;
  const F = useForm(cur ? { name: cur.name, symbol: cur.symbol, uom: cur.uom, group: cur.group, nature: cur.nature, desc: cur.desc, st: cur.status === 'active' ? 'active' : 'draft' } : { name: '', symbol: '', uom: '', group: '', nature: '', desc: '', st: 'active' });
  const { f, set, bad, check } = F;
  if (!loaded) return LOADING;
  if (edit && !cur) return <Navigate to="/master-data/units" replace />;
  const groups = [...new Set([...UNIT_GROUPS, ...units.map((u) => u.group).filter(Boolean)])];
  const submit = (e) => {
    if (!check(e, ['name', 'symbol', 'group', 'desc'])) return;
    const body = {
      name: f.name.trim(), symbol: f.symbol.trim(), code: f.uom.trim() || null, unit_group: f.group,
      nature: f.nature.trim() || null, description: f.desc.trim(), is_active: f.st === 'active',
    };
    F.save(async () => {
      if (edit) { await update('units', cur.id, body); nav('/master-data/units/' + cur.id); }
      else { const nid = await add('units', body); nav('/master-data/units/' + nid); }
    }, { name: 'name', symbol: 'symbol', uom: 'code', group: 'unit_group', nature: 'nature', desc: 'description' });
  };
  return (
    <form className="vform mform" onSubmit={submit} noValidate>
      <PageHead title={edit ? 'تعديل وحدة قياس' : 'إضافة وحدة قياس جديدة'} sub={edit ? 'تعديل وحدة قياس معتمدة جديدة في الدليل المرجعي وتحديد رمزها المختصر لاستخدامها في توصيف الأصناف وكراسات الشروط.' : 'تعريف وحدة قياس معتمدة جديدة في الدليل المرجعي وتحديد رمزها المختصر لاستخدامها في توصيف الأصناف وكراسات الشروط.'} tag={<Tag />} />
      <div className="mcols mcols--form">
        <div className="mcol">
          <Card icon={<IdCardIcon size={22} />} title="بطاقة البيانات الأساسية والتعريفية" sub="البيانات الإلزامية لتسجيل وحدة القياس في النظم الحكومية">
            <Field label="اسم وحدة القياس" req bad={bad('name')} error={F.errs.name}><Input v={f.name} set={set('name')} ph="كيلو غرام" /></Field>
            <div className="vf2">
              <Field label="الرمز المختصر (Symbol)" req bad={bad('symbol')} error={F.errs.symbol}><Input v={f.symbol} set={set('symbol')} ph="KG" dir="ltr" /></Field>
              <Field label="التصنيف القياسي الدولي" req bad={bad('group')} error={F.errs.group}><Select v={f.group} set={set('group')} ph="الكتلة والوزن (Mass & Weight)" opts={groups} /></Field>
            </div>
            <div className="vf2">
              <Field label="المعرف الموحد (UOM Code)" error={F.errs.uom}><Input v={f.uom} set={set('uom')} ph="UOM-ID-0928" dir="ltr" /></Field>
              <Field label="طبيعة الكميات والتجزئة" error={F.errs.nature}><Input v={f.nature} set={set('nature')} ph="أعداد صحيحة مطلقة (غير مجزأة)" /></Field>
            </div>
            <Field label="وصف الوحدة ونطاق الاستخدام" req bad={bad('desc')} error={F.errs.desc}><Area v={f.desc} set={set('desc')} rows={8} ph="اكتب التوصيف الدقيق للبند ومجال استخدامه والمواصفات الفنية المعيارية المطلوبة..." /></Field>
          </Card>
          <Card icon={<CertIcon size={22} />} title="الحالة التشغيلية واعتماد البند" sub="التحكم في ظهور البند في بوابات طلبات الشراء ومشاريع الكراسات">
            <div className="mchoices">
              <Choice on={f.st === 'active'} set={() => set('st')('active')} title="نشط ومتاح للأصناف فوراً" sub="مفعل لطلبات الشراء، الفواتير، وتوصيف كراسات الشروط والمنافسات." />
              <Choice on={f.st === 'draft'} set={() => set('st')('draft')} title="مسودة قيد المراجعة والتدقيق" sub="محجوبة عن اختيار مدخلي البيانات والأصناف حتى اعتمادها النهائي." />
            </div>
          </Card>
          <Foot onCancel={() => nav(edit ? '/master-data/units/' + cur.id : '/master-data/units')} saving={F.saving} error={F.error} />
        </div>
        <div className="mcol">
          <section className="mcard mgovside">
            <header className="mcardhead mcardhead--rev"><ShieldCheckIcon size={20} /><div><h2>الحوكمة والضوابط الرقابية</h2><small>مرسوم إدارة المشتريات م-84</small></div></header>
            <div className="mnote mnote--blue"><b>قاعدة تفرد الرمز واسم الوحدة</b><p>يرفض النظام أي وحدة قياس تشترك في نفس الرمز المختصر أو الاسم مع وحدة قائمة، لمنع الازدواجية في المنافسات وتضارب الفواتير.</p></div>
            <div className="mnote mnote--green"><b>تجريد التسعير والكميات</b><p>تعتبر وحدات القياس كيانات معيارية مجردة تماماً؛ لا ترتبط بالأسعار التعاقدية أو الحدود الدنيا للطلب، حيث تحدد تلك المتغيرات حصراً داخل كراسة شروط كل منافسة.</p></div>
            {cur && (
              <div className="mnote mnote--blue mnote--audit">
                <b>سجل التدقيق الآلي (Audit Trail)</b>
                <div><span>منشئ السجل:</span><em>{cur.by}</em></div>
                <div><span>تاريخ الإنشاء:</span><em>{dateTime(cur.raw.created_at)}</em></div>
                <div><span>آخر تحديث:</span><em className="is-b">{cur.date}</em></div>
              </div>
            )}
          </section>
          <section className="mcard mactive">
            <span className="mactive__icon"><CubeIcon size={22} /></span>
            <div><strong>الوحدات النشطة حالياً</strong><small>{units.filter((u) => u.status === 'active').length} وحدة معتمدة</small></div>
          </section>
        </div>
      </div>
    </form>
  );
}

// ---------- التصنيفات ----------
export function CategoryForm({ edit }) {
  const nav = useNavigate();
  const { id } = useParams();
  const [sp] = useSearchParams();
  const { categories, add, update, loaded } = useMaster();
  const cur = edit ? categories.find((d) => d.id === id) : null;
  const par = !edit && sp.get('parent') ? categories.find((c) => c.id === sp.get('parent')) : null;
  const F = useForm(cur ? { name: cur.name, code: cur.code, type: cur.level === 1 ? 'main' : 'sub', parentId: cur.parentId, cc: cur.cc, owner: cur.owner, desc: cur.desc } : { name: '', code: '', type: par ? 'sub' : 'main', parentId: par?.id || '', cc: '', owner: '', desc: '' });
  const { f, set, bad, check } = F;
  if (!loaded) return LOADING;
  if (edit && !cur) return <Navigate to="/master-data/categories" replace />;
  // a parent is a main category, never the category itself
  const parents = categories.filter((c) => c.level === 1 && c.id !== cur?.id);
  const parent = parents.find((c) => c.id === f.parentId);
  const submit = (e) => {
    if (!check(e, ['name', 'code'].concat(f.type === 'sub' ? ['parentId'] : []))) return;
    const body = {
      name: f.name.trim(), code: f.code.trim(), parent_id: f.type === 'sub' ? Number(f.parentId) : null,
      cost_center: f.cc.trim() || null, owner_name: f.owner.trim() || null, description: f.desc.trim() || null,
    };
    F.save(async () => {
      if (edit) { await update('categories', cur.id, body); nav('/master-data/categories/' + cur.id); }
      else { const nid = await add('categories', body); nav('/master-data/categories/' + nid); }
    }, { name: 'name', code: 'code', parentId: 'parent_id', cc: 'cost_center', owner: 'owner_name', desc: 'description' });
  };
  // next free code like CAT-2026-07
  const gen = () => {
    const used = new Set(categories.map((c) => c.code));
    let n = categories.length + 1;
    let code;
    do code = `CAT-${new Date().getFullYear()}-${String(n++).padStart(2, '0')}`; while (used.has(code));
    set('code')(code);
  };
  const nm = f.name.trim() || 'الخوادم والعتاد الشبكي المؤسسي...';
  return (
    <form className="vform mform" onSubmit={submit} noValidate>
      <PageHead title={edit ? 'تعديل تصنيف' : 'إضافة تصنيف جديد'} sub={edit ? 'قم بتعديل بيانات التصنيف الجديد وتحديد موقعه في الهيكل التنظيمي للمشتريات والأصناف السيادية.' : 'قم بإدخال بيانات التصنيف الجديد وتحديد موقعه في الهيكل التنظيمي للمشتريات والأصناف السيادية.'} tag={<Tag />} />
      <div className="mcols mcols--form">
        <div className="mcol">
          <section className="vcard vfcard mformcard">
            <header className="mcardhead mcardhead--cat"><h2>البيانات الأساسية لتصنيف</h2><span className="mreq">الحقول المطلوبة ملزمة للحوكمة</span></header>
            <Field label="اسم التصنيف المعتمد" req bad={bad('name')} error={F.errs.name} hint="اسم واضح ومميز للتصنيف يظهر في شاشات المشتريات، كراسات الشروط، ومستودعات الجهة."><Input v={f.name} set={set('name')} ph="مثال: الخوادم والعتاد الشبكي المؤسسي" /></Field>
            <Field label="رمز التصنيف السيادي (Code)" req bad={bad('code')} error={F.errs.code} hint="معرف فريد للتصنيف وفق الدليل الموحد لترميز الأصول والمشتريات الحكومية (مثال: CAT-MED-01)." link={<button type="button" className="mwand" onClick={gen}><WandIcon size={14} />توليد تلقائي وفق الدليل</button>}><Input v={f.code} set={set('code')} ph="CAT-ICT-2024-08" dir="ltr" /></Field>
            <div className="mdivider" />
            <Field label="نوع ومستوى التصنيف الشجري">
              <div className="mchoices">
                <Choice on={f.type === 'main'} set={() => set('type')('main')} title="تصنيف رئيسي (مستوى أول)" sub="مستوى استراتيجي مستقل يمثل قطاعاً رئيسياً للمشتريات بدون تبعية لتصنيف أب." />
                <Choice on={f.type === 'sub'} set={() => set('type')('sub')} title="تصنيف فرعي (تابع)" sub="يندرج تحت قطاع أو تصنيف رئيسي معتمد، لربط السلع والأصناف الدقيقة." />
              </div>
            </Field>
            {f.type === 'sub' && (
              <Field label="التصنيف الأعلى (التصنيف الأب)" req bad={bad('parentId')} error={F.errs.parentId} hint="اختر التصنيف الرئيسي التابع له. لا يمكن اختيار التصنيف نفسه لمنع التكرار الحلقي (Cyclic Redundancy).">
                <Select v={f.parentId} set={set('parentId')} ph="اختر التصنيف الرئيسي..." opts={parents.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} />
              </Field>
            )}
            <div className="vf2">
              <Field label="مركز التكلفة المرتبط (اختياري)" error={F.errs.cc}><Input v={f.cc} set={set('cc')} ph="CC-TECH-100" dir="ltr" /></Field>
              <Field label="المسؤول عن التصنيف (اختياري)" error={F.errs.owner}><Input v={f.owner} set={set('owner')} ph="م. خالد التميمي" /></Field>
            </div>
            <Field label="وصف التصنيف ومجال التطبيق (إختياري)" error={F.errs.desc}><Area v={f.desc} set={set('desc')} rows={8} ph="اكتب التوصيف الدقيق للبند ومجال استخدامه والمواصفات الفنية المعيارية المطلوبة..." /></Field>
          </section>
          <Foot onCancel={() => nav(edit ? '/master-data/categories/' + cur.id : '/master-data/categories')} saving={F.saving} error={F.error} />
        </div>
        <div className="mcol">
          <section className="mcard mpreview">
            <header className="mcardhead mcardhead--rev"><span className="mcardhead__icon mcardhead__icon--sq"><TreeIcon size={20} /></span><div><h2>معاينة المسار الشجري</h2><p>هكذا سيظهر موقع هذا التصنيف ضمن المستودع الرقمي ومسار التوريد المؤسسي:</p></div></header>
            <div className="mtree">
              {f.type === 'sub' && parent && <div className="mtree__n"><FolderIcon size={14} />{parent.name}</div>}
              <div className="mtree__n is-cur"><PlusCircleIcon size={14} />{nm}</div>
            </div>
            <div className="mtax"><small>مسار الربط التسلسل (Taxonomy Path):</small><b dir="ltr">{[f.type === 'sub' && parent ? parent.code : null, f.code.trim().toUpperCase() || 'CAT-ICT-2024-08'].filter(Boolean).join(' / ')}</b></div>
            {f.type === 'sub' && parent && (() => {
              const kids = categories.filter((c) => c.parentId === parent.id && c.id !== cur?.id);
              const act = kids.filter((c) => c.status === 'active').length;
              const pct = kids.length ? Math.round((act / kids.length) * 100) : 0;
              return (
                <div className="mdens"><div><small>التصنيفات الفرعية الحالية تحت «{parent.name}»:</small><span><b>{kids.length} تصنيف فرعي</b><em>{act} نشط</em></span></div><div className="mbar"><i style={{ width: pct + '%', background: '#0a3a4a' }} /></div></div>
              );
            })()}
          </section>
          <section className="mcard mguide">
            <header className="mcardhead mcardhead--rev"><span className="mcardhead__icon mcardhead__icon--sq"><TreeIcon size={20} /></span><h2>إرشادات هيكل التصنيفات</h2></header>
            <ul>
              <li><span className="mg mg--a"><CubeIcon size={14} /></span><p><b>التصنيفات الرئيسية:</b> تمثل القطاعات العامة للمشتريات (مثل: تقنية المعلومات، التجهيزات المكتبية، الخدمات الطبية).</p></li>
              <li><span className="mg mg--b"><FolderOpenIcon size={14} /></span><p><b>التصنيفات الفرعية:</b> تساعد مسؤولي المستودعات ومدراء العقود على تصفية وتجميع الأصناف بدقة ومنع الازدواجية.</p></li>
              <li><span className="mg mg--c"><WarnIcon size={14} /></span><p><b>قاعدة الحوكمة:</b> لا يمكن ربط تصنيف بنفسه كأب، وتغيير التصنيف الأب لاحقاً يؤثر فوراً على تقارير التصنيف التراكمية وسجلات التدقيق المالي.</p></li>
            </ul>

          </section>
        </div>
      </div>
    </form>
  );
}
