import { setLocale } from '@/lib/actions';
import type { Locale } from '@/lib/locale';

export function LangSwitch({ locale, dark = false }: { locale: Locale; dark?: boolean }) {
  const idle = dark ? 'text-[#d7e2db]' : 'text-[#6f675e]';
  const on = dark ? 'bg-white text-[#17241e]' : 'bg-[#17241e] text-white';
  return (
    <form action={setLocale} className={`flex rounded-full p-0.5 ${dark ? 'bg-white/10' : 'bg-white border border-[#e4ddd0]'}`}>
      {(['ka', 'en'] as const).map((value) => (
        <button key={value} name="locale" value={value} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${locale === value ? on : idle}`} type="submit">
          {value === 'ka' ? 'ქარ' : 'EN'}
        </button>
      ))}
    </form>
  );
}
