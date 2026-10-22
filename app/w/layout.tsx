import { Shell } from '@/components/shell';
import { requireUser } from '@/lib/auth';
import { get } from '@/lib/db';
import { getDb } from '@/lib/db';
import { getLocale } from '@/lib/locale';

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const locale = await getLocale();
  const unread = get<{ count: number }>(getDb(), `SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND read_at IS NULL`, user.id)?.count ?? 0;
  return <Shell user={user} locale={locale} unread={unread}>{children}</Shell>;
}
