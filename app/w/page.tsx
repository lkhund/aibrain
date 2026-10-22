import Link from 'next/link';
import { punch } from '@/lib/actions';
import { canSeePayroll, listVisibleEmployees, requireUser } from '@/lib/auth';
import { all, get, getDb } from '@/lib/db';
import { formatGel, getLocale, tx } from '@/lib/locale';
import { requestType } from '@/lib/catalog';
import { formatDate, todayISO } from '@/lib/time';
import { personName } from '@/lib/types';

export default async function DashboardPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const db = getDb();
  const people = listVisibleEmployees(user);
  const active = people.filter((person) => person.status === 'active').length;
  const mine = user.employeeId ? get<{ check_in: string | null; check_out: string | null }>(db, `SELECT check_in, check_out FROM attendance WHERE employee_id = ? AND date = ?`, user.employeeId, todayISO()) : undefined;
  const balance = user.employeeId ? get<{ entitled: number; used: number }>(db, `SELECT entitled, used FROM vacation_balances WHERE employee_id = ? AND year = ? AND type = 'annual'`, user.employeeId, 2026) : undefined;
  const approvals = user.employeeId
    ? all<{ id: number; type: string; first_name: string; last_name: string }>(
      db,
      `SELECT r.id, r.type, e.first_name, e.last_name
       FROM approval_steps s JOIN requests r ON r.id = s.request_id JOIN employees e ON e.id = r.employee_id
       WHERE s.status = 'pending' AND s.approver_employee_id = ? AND r.company_id = ?`,
      user.employeeId,
      user.companyId,
    )
    : [];
  const expiring = people.filter((person) => person.contract_end && person.contract_end <= '2026-12-31' && person.contract_end >= todayISO());
  const notes = all<{ id: number; kind: string; detail: string; href: string | null }>(db, `SELECT id, kind, detail, href FROM notifications WHERE user_id = ? AND read_at IS NULL ORDER BY id DESC LIMIT 5`, user.id);
  const kindLabel: Record<string, [string, string]> = {
    approval_needed: ['დასადასტურებელია', 'Needs your approval'],
    request_approved: ['მოთხოვნა დადასტურდა', 'Request approved'],
    request_rejected: ['მოთხოვნა უარყოფილია', 'Request rejected'],
    document_shared: ['ახალი დოკუმენტი', 'New document'],
    tabel_shared: ['ტაბელი გაზიარებულია', 'Tabel shared'],
  };

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-sm text-[#6f675e]">{formatDate(todayISO())}</p>
        <h1 className="text-2xl font-semibold">{t('გამარჯობა', 'Hello')}, {user.name.split(' ')[0]}</h1>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Link href="/w/employees" className="card p-4"><p className="text-xs text-[#6f675e]">{t('ხილული აქტიური', 'Visible active')}</p><p className="mt-1 text-2xl font-semibold">{active}</p></Link>
        <Link href="/w/requests" className="card p-4"><p className="text-xs text-[#6f675e]">{t('ჩემი დასადასტურებელი', 'Waiting on me')}</p><p className="mt-1 text-2xl font-semibold">{approvals.length}</p></Link>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('წლიური შვებულება', 'Annual leave left')}</p><p className="mt-1 text-2xl font-semibold">{balance ? balance.entitled - balance.used : '—'}</p></div>
        <div className="card p-4"><p className="text-xs text-[#6f675e]">{t('დღევანდელი დასწრება', 'Today')}</p><p className="mt-1 text-2xl font-semibold">{mine?.check_out ? mine.check_out : mine?.check_in || '—'}</p></div>
      </div>
      {user.employeeId ? (
        <form action={punch} className="card flex flex-wrap items-end gap-3 p-4">
          <label className="grid gap-1 text-sm">{t('სამუშაო ადგილი', 'Place')}
            <select className="field !w-auto" name="place">
              <option value="office">{t('ოფისი', 'Office')}</option>
              <option value="remote">{t('დისტანციური', 'Remote')}</option>
              <option value="site">{t('ობიექტი', 'Site')}</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={Boolean(mine?.check_out)}>
            {mine?.check_in && !mine.check_out ? t('გასვლის დაფიქსირება', 'Check out') : mine?.check_out ? t('დღე დახურულია', 'Day closed') : t('შესვლის დაფიქსირება', 'Check in')}
          </button>
        </form>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-4">
          <h2 className="font-semibold">{t('დასადასტურებელი მოთხოვნები', 'Requests to approve')}</h2>
          <div className="mt-3 grid gap-2">
            {approvals.length === 0 ? <p className="text-sm text-[#6f675e]">{t('რიგი ცარიელია', 'Nothing is waiting')}</p> : approvals.map((item) => {
              const spec = requestType(item.type);
              return <Link key={item.id} className="rounded-lg bg-[#f7f4ee] px-3 py-2 text-sm" href={`/w/requests/${item.id}`}>{personName(item)} · {spec ? (locale === 'ka' ? spec.ka : spec.en) : item.type}</Link>;
            })}
          </div>
        </section>
        <section className="card p-4">
          <h2 className="font-semibold">{t('წაუკითხავი შეტყობინებები', 'Unread notifications')}</h2>
          <div className="mt-3 grid gap-2">
            {notes.length === 0 ? <p className="text-sm text-[#6f675e]">{t('ყველაფერი წაკითხულია', 'You are caught up')}</p> : notes.map((note) => {
              const spec = requestType(note.detail);
              const detail = spec ? (locale === 'ka' ? spec.ka : spec.en) : note.detail;
              const pair = kindLabel[note.kind];
              return <Link key={note.id} className="block rounded-lg bg-[#f7f4ee] px-3 py-2 text-sm" href={note.href || '/w/notifications'}>{pair ? t(pair[0], pair[1]) : note.kind} · {detail}</Link>;
            })}
          </div>
          {canSeePayroll(user.role) ? <Link className="mt-4 inline-block text-sm text-[#c4622d]" href="/w/payroll">{t('ხელფასის რეესტრი', 'Open payroll')} · {formatGel(locale, 0).replace('0.00', '').trim() ? '' : ''}{t('ოქტომბერი მზადაა', 'October is ready')}</Link> : null}
          {expiring.length ? <p className="mt-3 text-sm text-[#92400e]">{t('ვადა ეწურება', 'Contracts ending soon')}: {expiring.map((person) => personName(person)).join(', ')}</p> : null}
        </section>
      </div>
    </div>
  );
}
