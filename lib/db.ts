import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { seed } from '@/lib/seed';

export const SCHEMA_VERSION = '2';

const globalForDb = globalThis as unknown as { hrDb?: Database.Database };

const SCHEMA = `
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE companies (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  address TEXT NOT NULL
);
CREATE TABLE departments (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  parent_id INTEGER,
  manager_employee_id INTEGER
);
CREATE TABLE positions (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  department_id INTEGER NOT NULL REFERENCES departments(id),
  title TEXT NOT NULL,
  planned_headcount INTEGER NOT NULL
);
CREATE TABLE employees (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  status TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  personal_id TEXT,
  birth_date TEXT,
  gender TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  department_id INTEGER REFERENCES departments(id),
  position_id INTEGER REFERENCES positions(id),
  manager_id INTEGER,
  hire_date TEXT,
  dismiss_date TEXT,
  dismiss_reason TEXT,
  contract_type TEXT,
  contract_end TEXT,
  salary_type TEXT,
  salary_gross REAL,
  hourly_rate REAL,
  output_rate REAL,
  pension_participant INTEGER NOT NULL DEFAULT 1,
  schedule_start TEXT NOT NULL DEFAULT '09:00',
  schedule_end TEXT NOT NULL DEFAULT '18:00',
  rs_status TEXT NOT NULL DEFAULT 'pending',
  rs_synced_at TEXT
);
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  employee_id INTEGER,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL
);
CREATE TABLE education (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  year INTEGER
);
CREATE TABLE benefits (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  name TEXT NOT NULL,
  amount REAL,
  start_date TEXT
);
CREATE TABLE employee_files (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  added_at TEXT NOT NULL
);
CREATE TABLE vacation_balances (
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  type TEXT NOT NULL,
  entitled REAL NOT NULL,
  used REAL NOT NULL,
  PRIMARY KEY (employee_id, year, type)
);
CREATE TABLE folders (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL
);
CREATE TABLE documents (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  folder_id INTEGER NOT NULL REFERENCES folders(id),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  requires_signature INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE document_access (
  document_id INTEGER NOT NULL REFERENCES documents(id),
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  seen_at TEXT,
  downloaded_at TEXT,
  signed_at TEXT,
  PRIMARY KEY (document_id, employee_id)
);
CREATE TABLE requests (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  type TEXT NOT NULL,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  created_by INTEGER NOT NULL,
  status TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE approval_steps (
  id INTEGER PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES requests(id),
  step_order INTEGER NOT NULL,
  role TEXT NOT NULL,
  approver_employee_id INTEGER,
  status TEXT NOT NULL,
  acted_at TEXT,
  comment TEXT
);
CREATE TABLE approval_chains (
  company_id INTEGER NOT NULL REFERENCES companies(id),
  request_type TEXT NOT NULL,
  steps TEXT NOT NULL,
  PRIMARY KEY (company_id, request_type)
);
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  kind TEXT NOT NULL,
  detail TEXT NOT NULL,
  href TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE shifts (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  UNIQUE (employee_id, date)
);
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  date TEXT NOT NULL,
  check_in TEXT,
  check_out TEXT,
  location TEXT,
  UNIQUE (employee_id, date)
);
CREATE TABLE tabel_periods (
  id INTEGER PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  mode TEXT NOT NULL,
  status TEXT NOT NULL,
  UNIQUE (company_id, year, month)
);
CREATE TABLE tabel_confirmations (
  id INTEGER PRIMARY KEY,
  period_id INTEGER NOT NULL REFERENCES tabel_periods(id),
  manager_employee_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  confirmed_at TEXT,
  UNIQUE (period_id, manager_employee_id)
);
CREATE TABLE payroll_inputs (
  employee_id INTEGER NOT NULL REFERENCES employees(id),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  bonus REAL NOT NULL DEFAULT 0,
  deduction REAL NOT NULL DEFAULT 0,
  output_units REAL NOT NULL DEFAULT 0,
  commission REAL NOT NULL DEFAULT 0,
  PRIMARY KEY (employee_id, year, month)
);
CREATE TABLE holidays (
  date TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
`;

function databaseFile() {
  return process.env.HR_DB_PATH || path.join(process.cwd(), 'data', 'hr.sqlite');
}

function readVersion(db: Database.Database) {
  try {
    const row = db.prepare(`SELECT value FROM meta WHERE key = 'v'`).get() as { value: string } | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

function removeFile(file: string) {
  fs.rmSync(file, { force: true });
  fs.rmSync(`${file}-wal`, { force: true });
  fs.rmSync(`${file}-shm`, { force: true });
}

function connect() {
  const file = databaseFile();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const existing = new Database(file);
  existing.pragma('journal_mode = WAL');
  if (readVersion(existing) === SCHEMA_VERSION) {
    existing.pragma('foreign_keys = ON');
    return existing;
  }
  existing.close();
  removeFile(file);
  const fresh = new Database(file);
  fresh.pragma('journal_mode = WAL');
  fresh.pragma('foreign_keys = ON');
  fresh.exec(SCHEMA);
  const transaction = fresh.transaction(() => {
    seed(fresh);
    fresh.prepare(`INSERT INTO meta (key, value) VALUES ('v', ?)`).run(SCHEMA_VERSION);
  });
  transaction();
  return fresh;
}

export function getDb() {
  if (!globalForDb.hrDb || !globalForDb.hrDb.open) globalForDb.hrDb = connect();
  if (readVersion(globalForDb.hrDb) !== SCHEMA_VERSION) {
    globalForDb.hrDb.close();
    globalForDb.hrDb = connect();
  }
  return globalForDb.hrDb;
}

export function get<T>(db: Database.Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).get(...params) as T | undefined;
}

export function all<T>(db: Database.Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).all(...params) as T[];
}

export function run(db: Database.Database, sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...params);
}
