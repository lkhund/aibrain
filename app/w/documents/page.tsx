import Link from 'next/link';
import { createDocument, createFolder } from '@/lib/actions';
import { canManageEmployees, requireUser } from '@/lib/auth';
import { all, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { personName, type EmployeeRow } from '@/lib/types';
import { ErrorNote, PageHeader, one } from '@/components/ui';

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const locale = await getLocale();
  const params = await searchParams;
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const hr = canManageEmployees(user.role);
  const folders = all<{ id: number; name: string; color: string }>(getDb(), `SELECT id, name, color FROM folders WHERE company_id = ?`, user.companyId);
  const documents = all<{ id: number; folder_id: number; name: string; requires_signature: number; shared: number; signed: number }>(
    getDb(),
    `SELECT d.id, d.folder_id, d.name, d.requires_signature,
            (SELECT COUNT(*) FROM document_access a WHERE a.document_id = d.id) AS shared,
            (SELECT COUNT(*) FROM document_access a WHERE a.document_id = d.id AND a.signed_at IS NOT NULL) AS signed
     FROM documents d WHERE d.company_id = ?`,
    user.companyId,
  );
  const visibleDocs = hr || user.role === 'director' || user.role === 'finance'
    ? documents
    : documents.filter((document) => getDb().prepare(`SELECT 1 FROM document_access WHERE document_id = ? AND employee_id = ?`).get(document.id, user.employeeId));
  const people = all<EmployeeRow>(getDb(), `SELECT id, first_name, last_name FROM employees WHERE company_id = ? AND status = 'active' ORDER BY first_name`, user.companyId);
  return (
    <div>
      <PageHeader title={t('დოკუმენტები', 'Documents')} text={t('ფოლდერები, წვდომა და ხელმოწერის სტატუსი.', 'Folders, access, and signature status.')} />
      <ErrorNote locale={locale} code={one(params.error)} />
      <div className="grid gap-4 md:grid-cols-3">
        {folders.map((folder) => (
          <section key={folder.id} className="card p-4">
            <h2 className="font-semibold" style={{ color: folder.color }}>{folder.name}</h2>
            <ul className="mt-3 grid gap-2 text-sm">
              {visibleDocs.filter((document) => document.folder_id === folder.id).map((document) => (
                <li key={document.id}>
                  <Link href={`/w/documents/${document.id}`}>{document.name}</Link>
                  <p className="text-xs text-[#6f675e]">{t('წვდომა', 'Access')} {document.shared} · {t('ხელმოწერა', 'Signed')} {document.signed}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {hr ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <form action={createFolder} className="card grid gap-2 p-4">
            <h2 className="font-semibold">{t('ახალი ფოლდერი', 'New folder')}</h2>
            <input className="field" name="name" required placeholder={t('სახელი', 'Name')} />
            <input className="field" name="color" defaultValue="#14532d" />
            <button className="btn btn-ghost w-fit" type="submit">{t('შექმნა', 'Create')}</button>
          </form>
          <form action={createDocument} className="card grid gap-2 p-4">
            <h2 className="font-semibold">{t('დოკუმენტის გაზიარება', 'Share a document')}</h2>
            <select className="field" name="folder_id">{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</select>
            <input className="field" name="name" required placeholder={t('დასახელება', 'Title')} />
            <textarea className="field" name="body" rows={4} required placeholder={t('ტექსტი', 'Text')} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requires_signature" />{t('საჭიროებს ხელმოწერას', 'Requires a signature')}</label>
            <div className="grid max-h-36 gap-1 overflow-auto text-sm">
              {people.map((person) => <label key={person.id} className="flex gap-2"><input type="checkbox" name="employee_id" value={person.id} />{personName(person)}</label>)}
            </div>
            <button className="btn btn-primary w-fit" type="submit">{t('გაზიარება', 'Share')}</button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
