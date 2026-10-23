import Link from 'next/link';
import { notFound } from 'next/navigation';
import { signDocument } from '@/lib/actions';
import { requireUser } from '@/lib/auth';
import { all, get, getDb, run } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { formatDate } from '@/lib/time';
import { PageHeader } from '@/components/ui';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const { id } = await params;
  const document = get<{ id: number; name: string; body: string; requires_signature: number; folder: string }>(
    getDb(),
    `SELECT d.id, d.name, d.body, d.requires_signature, f.name AS folder FROM documents d JOIN folders f ON f.id = d.folder_id WHERE d.id = ? AND d.company_id = ?`,
    Number(id),
    user.companyId,
  );
  if (!document) notFound();
  const access = all<{ employee_id: number; first_name: string; last_name: string; seen_at: string | null; downloaded_at: string | null; signed_at: string | null }>(
    getDb(),
    `SELECT a.employee_id, e.first_name, e.last_name, a.seen_at, a.downloaded_at, a.signed_at
     FROM document_access a JOIN employees e ON e.id = a.employee_id WHERE a.document_id = ?`,
    document.id,
  );
  const mine = access.find((row) => row.employee_id === user.employeeId);
  const admin = user.role === 'hr' || user.role === 'director' || user.role === 'finance';
  if (!mine && !admin) notFound();
  if (mine && !mine.seen_at) {
    run(getDb(), `UPDATE document_access SET seen_at = ? WHERE document_id = ? AND employee_id = ?`, new Date().toISOString(), document.id, user.employeeId);
    mine.seen_at = new Date().toISOString();
  }
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const yes = t('დიახ', 'Yes');
  const no = t('არა', 'No');
  return (
    <div className="grid max-w-3xl gap-4">
      <PageHeader title={document.name} text={document.folder}>
        <a className="btn btn-ghost btn-small" href={`/api/export?kind=document&id=${document.id}`}>{t('გადმოწერა', 'Download')}</a>
      </PageHeader>
      <article className="card whitespace-pre-wrap p-5 text-sm leading-6">{document.body}</article>
      {document.requires_signature && mine && !mine.signed_at ? (
        <form action={signDocument}>
          <input type="hidden" name="id" value={document.id} />
          <button className="btn btn-primary" type="submit">{t('ხელმოწერა', 'Sign')}</button>
        </form>
      ) : null}
      {admin ? (
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>{t('თანამშრომელი', 'Employee')}</th><th>{t('ნახა', 'Seen')}</th><th>{t('გადმოწერა', 'Downloaded')}</th><th>{t('ხელმოწერა', 'Signed')}</th></tr></thead>
            <tbody>
              {access.map((row) => (
                <tr key={row.employee_id}>
                  <td>{row.first_name} {row.last_name}</td>
                  <td>{row.seen_at ? formatDate(row.seen_at.slice(0, 10)) : no}</td>
                  <td>{row.downloaded_at ? yes : no}</td>
                  <td>{row.signed_at ? yes : no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <Link className="text-sm text-[#6f675e]" href="/w/documents">{t('ფოლდერებში დაბრუნება', 'Back to folders')}</Link>
    </div>
  );
}
