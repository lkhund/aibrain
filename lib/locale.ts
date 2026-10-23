import { cookies } from 'next/headers';

export type Locale = 'ka' | 'en';

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return jar.get('locale')?.value === 'en' ? 'en' : 'ka';
}

export function tx(locale: Locale, ka: string, en: string) {
  return locale === 'ka' ? ka : en;
}

export function formatGel(locale: Locale, value: number) {
  const formatted = new Intl.NumberFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ₾`;
}
