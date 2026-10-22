import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatePayroll } from './payroll';

const base = {
  monthlyGross: 3000,
  hourlyRate: 0,
  outputRate: 0,
  outputUnits: 0,
  commission: 0,
  bonus: 0,
  deduction: 0,
  pension: true,
  normHours: 168,
  regularHours: 0,
  overtimeHours: 0,
  unpaidDays: 0,
  workingDays: 21,
  proration: 1,
} as const;

test('fixed salary with pension contribution', () => {
  const result = calculatePayroll({ ...base, salaryType: 'fixed' });
  assert.equal(result.accrued, 3000);
  assert.equal(result.pensionEe, 60);
  assert.equal(result.pensionEr, 60);
  assert.equal(result.tax, 588);
  assert.equal(result.net, 2352);
});

test('fixed salary without pension', () => {
  const result = calculatePayroll({ ...base, salaryType: 'fixed', pension: false });
  assert.equal(result.tax, 600);
  assert.equal(result.net, 2400);
  assert.equal(result.pensionEe, 0);
});

test('overtime is paid at 1.5 times the derived hourly rate', () => {
  const result = calculatePayroll({ ...base, salaryType: 'fixed', overtimeHours: 4 });
  assert.equal(result.overtimePay, 107.16);
  assert.equal(result.accrued, 3107.16);
  assert.equal(result.net, 2436.02);
});

test('unpaid leave reduces the monthly base', () => {
  const result = calculatePayroll({ ...base, salaryType: 'fixed', unpaidDays: 2 });
  assert.equal(result.base, 2714.29);
  assert.equal(result.net, 2128);
});

test('variable pay uses worked hours and a higher overtime rate', () => {
  const result = calculatePayroll({
    ...base,
    salaryType: 'variable',
    hourlyRate: 22,
    regularHours: 80,
    overtimeHours: 5,
  });
  assert.equal(result.base, 1760);
  assert.equal(result.overtimePay, 165);
  assert.equal(result.net, 1509.2);
});

test('output pay and a net deduction', () => {
  const output = calculatePayroll({ ...base, salaryType: 'output', outputRate: 40, outputUnits: 10, pension: false });
  assert.equal(output.accrued, 400);
  assert.equal(output.net, 320);
  const deducted = calculatePayroll({ ...base, salaryType: 'fixed', deduction: 100 });
  assert.equal(deducted.net, 2252);
});
