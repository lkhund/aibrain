import { tx, type Locale } from '@/lib/locale';
import { monthLabel } from '@/lib/time';

export function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function errorText(locale: Locale, code?: string) {
  if (!code) return null;
  const messages: Record<string, [string, string]> = {
    credentials: ['ელფოსტა ან პაროლი არ ემთხვევა', 'Email or password does not match'],
    forbidden: ['ამ მოქმედების უფლება არ გაქვს', 'You do not have permission for this action'],
    invalid: ['შეავსე სავალდებულო ველები სწორად', 'Fill in the required fields'],
    overlap: ['ეს პერიოდი უკვე სხვა მოთხოვნაშია', 'Those dates overlap another request'],
    comment: ['უარყოფისას კომენტარი სავალდებულოა', 'A comment is required to reject'],
    missing: ['ჩანაწერი ვერ მოიძებნა', 'Record was not found'],
  };
  const pair = messages[code];
  return pair ? tx(locale, pair[0], pair[1]) : code;
}

export function ErrorNote({ locale, code }: { locale: Locale; code?: string }) {
  const text = errorText(locale, code);
  if (!text) return null;
  return <p className="rounded-xl border border-[#f0c7b4] bg-[#fff4ee] px-3 py-2 text-sm text-[#9a3412]">{text}</p>;
}

export function PageHeader({ title, text, children }: { title: string; text?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {text ? <p className="mt-1 max-w-2xl text-sm text-[#6f675e]">{text}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export function Pill({ tone, children }: { tone: 'ok' | 'wait' | 'bad' | 'muted'; children: React.ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

export function statusTone(status: string): 'ok' | 'wait' | 'bad' | 'muted' {
  if (status === 'approved' || status === 'active' || status === 'confirmed' || status === 'synced') return 'ok';
  if (status === 'pending' || status === 'shared' || status === 'candidate') return 'wait';
  if (status === 'rejected' || status === 'error' || status === 'dismissed' || status === 'cancelled') return 'bad';
  return 'muted';
}

export function MonthPicker({ year, month, locale, extra }: { year: number; month: number; locale: Locale; extra?: Record<string, string> }) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2">
      {extra ? Object.entries(extra).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />) : null}
      <select className="field !w-auto" name="month" defaultValue={month} aria-label={tx(locale, 'თვე', 'Month')}>
        {Array.from({ length: 12 }, (_, index) => (
          <option key={index + 1} value={index + 1}>{monthLabel(year, index + 1, locale).replace(String(year), '').trim()}</option>
        ))}
      </select>
      <input className="field !w-24" type="number" name="year" defaultValue={year} aria-label={tx(locale, 'წელი', 'Year')} />
      <button className="btn btn-ghost btn-small" type="submit">{tx(locale, 'ჩვენება', 'Show')}</button>
    </form>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-[#e4ddd0] px-4 py-8 text-center text-sm text-[#6f675e]">{children}</p>;
}
