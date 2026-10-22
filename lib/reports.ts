import { canSeePayroll, listVisibleEmployees } from '@/lib/auth';
import { CONTRACT_TYPES, REPORTS, REQUEST_TYPES, SALARY_TYPES, STATUSES, labelOf, reportMeta, requestType } from '@/lib/catalog';
import { all, getDb } from '@/lib/db';
import { formatHours, shiftMetrics } from '@/lib/metrics';
import { payrollForMonth } from '@/lib/payroll-run';
import { eachDate, formatDate, isWeekend } from '@/lib/time';
import type { CurrentUser } from '@/lib/types';
import type { Locale } from '@/lib/locale';

export type ReportColumn = { key: string; label: string };
export type ReportResult = { slug: string; title: string; columns: ReportColumn[]; rows: Record<string, string | number>[] };

type Filters = { departmentId?: number; from: string; to: string; year: number; month: number };

function column(locale: Locale, key: string, ka: string, en: string): ReportColumn {
  return { key, label: locale === 'ka' ? ka : en };
}

export function runReport(user: CurrentUser, slug: string, filters: Filters, locale: Locale): ReportResult | null {
  const meta = reportMeta(slug);
  if (!meta) return null;
  if (meta.sensitive && !canSeePayroll(user.role)) return null;
  const people = listVisibleEmployees(user).filter((person) => !filters.departmentId || person.department_id === filters.departmentId);
  const active = people.filter((person) => person.status === 'active');
  const db = getDb();
  const title = locale === 'ka' ? meta.ka : meta.en;
  const name = (person: { first_name: string; last_name: string }) => `${person.first_name} ${person.last_name}`;

  if (slug === 'personal') {
    return {
      slug, title,
      columns: [
        column(locale, 'name', 'თანამშრომელი', 'Employee'),
        column(locale, 'pid', 'პირადი ნომერი', 'Personal No.'),
        column(locale, 'birth', 'დაბადება', 'Birth date'),
        column(locale, 'gender', 'სქესი', 'Gender'),
        column(locale, 'address', 'მისამართი', 'Address'),
      ],
      rows: people.map((person) => ({
        name: name(person),
        pid: person.personal_id || '',
        birth: formatDate(person.birth_date),
        gender: person.gender === 'f' ? (locale === 'ka' ? 'მდედრობითი' : 'Female') : person.gender === 'm' ? (locale === 'ka' ? 'მამრობითი' : 'Male') : '',
        address: person.address || '',
      })),
    };
  }

  if (slug === 'employment') {
    return {
      slug, title,
      columns: [
        column(locale, 'name', 'თანამშრომელი', 'Employee'),
        column(locale, 'department', 'განყოფილება', 'Department'),
        column(locale, 'position', 'პოზიცია', 'Position'),
        column(locale, 'manager', 'ხელმძღვანელი', 'Manager'),
        column(locale, 'hire', 'მიღება', 'Hired'),
        column(locale, 'contract', 'ხელშეკრულება', 'Contract'),
        column(locale, 'status', 'სტატუსი', 'Status'),
      ],
      rows: people.map((person) => ({
        name: name(person),
        department: person.department_name || '',
        position: person.position_title || '',
        manager: person.manager_name || '',
        hire: formatDate(person.hire_date),
        contract: labelOf(CONTRACT_TYPES, person.contract_type, locale),
        status: labelOf(STATUSES, person.status, locale),
      })),
    };
  }

  if (slug === 'contacts') {
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'phone', 'ტელეფონი', 'Phone'), column(locale, 'email', 'ელფოსტა', 'Email')],
      rows: people.map((person) => ({ name: name(person), phone: person.phone || '', email: person.email || '' })),
    };
  }

  if (slug === 'schedules') {
    const shifts = all<{ employee_id: number; count: number }>(
      db,
      `SELECT employee_id, COUNT(*) AS count FROM shifts WHERE date >= ? AND date <= ? GROUP BY employee_id`,
      filters.from,
      filters.to,
    );
    return {
      slug, title,
      columns: [
        column(locale, 'name', 'თანამშრომელი', 'Employee'),
        column(locale, 'start', 'დასაწყისი', 'Start'),
        column(locale, 'end', 'დასასრული', 'End'),
        column(locale, 'shifts', 'განსაკუთრებული ცვლები', 'Custom shifts'),
      ],
      rows: active.map((person) => ({
        name: name(person),
        start: person.schedule_start,
        end: person.schedule_end,
        shifts: shifts.find((shift) => shift.employee_id === person.id)?.count || 0,
      })),
    };
  }

  if (slug === 'lateness' || slug === 'early' || slug === 'overtime' || slug === 'attendance') {
    const holidays = new Set(all<{ date: string }>(db, `SELECT date FROM holidays`).map((row) => row.date));
    const records = all<{ employee_id: number; date: string; check_in: string | null; check_out: string | null }>(
      db,
      `SELECT employee_id, date, check_in, check_out FROM attendance WHERE date >= ? AND date <= ?`,
      filters.from,
      filters.to,
    );
    const shifts = all<{ employee_id: number; date: string; start_time: string; end_time: string }>(
      db,
      `SELECT employee_id, date, start_time, end_time FROM shifts WHERE date >= ? AND date <= ?`,
      filters.from,
      filters.to,
    );
    const dates = eachDate(filters.from, filters.to);
    if (slug === 'attendance') {
      return {
        slug, title,
        columns: [
          column(locale, 'name', 'თანამშრომელი', 'Employee'),
          column(locale, 'present', 'დასწრება', 'Present'),
          column(locale, 'late', 'დაგვიანება', 'Late days'),
          column(locale, 'absent', 'გაცდენა', 'Absences'),
          column(locale, 'overtime', 'ზეგანაკვეთური სთ', 'Overtime h'),
        ],
        rows: active.map((person) => {
          let present = 0;
          let late = 0;
          let absent = 0;
          let overtime = 0;
          for (const date of dates) {
            const record = records.find((item) => item.employee_id === person.id && item.date === date);
            const shift = shifts.find((item) => item.employee_id === person.id && item.date === date);
            const rest = (isWeekend(date) || holidays.has(date)) && !shift;
            if (record?.check_in) {
              present += 1;
              const metrics = shiftMetrics(shift?.start_time || person.schedule_start, shift?.end_time || person.schedule_end, record.check_in, record.check_out);
              if (metrics.late > 0) late += 1;
              overtime += metrics.overtime;
            } else if (!rest) absent += 1;
          }
          return { name: name(person), present, late, absent, overtime: formatHours(overtime) };
        }),
      };
    }
    const rows: Record<string, string | number>[] = [];
    for (const person of active) {
      for (const date of dates) {
        const record = records.find((item) => item.employee_id === person.id && item.date === date);
        if (!record?.check_in) continue;
        const shift = shifts.find((item) => item.employee_id === person.id && item.date === date);
        const metrics = shiftMetrics(shift?.start_time || person.schedule_start, shift?.end_time || person.schedule_end, record.check_in, record.check_out);
        if (slug === 'lateness' && metrics.late > 0) rows.push({ name: name(person), date: formatDate(date), checkIn: record.check_in, minutes: metrics.late });
        if (slug === 'early' && metrics.early > 0) rows.push({ name: name(person), date: formatDate(date), checkOut: record.check_out || '', minutes: metrics.early });
        if (slug === 'overtime' && metrics.overtime > 0) rows.push({ name: name(person), date: formatDate(date), hours: formatHours(metrics.overtime) });
      }
    }
    if (slug === 'lateness') {
      return { slug, title, columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'date', 'თარიღი', 'Date'), column(locale, 'checkIn', 'შესვლა', 'In'), column(locale, 'minutes', 'წუთი', 'Minutes')], rows };
    }
    if (slug === 'early') {
      return { slug, title, columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'date', 'თარიღი', 'Date'), column(locale, 'checkOut', 'გასვლა', 'Out'), column(locale, 'minutes', 'წუთი', 'Minutes')], rows };
    }
    return { slug, title, columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'date', 'თარიღი', 'Date'), column(locale, 'hours', 'საათი', 'Hours')], rows };
  }

  if (slug === 'vacation') {
    const balances = all<{ employee_id: number; type: string; entitled: number; used: number }>(db, `SELECT employee_id, type, entitled, used FROM vacation_balances WHERE year = ?`, filters.year);
    return {
      slug, title,
      columns: [
        column(locale, 'name', 'თანამშრომელი', 'Employee'),
        column(locale, 'annual', 'წლიური ნაშთი', 'Annual left'),
        column(locale, 'annualUsed', 'წლიური გამოყენებული', 'Annual used'),
        column(locale, 'study', 'სასწავლო ნაშთი', 'Study left'),
        column(locale, 'sick', 'ბიულეტენი', 'Sick days'),
      ],
      rows: active.map((person) => {
        const of = (type: string) => balances.find((item) => item.employee_id === person.id && item.type === type);
        const annual = of('annual');
        const study = of('study');
        const sick = of('sick');
        return {
          name: name(person),
          annual: (annual?.entitled || 0) - (annual?.used || 0),
          annualUsed: annual?.used || 0,
          study: (study?.entitled || 0) - (study?.used || 0),
          sick: sick?.used || 0,
        };
      }),
    };
  }

  if (slug === 'headcount') {
    const departments = [...new Set(people.map((person) => person.department_name || '—'))];
    return {
      slug, title,
      columns: [column(locale, 'department', 'განყოფილება', 'Department'), column(locale, 'active', 'აქტიური', 'Active'), column(locale, 'candidates', 'კანდიდატები', 'Candidates'), column(locale, 'dismissed', 'განთავისუფლებული', 'Dismissed')],
      rows: departments.map((department) => ({
        department,
        active: people.filter((person) => (person.department_name || '—') === department && person.status === 'active').length,
        candidates: people.filter((person) => (person.department_name || '—') === department && person.status === 'candidate').length,
        dismissed: people.filter((person) => (person.department_name || '—') === department && person.status === 'dismissed').length,
      })),
    };
  }

  if (slug === 'contracts') {
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'contract', 'ტიპი', 'Type'), column(locale, 'end', 'ვადა', 'Ends'), column(locale, 'days', 'დარჩა', 'Days left')],
      rows: people.filter((person) => person.contract_end).map((person) => {
        const end = person.contract_end || '';
        const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${filters.from}T00:00:00Z`)) / 86400000);
        return { name: name(person), contract: labelOf(CONTRACT_TYPES, person.contract_type, locale), end: formatDate(end), days };
      }),
    };
  }

  if (slug === 'hires') {
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'department', 'განყოფილება', 'Department'), column(locale, 'position', 'პოზიცია', 'Position'), column(locale, 'hire', 'მიღება', 'Hired')],
      rows: people.filter((person) => person.hire_date && person.hire_date >= filters.from && person.hire_date <= filters.to).map((person) => ({
        name: name(person), department: person.department_name || '', position: person.position_title || '', hire: formatDate(person.hire_date),
      })),
    };
  }

  if (slug === 'dismissals') {
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'date', 'თარიღი', 'Date'), column(locale, 'reason', 'საფუძველი', 'Reason')],
      rows: people.filter((person) => person.status === 'dismissed').map((person) => ({ name: name(person), date: formatDate(person.dismiss_date), reason: person.dismiss_reason || '' })),
    };
  }

  if (slug === 'birthdays') {
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'date', 'თარიღი', 'Date'), column(locale, 'department', 'განყოფილება', 'Department')],
      rows: people.filter((person) => person.birth_date).slice().sort((a, b) => (a.birth_date || '').slice(5).localeCompare((b.birth_date || '').slice(5))).map((person) => ({
        name: name(person), date: formatDate(person.birth_date), department: person.department_name || '',
      })),
    };
  }

  if (slug === 'salary' || slug === 'pension' || slug === 'tax') {
    const lines = payrollForMonth(user.companyId, filters.year, filters.month, people.map((person) => person.id));
    if (slug === 'salary') {
      return {
        slug, title,
        columns: [
          column(locale, 'name', 'თანამშრომელი', 'Employee'),
          column(locale, 'type', 'ტიპი', 'Type'),
          column(locale, 'accrued', 'დარიცხული', 'Accrued'),
          column(locale, 'tax', 'საშემოსავლო', 'Tax'),
          column(locale, 'net', 'ხელზე', 'Net'),
        ],
        rows: lines.map((line) => ({ name: line.name, type: labelOf(SALARY_TYPES, line.salaryType, locale), accrued: line.accrued, tax: line.tax, net: line.net })),
      };
    }
    if (slug === 'pension') {
      return {
        slug, title,
        columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'ee', 'დასაქმებული 2%', 'Employee 2%'), column(locale, 'er', 'დამსაქმებელი 2%', 'Employer 2%')],
        rows: lines.map((line) => ({ name: line.name, ee: line.pensionEe, er: line.pensionEr })),
      };
    }
    return {
      slug, title,
      columns: [column(locale, 'name', 'თანამშრომელი', 'Employee'), column(locale, 'taxable', 'დასაბეგრი', 'Taxable'), column(locale, 'tax', 'საშემოსავლო 20%', 'Tax 20%')],
      rows: lines.map((line) => ({ name: line.name, taxable: line.taxable, tax: line.tax })),
    };
  }

  if (slug === 'requests') {
    const ids = people.map((person) => person.id);
    const requests = all<{ id: number; type: string; status: string; created_at: string; employee_id: number }>(
      db,
      `SELECT id, type, status, created_at, employee_id FROM requests WHERE company_id = ? AND created_at >= ? AND created_at <= ? ORDER BY id DESC`,
      user.companyId,
      `${filters.from}T00:00:00.000Z`,
      `${filters.to}T23:59:59.999Z`,
    ).filter((request) => ids.includes(request.employee_id));
    return {
      slug, title,
      columns: [column(locale, 'id', '№', 'No.'), column(locale, 'employee', 'თანამშრომელი', 'Employee'), column(locale, 'type', 'ტიპი', 'Type'), column(locale, 'status', 'სტატუსი', 'Status'), column(locale, 'date', 'თარიღი', 'Date')],
      rows: requests.map((request) => {
        const person = people.find((item) => item.id === request.employee_id);
        const spec = requestType(request.type);
        return {
          id: request.id,
          employee: person ? name(person) : '',
          type: spec ? (locale === 'ka' ? spec.ka : spec.en) : request.type,
          status: request.status,
          date: formatDate(request.created_at.slice(0, 10)),
        };
      }),
    };
  }

  if (slug === 'documents') {
    const ids = people.map((person) => person.id);
    const rows = all<{ document: string; employee_id: number; seen_at: string | null; downloaded_at: string | null; signed_at: string | null }>(
      db,
      `SELECT d.name AS document, a.employee_id, a.seen_at, a.downloaded_at, a.signed_at
       FROM document_access a JOIN documents d ON d.id = a.document_id WHERE d.company_id = ?`,
      user.companyId,
    ).filter((row) => ids.includes(row.employee_id));
    const yes = locale === 'ka' ? 'დიახ' : 'Yes';
    const no = locale === 'ka' ? 'არა' : 'No';
    return {
      slug, title,
      columns: [column(locale, 'document', 'დოკუმენტი', 'Document'), column(locale, 'employee', 'თანამშრომელი', 'Employee'), column(locale, 'seen', 'ნახა', 'Seen'), column(locale, 'downloaded', 'გადმოწერა', 'Downloaded'), column(locale, 'signed', 'ხელმოწერა', 'Signed')],
      rows: rows.map((row) => {
        const person = people.find((item) => item.id === row.employee_id);
        return { document: row.document, employee: person ? name(person) : '', seen: row.seen_at ? yes : no, downloaded: row.downloaded_at ? yes : no, signed: row.signed_at ? yes : no };
      }),
    };
  }

  if (slug === 'staffing') {
    const positions = all<{ title: string; planned_headcount: number; department: string; filled: number }>(
      db,
      `SELECT p.title, p.planned_headcount, d.name AS department,
              (SELECT COUNT(*) FROM employees e WHERE e.position_id = p.id AND e.status = 'active') AS filled
       FROM positions p JOIN departments d ON d.id = p.department_id
       WHERE p.company_id = ? ORDER BY d.name, p.title`,
      user.companyId,
    ).filter((position) => !filters.departmentId || people.some((person) => person.department_name === position.department && person.department_id === filters.departmentId));
    return {
      slug, title,
      columns: [column(locale, 'department', 'განყოფილება', 'Department'), column(locale, 'position', 'პოზიცია', 'Position'), column(locale, 'planned', 'გეგმა', 'Planned'), column(locale, 'filled', 'დაკავებული', 'Filled'), column(locale, 'vacant', 'ვაკანსია', 'Vacant')],
      rows: positions.map((position) => ({ department: position.department, position: position.title, planned: position.planned_headcount, filled: position.filled, vacant: position.planned_headcount - position.filled })),
    };
  }

  if (slug === 'benefits') {
    const ids = people.map((person) => person.id);
    const benefits = all<{ employee_id: number; name: string; amount: number | null }>(db, `SELECT employee_id, name, amount FROM benefits`).filter((benefit) => ids.includes(benefit.employee_id));
    return {
      slug, title,
      columns: [column(locale, 'employee', 'თანამშრომელი', 'Employee'), column(locale, 'benefit', 'ბენეფიტი', 'Benefit'), column(locale, 'amount', 'თანხა', 'Amount')],
      rows: benefits.map((benefit) => ({ employee: name(people.find((person) => person.id === benefit.employee_id)!), benefit: benefit.name, amount: benefit.amount || 0 })),
    };
  }

  const ids = people.map((person) => person.id);
  const education = all<{ employee_id: number; institution: string; degree: string; year: number | null }>(db, `SELECT employee_id, institution, degree, year FROM education`).filter((item) => ids.includes(item.employee_id));
  return {
    slug, title,
    columns: [column(locale, 'employee', 'თანამშრომელი', 'Employee'), column(locale, 'institution', 'სასწავლებელი', 'Institution'), column(locale, 'degree', 'ხარისხი', 'Degree'), column(locale, 'year', 'წელი', 'Year')],
    rows: education.map((item) => ({ employee: name(people.find((person) => person.id === item.employee_id)!), institution: item.institution, degree: item.degree, year: item.year || '' })),
  };
}

export const reportCatalog = REPORTS;
