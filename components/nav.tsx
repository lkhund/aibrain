'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function SideNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map((item) => {
        const active = item.href === '/w' ? pathname === '/w' : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`rounded-lg px-3 py-2 text-sm ${active ? 'bg-[#c4622d] text-white' : 'text-[#d7e2db] hover:bg-white/10'}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
