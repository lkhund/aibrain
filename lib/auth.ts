import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { all, get, getDb } from '@/lib/db';
import { COOKIE, decodeSession } from '@/lib/session';
import type { CurrentUser, EmployeeRow, Role } from '@/lib/types';

type UserJoin = {
  id: number;
  company_id: number;
  employee_id: number | null;
  email: string;
  role: Role;
  company_name: string;
  first_name: string | null;
  last_name: string | null;
  department_id: number | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = await decodeSession(token);
  if (!session) return null;
  const db = getDb();
  const row = get<UserJoin>(
    db,
    `SELECT u.id, u.company_id, u.employee_id, u.email, u.role, c.name AS company_name,
            e.first_name, e.last_name, e.department_id
     FROM users u
     JOIN companies c ON c.id = u.company_id
     LEFT JOIN employees e ON e.id = u.employee_id
     WHERE u.id = ? AND u.company_id = ?`,
    session.userId,
    session.companyId,
  );
  if (!row) return null;
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    role: row.role,
    employeeId: row.employee_id,
    email: row.email,
    name: row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : row.email,
    departmentId: row.department_id,
  };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export function canSeePayroll(role: Role) {
  return role === 'hr' || role === 'director' || role === 'finance';
}

export function canManageEmployees(role: Role) {
  return role === 'hr';
}

export function canSeeSalary(user: CurrentUser, employeeId: number) {
  return canSeePayroll(user.role) || user.employeeId === employeeId;
}

export function visibility(user: CurrentUser) {
  if (user.role === 'hr' || user.role === 'director' || user.role === 'finance') {
    return { clause: 'e.company_id = ?', params: [user.companyId] as unknown[] };
  }
  if (user.role === 'manager' && user.employeeId) {
    return {
      clause: `e.company_id = ? AND (e.id = ? OR e.manager_id = ? OR e.department_id IN (SELECT id FROM departments WHERE manager_employee_id = ?))`,
      params: [user.companyId, user.employeeId, user.employeeId, user.employeeId] as unknown[],
    };
  }
  return { clause: 'e.company_id = ? AND e.id = ?', params: [user.companyId, user.employeeId ?? 0] as unknown[] };
}

const EMPLOYEE_SELECT = `
  SELECT e.*, d.name AS department_name, p.title AS position_title,
         TRIM(COALESCE(m.first_name, '') || ' ' || COALESCE(m.last_name, '')) AS manager_name
  FROM employees e
  LEFT JOIN departments d ON d.id = e.department_id
  LEFT JOIN positions p ON p.id = e.position_id
  LEFT JOIN employees m ON m.id = e.manager_id
`;

export function listVisibleEmployees(user: CurrentUser) {
  const db = getDb();
  const scope = visibility(user);
  return all<EmployeeRow>(db, `${EMPLOYEE_SELECT} WHERE ${scope.clause} ORDER BY e.first_name, e.last_name`, ...scope.params);
}

export function getVisibleEmployee(user: CurrentUser, id: number) {
  const db = getDb();
  const scope = visibility(user);
  return get<EmployeeRow>(db, `${EMPLOYEE_SELECT} WHERE e.id = ? AND ${scope.clause}`, id, ...scope.params);
}

export function companyHolidays() {
  return new Set(all<{ date: string }>(getDb(), `SELECT date FROM holidays`).map((row) => row.date));
}
