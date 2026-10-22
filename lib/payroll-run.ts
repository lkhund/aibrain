import { all, getDb } from '@/lib/db';
import { shiftMetrics, minutesToHours } from '@/lib/metrics';
import { calculatePayroll, type SalaryType } from '@/lib/payroll';
import { isWeekend, monthDates, workingDates } from '@/lib/time';
import type { EmployeeRow } from '@/lib/types';

type AttendanceRow = { employee_id: number; date: string; check_in: string | null; check_out: string | null };
type ShiftRow = { employee_id: number; date: string; start_time: string; end_time: string };
type LeaveRow = { employee_id: number; type: string; payload: string };
type InputRow = { employee_id: number; bonus: number; deduction: number; output_units: number; commission: number };

export type PayrollLine = {
  employeeId: number;
  name: string;
  personalId: string;
  department: string;
  position: string;
  salaryType: string;
  accrued: number;
  base: number;
  overtimePay: number;
  bonus: number;
  commission: number;
  deduction: number;
  pensionEe: number;
  pensionEr: number;
  taxable: number;
  tax: number;
  net: number;
  regularHours: number;
  overtimeHours: number;
  unpaidDays: number;
};

function leaveDays(leaves: LeaveRow[], employeeId: number, dates: Set<string>, kind: string) {
  let count = 0;
  for (const leave of leaves) {
    if (leave.employee_id !== employeeId || leave.type !== kind) continue;
    const payload = JSON.parse(leave.payload) as { start?: string; end?: string };
    if (!payload.start || !payload.end) continue;
    for (const date of dates) {
      if (date >= payload.start && date <= payload.end) count += 1;
    }
  }
  return count;
}

export function payrollForMonth(companyId: number, year: number, month: number, onlyIds?: number[]) {
  const db = getDb();
  const dates = monthDates(year, month);
  const start = dates[0];
  const end = dates[dates.length - 1];
  const holidays = new Set(all<{ date: string }>(db, `SELECT date FROM holidays`).map((row) => row.date));
  const working = workingDates(dates, holidays);
  const workingSet = new Set(working);
  const normHours = working.length * 8;

  const people = all<EmployeeRow>(
    db,
    `SELECT e.*, d.name AS department_name, p.title AS position_title
     FROM employees e
     LEFT JOIN departments d ON d.id = e.department_id
     LEFT JOIN positions p ON p.id = e.position_id
     WHERE e.company_id = ? AND e.status = 'active'
       AND (e.hire_date IS NULL OR e.hire_date <= ?)
       AND (e.dismiss_date IS NULL OR e.dismiss_date >= ?)`,
    companyId,
    end,
    start,
  ).filter((person) => !onlyIds || onlyIds.includes(person.id));

  const attendance = all<AttendanceRow>(
    db,
    `SELECT a.employee_id, a.date, a.check_in, a.check_out
     FROM attendance a JOIN employees e ON e.id = a.employee_id
     WHERE e.company_id = ? AND a.date >= ? AND a.date <= ?`,
    companyId,
    start,
    end,
  );
  const shifts = all<ShiftRow>(
    db,
    `SELECT s.employee_id, s.date, s.start_time, s.end_time
     FROM shifts s JOIN employees e ON e.id = s.employee_id
     WHERE e.company_id = ? AND s.date >= ? AND s.date <= ?`,
    companyId,
    start,
    end,
  );
  const leaves = all<LeaveRow>(
    db,
    `SELECT employee_id, type, payload FROM requests
     WHERE company_id = ? AND status = 'approved' AND type IN ('vacation_unpaid')`,
    companyId,
  );
  const inputs = all<InputRow>(
    db,
    `SELECT employee_id, bonus, deduction, output_units, commission FROM payroll_inputs WHERE year = ? AND month = ?`,
    year,
    month,
  );

  return people.map((person) => {
    let regularMinutes = 0;
    let overtimeMinutes = 0;
    for (const date of dates) {
      const shift = shifts.find((item) => item.employee_id === person.id && item.date === date);
      const record = attendance.find((item) => item.employee_id === person.id && item.date === date);
      const weekend = isWeekend(date) || holidays.has(date);
      if (!record && !shift) continue;
      const startTime = shift?.start_time || (weekend ? null : person.schedule_start);
      const endTime = shift?.end_time || (weekend ? null : person.schedule_end);
      if (!startTime || !endTime) continue;
      const metrics = shiftMetrics(startTime, endTime, record?.check_in, record?.check_out);
      if (record?.check_in && record.check_out) {
        regularMinutes += Math.min(metrics.actual, metrics.scheduled);
        overtimeMinutes += metrics.overtime;
      }
    }
    const input = inputs.find((item) => item.employee_id === person.id);
    const employed = working.filter((date) => (!person.hire_date || date >= person.hire_date) && (!person.dismiss_date || date <= person.dismiss_date));
    const proration = working.length ? employed.length / working.length : 1;
    const result = calculatePayroll({
      salaryType: (person.salary_type || 'fixed') as SalaryType,
      monthlyGross: person.salary_gross || 0,
      hourlyRate: person.hourly_rate || 0,
      outputRate: person.output_rate || 0,
      outputUnits: input?.output_units || 0,
      commission: input?.commission || 0,
      bonus: input?.bonus || 0,
      deduction: input?.deduction || 0,
      pension: person.pension_participant === 1,
      normHours,
      regularHours: minutesToHours(regularMinutes),
      overtimeHours: minutesToHours(overtimeMinutes),
      unpaidDays: leaveDays(leaves, person.id, workingSet, 'vacation_unpaid'),
      workingDays: working.length,
      proration,
    });
    return {
      employeeId: person.id,
      name: `${person.first_name} ${person.last_name}`,
      personalId: person.personal_id || '',
      department: person.department_name || '',
      position: person.position_title || '',
      salaryType: person.salary_type || 'fixed',
      regularHours: minutesToHours(regularMinutes),
      overtimeHours: minutesToHours(overtimeMinutes),
      unpaidDays: leaveDays(leaves, person.id, workingSet, 'vacation_unpaid'),
      ...result,
    } satisfies PayrollLine;
  });
}
