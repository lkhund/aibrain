export function todayISO(timeZone = 'Europe/Madrid') {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function nowHM(timeZone = 'Europe/Madrid') {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number) {
  const date = parseISODate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return formatISODate(date);
}

export function weekday(iso: string) {
  return parseISODate(iso).getUTCDay();
}

export function isWeekend(iso: string) {
  const day = weekday(iso);
  return day === 0 || day === 6;
}

export function eachDate(start: string, end: string) {
  if (!start || !end || end < start) return [];
  const dates: string[] = [];
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) dates.push(cursor);
  return dates;
}

export function monthDates(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const dates: string[] = [];
  for (let cursor = start; cursor.slice(0, 7) === start.slice(0, 7); cursor = addDays(cursor, 1)) {
    dates.push(cursor);
  }
  return dates;
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  return `${day}.${month}.${year}`;
}

export function monthLabel(year: number, month: number, locale: 'ka' | 'en') {
  const date = parseISODate(`${year}-${String(month).padStart(2, '0')}-01`);
  return new Intl.DateTimeFormat(locale === 'ka' ? 'ka-GE' : 'en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function workingDates(dates: string[], holidays: Set<string>) {
  return dates.filter((date) => !isWeekend(date) && !holidays.has(date));
}

export function countWorkingDays(start: string, end: string, holidays: Set<string>) {
  return eachDate(start, end).filter((date) => !isWeekend(date) && !holidays.has(date)).length;
}

export function parseMonthQuery(
  source: { year?: string; month?: string },
  fallback = todayISO(),
) {
  const [fallbackYear, fallbackMonth] = fallback.split('-').map(Number);
  const year = Number(source.year ?? fallbackYear);
  const month = Number(source.month ?? fallbackMonth);
  if (!Number.isInteger(year) || !Number.isInteger(month) || year < 2000 || year > 2100 || month < 1 || month > 12) {
    return { year: fallbackYear, month: fallbackMonth };
  }
  return { year, month };
}
