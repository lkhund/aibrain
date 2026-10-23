import { requestType } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { formatHours, shiftMetrics } from '@/lib/metrics';
import { isWeekend, monthDates, todayISO } from '@/lib/time';
import type { EmployeeRow } from '@/lib/types';

export type TabelTone = 'work' | 'weekend' | 'holiday' | 'leave' | 'absent' | 'empty';

export type TabelCell = {
  label: string;
  tone: TabelTone;
  title: string;
  minutes: number;
  overtime: number;
  late: number;
  early: number;
};

export type TabelRow = {
  employeeId: number;
  name: string;
  position: string;
  department: string;
  cells: TabelCell[];
  totalMinutes: number;
  overtimeMinutes: number;
  leaveDays: number;
  absentDays: number;
};

type LeaveHit = { employee_id: number; type: string; payload: string };

function leaveFor(leaves: LeaveHit[], employeeId: number, date: string) {
  for (const leave of leaves) {
    if (leave.employee_id !== employeeId) continue;
    const spec = requestType(leave.type);
    if (!spec?.leave) continue;
    const payload = JSON.parse(leave.payload) as { start?: string; end?: string };
    if (payload.start && payload.end && date >= payload.start && date <= payload.end) return spec.leave;
  }
  return null;
}

const LEAVE_LABEL: Record<string, string> = {
  vacation: 'შ',
  unpaid: 'ხ',
  sick: 'ა',
  trip: 'მ',
  maternity: 'დკ',
  study: 'ს',
};

export function buildTabel(companyId: number, year: number, month: number, mode: 'schedule' | 'actual', onlyIds?: number[]) {
  const db = getDb();
  const dates = monthDates(year, month);
  const start = dates[0];
  const end = dates[dates.length - 1];
  const today = todayISO();
  const holidays = new Map(all<{ date: string; name: string }>(db, `SELECT date, name FROM holidays`).map((row) => [row.date, row.name]));
  const people = all<EmployeeRow>(
    db,
    `SELECT e.*, d.name AS department_name, p.title AS position_title
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN positions p ON p.id = e.position_id
     WHERE e.company_id = ? AND e.status = 'active'
     ORDER BY d.name, e.first_name`,
    companyId,
  ).filter((person) => !onlyIds || onlyIds.includes(person.id));
  const attendance = all<{ employee_id: number; date: string; check_in: string | null; check_out: string | null }>(
    db,
    `SELECT a.employee_id, a.date, a.check_in, a.check_out FROM attendance a
     JOIN employees e ON e.id = a.employee_id
     WHERE e.company_id = ? AND a.date >= ? AND a.date <= ?`,
    companyId,
    start,
    end,
  );
  const shifts = all<{ employee_id: number; date: string; start_time: string; end_time: string }>(
    db,
    `SELECT s.employee_id, s.date, s.start_time, s.end_time FROM shifts s
     JOIN employees e ON e.id = s.employee_id
     WHERE e.company_id = ? AND s.date >= ? AND s.date <= ?`,
    companyId,
    start,
    end,
  );
  const leaves = all<LeaveHit>(
    db,
    `SELECT employee_id, type, payload FROM requests WHERE company_id = ? AND status = 'approved'`,
    companyId,
  );

  const rows: TabelRow[] = people.map((person) => {
    let totalMinutes = 0;
    let overtimeMinutes = 0;
    let leaveDays = 0;
    let absentDays = 0;
    const cells = dates.map((date) => {
      const holiday = holidays.get(date);
      const weekend = isWeekend(date);
      const shift = shifts.find((item) => item.employee_id === person.id && item.date === date);
      const record = attendance.find((item) => item.employee_id === person.id && item.date === date);
      const leave = !weekend && !holiday ? leaveFor(leaves, person.id, date) : null;
      const plannedStart = shift?.start_time || person.schedule_start;
      const plannedEnd = shift?.end_time || person.schedule_end;
      const metrics = shiftMetrics(plannedStart, plannedEnd, record?.check_in, record?.check_out);

      if (holiday && !record) {
        return { label: 'დ', tone: 'holiday' as const, title: holiday, minutes: 0, overtime: 0, late: 0, early: 0 };
      }
      if (weekend && !record && !shift) {
        return { label: 'უ', tone: 'weekend' as const, title: 'დასვენება', minutes: 0, overtime: 0, late: 0, early: 0 };
      }
      if (leave) {
        leaveDays += 1;
        return { label: LEAVE_LABEL[leave] || 'შ', tone: 'leave' as const, title: leave, minutes: 0, overtime: 0, late: 0, early: 0 };
      }
      if (mode === 'schedule') {
        const minutes = weekend && !shift ? 0 : metrics.scheduled;
        totalMinutes += minutes;
        return {
          label: minutes ? formatHours(minutes) : 'უ',
          tone: minutes ? 'work' as const : 'weekend' as const,
          title: `${plannedStart}–${plannedEnd}`,
          minutes,
          overtime: 0,
          late: 0,
          early: 0,
        };
      }
      if (record?.check_in) {
        const minutes = record.check_out ? metrics.actual : 0;
        totalMinutes += minutes;
        overtimeMinutes += metrics.overtime;
        return {
          label: record.check_out ? formatHours(minutes) : '…',
          tone: 'work' as const,
          title: `${record.check_in}–${record.check_out || ''}`,
          minutes,
          overtime: metrics.overtime,
          late: metrics.late,
          early: metrics.early,
        };
      }
      if (!weekend && !holiday && date <= today) {
        absentDays += 1;
        return { label: 'გ', tone: 'absent' as const, title: 'გაცდენა', minutes: 0, overtime: 0, late: 0, early: 0 };
      }
      return { label: '—', tone: 'empty' as const, title: '', minutes: 0, overtime: 0, late: 0, early: 0 };
    });
    return {
      employeeId: person.id,
      name: `${person.first_name} ${person.last_name}`,
      position: person.position_title || '',
      department: person.department_name || '',
      cells,
      totalMinutes,
      overtimeMinutes,
      leaveDays,
      absentDays,
    };
  });

  return { dates, rows };
}
