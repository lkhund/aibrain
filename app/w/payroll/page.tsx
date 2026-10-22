import { redirect } from 'next/navigation';
import { savePayrollInputs } from '@/lib/actions';
import { canSeePayroll, requireUser } from '@/lib/auth';
import { SALARY_TYPES, labelOf } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { formatGel, getLocale, tx } from '@/lib/locale';
import { payrollForMonth } from '@/lib/payroll-run';
import { parseMonthQuery } from '@/lib/time';
import { MonthPicker, PageHeader } from '@/components/ui';

export default async function PayrollPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canSeePayroll(user.role)) redirect('/w');
  const locale = await getLocale();
  const params = await searchParams;
  const { year, month } = parseMonthQuery({ year: typeof params.year === 'string' ? params.year : undefined, month: typeof params.month === 'string' ? params.month : undefined });
  const lines = payrollForMonth(user.companyId, year, month);
  const inputs = all<{ employee_id: number; bonus: number; deduction: number; output_units: number; commission: number }>(getDb(), `SELECT employee_id, bonus, deduction, output_units, commission FROM payroll_inputs WHERE year = ? AND month = ?`, year, month);
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const totalNet = lines.reduce((sum, line) => sum + line.net, 0);
  const totalTax = lines.reduce((sum, line) => sum + line.tax, 0);
  const totalPension = lines.reduce((sum, line) => sum + line.pensionEe + line.pensionEr, 0);
  return (
    <div>
      <PageHeader title={t('ხელფასი და გამომუშავება', 'Payroll & earnings')} text={t('საშემოსავლო 20%. საპენსიო 2% დასაქმებულს და 2% დამსაქმებელს, თუ მონაწილეა. ზეგანაკვეთური 1.5 ტარიფით.', 'Income tax is 20%. Pension is 2% employee and 2% employer for participants. Overtime is paid at 1.5×.')}>
        <MonthPicker year={year} month={month} locale={locale} />
        <a className="btn btn-ghost btn-small" href={`/api/export?kind=payroll&year=${year}&month=${month}`}>Excel</a>
      </PageHeader>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('ხელზე სულ', 'Total net')}</p><p className="text-xl font-semibold">{formatGel(locale, totalNet)}</p></div>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('საშემოსავლო', 'Income tax')}</p><p className="text-xl font-semibold">{formatGel(locale, totalTax)}</p></div>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('საპენსიო სულ', 'Pension total')}</p><p className="text-xl font-semibold">{formatGel(locale, totalPension)}</p></div>
      </div>
      <form action={savePayrollInputs}>
        <input type="hidden" name="year" value={year} /><input type="hidden" name="month" value={month} />
        <input type="hidden" name="ids" value={lines.map((line) => line.employeeId).join(',')} />
        <div className="card table-wrap">
          <table className="data">
            <thead><tr>
              <th>{t('თანამშრომელი', 'Employee')}</th><th>{t('ტიპი', 'Type')}</th><th>{t('დარიცხული', 'Accrued')}</th><th>{t('ზეგანაკვეთური', 'Overtime')}</th><th>{t('პრემია', 'Bonus')}</th><th>{t('კომისია', 'Commission')}</th><th>{t('ერთეული', 'Units')}</th><th>{t('დაქვითვა', 'Deduction')}</th><th>{t('საპენსიო', 'Pension')}</th><th>{t('გადასახადი', 'Tax')}</th><th>{t('ხელზე', 'Net')}</th>
            </tr></thead>
            <tbody>
              {lines.map((line) => {
                const input = inputs.find((item) => item.employee_id === line.employeeId);
                return (
                  <tr key={line.employeeId}>
                    <td>{line.name}<div className="text-xs text-[#6f675e]">{line.department}</div></td>
                    <td>{labelOf(SALARY_TYPES, line.salaryType, locale)}</td>
                    <td>{formatGel(locale, line.accrued)}</td>
                    <td>{line.overtimeHours ? `${line.overtimeHours} ${t('სთ', 'h')}` : '—'}</td>
                    <td><input className="field !w-24" name={`bonus_${line.employeeId}`} type="number" step="0.01" defaultValue={input?.bonus || 0} /></td>
                    <td><input className="field !w-24" name={`commission_${line.employeeId}`} type="number" step="0.01" defaultValue={input?.commission || 0} /></td>
                    <td><input className="field !w-20" name={`units_${line.employeeId}`} type="number" step="0.01" defaultValue={input?.output_units || 0} /></td>
                    <td><input className="field !w-24" name={`deduction_${line.employeeId}`} type="number" step="0.01" defaultValue={input?.deduction || 0} /></td>
                    <td>{formatGel(locale, line.pensionEe)}</td>
                    <td>{formatGel(locale, line.tax)}</td>
                    <td className="font-semibold">{formatGel(locale, line.net)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary mt-4" type="submit">{t('ცვლილებების შენახვა', 'Save adjustments')}</button>
      </form>
    </div>
  );
}
