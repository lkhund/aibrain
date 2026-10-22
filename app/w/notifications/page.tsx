import { markNotificationsRead, openNotification } from '@/lib/actions';
import { requireUser } from '@/lib/auth';
import { requestType } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { PageHeader } from '@/components/ui';

const kinds: Record<string, [string, string]> = {
  approval_needed: ['დასადასტურებელია', 'Needs your approval'],
  request_approved: ['მოთხოვნა დადასტურდა', 'Request approved'],
  request_rejected: ['მოთხოვნა უარყოფილია', 'Request rejected'],
  document_shared: ['ახალი დოკუმენტი', 'New document'],
  tabel_shared: ['ტაბელი გაზიარებულია', 'Tabel shared'],
};

export default async function NotificationsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const notes = all<{ id: number; kind: string; detail: string; read_at: string | null; created_at: string }>(getDb(), `SELECT id, kind, detail, read_at, created_at FROM notifications WHERE user_id = ? ORDER BY id DESC`, user.id);
  return (
    <div className="max-w-2xl">
      <PageHeader title={t('შეტყობინებები', 'Notifications')}>
        <form action={markNotificationsRead}><button className="btn btn-ghost btn-small" type="submit">{t('ყველას წაკითხვა', 'Mark all read')}</button></form>
      </PageHeader>
      <div className="grid gap-2">
        {notes.map((note) => {
          const spec = requestType(note.detail);
          const detail = spec ? (locale === 'ka' ? spec.ka : spec.en) : note.detail;
          const label = kinds[note.kind] ? t(kinds[note.kind][0], kinds[note.kind][1]) : note.kind;
          return (
            <form key={note.id} action={openNotification}>
              <input type="hidden" name="id" value={note.id} />
              <button className={`card w-full px-4 py-3 text-left ${note.read_at ? 'opacity-60' : ''}`} type="submit">
                <span className="block text-sm font-medium">{label}</span>
                <span className="text-xs text-[#6f675e]">{detail}</span>
              </button>
            </form>
          );
        })}
      </div>
    </div>
  );
}
