'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { canManageEmployees, canSeePayroll, companyHolidays, getVisibleEmployee, requireUser } from '@/lib/auth';
import { REQUEST_TYPES, requestType, type StepRole } from '@/lib/catalog';
import { all, get, getDb, run } from '@/lib/db';
import { verifyPassword } from '@/lib/password';
import { seed } from '@/lib/seed';
import { COOKIE, encodeSession } from '@/lib/session';
import { countWorkingDays, todayISO } from '@/lib/time';
import type { EmployeeRow } from '@/lib/types';

function fail(path: string, code: string): never {
  const join = path.includes('?') ? '&' : '?';
  redirect(`${path}${join}error=${code}`);
}

export async function setLocale(formData: FormData) {
  const locale = formData.get('locale') === 'en' ? 'en' : 'ka';
  const jar = await cookies();
  jar.set('locale', locale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' });
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const next = String(formData.get('next') || '/w');
  const row = get<{ id: number; company_id: number; employee_id: number | null; role: string; password_hash: string }>(
    getDb(),
    `SELECT id, company_id, employee_id, role, password_hash FROM users WHERE lower(email) = ?`,
    email,
  );
  if (!row || !verifyPassword(password, row.password_hash)) {
    redirect(`/login?error=credentials${next.startsWith('/w') ? `&next=${encodeURIComponent(next)}` : ''}`);
  }
  const token = await encodeSession({
    userId: row.id,
    companyId: row.company_id,
    role: row.role,
    employeeId: row.employee_id,
  });
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.VERCEL === '1',
  });
  redirect(next.startsWith('/w') ? next : '/w');
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
  redirect('/');
}

function userIdForEmployee(employeeId: number | null) {
  if (!employeeId) return null;
  return get<{ id: number }>(getDb(), `SELECT id FROM users WHERE employee_id = ?`, employeeId)?.id ?? null;
}

function notify(userId: number | null, kind: string, detail: string, href: string) {
  if (!userId) return;
  run(getDb(), `INSERT INTO notifications (user_id, kind, detail, href, created_at) VALUES (?, ?, ?, ?, ?)`, userId, kind, detail, href, new Date().toISOString());
}

function resolveApprover(companyId: number, role: StepRole, employee: EmployeeRow) {
  if (role === 'manager') return employee.manager_id;
  return get<{ employee_id: number }>(
    getDb(),
    `SELECT employee_id FROM users WHERE company_id = ? AND role = ? AND employee_id IS NOT NULL ORDER BY id LIMIT 1`,
    companyId,
    role,
  )?.employee_id ?? null;
}

function addUsed(employeeId: number, year: number, type: string, days: number, entitled: number) {
  run(
    getDb(),
    `INSERT INTO vacation_balances (employee_id, year, type, entitled, used) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(employee_id, year, type) DO UPDATE SET used = used + ?`,
    employeeId,
    year,
    type,
    entitled,
    days,
    days,
  );
}

function addPayrollAmount(employeeId: number, field: 'bonus' | 'deduction', amount: number) {
  const [year, month] = todayISO().split('-').map(Number);
  const bonus = field === 'bonus' ? amount : 0;
  const deduction = field === 'deduction' ? amount : 0;
  run(
    getDb(),
    `INSERT INTO payroll_inputs (employee_id, year, month, bonus, deduction, output_units, commission)
     VALUES (?, ?, ?, ?, ?, 0, 0)
     ON CONFLICT(employee_id, year, month) DO UPDATE SET ${field} = ${field} + ?`,
    employeeId,
    year,
    month,
    bonus,
    deduction,
    amount,
  );
}

function applyEffect(employee: EmployeeRow, type: string, payload: Record<string, string | number | undefined>) {
  const db = getDb();
  const spec = requestType(type);
  if (spec?.leave && spec.leave !== 'trip' && payload.start && payload.end) {
    const holidays = companyHolidays();
    const days = countWorkingDays(String(payload.start), String(payload.end), holidays);
    const balanceType = spec.leave === 'vacation' ? 'annual' : spec.leave;
    const entitled = balanceType === 'annual' ? 24 : balanceType === 'study' ? 5 : 0;
    const year = Number(String(payload.start).slice(0, 4));
    if (days > 0) addUsed(employee.id, year, balanceType, days, entitled);
  }
  if (type === 'bonus' && payload.amount) addPayrollAmount(employee.id, 'bonus', Number(payload.amount));
  if (type === 'advance' && payload.amount) addPayrollAmount(employee.id, 'deduction', Number(payload.amount));
  if (type === 'salary_change' && payload.amount) {
    run(db, `UPDATE employees SET salary_gross = ? WHERE id = ?`, Number(payload.amount), employee.id);
  }
  if (type === 'resignation') {
    run(
      db,
      `UPDATE employees SET status = 'dismissed', dismiss_date = ?, dismiss_reason = ? WHERE id = ?`,
      payload.date || todayISO(),
      payload.comment || '',
      employee.id,
    );
  }
  if (type === 'appointment') {
    run(
      db,
      `UPDATE employees SET status = 'active', hire_date = COALESCE(hire_date, ?), contract_type = COALESCE(contract_type, 'indefinite') WHERE id = ?`,
      payload.date || todayISO(),
      employee.id,
    );
  }
}

export async function createRequest(formData: FormData) {
  const user = await requireUser();
  const typeId = String(formData.get('type') || '');
  const spec = requestType(typeId);
  if (!spec) fail('/w/requests/new', 'invalid');
  const requestedId = Number(formData.get('employee_id') || user.employeeId);
  const employeeId = user.role === 'hr' || user.role === 'director' ? requestedId : user.employeeId;
  if (!employeeId) fail('/w/requests/new', 'forbidden');
  const employee = getVisibleEmployee(user, employeeId);
  if (!employee) fail('/w/requests/new', 'forbidden');

  const payload: Record<string, string | number> = {};
  for (const field of spec.fields) {
    const raw = String(formData.get(field) || '').trim();
    if (field === 'comment') {
      if (raw) payload.comment = raw.slice(0, 1000);
      continue;
    }
    if (!raw) fail('/w/requests/new', 'invalid');
    if (field === 'amount' || field === 'hours') {
      const value = Number(raw);
      if (!Number.isFinite(value) || value <= 0) fail('/w/requests/new', 'invalid');
      payload[field] = value;
    } else payload[field] = raw;
  }
  if (payload.start && payload.end && String(payload.end) < String(payload.start)) fail('/w/requests/new', 'invalid');

  if (spec.leave && payload.start && payload.end) {
    const existing = all<{ type: string; payload: string }>(
      getDb(),
      `SELECT type, payload FROM requests WHERE employee_id = ? AND status IN ('pending', 'approved')`,
      employee.id,
    );
    for (const row of existing) {
      const other = requestType(row.type);
      if (!other?.leave) continue;
      const body = JSON.parse(row.payload) as { start?: string; end?: string };
      if (!body.start || !body.end) continue;
      if (!(String(payload.end) < body.start || String(payload.start) > body.end)) fail('/w/requests/new', 'overlap');
    }
  }

  const chainRow = get<{ steps: string }>(getDb(), `SELECT steps FROM approval_chains WHERE company_id = ? AND request_type = ?`, user.companyId, spec.id);
  const chain = (chainRow ? JSON.parse(chainRow.steps) : spec.steps) as StepRole[];
  const planned: { role: StepRole; approver: number | null; status: string }[] = [];
  let opened = false;
  for (const role of chain) {
    const approver = resolveApprover(user.companyId, role, employee);
    if (!approver || approver === employee.id) {
      planned.push({ role, approver, status: 'skipped' });
      continue;
    }
    planned.push({ role, approver, status: opened ? 'waiting' : 'pending' });
    opened = true;
  }
  const initial = opened ? 'pending' : 'approved';
  const created = run(
    getDb(),
    `INSERT INTO requests (company_id, type, employee_id, created_by, status, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    user.companyId,
    spec.id,
    employee.id,
    user.id,
    initial,
    JSON.stringify(payload),
    new Date().toISOString(),
  );
  const requestId = Number(created.lastInsertRowid);
  planned.forEach((step, index) => {
    run(
      getDb(),
      `INSERT INTO approval_steps (request_id, step_order, role, approver_employee_id, status) VALUES (?, ?, ?, ?, ?)`,
      requestId,
      index + 1,
      step.role,
      step.approver,
      step.status,
    );
  });
  if (initial === 'approved') applyEffect(employee, spec.id, payload);
  else {
    const pending = planned.find((step) => step.status === 'pending');
    notify(userIdForEmployee(pending?.approver ?? null), 'approval_needed', spec.id, `/w/requests/${requestId}`);
  }
  redirect(`/w/requests/${requestId}`);
}

export async function actOnRequest(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const decision = String(formData.get('decision') || '');
  const comment = String(formData.get('comment') || '').trim();
  const request = get<{ id: number; company_id: number; type: string; employee_id: number; status: string; payload: string }>(
    getDb(),
    `SELECT * FROM requests WHERE id = ? AND company_id = ?`,
    id,
    user.companyId,
  );
  if (!request || request.status !== 'pending') fail(`/w/requests/${id}`, 'invalid');
  const step = get<{ id: number; step_order: number; approver_employee_id: number | null; role: string }>(
    getDb(),
    `SELECT * FROM approval_steps WHERE request_id = ? AND status = 'pending' ORDER BY step_order LIMIT 1`,
    id,
  );
  if (!step) fail(`/w/requests/${id}`, 'invalid');
  const allowed = step.approver_employee_id === user.employeeId || (!step.approver_employee_id && step.role === user.role);
  if (!allowed) fail(`/w/requests/${id}`, 'forbidden');
  if (decision === 'reject' && !comment) fail(`/w/requests/${id}`, 'comment');
  if (decision !== 'approve' && decision !== 'reject') fail(`/w/requests/${id}`, 'invalid');

  const now = new Date().toISOString();
  run(getDb(), `UPDATE approval_steps SET status = ?, acted_at = ?, comment = ? WHERE id = ?`, decision === 'approve' ? 'approved' : 'rejected', now, comment || null, step.id);
  const requester = get<{ id: number; employee_id: number | null }>(getDb(), `SELECT id, employee_id FROM users WHERE id = (SELECT created_by FROM requests WHERE id = ?)`, id);
  if (decision === 'reject') {
    run(getDb(), `UPDATE approval_steps SET status = 'skipped' WHERE request_id = ? AND status IN ('waiting', 'pending')`, id);
    run(getDb(), `UPDATE requests SET status = 'rejected' WHERE id = ?`, id);
    notify(requester?.id ?? null, 'request_rejected', request.type, `/w/requests/${id}`);
    redirect(`/w/requests/${id}`);
  }
  const next = get<{ id: number; approver_employee_id: number | null }>(
    getDb(),
    `SELECT * FROM approval_steps WHERE request_id = ? AND status = 'waiting' ORDER BY step_order LIMIT 1`,
    id,
  );
  if (next) {
    run(getDb(), `UPDATE approval_steps SET status = 'pending' WHERE id = ?`, next.id);
    notify(userIdForEmployee(next.approver_employee_id), 'approval_needed', request.type, `/w/requests/${id}`);
  } else {
    run(getDb(), `UPDATE requests SET status = 'approved' WHERE id = ?`, id);
    const employee = get<EmployeeRow>(getDb(), `SELECT * FROM employees WHERE id = ?`, request.employee_id);
    if (employee) applyEffect(employee, request.type, JSON.parse(request.payload));
    notify(requester?.id ?? null, 'request_approved', request.type, `/w/requests/${id}`);
  }
  redirect(`/w/requests/${id}`);
}

export async function cancelRequest(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const request = get<{ created_by: number; status: string }>(getDb(), `SELECT created_by, status FROM requests WHERE id = ? AND company_id = ?`, id, user.companyId);
  if (!request || request.status !== 'pending') fail(`/w/requests/${id}`, 'invalid');
  if (request.created_by !== user.id && user.role !== 'hr') fail(`/w/requests/${id}`, 'forbidden');
  run(getDb(), `UPDATE requests SET status = 'cancelled' WHERE id = ?`, id);
  run(getDb(), `UPDATE approval_steps SET status = 'skipped' WHERE request_id = ? AND status IN ('pending', 'waiting')`, id);
  redirect(`/w/requests/${id}`);
}

function employeePayload(formData: FormData) {
  const text = (key: string) => String(formData.get(key) || '').trim();
  const optionalNumber = (key: string) => {
    const raw = text(key);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  };
  return {
    first: text('first_name'),
    last: text('last_name'),
    personalId: text('personal_id'),
    birth: text('birth_date') || null,
    gender: text('gender') || null,
    phone: text('phone') || null,
    email: text('email') || null,
    address: text('address') || null,
    departmentId: optionalNumber('department_id'),
    positionId: optionalNumber('position_id'),
    managerId: optionalNumber('manager_id'),
    status: text('status') || 'active',
    hire: text('hire_date') || null,
    contract: text('contract_type') || null,
    contractEnd: text('contract_end') || null,
    salaryType: text('salary_type') || 'fixed',
    gross: optionalNumber('salary_gross'),
    hourly: optionalNumber('hourly_rate'),
    output: optionalNumber('output_rate'),
    pension: formData.get('pension_participant') ? 1 : 0,
    scheduleStart: text('schedule_start') || '09:00',
    scheduleEnd: text('schedule_end') || '18:00',
  };
}

export async function createEmployee(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const data = employeePayload(formData);
  if (!data.first || !data.last) fail('/w/employees/new', 'invalid');
  if (data.personalId && !/^\d{11}$/.test(data.personalId)) fail('/w/employees/new', 'invalid');
  const created = run(
    getDb(),
    `INSERT INTO employees (
      company_id, status, first_name, last_name, personal_id, birth_date, gender, phone, email, address,
      department_id, position_id, manager_id, hire_date, contract_type, contract_end, salary_type, salary_gross,
      hourly_rate, output_rate, pension_participant, schedule_start, schedule_end, rs_status
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, 'pending')`,
    user.companyId, data.status, data.first, data.last, data.personalId || null, data.birth, data.gender, data.phone, data.email, data.address,
    data.departmentId, data.positionId, data.managerId, data.hire, data.contract, data.contractEnd, data.salaryType, data.gross, data.hourly, data.output,
    data.pension, data.scheduleStart, data.scheduleEnd,
  );
  const id = Number(created.lastInsertRowid);
  run(getDb(), `INSERT INTO vacation_balances (employee_id, year, type, entitled, used) VALUES (?, ?, 'annual', 24, 0), (?, ?, 'study', 5, 0)`, id, new Date().getFullYear(), id, new Date().getFullYear());
  redirect(`/w/employees/${id}`);
}

export async function updateEmployee(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const id = Number(formData.get('id'));
  const existing = getVisibleEmployee(user, id);
  if (!existing) fail('/w/employees', 'missing');
  const data = employeePayload(formData);
  if (!data.first || !data.last) fail(`/w/employees/${id}`, 'invalid');
  if (data.personalId && !/^\d{11}$/.test(data.personalId)) fail(`/w/employees/${id}`, 'invalid');
  run(
    getDb(),
    `UPDATE employees SET status=?, first_name=?, last_name=?, personal_id=?, birth_date=?, gender=?, phone=?, email=?, address=?,
      department_id=?, position_id=?, manager_id=?, hire_date=?, contract_type=?, contract_end=?, salary_type=?, salary_gross=?,
      hourly_rate=?, output_rate=?, pension_participant=?, schedule_start=?, schedule_end=? WHERE id=? AND company_id=?`,
    data.status, data.first, data.last, data.personalId || null, data.birth, data.gender, data.phone, data.email, data.address,
    data.departmentId, data.positionId, data.managerId, data.hire, data.contract, data.contractEnd, data.salaryType, data.gross, data.hourly, data.output,
    data.pension, data.scheduleStart, data.scheduleEnd, id, user.companyId,
  );
  redirect(`/w/employees/${id}`);
}

export async function dismissEmployee(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const id = Number(formData.get('id'));
  if (!getVisibleEmployee(user, id)) fail('/w/employees', 'missing');
  run(getDb(), `UPDATE employees SET status='dismissed', dismiss_date=?, dismiss_reason=? WHERE id=?`, String(formData.get('date') || todayISO()), String(formData.get('reason') || ''), id);
  redirect(`/w/employees/${id}`);
}

export async function syncRs(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const id = Number(formData.get('id'));
  if (!getVisibleEmployee(user, id)) fail('/w/employees', 'missing');
  run(getDb(), `UPDATE employees SET rs_status='synced', rs_synced_at=? WHERE id=?`, new Date().toISOString(), id);
  redirect(`/w/employees/${id}`);
}

export async function saveBalance(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const id = Number(formData.get('id'));
  if (!getVisibleEmployee(user, id)) fail('/w/employees', 'missing');
  const year = Number(formData.get('year'));
  for (const type of ['annual', 'study']) {
    const entitled = Number(formData.get(type) || 0);
    run(
      getDb(),
      `INSERT INTO vacation_balances (employee_id, year, type, entitled, used) VALUES (?, ?, ?, ?, 0)
       ON CONFLICT(employee_id, year, type) DO UPDATE SET entitled = ?`,
      id, year, type, entitled, entitled,
    );
  }
  redirect(`/w/employees/${id}`);
}

export async function addProfileItem(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/employees', 'forbidden');
  const id = Number(formData.get('id'));
  const kind = String(formData.get('kind') || '');
  if (!getVisibleEmployee(user, id)) fail('/w/employees', 'missing');
  if (kind === 'education') {
    run(getDb(), `INSERT INTO education (employee_id, institution, degree, year) VALUES (?, ?, ?, ?)`, id, String(formData.get('institution') || ''), String(formData.get('degree') || ''), Number(formData.get('year')) || null);
  } else if (kind === 'benefit') {
    run(getDb(), `INSERT INTO benefits (employee_id, name, amount, start_date) VALUES (?, ?, ?, ?)`, id, String(formData.get('name') || ''), Number(formData.get('amount')) || 0, todayISO());
  } else if (kind === 'file') {
    run(getDb(), `INSERT INTO employee_files (employee_id, name, kind, added_at) VALUES (?, ?, ?, ?)`, id, String(formData.get('name') || ''), String(formData.get('file_kind') || 'other'), todayISO());
  }
  redirect(`/w/employees/${id}`);
}

export async function punch(formData: FormData) {
  const user = await requireUser();
  if (!user.employeeId) fail('/w', 'forbidden');
  const place = ['office', 'remote', 'site'].includes(String(formData.get('place'))) ? String(formData.get('place')) : 'office';
  const date = todayISO();
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const existing = get<{ id: number; check_in: string | null; check_out: string | null }>(getDb(), `SELECT id, check_in, check_out FROM attendance WHERE employee_id = ? AND date = ?`, user.employeeId, date);
  if (!existing) {
    run(getDb(), `INSERT INTO attendance (employee_id, date, check_in, location) VALUES (?, ?, ?, ?)`, user.employeeId, date, time, place);
  } else if (!existing.check_out) {
    run(getDb(), `UPDATE attendance SET check_out = ?, location = COALESCE(location, ?) WHERE id = ?`, time, place, existing.id);
  }
  redirect('/w');
}

export async function saveShift(formData: FormData) {
  const user = await requireUser();
  const employeeId = Number(formData.get('employee_id'));
  const employee = getVisibleEmployee(user, employeeId);
  if (!employee) fail('/w/attendance', 'forbidden');
  if (user.role === 'employee' && user.employeeId !== employeeId) fail('/w/attendance', 'forbidden');
  if (user.role !== 'hr' && user.role !== 'director' && user.role !== 'manager') fail('/w/attendance', 'forbidden');
  const date = String(formData.get('date') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail('/w/attendance', 'invalid');
  if (formData.get('remove')) {
    run(getDb(), `DELETE FROM shifts WHERE employee_id = ? AND date = ?`, employeeId, date);
  } else {
    const start = String(formData.get('start') || '');
    const end = String(formData.get('end') || '');
    if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end) || end <= start) fail('/w/attendance', 'invalid');
    run(
      getDb(),
      `INSERT INTO shifts (employee_id, date, start_time, end_time) VALUES (?, ?, ?, ?)
       ON CONFLICT(employee_id, date) DO UPDATE SET start_time = ?, end_time = ?`,
      employeeId, date, start, end, start, end,
    );
  }
  redirect(`/w/attendance?employee=${employeeId}&year=${date.slice(0, 4)}&month=${Number(date.slice(5, 7))}`);
}

export async function shareTabel(formData: FormData) {
  const user = await requireUser();
  if (user.role !== 'hr' && user.role !== 'director') fail('/w/tabel', 'forbidden');
  const year = Number(formData.get('year'));
  const month = Number(formData.get('month'));
  const mode = formData.get('mode') === 'schedule' ? 'schedule' : 'actual';
  run(
    getDb(),
    `INSERT INTO tabel_periods (company_id, year, month, mode, status) VALUES (?, ?, ?, ?, 'shared')
     ON CONFLICT(company_id, year, month) DO UPDATE SET mode = ?, status = 'shared'`,
    user.companyId, year, month, mode, mode,
  );
  const period = get<{ id: number }>(getDb(), `SELECT id FROM tabel_periods WHERE company_id = ? AND year = ? AND month = ?`, user.companyId, year, month);
  if (!period) fail('/w/tabel', 'invalid');
  run(getDb(), `DELETE FROM tabel_confirmations WHERE period_id = ?`, period.id);
  const managers = all<{ manager_employee_id: number }>(getDb(), `SELECT DISTINCT manager_employee_id FROM departments WHERE company_id = ? AND manager_employee_id IS NOT NULL`, user.companyId);
  for (const manager of managers) {
    run(getDb(), `INSERT INTO tabel_confirmations (period_id, manager_employee_id, status) VALUES (?, ?, 'pending')`, period.id, manager.manager_employee_id);
    notify(userIdForEmployee(manager.manager_employee_id), 'tabel_shared', `${year}-${month}`, `/w/tabel?year=${year}&month=${month}`);
  }
  redirect(`/w/tabel?year=${year}&month=${month}&mode=${mode}`);
}

export async function confirmTabel(formData: FormData) {
  const user = await requireUser();
  const year = Number(formData.get('year'));
  const month = Number(formData.get('month'));
  const period = get<{ id: number }>(getDb(), `SELECT id FROM tabel_periods WHERE company_id = ? AND year = ? AND month = ?`, user.companyId, year, month);
  if (!period || !user.employeeId) fail('/w/tabel', 'forbidden');
  const updated = run(
    getDb(),
    `UPDATE tabel_confirmations SET status = 'confirmed', confirmed_at = ? WHERE period_id = ? AND manager_employee_id = ? AND status = 'pending'`,
    new Date().toISOString(),
    period.id,
    user.employeeId,
  );
  if (updated.changes === 0 && user.role !== 'hr') fail(`/w/tabel?year=${year}&month=${month}`, 'forbidden');
  const pending = get<{ count: number }>(getDb(), `SELECT COUNT(*) AS count FROM tabel_confirmations WHERE period_id = ? AND status = 'pending'`, period.id);
  if (!pending?.count) run(getDb(), `UPDATE tabel_periods SET status = 'confirmed' WHERE id = ?`, period.id);
  redirect(`/w/tabel?year=${year}&month=${month}`);
}

export async function savePayrollInputs(formData: FormData) {
  const user = await requireUser();
  if (!canSeePayroll(user.role)) fail('/w', 'forbidden');
  const year = Number(formData.get('year'));
  const month = Number(formData.get('month'));
  const ids = String(formData.get('ids') || '').split(',').map(Number).filter(Boolean);
  for (const id of ids) {
    const employee = getVisibleEmployee(user, id);
    if (!employee) continue;
    const numberOf = (key: string) => Number(formData.get(`${key}_${id}`) || 0);
    run(
      getDb(),
      `INSERT INTO payroll_inputs (employee_id, year, month, bonus, deduction, output_units, commission)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(employee_id, year, month) DO UPDATE SET bonus = ?, deduction = ?, output_units = ?, commission = ?`,
      id, year, month, numberOf('bonus'), numberOf('deduction'), numberOf('units'), numberOf('commission'),
      numberOf('bonus'), numberOf('deduction'), numberOf('units'), numberOf('commission'),
    );
  }
  redirect(`/w/payroll?year=${year}&month=${month}`);
}

export async function createDocument(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/documents', 'forbidden');
  const name = String(formData.get('name') || '').trim();
  const body = String(formData.get('body') || '').trim();
  const folderId = Number(formData.get('folder_id'));
  if (!name || !body || !folderId) fail('/w/documents', 'invalid');
  const created = run(
    getDb(),
    `INSERT INTO documents (company_id, folder_id, name, body, requires_signature, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
    user.companyId, folderId, name, body, formData.get('requires_signature') ? 1 : 0, new Date().toISOString(),
  );
  const documentId = Number(created.lastInsertRowid);
  const recipients = formData.getAll('employee_id').map(Number).filter(Boolean);
  for (const employeeId of recipients) {
    if (!getVisibleEmployee(user, employeeId)) continue;
    run(getDb(), `INSERT INTO document_access (document_id, employee_id) VALUES (?, ?)`, documentId, employeeId);
    notify(userIdForEmployee(employeeId), 'document_shared', name, `/w/documents/${documentId}`);
  }
  redirect(`/w/documents/${documentId}`);
}

export async function createFolder(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/documents', 'forbidden');
  const name = String(formData.get('name') || '').trim();
  const color = String(formData.get('color') || '#14532d');
  if (!name) fail('/w/documents', 'invalid');
  run(getDb(), `INSERT INTO folders (company_id, name, color) VALUES (?, ?, ?)`, user.companyId, name, color);
  redirect('/w/documents');
}

export async function signDocument(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  if (!user.employeeId) fail(`/w/documents/${id}`, 'forbidden');
  const access = get<{ document_id: number }>(getDb(), `SELECT document_id FROM document_access WHERE document_id = ? AND employee_id = ?`, id, user.employeeId);
  if (!access) fail(`/w/documents/${id}`, 'forbidden');
  run(getDb(), `UPDATE document_access SET signed_at = ?, seen_at = COALESCE(seen_at, ?) WHERE document_id = ? AND employee_id = ?`, new Date().toISOString(), new Date().toISOString(), id, user.employeeId);
  redirect(`/w/documents/${id}`);
}

export async function saveCompany(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/settings', 'forbidden');
  run(getDb(), `UPDATE companies SET name = ?, tax_id = ?, address = ? WHERE id = ?`, String(formData.get('name') || ''), String(formData.get('tax_id') || ''), String(formData.get('address') || ''), user.companyId);
  redirect('/w/settings');
}

export async function saveChains(formData: FormData) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/settings', 'forbidden');
  const allowed = new Set(['manager', 'hr', 'finance', 'director']);
  for (const type of REQUEST_TYPES) {
    const steps = String(formData.get(`steps_${type.id}`) || '').split(',').map((part) => part.trim()).filter(Boolean);
    if (!steps.length || steps.some((step) => !allowed.has(step))) fail('/w/settings', 'invalid');
    run(
      getDb(),
      `INSERT INTO approval_chains (company_id, request_type, steps) VALUES (?, ?, ?)
       ON CONFLICT(company_id, request_type) DO UPDATE SET steps = ?`,
      user.companyId, type.id, JSON.stringify(steps), JSON.stringify(steps),
    );
  }
  redirect('/w/settings');
}

export async function resetDemo() {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) fail('/w/settings', 'forbidden');
  const db = getDb();
  db.pragma('foreign_keys = OFF');
  for (const table of ['tabel_confirmations', 'tabel_periods', 'payroll_inputs', 'attendance', 'shifts', 'notifications', 'approval_steps', 'requests', 'approval_chains', 'document_access', 'documents', 'folders', 'vacation_balances', 'employee_files', 'benefits', 'education', 'users', 'employees', 'positions', 'departments', 'holidays', 'companies']) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
  db.pragma('foreign_keys = ON');
  seed(db);
  redirect('/w?reset=1');
}

export async function openNotification(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get('id'));
  const note = get<{ href: string | null }>(getDb(), `SELECT href FROM notifications WHERE id = ? AND user_id = ?`, id, user.id);
  if (!note) redirect('/w/notifications');
  run(getDb(), `UPDATE notifications SET read_at = ? WHERE id = ? AND read_at IS NULL`, new Date().toISOString(), id);
  redirect(note.href || '/w/notifications');
}

export async function markNotificationsRead() {
  const user = await requireUser();
  run(getDb(), `UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL`, new Date().toISOString(), user.id);
  redirect('/w/notifications');
}
