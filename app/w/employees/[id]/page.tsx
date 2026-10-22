import { notFound } from 'next/navigation';
import { addProfileItem, dismissEmployee, saveBalance, syncRs, updateEmployee } from '@/lib/actions';
import { canManageEmployees, canSeeSalary, getVisibleEmployee, requireUser } from '@/lib/auth';
import { CONTRACT_TYPES, SALARY_TYPES, STATUSES, labelOf } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { formatGel, getLocale, tx } from '@/lib/locale';
import { formatDate } from '@/lib/time';
import { personName, type EmployeeRow } from '@/lib/types';
import { EmployeeFields } from '@/components/employee-fields';
import { ErrorNote, PageHeader, Pill, one, statusTone } from '@/components/ui';

export default async function EmployeeProfile({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const { id } = await params;
  const query = await searchParams;
  const employee = getVisibleEmployee(user, Number(id));
  if (!employee) notFound();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const db = getDb();
  const balances = all<{ type: string; entitled: number; used: number }>(db, `SELECT type, entitled, used FROM vacation_balances WHERE employee_id = ? AND year = 2026`, employee.id);
  const education = all<{ institution: string; degree: string; year: number | null }>(db, `SELECT institution, degree, year FROM education WHERE employee_id = ?`, employee.id);
  const benefits = all<{ name: string; amount: number | null }>(db, `SELECT name, amount FROM benefits WHERE employee_id = ?`, employee.id);
  const files = all<{ name: string; kind: string; added_at: string }>(db, `SELECT name, kind, added_at FROM employee_files WHERE employee_id = ?`, employee.id);
  const departments = all<{ id: number; name: string }>(db, `SELECT id, name FROM departments WHERE company_id = ?`, user.companyId);
  const positions = all<{ id: number; title: string; department_id: number }>(db, `SELECT id, title, department_id FROM positions WHERE company_id = ?`, user.companyId);
  const managers = all<EmployeeRow>(db, `SELECT id, first_name, last_name FROM employees WHERE company_id = ? AND status = 'active' AND id != ?`, user.companyId, employee.id);
  const showPay = canSeeSalary(user, employee.id);
  const annual = balances.find((item) => item.type === 'annual');
  const study = balances.find((item) => item.type === 'study');
  const hr = canManageEmployees(user.role);

  return (
    <div className="grid gap-5">
      <PageHeader title={personName(employee)} text={`${employee.position_title || '—'} · ${employee.department_name || '—'}`}>
        <Pill tone={statusTone(employee.status)}>{labelOf(STATUSES, employee.status, locale)}</Pill>
        <Pill tone={statusTone(employee.rs_status)}>RS.ge · {employee.rs_status}</Pill>
      </PageHeader>
      <ErrorNote locale={locale} code={one(query.error)} />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4 lg:col-span-2">
          <h2 className="font-semibold">{t('პირადი და სამუშაო მონაცემები', 'Personal and work details')}</h2>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            <div><dt className="text-[#6f675e]">{t('პირადი ნომერი', 'Personal No.')}</dt><dd>{employee.personal_id || '—'}</dd></div>
            <div><dt className="text-[#6f675e]">{t('დაბადება', 'Birth date')}</dt><dd>{formatDate(employee.birth_date)}</dd></div>
            <div><dt className="text-[#6f675e]">{t('ტელეფონი', 'Phone')}</dt><dd>{employee.phone || '—'}</dd></div>
            <div><dt className="text-[#6f675e]">{t('ელფოსტა', 'Email')}</dt><dd>{employee.email || '—'}</dd></div>
            <div><dt className="text-[#6f675e]">{t('მისამართი', 'Address')}</dt><dd>{employee.address || '—'}</dd></div>
            <div><dt className="text-[#6f675e]">{t('ხელმძღვანელი', 'Manager')}</dt><dd>{employee.manager_name || '—'}</dd></div>
            <div><dt className="text-[#6f675e]">{t('მიღება', 'Hired')}</dt><dd>{formatDate(employee.hire_date)}</dd></div>
            <div><dt className="text-[#6f675e]">{t('ხელშეკრულება', 'Contract')}</dt><dd>{labelOf(CONTRACT_TYPES, employee.contract_type, locale)} {employee.contract_end ? `· ${formatDate(employee.contract_end)}` : ''}</dd></div>
            <div><dt className="text-[#6f675e]">{t('გრაფიკი', 'Schedule')}</dt><dd>{employee.schedule_start}–{employee.schedule_end}</dd></div>
            {showPay ? <div><dt className="text-[#6f675e]">{t('ანაზღაურება', 'Pay')}</dt><dd>{labelOf(SALARY_TYPES, employee.salary_type, locale)} · {employee.salary_gross ? formatGel(locale, employee.salary_gross) : employee.hourly_rate ? `${employee.hourly_rate} ₾` : employee.output_rate ? `${employee.output_rate} ₾` : '—'}</dd></div> : null}
            <div><dt className="text-[#6f675e]">{t('საპენსიო', 'Pension')}</dt><dd>{employee.pension_participant ? t('მონაწილე', 'Participant') : t('არ მონაწილეობს', 'Not participating')}</dd></div>
            {employee.dismiss_date ? <div><dt className="text-[#6f675e]">{t('განთავისუფლება', 'Dismissed')}</dt><dd>{formatDate(employee.dismiss_date)} · {employee.dismiss_reason}</dd></div> : null}
          </dl>
          {hr ? (
            <form action={syncRs} className="mt-4">
              <input type="hidden" name="id" value={employee.id} />
              <button className="btn btn-ghost btn-small" type="submit">{t('RS.ge სინქრონიზაცია', 'Sync RS.ge status')}</button>
              {employee.rs_synced_at ? <span className="ml-2 text-xs text-[#6f675e]">{employee.rs_synced_at.slice(0, 16).replace('T', ' ')}</span> : null}
            </form>
          ) : null}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold">{t('შვებულების ბალანსი', 'Leave balance')}</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            <li>{t('წლიური', 'Annual')}: {(annual?.entitled || 0) - (annual?.used || 0)} / {annual?.entitled || 0}</li>
            <li>{t('სასწავლო', 'Study')}: {(study?.entitled || 0) - (study?.used || 0)} / {study?.entitled || 0}</li>
            {balances.filter((item) => !['annual', 'study'].includes(item.type) && item.used).map((item) => <li key={item.type}>{item.type}: {item.used}</li>)}
          </ul>
          {hr ? (
            <form action={saveBalance} className="mt-4 grid gap-2">
              <input type="hidden" name="id" value={employee.id} />
              <input type="hidden" name="year" value={2026} />
              <label className="text-xs">{t('წლიური უფლება', 'Annual entitlement')}<input className="field" name="annual" type="number" defaultValue={annual?.entitled ?? 24} /></label>
              <label className="text-xs">{t('სასწავლო უფლება', 'Study entitlement')}<input className="field" name="study" type="number" defaultValue={study?.entitled ?? 5} /></label>
              <button className="btn btn-ghost btn-small" type="submit">{t('ნაშთის შენახვა', 'Save balances')}</button>
            </form>
          ) : null}
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-4">
          <h2 className="font-semibold">{t('განათლება', 'Education')}</h2>
          <ul className="mt-2 text-sm">{education.map((item) => <li key={item.degree}>{item.institution} — {item.degree} ({item.year})</li>)}</ul>
          {hr ? <form action={addProfileItem} className="mt-3 grid gap-2"><input type="hidden" name="id" value={employee.id} /><input type="hidden" name="kind" value="education" /><input className="field" name="institution" placeholder={t('სასწავლებელი', 'Institution')} /><input className="field" name="degree" placeholder={t('ხარისხი', 'Degree')} /><input className="field" name="year" placeholder="2020" /><button className="btn btn-ghost btn-small" type="submit">{t('დამატება', 'Add')}</button></form> : null}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold">{t('ბენეფიტები', 'Benefits')}</h2>
          <ul className="mt-2 text-sm">{benefits.map((item) => <li key={item.name}>{item.name} · {formatGel(locale, item.amount || 0)}</li>)}</ul>
          {hr ? <form action={addProfileItem} className="mt-3 grid gap-2"><input type="hidden" name="id" value={employee.id} /><input type="hidden" name="kind" value="benefit" /><input className="field" name="name" placeholder={t('სახელი', 'Name')} /><input className="field" name="amount" type="number" step="0.01" /><button className="btn btn-ghost btn-small" type="submit">{t('დამატება', 'Add')}</button></form> : null}
        </section>
        <section className="card p-4">
          <h2 className="font-semibold">{t('პირადი საქმის დოკუმენტები', 'File documents')}</h2>
          <ul className="mt-2 text-sm">{files.map((item) => <li key={`${item.kind}-${item.name}`}>{item.name} · {formatDate(item.added_at)}</li>)}</ul>
          {hr ? <form action={addProfileItem} className="mt-3 grid gap-2"><input type="hidden" name="id" value={employee.id} /><input type="hidden" name="kind" value="file" /><input className="field" name="name" placeholder={t('დასახელება', 'Title')} /><button className="btn btn-ghost btn-small" type="submit">{t('დამატება', 'Add')}</button></form> : null}
        </section>
      </div>
      {hr && employee.status === 'active' ? (
        <form action={dismissEmployee} className="card flex flex-wrap items-end gap-2 p-4">
          <input type="hidden" name="id" value={employee.id} />
          <label className="text-sm">{t('განთავისუფლების თარიღი', 'Dismissal date')}<input className="field" type="date" name="date" required /></label>
          <label className="text-sm">{t('საფუძველი', 'Reason')}<input className="field" name="reason" /></label>
          <button className="btn btn-ghost" type="submit">{t('განთავისუფლება', 'Dismiss')}</button>
        </form>
      ) : null}
      {hr ? (
        <form action={updateEmployee} className="card grid gap-4 p-5">
          <h2 className="font-semibold">{t('ჩანაწერის რედაქტირება', 'Edit record')}</h2>
          <input type="hidden" name="id" value={employee.id} />
          <EmployeeFields locale={locale} employee={employee} departments={departments} positions={positions} managers={managers.map((manager) => ({ id: manager.id, name: personName(manager) }))} />
          <button className="btn btn-primary w-fit" type="submit">{t('შენახვა', 'Save')}</button>
        </form>
      ) : null}
    </div>
  );
}
