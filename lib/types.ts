export type EmployeeRow = {
  id: number;
  company_id: number;
  status: string;
  first_name: string;
  last_name: string;
  personal_id: string | null;
  birth_date: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  department_id: number | null;
  position_id: number | null;
  manager_id: number | null;
  hire_date: string | null;
  dismiss_date: string | null;
  dismiss_reason: string | null;
  contract_type: string | null;
  contract_end: string | null;
  salary_type: string | null;
  salary_gross: number | null;
  hourly_rate: number | null;
  output_rate: number | null;
  pension_participant: number;
  schedule_start: string;
  schedule_end: string;
  rs_status: string;
  rs_synced_at: string | null;
  department_name?: string | null;
  position_title?: string | null;
  manager_name?: string | null;
};

export type Role = 'hr' | 'director' | 'finance' | 'manager' | 'employee';

export type CurrentUser = {
  id: number;
  companyId: number;
  companyName: string;
  role: Role;
  employeeId: number | null;
  email: string;
  name: string;
  departmentId: number | null;
};

export function personName(person: { first_name: string; last_name: string }) {
  return `${person.first_name} ${person.last_name}`;
}
