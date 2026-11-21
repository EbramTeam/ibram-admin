import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMaster, fmt } from '../../masterStore.jsx';
import { api } from '../../lib/api.js';
import { dateTime } from '../../lib/users.js';
import { eventLabel, subjectLabel } from '../../auditData.js';
import { PageHead } from './Bits.jsx';
import { OrgChartIcon, ScalesIcon, ShieldIcon, ClipboardUserIcon } from '../../components/Icons.jsx';
import { CubeIcon, AppsIcon } from '../../components/MIcons.jsx';

export default function MasterHub() {
  const nav = useNavigate();
  const { departments, items, units, categories, loaded } = useMaster();
  const [log, setLog] = useState(null);

  // last master data changes from the audit log (one small request per area)
  useEffect(() => {
    Promise.all(['department.*', 'category.*', 'unit.*', 'item.*'].map((e) => api(`/audit-logs?event=${encodeURIComponent(e)}&per_page=5`).then((r) => r.data)))
      .then((lists) => setLog(lists.flat().sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6)))
      .catch(() => setLog([]));
  }, []);

  const n = (v) => (loaded ? fmt(v) : '—');
  const cards = [
    { icon: <OrgChartIcon size={24} />, tag: n(departments.length) + ' إدارة وقسم معتمد', title: 'الأقسام والإدارات', text: 'تنظيم الهيكل الإداري والمراكز التكليفية والجهات الطالبة لمطابقة اعتمادات المشتريات ومسارات الصرف.', btn: 'إدارة الأقسام والإدارات', to: '/master-data/departments' },
    { icon: <CubeIcon size={24} />, tag: n(items.length) + ' صنف مسجل', title: 'الأصناف', text: 'الدليل الموحد للمواد والخدمات، وتوصيف بنود المشتريات ورموزها المرجعية وربطها بالمواصفات الفنية القياسية.', btn: 'إدارة الأصناف', to: '/master-data/items' },
    { icon: <AppsIcon size={22} />, tag: n(categories.length) + ' تصنيف رئيسي وفرعي', title: 'التصنيفات', text: 'شجرة تبويب المشتريات وسلاسل الإمداد ومجموعات الإنفاق وفق المعايير المحاسبية والتصنيف الحكومي الموحد.', btn: 'إدارة التصنيفات', to: '/master-data/categories' },
    { icon: <ScalesIcon size={24} />, tag: n(units.length) + ' وحدة قياس قياسية', title: 'الوحدات', text: 'معايير قياس الكميات (عدد، طن، متر، رخصة ساعة عمل) وضوابط التحويل الرياضي المعتمدة لتدقيق الفواتير.', btn: 'إدارة وحدة القياس', to: '/master-data/units' },
  ];
  return (
    <div className="mhub">
      <PageHead title="البيانات الأساسية" sub="إدارة البيانات المرجعية التي يعتمد عليها النظام في تنظيم طلبات الشراء ومعالجة البيانات." />
      <div className="mhub__cards">
        {cards.map((c) => (
          <section key={c.to} className="mhubcard">
            <div className="mhubcard__top"><span className="mhubcard__icon">{c.icon}</span><span className="mhubcard__tag">{c.tag}</span></div>
            <h2>{c.title}</h2>
            <p>{c.text}</p>
            <button type="button" className="btn-primary" onClick={() => nav(c.to)}>{c.btn}</button>
          </section>
        ))}
      </div>
      <section className="vcard mhubaudit">
        <header className="mcardhead">
          <span className="mcardhead__icon mcardhead__icon--sq"><ClipboardUserIcon size={22} /></span>
          <div><h2>سجل التدقيق والتكامل المرجعي للبيانات</h2><p>عمليات الضبط والتعديل الأخيرة المسجلة بنظام الإشراف المركزي</p></div>
        </header>
        <div className="vtable mhubtable">
          <table>
            <thead><tr><th>البيان المرجعي والتعديل</th><th>المسؤول عن التعديل</th><th>تاريخ الإجراء</th><th>نوع العملية</th></tr></thead>
            <tbody>
              {(log || []).map((r) => {
                const kind = r.event.split('.')[1];
                const pill = kind === 'created' ? ['إضافة', 'green'] : kind === 'deleted' ? ['حذف', 'orange'] : ['تعديل', 'blue'];
                return (
                  <tr key={r.id} onClick={() => nav('/audit-log')}>
                    <td className="mhub__t">{eventLabel(r.event)}{r.subject_type ? ' - ' + subjectLabel(r) : ''}</td>
                    <td>{r.user?.name || '—'}</td>
                    <td>{dateTime(r.created_at)}</td>
                    <td><span className={'mpill mpill--' + pill[1]}>{pill[0]}</span></td>
                  </tr>
                );
              })}
              {log && !log.length && <tr className="vtable__empty"><td colSpan={4}>لا توجد تعديلات على البيانات الأساسية بعد</td></tr>}
              {!log && <tr className="vtable__empty"><td colSpan={4}>جارٍ التحميل...</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mhubnote"><ShieldIcon size={16} /><b>تنويه إجرائي:</b> كل إضافة أو تعديل أو تعطيل أو حذف في البيانات الأساسية يُسجَّل في سجل التدقيق باسم من نفّذه.</div>
      </section>
    </div>
  );
}
