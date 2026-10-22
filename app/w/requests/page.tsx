import Link from 'next/link';
import { listVisibleEmployees, requireUser } from '@/lib/auth';
import { REQUEST_TYPES, requestType } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { formatDate } from '@/lib/time';
import { PageHeader, Pill, statusTone } from '@/components/ui';

const statuses = ['pending', 'approved', 'rejected', 'cancelled'] as const;

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const status = typeof params.status === 'string' ? params.status : '';
  const type = typeof params.type === 'string' ? params.type : '';
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const visible = new Set(listVisibleEmployees(user).map((person) => person.id));
  const rows = all<{ id: number; type: string; status: string; created_at: string; employee_id: number; first_name: string; last_name: string }>(
    getDb(),
    `SELECT r.id, r.type, r.status, r.created_at, r.employee_id, e.first_name, e.last_name
     FROM requests r JOIN employees e ON e.id = r.employee_id
     WHERE r.company_id = ? ORDER BY r.id DESC`,
    user.companyId,
  ).filter((row) => visible.has(row.employee_id) && (!status || row.status === status) && (!type || row.type === type));

  return (
    <div>
      <PageHeader title={t('მოთხოვნები', 'Requests')} text={t('22 შაბლონი და ეტაპობრივი დადასტურება.', '22 templates and step-by-step approval.')}>
        <Link className="btn btn-primary" href="/w/requests/new">{t('ახალი მოთხოვნა', 'New request')}</Link>
      </PageHeader>
      <form className="mb-4 flex flex-wrap gap-2" method="get">
        <select className="field !w-auto" name="status" defaultValue={status}><option value="">{t('ყველა სტატუსი', 'All statuses')}</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select className="field !w-auto" name="type" defaultValue={type}><option value="">{t('ყველა ტიპი', 'All types')}</option>{REQUEST_TYPES.map((item) => <option key={item.id} value={item.id}>{locale === 'ka' ? item.ka : item.en}</option>)}</select>
        <button className="btn btn-ghost" type="submit">{t('ფილტრი', 'Filter')}</button>
      </form>
      <div className="card table-wrap">
        <table className="data">
          <thead><tr><th>№</th><th>{t('თანამშრომელი', 'Employee')}</th><th>{t('ტიპი', 'Type')}</th><th>{t('სტატუსი', 'Status')}</th><th>{t('თარიღი', 'Date')}</th></tr></thead>
          <tbody>
            {rows.map((row) => {
              const spec = requestType(row.type);
              return (
                <tr key={row.id}>
                  <td><Link href={`/w/requests/${row.id}`}>{row.id}</Link></td>
                  <td>{row.first_name} {row.last_name}</td>
                  <td>{spec ? (locale === 'ka' ? spec.ka : spec.en) : row.type}</td>
                  <td><Pill tone={statusTone(row.status)}>{row.status}</Pill></td>
                  <td>{formatDate(row.created_at.slice(0, 10))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
