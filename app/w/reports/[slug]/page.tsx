import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { reportMeta } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { getLocale } from '@/lib/locale';
import { runReport } from '@/lib/reports';
import { monthLabel, monthDates, parseMonthQuery, todayISO } from '@/lib/time';
import { PageHeader } from '@/components/ui';

export default async function ReportPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (user.role === 'employee') redirect('/w');
  const locale = await getLocale();
  const { slug } = await params;
  if (!reportMeta(slug)) notFound();
  const query = await searchParams;
  const { year, month } = parseMonthQuery({ year: typeof query.year === 'string' ? query.year : undefined, month: typeof query.month === 'string' ? query.month : undefined });
  const dates = monthDates(year, month);
  const from = typeof query.from === 'string' ? query.from : dates[0];
  const to = typeof query.to === 'string' ? query.to : dates[dates.length - 1];
  const departmentId = typeof query.department === 'string' && query.department ? Number(query.department) : undefined;
  const report = runReport(user, slug, { departmentId, from, to, year, month }, locale);
  if (!report) notFound();
  const departments = all<{ id: number; name: string }>(getDb(), `SELECT id, name FROM departments WHERE company_id = ?`, user.companyId);
  const exportHref = `/api/export?kind=report&slug=${slug}&year=${year}&month=${month}&from=${from}&to=${to}&department=${departmentId || ''}`;
  return (
    <div>
      <PageHeader title={report.title} text={todayISO()}>
        <a className="btn btn-ghost btn-small" href={exportHref}>Excel</a>
      </PageHeader>
      <form className="mb-4 flex flex-wrap items-end gap-2" method="get">
        <label className="text-xs">{locale === 'ka' ? 'თვე' : 'Month'}
          <select className="field !w-auto" name="month" defaultValue={month}>
            {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{monthLabel(year, index + 1, locale)}</option>)}
          </select>
        </label>
        <label className="text-xs">{locale === 'ka' ? 'წელი' : 'Year'}<input className="field !w-24" type="number" name="year" defaultValue={year} /></label>
        <label className="text-xs">{locale === 'ka' ? 'დან' : 'From'}<input className="field" type="date" name="from" defaultValue={from} /></label>
        <label className="text-xs">{locale === 'ka' ? 'მდე' : 'To'}<input className="field" type="date" name="to" defaultValue={to} /></label>
        <select className="field !w-auto" name="department" defaultValue={departmentId || ''}>
          <option value="">{locale === 'ka' ? 'ყველა განყოფილება' : 'All departments'}</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
        <button className="btn btn-dark btn-small" type="submit">{locale === 'ka' ? 'განახლება' : 'Update'}</button>
      </form>
      <div className="card table-wrap">
        <table className="data">
          <thead><tr>{report.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {report.rows.map((row, index) => <tr key={index}>{report.columns.map((column) => <td key={column.key}>{String(row[column.key] ?? '')}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      {!report.rows.length ? <p className="mt-3 text-sm text-[#6f675e]">{locale === 'ka' ? 'ჩანაწერი არ არის' : 'No rows'}</p> : null}
    </div>
  );
}
