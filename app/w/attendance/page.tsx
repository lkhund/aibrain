import { saveShift } from '@/lib/actions';
import { listVisibleEmployees, requireUser } from '@/lib/auth';
import { all, getDb } from '@/lib/db';
import { formatHours, shiftMetrics } from '@/lib/metrics';
import { getLocale, tx } from '@/lib/locale';
import { isWeekend, monthDates, parseMonthQuery } from '@/lib/time';
import { personName } from '@/lib/types';
import { MonthPicker, PageHeader, one } from '@/components/ui';

export default async function AttendancePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const people = listVisibleEmployees(user).filter((person) => person.status === 'active');
  const selected = Number(one(params.employee) || user.employeeId || people[0]?.id);
  const person = people.find((item) => item.id === selected) || people[0];
  const { year, month } = parseMonthQuery({ year: typeof params.year === 'string' ? params.year : undefined, month: typeof params.month === 'string' ? params.month : undefined });
  const t = (ka: string, en: string) => tx(locale, ka, en);
  if (!person) return <PageHeader title={t('დასწრება', 'Attendance')} />;
  const dates = monthDates(year, month);
  const holidays = new Set(all<{ date: string }>(getDb(), `SELECT date FROM holidays`).map((row) => row.date));
  const attendance = all<{ date: string; check_in: string | null; check_out: string | null; location: string | null }>(getDb(), `SELECT date, check_in, check_out, location FROM attendance WHERE employee_id = ? AND date >= ? AND date <= ?`, person.id, dates[0], dates[dates.length - 1]);
  const shifts = all<{ date: string; start_time: string; end_time: string }>(getDb(), `SELECT date, start_time, end_time FROM shifts WHERE employee_id = ? AND date >= ? AND date <= ?`, person.id, dates[0], dates[dates.length - 1]);
  const canEdit = user.role === 'hr' || user.role === 'director' || user.role === 'manager';
  let late = 0; let early = 0; let overtime = 0;
  const rows = dates.map((date) => {
    const record = attendance.find((item) => item.date === date);
    const shift = shifts.find((item) => item.date === date);
    const start = shift?.start_time || person.schedule_start;
    const end = shift?.end_time || person.schedule_end;
    const rest = (isWeekend(date) || holidays.has(date)) && !shift && !record;
    const metrics = rest || !record?.check_in ? null : shiftMetrics(start, end, record.check_in, record.check_out);
    if (metrics) { late += metrics.late; early += metrics.early; overtime += metrics.overtime; }
    return { date, record, shift, start, end, rest, metrics };
  });

  return (
    <div>
      <PageHeader title={t('ცვლები და დასწრება', 'Shifts & attendance')} text={t('დაგეგმილი ცვლა რეალურ შესვლა-გასვლასთან შედარებით.', 'Planned shifts compared with real check-ins.')}>
        <MonthPicker year={year} month={month} locale={locale} extra={{ employee: String(person.id) }} />
      </PageHeader>
      <form className="mb-4" method="get">
        <input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} />
        <select className="field !w-auto" name="employee" defaultValue={person.id} onChange={undefined}>
          {people.map((item) => <option key={item.id} value={item.id}>{personName(item)}</option>)}
        </select>
        <button className="btn btn-ghost ml-2" type="submit">{t('ჩვენება', 'Show')}</button>
      </form>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('დაგვიანება', 'Lateness')}</p><p className="text-xl font-semibold">{late} {t('წთ', 'min')}</p></div>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('ადრე წასვლა', 'Early leave')}</p><p className="text-xl font-semibold">{early} {t('წთ', 'min')}</p></div>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('ზეგანაკვეთური', 'Overtime')}</p><p className="text-xl font-semibold">{formatHours(overtime)} {t('სთ', 'h')}</p></div>
      </div>
      {canEdit ? (
        <form action={saveShift} className="card mb-4 flex flex-wrap items-end gap-2 p-4">
          <input type="hidden" name="employee_id" value={person.id} />
          <label className="text-sm">{t('თარიღი', 'Date')}<input className="field" type="date" name="date" required /></label>
          <label className="text-sm">{t('დან', 'From')}<input className="field" name="start" defaultValue="09:00" /></label>
          <label className="text-sm">{t('მდე', 'To')}<input className="field" name="end" defaultValue="18:00" /></label>
          <button className="btn btn-primary btn-small" type="submit">{t('ცვლის შენახვა', 'Save shift')}</button>
          <button className="btn btn-ghost btn-small" name="remove" value="1" type="submit">{t('წაშლა', 'Remove')}</button>
        </form>
      ) : null}
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>{t('თარიღი', 'Date')}</th><th>{t('გეგმა', 'Plan')}</th><th>{t('ფაქტი', 'Actual')}</th><th>{t('ადგილი', 'Place')}</th><th>{t('წთ', 'Min')}</th></tr></thead>
          <tbody>
            {rows.filter((row) => !row.rest || row.record).map((row) => (
              <tr key={row.date}>
                <td>{row.date.slice(8)}.{row.date.slice(5, 7)}</td>
                <td>{row.rest ? '—' : `${row.start}–${row.end}`}{row.shift ? ' *' : ''}</td>
                <td>{row.record?.check_in ? `${row.record.check_in}–${row.record.check_out || '…'}` : '—'}</td>
                <td>{row.record?.location || ''}</td>
                <td>{row.metrics ? `${row.metrics.late ? `+${row.metrics.late}` : ''}${row.metrics.early ? ` -${row.metrics.early}` : ''}${row.metrics.overtime ? ` OT ${formatHours(row.metrics.overtime)}` : ''}` : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
