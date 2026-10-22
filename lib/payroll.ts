export type SalaryType = 'fixed' | 'variable' | 'hybrid' | 'output';

export type PayrollInput = {
  salaryType: SalaryType;
  monthlyGross: number;
  hourlyRate: number;
  outputRate: number;
  outputUnits: number;
  commission: number;
  bonus: number;
  deduction: number;
  pension: boolean;
  normHours: number;
  regularHours: number;
  overtimeHours: number;
  unpaidDays: number;
  workingDays: number;
  proration: number;
};

export type PayrollResult = {
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
};

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Georgian payroll: 20% income tax on gross minus the employee's 2% pension contribution. */
export function calculatePayroll(input: PayrollInput): PayrollResult {
  const norm = input.normHours > 0 ? input.normHours : 1;
  const hourlyFromMonthly = money(input.monthlyGross / norm);
  let base = 0;
  let overtimePay = 0;
  let commission = input.commission || 0;

  if (input.salaryType === 'fixed' || input.salaryType === 'hybrid') {
    base = money(input.monthlyGross * input.proration);
    const daily = input.workingDays > 0 ? input.monthlyGross / input.workingDays : 0;
    base = money(Math.max(0, base - money(daily * input.unpaidDays)));
    overtimePay = money(input.overtimeHours * hourlyFromMonthly * 1.5);
  } else if (input.salaryType === 'variable') {
    base = money(input.regularHours * input.hourlyRate);
    overtimePay = money(input.overtimeHours * input.hourlyRate * 1.5);
    commission = 0;
  } else {
    base = money(input.outputUnits * input.outputRate);
  }

  if (input.salaryType === 'fixed') commission = 0;

  const bonus = input.bonus || 0;
  const accrued = money(base + overtimePay + commission + bonus);
  const pensionEe = input.pension ? money(accrued * 0.02) : 0;
  const pensionEr = input.pension ? money(accrued * 0.02) : 0;
  const taxable = money(accrued - pensionEe);
  const tax = money(taxable * 0.2);
  const deduction = input.deduction || 0;
  const net = money(accrued - pensionEe - tax - deduction);

  return { accrued, base, overtimePay, bonus, commission, deduction, pensionEe, pensionEr, taxable, tax, net };
}
