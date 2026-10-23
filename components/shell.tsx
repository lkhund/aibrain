import Link from 'next/link';
import { logout } from '@/lib/actions';
import { canSeePayroll } from '@/lib/auth';
import { tx, type Locale } from '@/lib/locale';
import type { CurrentUser } from '@/lib/types';
import { LangSwitch } from '@/components/lang';
import { SideNav } from '@/components/nav';

export function Shell({ user, locale, unread, children }: { user: CurrentUser; locale: Locale; unread: number; children: React.ReactNode }) {
  const items = [
    { href: '/w', label: tx(locale, 'მთავარი', 'Home') },
    { href: '/w/employees', label: tx(locale, 'თანამშრომლები', 'Employees') },
    { href: '/w/org', label: tx(locale, 'სტრუქტურა', 'Structure'), hide: user.role === 'employee' },
    { href: '/w/requests', label: tx(locale, 'მოთხოვნები', 'Requests') },
    { href: '/w/tabel', label: tx(locale, 'ტაბელი', 'Tabel') },
    { href: '/w/attendance', label: tx(locale, 'ცვლები და დასწრება', 'Shifts & attendance') },
    { href: '/w/payroll', label: tx(locale, 'ხელფასი', 'Payroll'), hide: !canSeePayroll(user.role) },
    { href: '/w/documents', label: tx(locale, 'დოკუმენტები', 'Documents') },
    { href: '/w/reports', label: tx(locale, 'რეპორტები', 'Reports'), hide: user.role === 'employee' },
    { href: '/w/notifications', label: `${tx(locale, 'შეტყობინებები', 'Notifications')}${unread ? ` (${unread})` : ''}` },
    { href: '/w/settings', label: tx(locale, 'პარამეტრები', 'Settings'), hide: user.role !== 'hr' },
  ].filter((item) => !item.hide);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="flex flex-col bg-[#17241e] text-[#f4efe6] lg:min-h-screen lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center justify-between gap-3 px-4 py-4">
          <Link href="/w" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#c4622d] text-sm">ა</span>
            Aibrain HR
          </Link>
          <LangSwitch locale={locale} dark />
        </div>
        <details className="px-3 pb-3 lg:hidden">
          <summary className="cursor-pointer rounded-lg px-3 py-2 text-sm text-[#d7e2db]">{tx(locale, 'მენიუ', 'Menu')}</summary>
          <div className="mt-2">
            <SideNav items={items} />
          </div>
        </details>
        <div className="hidden flex-1 px-3 lg:flex lg:flex-col">
          <SideNav items={items} />
        </div>
        <div className="mt-auto border-t border-white/10 px-4 py-4">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-[#b7c4bc]">{user.companyName}</p>
          <form action={logout} className="mt-3">
            <button className="text-sm text-[#f0d3c2]" type="submit">{tx(locale, 'გასვლა', 'Sign out')}</button>
          </form>
        </div>
      </aside>
      <main className="px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
