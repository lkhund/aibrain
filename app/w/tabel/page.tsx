import { confirmTabel, shareTabel } from '@/lib/actions';
import { listVisibleEmployees, requireUser } from '@/lib/auth';
import { all, get, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { buildTabel } from '@/lib/tabel';
import { formatHours } from '@/lib/metrics';
import { monthDates, parseMonthQuery, todayISO } from '@/lib/time';
import { MonthPicker, PageHeader, Pill, statusTone } from '@/components/ui';

export default async function TabelPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const { year, month } = parseMonthQuery({ year: typeof params.year === 'string' ? params.year : undefined, month: typeof params.month === 'string' ? params.month : undefined });
  const period = get<{ id: number; mode: string; status: string }>(getDb(), `SELECT id, mode, status FROM tabel_periods WHERE company_id = ? AND year = ? AND month = ?`, user.companyId, year, month);
  const mode = params.mode === 'schedule' || params.mode === 'actual' ? params.mode : (period?.mode === 'schedule' ? 'schedule' : 'actual');
  const visible = listVisibleEmployees(user).filter((person) => person.status === 'active').map((person) => person.id);
  const table = buildTabel(user.companyId, year, month, mode, user.role === 'hr' || user.role === 'director' || user.role === 'finance' ? undefined : visible);
  const confirmations = period ? all<{ manager_employee_id: number; status: string; first_name: string; last_name: string }>(getDb(), `SELECT c.manager_employee_id, c.status, e.first_name, e.last_name FROM tabel_confirmations c JOIN employees e ON e.id = c.manager_employee_id WHERE c.period_id = ?`, period.id) : [];
  const mine = confirmations.find((item) => item.manager_employee_id === user.employeeId && item.status === 'pending');
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const dates = monthDates(year, month);
  return (
    <div>
      <PageHeader title={t('თვიური ტაბელი', 'Monthly tabel')} text={t('უ დასვენება · დ უქმე · შ შვებულება · ხ უხელფასო · ა ბიულეტენი · მ მივლინება · გ გაცდენა · ს სასწავლო', 'უ rest · დ holiday · შ vacation · ხ unpaid · ა sick · მ trip · გ absent · ს study')}>
        <MonthPicker year={year} month={month} locale={locale} extra={{ mode }} />
        <a className={`btn btn-small ${mode === 'actual' ? 'btn-dark' : 'btn-ghost'}`} href={`/w/tabel?year=${year}&month=${month}&mode=actual`}>{t('ფაქტი', 'Actual')}</a>
        <a className={`btn btn-small ${mode === 'schedule' ? 'btn-dark' : 'btn-ghost'}`} href={`/w/tabel?year=${year}&month=${month}&mode=schedule`}>{t('გრაფიკი', 'Schedule')}</a>
        <a className="btn btn-ghost btn-small" href={`/api/export?kind=tabel&year=${year}&month=${month}&mode=${mode}`}>Excel</a>
      </PageHeader>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Pill tone={statusTone(period?.status || 'draft')}>{period?.status || 'draft'}</Pill>
        {confirmations.map((item) => <span key={item.manager_employee_id} className="text-xs text-[#6f675e]">{item.first_name}: {item.status}</span>)}
        {(user.role === 'hr' || user.role === 'director') ? (
          <form action={shareTabel}>
            <input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} /><input type="hidden" name="mode" value={mode} />
            <button className="btn btn-primary btn-small" type="submit">{t('გაზიარება მენეჯერებთან', 'Share with managers')}</button>
          </form>
        ) : null}
        {mine ? (
          <form action={confirmTabel}>
            <input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} />
            <button className="btn btn-dark btn-small" type="submit">{t('ვადასტურებ ტაბელს', 'Confirm tabel')}</button>
          </form>
        ) : null}
      </div>
      <div className="card table-wrap">
        <table className="data tabel-grid">
          <thead>
            <tr>
              <th className="sticky">{t('თანამშრომელი', 'Employee')}</th>
              {dates.map((date) => <th key={date}>{Number(date.slice(8))}</th>)}
              <th>{t('სთ', 'h')}</th>
              <th>{t('ზეგ.', 'OT')}</th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row) => (
              <tr key={row.employeeId}>
                <td className="sticky">{row.name}</td>
                {row.cells.map((cell, index) => <td key={dates[index]} className={`tone-${cell.tone}`} title={cell.title}>{cell.label}</td>)}
                <td>{formatHours(row.totalMinutes)}</td>
                <td>{formatHours(row.overtimeMinutes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-[#6f675e]">{todayISO()}</p>
    </div>
  );
}
