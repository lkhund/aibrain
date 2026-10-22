import { NextResponse, type NextRequest } from 'next/server';
import { canSeePayroll, getCurrentUser, getVisibleEmployee, listVisibleEmployees } from '@/lib/auth';
import { CONTRACT_TYPES, SALARY_TYPES, labelOf, requestType } from '@/lib/catalog';
import { all, get, getDb, run } from '@/lib/db';
import { documentPdf, spreadsheet } from '@/lib/files';
import { getLocale } from '@/lib/locale';
import { formatHours } from '@/lib/metrics';
import { payrollForMonth } from '@/lib/payroll-run';
import { runReport } from '@/lib/reports';
import { buildTabel } from '@/lib/tabel';
import { monthDates } from '@/lib/time';
import { personName } from '@/lib/types';

function file(body: Buffer, filename: string, type: string) {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': type,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });
  const locale = await getLocale();
  const params = request.nextUrl.searchParams;
  const kind = params.get('kind');
  const xlsx = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  if (kind === 'employees') {
    const status = params.get('status') || 'active';
    const rows = listVisibleEmployees(user).filter((person) => {
      if (status !== 'all' && person.status !== status) return false;
      if (params.get('department') && String(person.department_id) !== params.get('department')) return false;
      if (params.get('position') && String(person.position_id) !== params.get('position')) return false;
      if (params.get('contract') && person.contract_type !== params.get('contract')) return false;
      const query = (params.get('q') || '').toLowerCase();
      if (!query) return true;
      return `${person.first_name} ${person.last_name} ${person.personal_id || ''}`.toLowerCase().includes(query);
    }).map((person) => ({
      name: personName(person),
      department: person.department_name || '',
      position: person.position_title || '',
      contract: labelOf(CONTRACT_TYPES, person.contract_type, locale),
      status: person.status,
      pay: canSeePayroll(user.role) ? person.salary_gross || person.hourly_rate || person.output_rate || '' : '',
    }));
    const columns = [
      { key: 'name', label: locale === 'ka' ? 'სახელი' : 'Name' },
      { key: 'department', label: locale === 'ka' ? 'განყოფილება' : 'Department' },
      { key: 'position', label: locale === 'ka' ? 'პოზიცია' : 'Position' },
      { key: 'contract', label: locale === 'ka' ? 'ხელშეკრულება' : 'Contract' },
      { key: 'status', label: locale === 'ka' ? 'სტატუსი' : 'Status' },
      { key: 'pay', label: locale === 'ka' ? 'ანაზღაურება' : 'Pay' },
    ];
    return file(await spreadsheet('Employees', columns, rows), 'employees.xlsx', xlsx);
  }

  if (kind === 'tabel') {
    const year = Number(params.get('year'));
    const month = Number(params.get('month'));
    const mode = params.get('mode') === 'schedule' ? 'schedule' : 'actual';
    const table = buildTabel(user.companyId, year, month, mode);
    const dates = monthDates(year, month);
    const columns = [
      { key: 'name', label: locale === 'ka' ? 'თანამშრომელი' : 'Employee' },
      ...dates.map((date) => ({ key: date, label: String(Number(date.slice(8))) })),
      { key: 'hours', label: locale === 'ka' ? 'სულ' : 'Total' },
    ];
    const rows = table.rows.map((row) => {
      const record: Record<string, string | number> = { name: row.name, hours: formatHours(row.totalMinutes) };
      row.cells.forEach((cell, index) => { record[dates[index]] = cell.label; });
      return record;
    });
    return file(await spreadsheet(`Tabel ${year}-${month}`, columns, rows), `tabel-${year}-${month}.xlsx`, xlsx);
  }

  if (kind === 'payroll') {
    if (!canSeePayroll(user.role)) return new NextResponse('Forbidden', { status: 403 });
    const year = Number(params.get('year'));
    const month = Number(params.get('month'));
    const lines = payrollForMonth(user.companyId, year, month);
    const columns = [
      { key: 'name', label: 'თანამშრომელი' },
      { key: 'type', label: 'ტიპი' },
      { key: 'accrued', label: 'დარიცხული' },
      { key: 'overtimePay', label: 'ზეგანაკვეთური' },
      { key: 'bonus', label: 'პრემია' },
      { key: 'deduction', label: 'დაქვითვა' },
      { key: 'pensionEe', label: 'საპენსიო დასაქმებული' },
      { key: 'pensionEr', label: 'საპენსიო დამსაქმებელი' },
      { key: 'tax', label: 'საშემოსავლო' },
      { key: 'net', label: 'ხელზე' },
    ];
    const rows = lines.map((line) => ({ ...line, type: labelOf(SALARY_TYPES, line.salaryType, locale) }));
    return file(await spreadsheet(`Payroll ${year}-${month}`, columns, rows), `payroll-${year}-${month}.xlsx`, xlsx);
  }

  if (kind === 'report') {
    const slug = params.get('slug') || '';
    const year = Number(params.get('year'));
    const month = Number(params.get('month'));
    const dates = monthDates(year, month);
    const report = runReport(user, slug, {
      departmentId: params.get('department') ? Number(params.get('department')) : undefined,
      from: params.get('from') || dates[0],
      to: params.get('to') || dates[dates.length - 1],
      year,
      month,
    }, locale);
    if (!report) return new NextResponse('Not found', { status: 404 });
    return file(await spreadsheet(report.title, report.columns, report.rows), `${slug}.xlsx`, xlsx);
  }

  if (kind === 'request') {
    const id = Number(params.get('id'));
    const request = get<{ id: number; type: string; status: string; payload: string; employee_id: number; created_at: string; first_name: string; last_name: string }>(
      getDb(),
      `SELECT r.id, r.type, r.status, r.payload, r.employee_id, r.created_at, e.first_name, e.last_name FROM requests r JOIN employees e ON e.id = r.employee_id WHERE r.id = ? AND r.company_id = ?`,
      id,
      user.companyId,
    );
    if (!request) return new NextResponse('Not found', { status: 404 });
    const visible = getVisibleEmployee(user, request.employee_id);
    const steps = all<{ role: string; status: string; comment: string | null; first_name: string | null; last_name: string | null; approver_employee_id: number | null }>(
      getDb(),
      `SELECT s.role, s.status, s.comment, s.approver_employee_id, e.first_name, e.last_name FROM approval_steps s LEFT JOIN employees e ON e.id = s.approver_employee_id WHERE s.request_id = ? ORDER BY s.step_order`,
      id,
    );
    if (!visible && !steps.some((step) => step.approver_employee_id === user.employeeId)) return new NextResponse('Forbidden', { status: 403 });
    const spec = requestType(request.type);
    const payload = JSON.parse(request.payload) as Record<string, string | number>;
    const company = get<{ name: string }>(getDb(), `SELECT name FROM companies WHERE id = ?`, user.companyId);
    const paragraphs = [
      company?.name || '',
      `${request.first_name} ${request.last_name}`,
      request.status,
      ...Object.entries(payload).map(([key, value]) => `${key}: ${value}`),
      ...steps.map((step, index) => `${index + 1}. ${step.first_name || ''} ${step.last_name || ''} (${step.role}) — ${step.status}${step.comment ? ` — ${step.comment}` : ''}`),
    ];
    const pdf = await documentPdf(spec ? (locale === 'ka' ? spec.ka : spec.en) : request.type, paragraphs);
    return file(pdf, `request-${id}.pdf`, 'application/pdf');
  }

  if (kind === 'document') {
    const id = Number(params.get('id'));
    const document = get<{ id: number; name: string; body: string }>(getDb(), `SELECT id, name, body FROM documents WHERE id = ? AND company_id = ?`, id, user.companyId);
    if (!document) return new NextResponse('Not found', { status: 404 });
    const access = user.employeeId ? get<{ employee_id: number }>(getDb(), `SELECT employee_id FROM document_access WHERE document_id = ? AND employee_id = ?`, id, user.employeeId) : undefined;
    const admin = user.role === 'hr' || user.role === 'director' || user.role === 'finance';
    if (!access && !admin) return new NextResponse('Forbidden', { status: 403 });
    if (access) run(getDb(), `UPDATE document_access SET downloaded_at = COALESCE(downloaded_at, ?) WHERE document_id = ? AND employee_id = ?`, new Date().toISOString(), id, user.employeeId);
    const pdf = await documentPdf(document.name, document.body.split(/\n+/));
    return file(pdf, `document-${id}.pdf`, 'application/pdf');
  }

  return new NextResponse('Not found', { status: 404 });
}
