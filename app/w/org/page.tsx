import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { all, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { PageHeader } from '@/components/ui';

type Department = { id: number; name: string; parent_id: number | null; manager_name: string | null };
type Position = { title: string; department_id: number; department: string; planned_headcount: number; filled: number };
type Person = { id: number; first_name: string; last_name: string; manager_id: number | null; position_title: string | null };

function Tree({ people, parent }: { people: Person[]; parent: number | null }) {
  const nodes = people.filter((person) => person.manager_id === parent);
  if (!nodes.length) return null;
  return (
    <ul className={parent === null ? 'grid gap-2' : 'ml-4 mt-2 border-l border-[#e4ddd0] pl-3'}>
      {nodes.map((person) => (
        <li key={person.id}>
          <p className="text-sm"><span className="font-medium">{person.first_name} {person.last_name}</span> <span className="text-[#6f675e]">· {person.position_title}</span></p>
          <Tree people={people} parent={person.id} />
        </li>
      ))}
    </ul>
  );
}

export default async function OrgPage() {
  const user = await requireUser();
  if (user.role === 'employee') redirect('/w');
  const locale = await getLocale();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const departments = all<Department>(getDb(), `SELECT d.id, d.name, d.parent_id, TRIM(COALESCE(e.first_name,'') || ' ' || COALESCE(e.last_name,'')) AS manager_name FROM departments d LEFT JOIN employees e ON e.id = d.manager_employee_id WHERE d.company_id = ?`, user.companyId);
  const positions = all<Position>(getDb(), `SELECT p.title, p.department_id, d.name AS department, p.planned_headcount, (SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id AND e.status = 'active') AS filled FROM positions p JOIN departments d ON d.id = p.department_id WHERE p.company_id = ? ORDER BY d.name`, user.companyId);
  const people = all<Person>(getDb(), `SELECT e.id, e.first_name, e.last_name, e.manager_id, p.title AS position_title FROM employees e LEFT JOIN positions p ON p.id = e.position_id WHERE e.company_id = ? AND e.status = 'active'`, user.companyId);
  return (
    <div className="grid gap-5">
      <PageHeader title={t('სტრუქტურა და საშტატო ნუსხა', 'Structure and staffing plan')} text={t('იერარქია და ვაკანსიები ერთ ეკრანზე.', 'Reporting lines and vacancies on one screen.')} />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold">{t('დაქვემდებარება', 'Reporting lines')}</h2>
          <div className="mt-3"><Tree people={people} parent={null} /></div>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold">{t('განყოფილებები', 'Departments')}</h2>
          <ul className="mt-3 grid gap-2 text-sm">{departments.map((department) => <li key={department.id}>{department.name} · {department.manager_name || '—'}</li>)}</ul>
        </section>
      </div>
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>{t('განყოფილება', 'Department')}</th><th>{t('პოზიცია', 'Position')}</th><th>{t('გეგმა', 'Planned')}</th><th>{t('დაკავებული', 'Filled')}</th><th>{t('ვაკანსია', 'Vacant')}</th></tr></thead>
          <tbody>
            {positions.map((position) => (
              <tr key={`${position.department}-${position.title}`}>
                <td>{position.department}</td><td>{position.title}</td><td>{position.planned_headcount}</td><td>{position.filled}</td>
                <td className={position.planned_headcount - position.filled > 0 ? 'font-semibold text-[#c4622d]' : ''}>{position.planned_headcount - position.filled}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
