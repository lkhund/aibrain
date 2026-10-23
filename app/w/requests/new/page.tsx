import { listVisibleEmployees, requireUser } from '@/lib/auth';
import { REQUEST_TYPES } from '@/lib/catalog';
import { getLocale, tx } from '@/lib/locale';
import { personName } from '@/lib/types';
import { RequestForm } from '@/components/request-form';
import { ErrorNote, PageHeader, one } from '@/components/ui';

export default async function NewRequestPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const people = listVisibleEmployees(user).map((person) => ({ id: person.id, name: `${personName(person)} · ${person.status}` }));
  return (
    <div className="max-w-xl">
      <PageHeader title={tx(locale, 'ახალი მოთხოვნა', 'New request')} />
      <ErrorNote locale={locale} code={one(params.error)} />
      <div className="mt-4">
        <RequestForm types={REQUEST_TYPES} employees={people} locale={locale} selfId={user.employeeId} canPick={user.role === 'hr' || user.role === 'director'} />
      </div>
    </div>
  );
}
