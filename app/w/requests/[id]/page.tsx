import Link from 'next/link';
import { notFound } from 'next/navigation';
import { actOnRequest, cancelRequest } from '@/lib/actions';
import { getVisibleEmployee, requireUser } from '@/lib/auth';
import { requestType } from '@/lib/catalog';
import { all, get, getDb } from '@/lib/db';
import { formatGel, getLocale, tx } from '@/lib/locale';
import { formatDate } from '@/lib/time';
import { ErrorNote, PageHeader, Pill, one, statusTone } from '@/components/ui';

type Step = { id: number; step_order: number; role: string; approver_employee_id: number | null; status: string; acted_at: string | null; comment: string | null; first_name: string | null; last_name: string | null };

export default async function RequestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const { id } = await params;
  const query = await searchParams;
  const request = get<{ id: number; type: string; status: string; payload: string; employee_id: number; created_by: number; created_at: string; first_name: string; last_name: string }>(
    getDb(),
    `SELECT r.*, e.first_name, e.last_name FROM requests r JOIN employees e ON e.id = r.employee_id WHERE r.id = ? AND r.company_id = ?`,
    Number(id),
    user.companyId,
  );
  if (!request) notFound();
  const steps = all<Step>(getDb(), `SELECT s.*, e.first_name, e.last_name FROM approval_steps s LEFT JOIN employees e ON e.id = s.approver_employee_id WHERE s.request_id = ? ORDER BY s.step_order`, request.id);
  const visible = getVisibleEmployee(user, request.employee_id);
  const involved = steps.some((step) => step.approver_employee_id === user.employeeId) || request.created_by === user.id;
  if (!visible && !involved) notFound();
  const spec = requestType(request.type);
  const payload = JSON.parse(request.payload) as Record<string, string | number>;
  const pending = steps.find((step) => step.status === 'pending');
  const canAct = request.status === 'pending' && pending && (pending.approver_employee_id === user.employeeId || (!pending.approver_employee_id && pending.role === user.role));
  const t = (ka: string, en: string) => tx(locale, ka, en);
  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeader title={`${spec ? (locale === 'ka' ? spec.ka : spec.en) : request.type} #${request.id}`} text={`${request.first_name} ${request.last_name}`}>
        <Pill tone={statusTone(request.status)}>{request.status}</Pill>
        <a className="btn btn-ghost btn-small" href={`/api/export?kind=request&id=${request.id}`}>PDF</a>
      </PageHeader>
      <ErrorNote locale={locale} code={one(query.error)} />
      <section className="card p-4 text-sm">
        <p className="text-[#6f675e]">{formatDate(request.created_at.slice(0, 10))}</p>
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {Object.entries(payload).map(([key, value]) => (
            <div key={key}><dt className="text-[#6f675e]">{key}</dt><dd>{key === 'amount' ? formatGel(locale, Number(value)) : String(value)}</dd></div>
          ))}
        </dl>
      </section>
      <ol className="grid gap-2">
        {steps.map((step) => (
          <li key={step.id} className="card flex items-start justify-between gap-3 p-4">
            <div>
              <p className="text-sm font-medium">{step.step_order}. {step.first_name ? `${step.first_name} ${step.last_name}` : step.role}</p>
              <p className="text-xs text-[#6f675e]">{step.role}{step.comment ? ` · ${step.comment}` : ''}</p>
            </div>
            <Pill tone={statusTone(step.status)}>{step.status}</Pill>
          </li>
        ))}
      </ol>
      {canAct ? (
        <form action={actOnRequest} className="card grid gap-3 p-4">
          <input type="hidden" name="id" value={request.id} />
          <textarea className="field" name="comment" rows={3} placeholder={t('კომენტარი', 'Comment')} />
          <div className="flex gap-2">
            <button className="btn btn-primary" name="decision" value="approve" type="submit">{t('დადასტურება', 'Approve')}</button>
            <button className="btn btn-ghost" name="decision" value="reject" type="submit">{t('უარყოფა', 'Reject')}</button>
          </div>
        </form>
      ) : null}
      {request.status === 'pending' && (request.created_by === user.id || user.role === 'hr') ? (
        <form action={cancelRequest}><input type="hidden" name="id" value={request.id} /><button className="btn btn-ghost btn-small" type="submit">{t('გაუქმება', 'Cancel')}</button></form>
      ) : null}
      <Link className="text-sm text-[#6f675e]" href="/w/requests">{t('სიაში დაბრუნება', 'Back to the list')}</Link>
    </div>
  );
}
