import Link from 'next/link';
import { canManageEmployees, canSeeSalary, listVisibleEmployees, requireUser } from '@/lib/auth';
import { CONTRACT_TYPES, STATUSES, labelOf } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { formatGel, getLocale, tx } from '@/lib/locale';
import { personName } from '@/lib/types';
import { ErrorNote, PageHeader, Pill, one, statusTone } from '@/components/ui';

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const status = one(params.status) || 'active';
  const department = one(params.department) || '';
  const position = one(params.position) || '';
  const contract = one(params.contract) || '';
  const query = (one(params.q) || '').replace(/[%_]/g, '').trim().toLowerCase();
  const departments = all<{ id: number; name: string }>(getDb(), `SELECT id, name FROM departments WHERE company_id = ? ORDER BY name`, user.companyId);
  const positions = all<{ id: number; title: string }>(getDb(), `SELECT id, title FROM positions WHERE company_id = ? ORDER BY title`, user.companyId);
  const rows = listVisibleEmployees(user).filter((person) => {
    if (status !== 'all' && person.status !== status) return false;
    if (department && String(person.department_id) !== department) return false;
    if (position && String(person.position_id) !== position) return false;
    if (contract && person.contract_type !== contract) return false;
    if (!query) return true;
    return `${person.first_name} ${person.last_name} ${person.personal_id || ''} ${person.email || ''}`.toLowerCase().includes(query);
  });

  return (
    <div>
      <PageHeader title={t('თანამშრომლები', 'Employees')} text={t('ბაზა, კანდიდატები და განთავისუფლებულები ერთ სიაში.', 'Employees, candidates, and former staff in one list.')}>
        {canManageEmployees(user.role) ? <Link className="btn btn-primary" href="/w/employees/new">{t('დამატება', 'Add')}</Link> : null}
        <a className="btn btn-ghost" href={`/api/export?kind=employees&status=${status}&department=${department}&position=${position}&contract=${contract}&q=${encodeURIComponent(query)}`}>{t('Excel', 'Excel')}</a>
      </PageHeader>
      <ErrorNote locale={locale} code={one(params.error)} />
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((item) => (
          <Link key={item.id} href={`/w/employees?status=${item.id}`} className={`btn btn-small ${status === item.id ? 'btn-dark' : 'btn-ghost'}`}>{locale === 'ka' ? item.ka : item.en}</Link>
        ))}
      </div>
      <form className="mb-4 grid gap-2 md:grid-cols-5" method="get">
        <input type="hidden" name="status" value={status} />
        <input className="field" name="q" defaultValue={query} placeholder={t('სახელი ან ნომერი', 'Name or number')} />
        <select className="field" name="department" defaultValue={department}><option value="">{t('ყველა განყოფილება', 'All departments')}</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select className="field" name="position" defaultValue={position}><option value="">{t('ყველა პოზიცია', 'All positions')}</option>{positions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select className="field" name="contract" defaultValue={contract}><option value="">{t('ყველა ხელშეკრულება', 'All contracts')}</option>{CONTRACT_TYPES.map((item) => <option key={item.id} value={item.id}>{locale === 'ka' ? item.ka : item.en}</option>)}</select>
        <button className="btn btn-dark" type="submit">{t('ფილტრი', 'Filter')}</button>
      </form>
      <div className="card table-wrap">
        <table className="data">
          <thead><tr>
            <th>{t('სახელი', 'Name')}</th><th>{t('განყოფილება', 'Department')}</th><th>{t('პოზიცია', 'Position')}</th><th>{t('ხელშეკრულება', 'Contract')}</th><th>{t('სტატუსი', 'Status')}</th>{canSeeSalary(user, -1) ? <th>{t('ხელფასი', 'Pay')}</th> : null}
          </tr></thead>
          <tbody>
            {rows.map((person) => (
              <tr key={person.id}>
                <td><Link className="font-medium" href={`/w/employees/${person.id}`}>{personName(person)}</Link></td>
                <td>{person.department_name}</td>
                <td>{person.position_title}</td>
                <td>{labelOf(CONTRACT_TYPES, person.contract_type, locale)}</td>
                <td><Pill tone={statusTone(person.status)}>{labelOf(STATUSES, person.status, locale)}</Pill></td>
                {canSeeSalary(user, -1) ? <td>{person.salary_gross ? formatGel(locale, person.salary_gross) : person.hourly_rate ? `${person.hourly_rate} ₾/${t('სთ', 'h')}` : person.output_rate ? `${person.output_rate} ₾` : '—'}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
