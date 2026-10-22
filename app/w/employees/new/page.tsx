import { createEmployee } from '@/lib/actions';
import { canManageEmployees, requireUser } from '@/lib/auth';
import { all, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { personName } from '@/lib/types';
import { EmployeeFields } from '@/components/employee-fields';
import { ErrorNote, PageHeader, one } from '@/components/ui';
import { redirect } from 'next/navigation';

export default async function NewEmployeePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) redirect('/w/employees');
  const locale = await getLocale();
  const params = await searchParams;
  const departments = all<{ id: number; name: string }>(getDb(), `SELECT id, name FROM departments WHERE company_id = ?`, user.companyId);
  const positions = all<{ id: number; title: string; department_id: number }>(getDb(), `SELECT id, title, department_id FROM positions WHERE company_id = ?`, user.companyId);
  const managers = all<{ id: number; first_name: string; last_name: string }>(getDb(), `SELECT id, first_name, last_name FROM employees WHERE company_id = ? AND status = 'active'`, user.companyId);
  return (
    <div>
      <PageHeader title={tx(locale, 'ახალი ჩანაწერი', 'New record')} />
      <ErrorNote locale={locale} code={one(params.error)} />
      <form action={createEmployee} className="card mt-4 grid gap-4 p-5">
        <EmployeeFields locale={locale} departments={departments} positions={positions} managers={managers.map((manager) => ({ id: manager.id, name: personName(manager) }))} />
        <button className="btn btn-primary w-fit" type="submit">{tx(locale, 'შენახვა', 'Save')}</button>
      </form>
    </div>
  );
}
