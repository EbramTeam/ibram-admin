import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaster, fmt, masterError, DEPT_MAIN } from '../../masterStore.jsx';
import { PageHead, Stat, FilterCard, StatusPill, RowActions, Empty, exportCsv } from './Bits.jsx';
import Cbx from '../../components/Cbx.jsx';
import { CircleCheckIcon, IdCardIcon, ScalesIcon, OrgChartIcon, ShieldCheckIcon, PauseCircleIcon, DatabaseIcon, DocIcon, ReportIcon } from '../../components/Icons.jsx';
import { CubeIcon, AppsIcon, RulerIcon, ChevronUpIcon, ClipboardListIcon, BoxesIcon } from '../../components/MIcons.jsx';
import { ChevronDownIcon, SettingsIcon } from '../../components/Icons.jsx';

const T = {
  blue: { bg: '#e8f6ff', fg: '#0b2a4a' }, mint: { bg: '#eefff8', fg: '#0a5c36' },
  red: { bg: '#fff0f0', fg: '#e84a4a' }, grey: { bg: '#f1f1f1', fg: '#222' }, amber: { bg: '#fff9e8', fg: '#e84a4a' },
};
const ok = (t) => <>{t} <CircleCheckIcon size={14} /></>;
const ALL = 'كافة الإدارات';
const PH = 'ابحث باسم القسم أو الرمز (مثل: المشتريات ,DEPT-HQ-01)...';

// ---------- هيكل الصفحة المشترك ----------
function ListPage({ cfg, rows, all, selected, setSelected, onAdd, filter, setFilter, defaults, msg, setMsg, children }) {
  const { loaded, error, reload } = useMaster();
  const empty = loaded && !error && all.length === 0;
  const allSel = rows.length > 0 && rows.every((r) => selected.includes(r.id));
  return (
    <div className="vendors-page mlist">
      <PageHead title={cfg.title} sub={cfg.sub}>
        <button type="button" className="btn-outline" onClick={cfg.onExport}>{cfg.exportLabel}</button>
        <button type="button" className="btn-primary" onClick={onAdd}>{cfg.addLabel}</button>
      </PageHead>
      <div className="vstats">
        {cfg.stats.map((s, i) => <Stat key={i} {...s} value={!loaded ? '—' : empty ? '00' : s.value} />)}
      </div>
      {msg && (
        <p className="users-msg is-err" role="alert">
          {msg} <button type="button" onClick={() => setMsg('')}>إغلاق</button>
        </p>
      )}
      {!loaded || error ? (
        <p className={'users-msg' + (error ? ' is-err' : '')} role={error ? 'alert' : undefined}>
          {error || 'جارٍ التحميل...'} {error && <button type="button" onClick={reload}>إعادة المحاولة</button>}
        </p>
      ) : empty ? (
        <Empty {...cfg.empty} onClick={onAdd} />
      ) : (
        <>
          <FilterCard placeholder={PH} f={filter} setF={setFilter} defaults={defaults} statusOpts={['الكل', 'نشط', 'غير نشط']} secondLabel="القسم الرئيسي" secondOpts={cfg.secondOpts} />
          <div className="vtable mtable">
            <table>
              <colgroup>{cfg.widths.map((w, i) => <col key={i} style={{ width: w + '%' }} />)}</colgroup>
              <thead>
                <tr>
                  <th className="mcb"><Cbx checked={allSel} onChange={(v) => setSelected(v ? rows.map((r) => r.id) : [])} label="تحديد الكل" size={22} /></th>
                  {cfg.cols.map((c) => <th key={c.h} className={c.cls}>{c.h}</th>)}
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {children}
                {rows.length === 0 && <tr className="vtable__empty"><td colSpan={cfg.cols.length + 2}>لا توجد نتائج مطابقة</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function useListState() {
  const { toggle, remove } = useMaster();
  const defaults = { q: '', status: 'الكل', second: ALL };
  const [filter, setFilter] = useState(defaults);
  const [selected, setSelected] = useState([]);
  const [msg, setMsg] = useState('');
  // run an API action and show the server's message if it is refused
  const run = (fn) => fn().catch((err) => setMsg(masterError(err)));
  const doToggle = (kind, id) => run(() => toggle(kind, id));
  const doRemove = (kind, r) => {
    if (window.confirm(`حذف «${r.name}» نهائياً؟ لا يمكن التراجع عن الحذف.`)) run(() => remove(kind, r.id));
  };
  const pass = (r, hay, secondHit) => {
    if (filter.q && !hay.some((h) => String(h).toLowerCase().includes(filter.q.toLowerCase()))) return false;
    if (filter.status === 'نشط' && r.status !== 'active') return false;
    if (filter.status === 'غير نشط' && r.status === 'active') return false;
    if (filter.second !== ALL && !secondHit) return false;
    return true;
  };
  return { filter, setFilter, defaults, selected, setSelected, pass, msg, setMsg, doToggle, doRemove };
}
const toggleSel = (sel, setSel, id) => setSel(sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id]);
const dateCell = (r) => <div className="vupd"><b>{r.date}</b><span>{r.by}</span></div>;

// ---------- الأقسام والإدارات ----------
export function DepartmentsList() {
  const nav = useNavigate();
  const { departments: all } = useMaster();
  const L = useListState();
  const rows = all.filter((r) => L.pass(r, [r.name, r.code], r.parent === L.filter.second || r.name === L.filter.second));
  const mains = all.filter((d) => d.level === 'main');
  const subs = all.filter((d) => d.level === 'sub');
  const ccs = new Set(all.map((d) => d.cc).filter(Boolean));
  const kids = (r) => (r.children ? r.children + (r.children === 1 ? ' قسم فرعي' : ' أقسام فرعية') : '-');
  const cfg = {
    title: 'الأقسام والإدارات', sub: 'تنظيم الهيكل الإداري والمراكز التكليفية والجهات الطالبة لاعتمادات الشراء والميزانيات.',
    exportLabel: 'تصدير الهيكل التنظيمي', addLabel: 'إضافة قسم',
    onExport: () => exportCsv('الهيكل-التنظيمي', ['اسم القسم / الإدارة', 'الرمز التنظيمي', 'القسم الأعلى', 'مركز التكلفة', 'المستخدمون', 'الحالة'], all.map((r) => [r.name, r.code, r.parent, r.cc, r.staff, r.status === 'active' ? 'نشط الآن' : 'غير نشط'])),
    stats: [
      { value: fmt(all.length), label: 'إجمالي الأقسام والإدارات', pill: ok('شامل كافة القطاعات'), pillClass: 'is-text', icon: <OrgChartIcon size={24} />, tint: T.blue },
      { value: fmt(subs.length), label: 'أقسام فرعية تشغيلية', icon: <OrgChartIcon size={24} />, tint: T.blue },
      { value: fmt(mains.length), label: 'إدارات رئيسية مستقلة', pill: '(HQ) مستوى قيادي أول', pillClass: 'is-green', icon: <IdCardIcon size={24} />, tint: T.blue },
      { value: fmt(ccs.size), label: 'مراكز التكلفة المربوطة', pill: `${all.filter((d) => d.cc).length} قسم مربوط بمركز تكلفة`, pillClass: 'is-blue', icon: <ShieldCheckIcon size={24} />, tint: T.mint },
    ],
    empty: { icon: <OrgChartIcon size={64} />, title: 'لا توجد أقسام أو إدارات حتى الآن', text: 'ابدأ بإضافة القسم أو الإدارة الأولى لبناء الهيكل التنظيمي للجهة. يمكنك لاحقًا تفريع الإدارات المساندة وربط مراكز التكلفة لاعتماد مسارات المنافسات والمشتريات آليًا وفق الحوكمة المعتمدة.', btn: 'إضافة أول قسم' },
    secondOpts: [ALL, ...mains.map((d) => d.name)], widths: [4, 22, 12, 17, 11, 10, 11, 13],
    cols: [{ h: 'اسم القسم / الإدارة' }, { h: 'الرمز التنظيمي' }, { h: 'القسم الأعلى' }, { h: 'الأقسام التابعة' }, { h: 'الحالة' }, { h: 'آخر تحديث' }],
  };
  return (
    <ListPage cfg={cfg} rows={rows} all={all} {...L} onAdd={() => nav('/master-data/departments/new')}>
      {rows.map((r) => (
        <tr key={r.id} className={L.selected.includes(r.id) ? 'is-sel' : ''} onClick={() => nav('/master-data/departments/' + r.id)}>
          <td className="mcb"><Cbx checked={L.selected.includes(r.id)} onChange={() => toggleSel(L.selected, L.setSelected, r.id)} label="تحديد" size={22} /></td>
          <td><div className="vname"><strong className="mname">{r.name}</strong><small>{r.sub}</small></div></td>
          <td>{r.level === 'main' ? <span className="mcode mcode--plain">{r.code}</span> : <span className="mcode">{r.code}</span>}</td>
          <td className="mtxt">{r.level === 'main' ? DEPT_MAIN : r.parent}</td>
          <td className={'mtxt' + (r.children ? ' mblue' : '')}>{kids(r)}</td>
          <td><StatusPill s={r.status} now /></td>
          <td>{dateCell(r)}</td>
          {/* departments are never deleted: they keep their users and purchase history */}
          <td><RowActions off={r.status !== 'active'} onEdit={() => nav(`/master-data/departments/${r.id}/edit`)} onLock={() => L.doToggle('departments', r.id)} onView={() => nav('/master-data/departments/' + r.id)} /></td>
        </tr>
      ))}
    </ListPage>
  );
}

// ---------- الأصناف ----------
export function ItemsList() {
  const nav = useNavigate();
  const { items: all, categories } = useMaster();
  const L = useListState();
  const rows = all.filter((r) => L.pass(r, [r.name, r.code, r.desc], r.category === L.filter.second || r.category.startsWith(L.filter.second + ' /')));
  const cats = [...new Set(categories.filter((c) => c.level === 1).map((c) => c.name))];
  const active = all.filter((i) => i.status === 'active').length;
  const usedCats = new Set(all.map((i) => i.categoryId)).size;
  const cfg = {
    title: 'الأصناف', sub: 'الدليل المرجعي الموحد للمواد والخدمات وبنود التوريد المعتمدة لمطابقة كراسات الشروط ومواصفات الشراء الحكومي.',
    exportLabel: 'تصدير الفهرس إكسل', addLabel: 'إضافة صنف',
    onExport: () => exportCsv('فهرس-الأصناف', ['رمز الصنف', 'اسم الصنف', 'التصنيف المعتمد', 'وحدة القياس', 'الحالة'], all.map((r) => [r.code, r.name, r.category, r.unit, r.status === 'active' ? 'نشط' : 'غير نشط'])),
    stats: [
      { value: fmt(all.length), unit: 'صنف مقيد', label: 'إجمالي الأصناف المعتمدة', pill: ok('رمز فريد لكل صنف'), pillClass: 'is-text', icon: <DocIcon size={22} />, tint: T.blue },
      { value: fmt(active), unit: 'صنف متاح', label: 'أصناف نشطة للمنافسات', icon: <AppsIcon size={20} />, tint: T.blue },
      { value: fmt(all.length - active), unit: 'صنف موقوف', label: 'أصناف موقوفة او منتهية', icon: <AppsIcon size={20} />, tint: T.red },
      { value: fmt(usedCats), unit: 'تصنيف', label: 'تصنيفات الأصناف المستخدمة', pill: `من أصل ${categories.length} تصنيف معرّف`, pillClass: 'is-blue', icon: <ShieldCheckIcon size={24} />, tint: T.mint },
    ],
    empty: { icon: <CubeIcon size={64} />, title: 'لا توجد أصناف حتى الآن', text: 'ابدأ بإضافة الصنف الأول للدليل المرجعي. كل صنف يحتاج تصنيفاً ووحدة قياس، فأضفهما أولاً إذا لم يكونا موجودين.', btn: 'إضافة أول صنف' },
    secondOpts: [ALL, ...cats], widths: [4, 11, 27, 18, 12, 8, 10, 10],
    cols: [{ h: 'رمز الصنف' }, { h: 'اسم الصنف والمواصفة الفنية' }, { h: 'التصنيف المعتمد' }, { h: 'وحدة القياس' }, { h: 'الحالة' }, { h: 'آخر تحديث' }],
  };
  return (
    <ListPage cfg={cfg} rows={rows} all={all} {...L} onAdd={() => nav('/master-data/items/new')}>
      {rows.map((r) => (
        <tr key={r.id} className={L.selected.includes(r.id) ? 'is-sel' : ''} onClick={() => nav('/master-data/items/' + r.id)}>
          <td className="mcb"><Cbx checked={L.selected.includes(r.id)} onChange={() => toggleSel(L.selected, L.setSelected, r.id)} label="تحديد" size={22} /></td>
          <td><span className="mcode">{r.code}</span></td>
          <td><div className="vname"><strong className="mname">{r.name}</strong><small>{r.desc}</small></div></td>
          <td className="mtxt">{r.category}</td>
          <td><span className="mcode mcode--unit">{r.unit}</span></td>
          <td><StatusPill s={r.status} /></td>
          <td>{dateCell(r)}</td>
          <td><RowActions off={r.status !== 'active'} onEdit={() => nav(`/master-data/items/${r.id}/edit`)} onLock={() => L.doToggle('items', r.id)} onView={() => nav('/master-data/items/' + r.id)} onDelete={() => L.doRemove('items', r)} /></td>
        </tr>
      ))}
    </ListPage>
  );
}

// ---------- وحدات القياس ----------
export function UnitsList() {
  const nav = useNavigate();
  const { units: all } = useMaster();
  const L = useListState();
  const rows = all.filter((r) => L.pass(r, [r.name, r.symbol, r.desc], true));
  const active = all.filter((u) => u.status === 'active').length;
  const linked = all.reduce((s, u) => s + u.linked, 0);
  const pct = all.length ? Math.round((active / all.length) * 1000) / 10 : 0;
  const cfg = {
    title: 'وحدات القياس', sub: 'إدارة وحدات القياس المستخدمة عند تعريف وتوصيف الأصناف في كراسات الشروط ومنافسات الشراء الحكومية والتعميدات المؤسسية.',
    exportLabel: 'تصدير الدليل (Excel/CSV)', addLabel: 'إضافة وحدة قياس',
    onExport: () => exportCsv('وحدات-القياس', ['الوحدة', 'الرمز المختصر', 'الأصناف المرتبطة', 'الحالة'], all.map((r) => [r.name, r.symbol, r.linked + ' صنف مقيد', r.status === 'active' ? 'نشط' : 'غير نشط'])),
    stats: [
      { value: fmt(all.length), unit: 'وحدة معتمدة', label: 'إجمالي وحدات القياس', pill: ok('اسم ورمز فريد لكل وحدة'), pillClass: 'is-text', icon: <RulerIcon size={22} />, tint: T.blue },
      { value: fmt(active), unit: 'وحدة مفعلة', label: 'الوحدات النشطة للمنافسات', pill: `نسبة الوحدات النشطة ${pct}%`, pillClass: 'is-blue', icon: <CircleCheckIcon size={22} />, tint: T.mint },
      { value: fmt(linked), unit: 'صنف معتمد', label: 'الأصناف المقيدة بالوحدات', pill: 'كل صنف مربوط بوحدة واحدة', pillClass: 'is-blue', icon: <AppsIcon size={20} />, tint: T.mint },
      { value: fmt(all.length - active), unit: 'وحدة موقوفة', label: 'وحدات موقوفة / مسودة', pill: 'غير متاحة للأصناف الجديدة', pillClass: 'is-blue', icon: <PauseCircleIcon size={24} />, tint: T.amber },
    ],
    empty: { icon: <ScalesIcon size={64} />, title: 'لا توجد وحدات قياس حتى الآن', text: 'ابدأ بإضافة وحدات القياس المستخدمة في الأصناف، مثل قطعة وكيلوغرام ومتر، لضمان توحيد بيانات المشتريات وتنظيمها بشكل دقيق.', btn: 'إضافة وحدة قياس' },
    secondOpts: [ALL], widths: [4, 25, 14, 17, 14, 13, 13],
    cols: [{ h: 'الوحدة' }, { h: 'الرمز المختصر (Symbol)' }, { h: 'الأصناف المرتبطة' }, { h: 'الحالة التشغيلية' }, { h: 'آخر تحديث' }],
  };
  return (
    <ListPage cfg={cfg} rows={rows} all={all} {...L} onAdd={() => nav('/master-data/units/new')}>
      {rows.map((r) => (
        <tr key={r.id} className={L.selected.includes(r.id) ? 'is-sel' : ''} onClick={() => nav('/master-data/units/' + r.id)}>
          <td className="mcb"><Cbx checked={L.selected.includes(r.id)} onChange={() => toggleSel(L.selected, L.setSelected, r.id)} label="تحديد" size={22} /></td>
          <td><div className="vname"><strong className="mname">{r.name}</strong><small>{r.desc}</small></div></td>
          <td><span className="mcode mcode--plain">{r.symbol}</span></td>
          <td className="mtxt">{r.linked} صنف مقيد</td>
          <td><StatusPill s={r.status} /></td>
          <td>{dateCell(r)}</td>
          <td><RowActions off={r.status !== 'active'} onEdit={() => nav(`/master-data/units/${r.id}/edit`)} onLock={() => L.doToggle('units', r.id)} onView={() => nav('/master-data/units/' + r.id)} onDelete={r.linked ? undefined : () => L.doRemove('units', r)} /></td>
        </tr>
      ))}
    </ListPage>
  );
}

// ---------- التصنيفات ----------
export function CategoriesList() {
  const nav = useNavigate();
  const { categories } = useMaster();
  const all = categories.filter((c) => c.level === 1);
  const L = useListState();
  const [open, setOpen] = useState([]);
  const rows = all.filter((r) => L.pass(r, [r.name, r.code], r.name === L.filter.second));
  const kidsOf = (r) => categories.filter((c) => c.level === 2 && c.parentId === r.id);
  const subs = categories.filter((c) => c.level === 2).length;
  const items = all.reduce((s, c) => s + c.count, 0);
  const quarterAgo = Date.now() - 90 * 86400000;
  const newQuarter = categories.filter((c) => new Date(c.raw.created_at).getTime() >= quarterAgo).length;
  const cfg = {
    title: 'التصنيفات', sub: 'تنظيم الأصناف ضمن تصنيفات واضحة لتسهيل إدارتها واستخدامها عبر منظومة المشتريات.',
    exportLabel: 'تصدير الدليل (Excel/CSV)', addLabel: 'إضافة تصنيف',
    onExport: () => exportCsv('التصنيفات', ['اسم التصنيف', 'الرمز', 'التصنيف الأعلى', 'الأصناف المرتبطة', 'الحالة'], categories.map((r) => [r.name, r.code, r.parent, r.count + ' صنف', r.status === 'active' ? 'نشط الآن' : 'غير نشط'])),
    stats: [
      { value: fmt(categories.length), unit: 'تصنيف معتمد', label: 'إجمالي التصنيفات', pill: `+${newQuarter} تصنيف آخر 3 أشهر`, pillClass: 'is-text', icon: <AppsIcon size={20} />, tint: T.blue },
      { value: fmt(all.length), unit: 'قطاع أساسي', label: 'التصنيفات الرئيسية', pill: 'مستوى الحوكمة: L1', pillClass: 'is-blue', icon: <SettingsIcon size={20} />, tint: T.mint },
      { value: fmt(subs), unit: 'فرع تابع', label: 'التصنيفات الفرعية', pill: 'مستوى الحوكمة: L2', pillClass: 'is-blue', icon: <OrgChartIcon size={22} />, tint: T.blue },
      { value: fmt(items), unit: 'صنف مفهرس', label: 'إجمالي الأصناف المرتبطة', pill: ok('محسوبة من الأصناف الفعلية'), pillClass: 'is-text', icon: <ClipboardListIcon size={20} />, tint: T.grey },
    ],
    empty: { icon: <AppsIcon size={64} />, title: 'لا توجد تصنيفات حتى الآن', text: 'ابدأ بإضافة التصنيفات لتنظيم الأصناف ضمن مجموعات واضحة، ويمكنك لاحقًا إنشاء تصنيفات فرعية لبناء هيكل منظم يسهل إدارة الأصناف والوصول إليها.', btn: 'إضافة أول تصنيف' },
    secondOpts: [ALL, ...new Set(all.map((c) => c.name))], widths: [4, 24, 12, 17, 14, 11, 13, 13],
    cols: [{ h: 'اسم التصنيف' }, { h: 'الرمز' }, { h: 'التصنيف الأعلى' }, { h: 'الأصناف المرتبطة' }, { h: 'الحالة' }, { h: 'آخر تحديث' }],
  };
  const tog = (id) => setOpen((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  const Row = (r, child) => (
    <tr key={r.id + (child ? 'k' : '')} className={child ? 'is-child' : ''} onClick={() => nav('/master-data/categories/' + r.id)}>
      <td className="mcb">
        {!child && r.children > 0 && (
          <button type="button" className="mchev" aria-label="توسيع" aria-expanded={open.includes(r.id)} onClick={(e) => { e.stopPropagation(); tog(r.id); }}>
            {open.includes(r.id) ? <ChevronUpIcon size={18} /> : <ChevronDownIcon size={18} />}
          </button>
        )}
      </td>
      <td><div className="vname"><strong className="mname">{r.name}</strong><small>{r.sub}</small></div></td>
      <td>{child ? <span className="mcode">{r.code}</span> : <span className="mcode mcode--plain">{r.code}</span>}</td>
      <td className="mtxt">{r.parent}</td>
      <td className="mtxt">{r.count} صنف</td>
      <td><StatusPill s={r.status} now /></td>
      <td>{dateCell(r)}</td>
      <td><RowActions off={r.status !== 'active'} onEdit={() => nav(`/master-data/categories/${r.id}/edit`)} onLock={() => L.doToggle('categories', r.id)} onView={() => nav('/master-data/categories/' + r.id)} onDelete={r.children || r.count ? undefined : () => L.doRemove('categories', r)} /></td>
    </tr>
  );
  return (
    <ListPage cfg={cfg} rows={rows} all={all} {...L} onAdd={() => nav('/master-data/categories/new')}>
      {rows.flatMap((r) => [Row(r, false), ...(open.includes(r.id) ? kidsOf(r).map((k) => Row(k, true)) : [])])}
    </ListPage>
  );
}
