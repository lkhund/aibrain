export function timeToMinutes(value: string) {
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

export function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export function formatHours(minutes: number) {
  const rounded = Math.round((minutes / 60) * 100) / 100;
  return rounded.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
}

export type ShiftMetrics = {
  scheduled: number;
  actual: number;
  late: number;
  early: number;
  overtime: number;
};

export function shiftMetrics(
  shiftStart: string,
  shiftEnd: string,
  checkIn?: string | null,
  checkOut?: string | null,
): ShiftMetrics {
  const start = timeToMinutes(shiftStart);
  const end = timeToMinutes(shiftEnd);
  const span = Math.max(0, end - start);
  const lunch = span >= 360 ? 60 : 0;
  const scheduled = Math.max(0, span - lunch);
  let late = 0;
  let early = 0;
  let actual = 0;
  let overtime = 0;

  if (checkIn) {
    const arrived = timeToMinutes(checkIn);
    late = Math.max(0, arrived - start);
    if (checkOut) {
      const left = timeToMinutes(checkOut);
      const presence = Math.max(0, left - arrived);
      const actualLunch = presence >= 360 ? 60 : 0;
      actual = Math.max(0, presence - actualLunch);
      overtime = Math.max(0, actual - scheduled);
      early = Math.max(0, end - left);
    }
  }

  return { scheduled, actual, late, early, overtime };
}
