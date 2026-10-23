import type Database from 'better-sqlite3';
import { REQUEST_TYPES } from '@/lib/catalog';
import { hashPassword } from '@/lib/password';
import { isWeekend } from '@/lib/time';

type EmployeeSeed = {
  id: number;
  status: string;
  first: string;
  last: string;
  pid: string;
  birth: string;
  gender: string;
  phone: string;
  email: string;
  address: string;
  dept: number | null;
  pos: number | null;
  manager: number | null;
  hire: string | null;
  dismiss: string | null;
  dismissReason: string | null;
  contract: string | null;
  contractEnd: string | null;
  salaryType: string | null;
  gross: number | null;
  hourly: number | null;
  output: number | null;
  pension: number;
  rs: string;
};

const employees: EmployeeSeed[] = [
  { id: 1, status: 'active', first: 'გიორგი', last: 'კაპანაძე', pid: '01024001014', birth: '1984-04-12', gender: 'm', phone: '+995555100101', email: 'giorgi@demo.ge', address: 'თბილისი, ვაკე', dept: 1, pos: 1, manager: null, hire: '2019-03-01', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 8000, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 2, status: 'active', first: 'ნინო', last: 'ბერიძე', pid: '01024002025', birth: '1990-06-21', gender: 'f', phone: '+995555100102', email: 'nino@demo.ge', address: 'თბილისი, საბურთალო', dept: 1, pos: 2, manager: 1, hire: '2020-06-15', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 3500, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 3, status: 'active', first: 'მარიამ', last: 'გელაშვილი', pid: '01024003036', birth: '1988-01-09', gender: 'f', phone: '+995555100103', email: 'mariam@demo.ge', address: 'თბილისი, ვერა', dept: 2, pos: 4, manager: 1, hire: '2021-01-11', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 4500, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 4, status: 'active', first: 'ლუკა', last: 'ხარაიშვილი', pid: '01024004047', birth: '1992-11-02', gender: 'm', phone: '+995555100104', email: 'luka@demo.ge', address: 'თბილისი, დიდუბე', dept: 3, pos: 6, manager: 1, hire: '2021-09-01', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'hybrid', gross: 4200, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 5, status: 'active', first: 'ანა', last: 'წერეთელი', pid: '01024005058', birth: '1996-10-28', gender: 'f', phone: '+995555100105', email: 'ana@demo.ge', address: 'თბილისი, ნაძალადევი', dept: 3, pos: 7, manager: 4, hire: '2023-02-14', dismiss: null, dismissReason: null, contract: 'fixed_term', contractEnd: '2027-02-14', salaryType: 'fixed', gross: 2800, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 6, status: 'active', first: 'დავით', last: 'ლომიძე', pid: '01024006069', birth: '1998-03-17', gender: 'm', phone: '+995555100106', email: 'davit@demo.ge', address: 'თბილისი, ისანი', dept: 3, pos: 7, manager: 4, hire: '2024-11-04', dismiss: null, dismissReason: null, contract: 'service', contractEnd: null, salaryType: 'variable', gross: null, hourly: 22, output: null, pension: 0, rs: 'pending' },
  { id: 7, status: 'active', first: 'სალომე', last: 'კიკნაძე', pid: '01024007070', birth: '1995-07-30', gender: 'f', phone: '+995555100107', email: 'salome@demo.ge', address: 'თბილისი, გლდანი', dept: 4, pos: 9, manager: 8, hire: '2022-05-16', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'output', gross: null, hourly: null, output: 35, pension: 1, rs: 'synced' },
  { id: 8, status: 'active', first: 'ირაკლი', last: 'წიკლაური', pid: '01024008081', birth: '1987-12-05', gender: 'm', phone: '+995555100108', email: 'irakli@demo.ge', address: 'თბილისი, დიღომი', dept: 4, pos: 8, manager: 1, hire: '2020-10-01', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'hybrid', gross: 3200, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 9, status: 'active', first: 'ეკა', last: 'გიორგაძე', pid: '01024009092', birth: '1994-02-19', gender: 'f', phone: '+995555100109', email: 'eka@demo.ge', address: 'თბილისი, წყნეთი', dept: 5, pos: 11, manager: 10, hire: '2024-04-08', dismiss: null, dismissReason: null, contract: 'fixed_term', contractEnd: '2026-11-30', salaryType: 'fixed', gross: 1900, hourly: null, output: null, pension: 1, rs: 'error' },
  { id: 10, status: 'active', first: 'თამარ', last: 'ჯავახიშვილი', pid: '01024010103', birth: '1991-10-03', gender: 'f', phone: '+995555100110', email: 'tamar@demo.ge', address: 'თბილისი, მთაწმინდა', dept: 5, pos: 10, manager: 1, hire: '2022-08-22', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 2700, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 11, status: 'active', first: 'ნიკოლოზ', last: 'აბაშიძე', pid: '01024011114', birth: '1993-09-14', gender: 'm', phone: '+995555100111', email: 'nikoloz@demo.ge', address: 'თბილისი, ორთაჭალა', dept: 2, pos: 5, manager: 3, hire: '2023-07-01', dismiss: null, dismissReason: null, contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 2300, hourly: null, output: null, pension: 1, rs: 'synced' },
  { id: 12, status: 'candidate', first: 'ნიკა', last: 'აბრამიშვილი', pid: '01024012125', birth: '1999-05-25', gender: 'm', phone: '+995555100112', email: 'nika@demo.ge', address: 'თბილისი', dept: 3, pos: 7, manager: 4, hire: null, dismiss: null, dismissReason: null, contract: null, contractEnd: null, salaryType: 'fixed', gross: 2600, hourly: null, output: null, pension: 1, rs: 'pending' },
  { id: 13, status: 'candidate', first: 'სოფო', last: 'ნადირაძე', pid: '01024013136', birth: '1997-08-11', gender: 'f', phone: '+995555100113', email: 'sopho@demo.ge', address: 'რუსთავი', dept: 4, pos: 9, manager: 8, hire: null, dismiss: null, dismissReason: null, contract: null, contractEnd: null, salaryType: 'output', gross: null, hourly: null, output: 35, pension: 1, rs: 'pending' },
  { id: 14, status: 'dismissed', first: 'გიგა', last: 'მაისურაძე', pid: '01024014147', birth: '1991-01-29', gender: 'm', phone: '+995555100114', email: 'giga@demo.ge', address: 'თბილისი', dept: 3, pos: 7, manager: 4, hire: '2022-02-01', dismiss: '2026-08-31', dismissReason: 'პირადი განცხადება', contract: 'indefinite', contractEnd: null, salaryType: 'fixed', gross: 2500, hourly: null, output: null, pension: 1, rs: 'synced' },
];

const users = [
  { id: 1, employeeId: 1, email: 'giorgi@demo.ge', role: 'director' },
  { id: 2, employeeId: 2, email: 'nino@demo.ge', role: 'hr' },
  { id: 3, employeeId: 3, email: 'mariam@demo.ge', role: 'finance' },
  { id: 4, employeeId: 4, email: 'luka@demo.ge', role: 'manager' },
  { id: 5, employeeId: 5, email: 'ana@demo.ge', role: 'employee' },
  { id: 6, employeeId: 8, email: 'irakli@demo.ge', role: 'manager' },
  { id: 7, employeeId: 10, email: 'tamar@demo.ge', role: 'manager' },
];

function eachOctoberWorkday() {
  const dates: string[] = [];
  for (let day = 1; day <= 21; day += 1) {
    const iso = `2026-10-${String(day).padStart(2, '0')}`;
    if (!isWeekend(iso) && iso !== '2026-10-14') dates.push(iso);
  }
  return dates;
}

export function seed(db: Database.Database) {
  const password = hashPassword('demo1234');
  db.prepare(`INSERT INTO companies (id, name, tax_id, address) VALUES (1, ?, ?, ?)`).run(
    'შპს „მთაწმინდა ლაბი“',
    '405123456',
    'თბილისი, რუსთაველის გამზირი 24',
  );

  const departments = [
    [1, 'ადმინისტრაცია', null],
    [2, 'ფინანსები', null],
    [3, 'ტექნოლოგიები', null],
    [4, 'გაყიდვები', null],
    [5, 'ოპერაციები', null],
  ];
  const insertDepartment = db.prepare(`INSERT INTO departments (id, company_id, name, parent_id) VALUES (?, 1, ?, ?)`);
  for (const [id, name, parent] of departments) insertDepartment.run(id, name, parent);

  const positions = [
    [1, 1, 'დირექტორი', 1],
    [2, 1, 'HR ხელმძღვანელი', 1],
    [3, 1, 'HR სპეციალისტი', 2],
    [4, 2, 'ფინანსური დირექტორი', 1],
    [5, 2, 'ბუღალტერი', 2],
    [6, 3, 'IT ხელმძღვანელი', 1],
    [7, 3, 'დეველოპერი', 4],
    [8, 4, 'გაყიდვების ხელმძღვანელი', 1],
    [9, 4, 'გაყიდვების წარმომადგენელი', 3],
    [10, 5, 'ოპერაციების ხელმძღვანელი', 1],
    [11, 5, 'ოპერაციების სპეციალისტი', 3],
  ];
  const insertPosition = db.prepare(`INSERT INTO positions (id, company_id, department_id, title, planned_headcount) VALUES (?, 1, ?, ?, ?)`);
  for (const [id, department, title, planned] of positions) insertPosition.run(id, department, title, planned);

  const insertEmployee = db.prepare(`
    INSERT INTO employees (
      id, company_id, status, first_name, last_name, personal_id, birth_date, gender, phone, email, address,
      department_id, position_id, manager_id, hire_date, dismiss_date, dismiss_reason, contract_type, contract_end,
      salary_type, salary_gross, hourly_rate, output_rate, pension_participant, schedule_start, schedule_end, rs_status, rs_synced_at
    ) VALUES (
      ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '09:00', '18:00', ?, ?
    )
  `);
  for (const employee of employees) {
    insertEmployee.run(
      employee.id,
      employee.status,
      employee.first,
      employee.last,
      employee.pid,
      employee.birth,
      employee.gender,
      employee.phone,
      employee.email,
      employee.address,
      employee.dept,
      employee.pos,
      employee.manager,
      employee.hire,
      employee.dismiss,
      employee.dismissReason,
      employee.contract,
      employee.contractEnd,
      employee.salaryType,
      employee.gross,
      employee.hourly,
      employee.output,
      employee.pension,
      employee.rs,
      employee.rs === 'synced' ? '2026-10-01T08:00:00.000Z' : null,
    );
  }

  db.prepare(`UPDATE departments SET manager_employee_id = 1 WHERE id = 1`).run();
  db.prepare(`UPDATE departments SET manager_employee_id = 3 WHERE id = 2`).run();
  db.prepare(`UPDATE departments SET manager_employee_id = 4 WHERE id = 3`).run();
  db.prepare(`UPDATE departments SET manager_employee_id = 8 WHERE id = 4`).run();
  db.prepare(`UPDATE departments SET manager_employee_id = 10 WHERE id = 5`).run();

  const insertUser = db.prepare(`INSERT INTO users (id, company_id, employee_id, email, password_hash, role) VALUES (?, 1, ?, ?, ?, ?)`);
  for (const user of users) insertUser.run(user.id, user.employeeId, user.email, password, user.role);

  const insertEducation = db.prepare(`INSERT INTO education (employee_id, institution, degree, year) VALUES (?, ?, ?, ?)`);
  insertEducation.run(5, 'თსუ', 'ბაკალავრი, კომპიუტერული მეცნიერება', 2018);
  insertEducation.run(4, 'სტუ', 'მაგისტრი, ინფორმატიკა', 2016);
  insertEducation.run(2, 'თსუ', 'მაგისტრი, ადამიანური რესურსები', 2014);
  insertEducation.run(3, 'კავკასიის უნივერსიტეტი', 'ბაკალავრი, ფინანსები', 2010);

  const insertBenefit = db.prepare(`INSERT INTO benefits (employee_id, name, amount, start_date) VALUES (?, ?, ?, ?)`);
  for (const id of [1, 2, 3, 4, 5, 8, 10, 11]) insertBenefit.run(id, 'ჯანმრთელობის დაზღვევა', 45, '2026-01-01');
  insertBenefit.run(4, 'სპორტდარბაზი', 30, '2026-01-01');
  insertBenefit.run(5, 'ტრანსპორტი', 40, '2026-03-01');

  const insertFile = db.prepare(`INSERT INTO employee_files (employee_id, name, kind, added_at) VALUES (?, ?, ?, ?)`);
  for (const employee of employees.filter((item) => item.status !== 'candidate')) {
    insertFile.run(employee.id, 'შრომითი ხელშეკრულება', 'contract', employee.hire || '2026-01-01');
    insertFile.run(employee.id, 'პირადობის ასლი', 'id', employee.hire || '2026-01-01');
  }
  insertFile.run(5, 'დიპლომი', 'education', '2023-02-14');

  const insertBalance = db.prepare(`INSERT INTO vacation_balances (employee_id, year, type, entitled, used) VALUES (?, 2026, ?, ?, ?)`);
  for (const employee of employees.filter((item) => item.status === 'active')) {
    const annualUsed = employee.id === 4 ? 8 : employee.id === 5 ? 5 : employee.id === 2 ? 3 : employee.id === 10 ? 6 : 0;
    insertBalance.run(employee.id, 'annual', 24, annualUsed);
    insertBalance.run(employee.id, 'study', 5, 0);
    insertBalance.run(employee.id, 'unpaid', 0, 0);
    insertBalance.run(employee.id, 'sick', 0, employee.id === 11 ? 1 : 0);
    insertBalance.run(employee.id, 'maternity', 0, 0);
  }

  db.prepare(`INSERT INTO folders (id, company_id, name, color) VALUES (1, 1, ?, ?)`).run('შინაგანი წესები', '#9a3412');
  db.prepare(`INSERT INTO folders (id, company_id, name, color) VALUES (2, 1, ?, ?)`).run('ხელშეკრულებები', '#14532d');
  db.prepare(`INSERT INTO folders (id, company_id, name, color) VALUES (3, 1, ?, ?)`).run('ცნობები და პოლიტიკა', '#1e3a8a');

  const docs = [
    [1, 1, 'შრომის შინაგანაწესი', 'შპს „მთაწმინდა ლაბი“-ს შრომის შინაგანაწესი. სამუშაო დრო ორშაბათიდან პარასკევამდე, 09:00–18:00, შესვენებით 13:00–14:00. დისტანციური დღე შეთანხმდება უშუალო ხელმძღვანელთან.', 1],
    [2, 1, 'უსაფრთხოების პოლიტიკა', 'წვდომის ბარათი და სამუშაო ანგარიში პირადია. ინციდენტი ეცნობება HR-ს იმავე დღეს.', 0],
    [3, 3, 'შვებულების პოლიტიკა', 'ანაზღაურებადი შვებულება არის 24 სამუშაო დღე კალენდარულ წელიწადში. მოთხოვნა იგზავნება მენეჯერთან, შემდეგ HR-თან.', 0],
    [4, 2, 'ხელშეკრულების დანართი — ანა წერეთელი', 'ვადიანი ხელშეკრულება 2027 წლის 14 თებერვლამდე. პოზიცია: დეველოპერი. ანაზღაურება ფიქსირებულია თვეში.', 1],
  ];
  const insertDoc = db.prepare(`INSERT INTO documents (id, company_id, folder_id, name, body, requires_signature, created_at) VALUES (?, 1, ?, ?, ?, ?, '2026-09-15')`);
  for (const [id, folder, name, body, signature] of docs) insertDoc.run(id, folder, name, body, signature);

  const insertAccess = db.prepare(`INSERT INTO document_access (document_id, employee_id, seen_at, downloaded_at, signed_at) VALUES (?, ?, ?, ?, ?)`);
  const activeIds = employees.filter((item) => item.status === 'active').map((item) => item.id);
  for (const employeeId of activeIds) {
    const signed = [1, 2, 3, 4, 5].includes(employeeId) ? '2026-09-20T10:00:00.000Z' : null;
    const seen = [1, 2, 3, 4, 5, 6, 7, 8].includes(employeeId) ? '2026-09-18T10:00:00.000Z' : null;
    insertAccess.run(1, employeeId, seen, signed ? '2026-09-20T10:05:00.000Z' : null, signed);
    insertAccess.run(2, employeeId, '2026-09-18T10:00:00.000Z', null, null);
  }
  for (const employeeId of [1, 2, 3, 4, 8, 10]) insertAccess.run(3, employeeId, '2026-09-21T10:00:00.000Z', null, null);
  insertAccess.run(4, 5, '2026-09-16T10:00:00.000Z', '2026-09-16T10:05:00.000Z', '2026-09-16T10:06:00.000Z');

  const insertChain = db.prepare(`INSERT INTO approval_chains (company_id, request_type, steps) VALUES (1, ?, ?)`);
  for (const type of REQUEST_TYPES) insertChain.run(type.id, JSON.stringify(type.steps));

  const insertRequest = db.prepare(`INSERT INTO requests (id, company_id, type, employee_id, created_by, status, payload, created_at) VALUES (?, 1, ?, ?, ?, ?, ?, ?)`);
  const requests = [
    [1, 'vacation_paid', 5, 5, 'pending', { start: '2026-10-27', end: '2026-10-30', comment: 'ოჯახური ვიზიტი' }, '2026-10-20T09:00:00.000Z'],
    [2, 'advance', 6, 2, 'pending', { amount: 500, comment: 'ოქტომბრის ავანსი' }, '2026-10-18T11:00:00.000Z'],
    [3, 'trip', 9, 7, 'approved', { start: '2026-10-15', end: '2026-10-16', destination: 'ბათუმი', amount: 180, comment: 'კლიენტთან შეხვედრა' }, '2026-10-10T08:30:00.000Z'],
    [4, 'appointment', 12, 2, 'pending', { date: '2026-11-02', comment: 'დეველოპერის პოზიციაზე, საცდელი 3 თვე' }, '2026-10-21T14:00:00.000Z'],
    [5, 'bonus', 7, 6, 'pending', { amount: 300, comment: 'კვარტლის გეგმის შესრულება' }, '2026-10-19T16:00:00.000Z'],
    [6, 'training', 4, 4, 'rejected', { start: '2026-11-02', end: '2026-11-03', comment: 'არქიტექტურის კურსი' }, '2026-10-12T10:00:00.000Z'],
    [7, 'remote', 5, 5, 'approved', { start: '2026-10-08', end: '2026-10-08', comment: 'სახლიდან' }, '2026-10-07T09:10:00.000Z'],
    [8, 'vacation_unpaid', 10, 7, 'pending', { start: '2026-10-29', end: '2026-10-30', comment: 'პირადი საქმე' }, '2026-10-21T12:00:00.000Z'],
    [9, 'vacation_paid', 4, 4, 'approved', { start: '2026-10-05', end: '2026-10-05', comment: 'ერთი დღე' }, '2026-10-01T09:00:00.000Z'],
    [10, 'sick', 11, 2, 'approved', { start: '2026-10-12', end: '2026-10-12', comment: 'ბიულეტენი' }, '2026-10-12T08:00:00.000Z'],
  ] as const;
  for (const [id, type, employeeId, createdBy, status, payload, createdAt] of requests) {
    insertRequest.run(id, type, employeeId, createdBy, status, JSON.stringify(payload), createdAt);
  }

  const insertStep = db.prepare(`INSERT INTO approval_steps (request_id, step_order, role, approver_employee_id, status, acted_at, comment) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const steps = [
    [1, 1, 'manager', 4, 'pending', null, null],
    [1, 2, 'hr', 2, 'waiting', null, null],
    [2, 1, 'manager', 4, 'approved', '2026-10-18T15:00:00.000Z', 'ვადასტურებ'],
    [2, 2, 'finance', 3, 'pending', null, null],
    [2, 3, 'hr', 2, 'waiting', null, null],
    [3, 1, 'manager', 10, 'approved', '2026-10-10T09:00:00.000Z', null],
    [3, 2, 'finance', 3, 'approved', '2026-10-10T12:00:00.000Z', 'ბიუჯეტში ჯდება'],
    [4, 1, 'hr', 2, 'pending', null, null],
    [4, 2, 'director', 1, 'waiting', null, null],
    [5, 1, 'manager', 8, 'approved', '2026-10-19T17:00:00.000Z', null],
    [5, 2, 'finance', 3, 'approved', '2026-10-20T10:00:00.000Z', null],
    [5, 3, 'director', 1, 'pending', null, null],
    [6, 1, 'manager', 1, 'rejected', '2026-10-13T11:00:00.000Z', 'ეს კვარტალი გადატვირთულია'],
    [6, 2, 'hr', 2, 'skipped', null, null],
    [7, 1, 'manager', 4, 'approved', '2026-10-07T10:00:00.000Z', null],
    [8, 1, 'manager', 1, 'pending', null, null],
    [8, 2, 'hr', 2, 'waiting', null, null],
    [9, 1, 'manager', 1, 'approved', '2026-10-01T10:00:00.000Z', null],
    [9, 2, 'hr', 2, 'approved', '2026-10-01T11:00:00.000Z', null],
    [10, 1, 'hr', 2, 'approved', '2026-10-12T09:00:00.000Z', null],
  ] as const;
  for (const [requestId, order, role, approver, status, actedAt, comment] of steps) {
    insertStep.run(requestId, order, role, approver, status, actedAt, comment);
  }

  const insertNote = db.prepare(`INSERT INTO notifications (user_id, kind, detail, href, created_at) VALUES (?, ?, ?, ?, ?)`);
  insertNote.run(4, 'approval_needed', 'vacation_paid', '/w/requests/1', '2026-10-20T09:01:00.000Z');
  insertNote.run(3, 'approval_needed', 'advance', '/w/requests/2', '2026-10-18T15:01:00.000Z');
  insertNote.run(2, 'approval_needed', 'appointment', '/w/requests/4', '2026-10-21T14:01:00.000Z');
  insertNote.run(1, 'approval_needed', 'bonus', '/w/requests/5', '2026-10-20T10:01:00.000Z');
  insertNote.run(5, 'request_approved', 'remote', '/w/requests/7', '2026-10-07T10:01:00.000Z');
  insertNote.run(4, 'tabel_shared', '2026-10', '/w/tabel?year=2026&month=10', '2026-10-21T18:00:00.000Z');

  const insertShift = db.prepare(`INSERT INTO shifts (employee_id, date, start_time, end_time) VALUES (?, ?, ?, ?)`);
  for (const date of ['2026-10-06', '2026-10-08', '2026-10-13', '2026-10-20']) insertShift.run(9, date, '12:00', '21:00');
  insertShift.run(9, '2026-10-17', '10:00', '14:00');

  const insertAttendance = db.prepare(`INSERT INTO attendance (employee_id, date, check_in, check_out, location) VALUES (?, ?, ?, ?, ?)`);
  const workdays = eachOctoberWorkday();
  for (const employeeId of activeIds) {
    for (const date of workdays) {
      if (employeeId === 9 && (date === '2026-10-15' || date === '2026-10-16')) continue;
      if (employeeId === 6 && date === '2026-10-07') continue;
      if (employeeId === 11 && date === '2026-10-12') continue;
      if (employeeId === 4 && date === '2026-10-05') continue;
      let start = '09:00';
      let end = '18:00';
      if (employeeId === 9 && ['2026-10-06', '2026-10-08', '2026-10-13', '2026-10-20'].includes(date)) {
        start = '12:00';
        end = '21:00';
      }
      let checkIn = start;
      let checkOut = end;
      if (employeeId === 5 && date === '2026-10-06') checkIn = '09:28';
      if (employeeId === 5 && date === '2026-10-13') checkOut = '16:40';
      if (employeeId === 4 && date === '2026-10-09') checkOut = '20:30';
      if (employeeId === 8 && date === '2026-10-02') checkIn = '09:17';
      if (employeeId === 10 && date === '2026-10-19') checkIn = '09:46';
      if (employeeId === 2 && date === '2026-10-21') checkOut = '17:10';
      insertAttendance.run(employeeId, date, checkIn, checkOut, 'office');
    }
  }
  insertAttendance.run(9, '2026-10-17', '10:00', '14:00', 'site');

  const insertPayroll = db.prepare(`INSERT INTO payroll_inputs (employee_id, year, month, bonus, deduction, output_units, commission) VALUES (?, 2026, 10, ?, ?, ?, ?)`);
  insertPayroll.run(5, 200, 0, 0, 0);
  insertPayroll.run(11, 0, 80, 0, 0);
  insertPayroll.run(8, 0, 0, 0, 450);
  insertPayroll.run(7, 0, 0, 16, 0);

  const holidays = [
    ['2026-01-01', 'ახალი წელი'],
    ['2026-01-02', 'ახალი წელი'],
    ['2026-01-07', 'შობა'],
    ['2026-01-19', 'ნათლისღება'],
    ['2026-03-03', 'დედის დღე'],
    ['2026-03-08', 'ქალთა საერთაშორისო დღე'],
    ['2026-04-09', 'ეროვნული ერთიანობის დღე'],
    ['2026-04-10', 'წითელი პარასკევი'],
    ['2026-04-11', 'დიდი შაბათი'],
    ['2026-04-12', 'აღდგომა'],
    ['2026-04-13', 'აღდგომის ორშაბათი'],
    ['2026-05-09', 'გამარჯვების დღე'],
    ['2026-05-12', 'წმინდა ანდრია პირველწოდებულის დღე'],
    ['2026-05-26', 'დამოუკიდებლობის დღე'],
    ['2026-08-28', 'მარიამობა'],
    ['2026-10-14', 'სვეტიცხოვლობა'],
    ['2026-11-23', 'გიორგობა'],
  ];
  const insertHoliday = db.prepare(`INSERT INTO holidays (date, name) VALUES (?, ?)`);
  for (const [date, name] of holidays) insertHoliday.run(date, name);

  const period = db.prepare(`INSERT INTO tabel_periods (id, company_id, year, month, mode, status) VALUES (1, 1, 2026, 10, 'actual', 'shared')`).run();
  void period;
  const insertConfirmation = db.prepare(`INSERT INTO tabel_confirmations (period_id, manager_employee_id, status, confirmed_at) VALUES (1, ?, ?, ?)`);
  insertConfirmation.run(1, 'pending', null);
  insertConfirmation.run(3, 'confirmed', '2026-10-21T18:20:00.000Z');
  insertConfirmation.run(4, 'pending', null);
  insertConfirmation.run(8, 'pending', null);
  insertConfirmation.run(10, 'confirmed', '2026-10-21T19:00:00.000Z');
}
