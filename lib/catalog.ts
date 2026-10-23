export type StepRole = 'manager' | 'hr' | 'finance' | 'director';
export type FieldKey = 'start' | 'end' | 'date' | 'hours' | 'amount' | 'destination' | 'comment';
export type LeaveCode = 'vacation' | 'unpaid' | 'sick' | 'trip' | 'maternity' | 'study';

export type RequestType = {
  id: string;
  ka: string;
  en: string;
  steps: StepRole[];
  fields: FieldKey[];
  leave?: LeaveCode;
};

export const REQUEST_TYPES: RequestType[] = [
  { id: 'vacation_paid', ka: 'ანაზღაურებადი შვებულება', en: 'Paid vacation', steps: ['manager', 'hr'], fields: ['start', 'end', 'comment'], leave: 'vacation' },
  { id: 'vacation_unpaid', ka: 'უხელფასო შვებულება', en: 'Unpaid leave', steps: ['manager', 'hr'], fields: ['start', 'end', 'comment'], leave: 'unpaid' },
  { id: 'sick', ka: 'ბიულეტენი', en: 'Sick leave', steps: ['hr'], fields: ['start', 'end', 'comment'], leave: 'sick' },
  { id: 'maternity', ka: 'დეკრეტული შვებულება', en: 'Maternity leave', steps: ['hr'], fields: ['start', 'end', 'comment'], leave: 'maternity' },
  { id: 'study', ka: 'სასწავლო შვებულება', en: 'Study leave', steps: ['manager', 'hr'], fields: ['start', 'end', 'comment'], leave: 'study' },
  { id: 'advance', ka: 'ავანსი', en: 'Salary advance', steps: ['manager', 'finance', 'hr'], fields: ['amount', 'comment'] },
  { id: 'trip', ka: 'მივლინება', en: 'Business trip', steps: ['manager', 'finance'], fields: ['start', 'end', 'destination', 'amount', 'comment'], leave: 'trip' },
  { id: 'staffing', ka: 'საშტატო ცვლილება', en: 'Staffing change', steps: ['manager', 'hr', 'director'], fields: ['comment'] },
  { id: 'training', ka: 'ტრენინგი', en: 'Training', steps: ['manager', 'hr'], fields: ['start', 'end', 'comment'] },
  { id: 'discipline', ka: 'დისციპლინური სანქცია', en: 'Disciplinary action', steps: ['manager', 'hr', 'director'], fields: ['comment'] },
  { id: 'overtime', ka: 'ზეგანაკვეთური', en: 'Overtime', steps: ['manager'], fields: ['date', 'hours', 'comment'] },
  { id: 'remote', ka: 'დისტანციური მუშაობა', en: 'Remote work', steps: ['manager'], fields: ['start', 'end', 'comment'] },
  { id: 'certificate', ka: 'ცნობა დასაქმებაზე', en: 'Employment certificate', steps: ['hr'], fields: ['comment'] },
  { id: 'salary_change', ka: 'ხელფასის ცვლილება', en: 'Salary change', steps: ['manager', 'finance', 'director'], fields: ['amount', 'comment'] },
  { id: 'transfer', ka: 'გადაყვანა', en: 'Transfer', steps: ['manager', 'hr'], fields: ['comment'] },
  { id: 'equipment', ka: 'ინვენტარი', en: 'Equipment', steps: ['manager'], fields: ['comment'] },
  { id: 'resignation', ka: 'განთავისუფლება', en: 'Resignation', steps: ['manager', 'hr'], fields: ['date', 'comment'] },
  { id: 'appointment', ka: 'დანიშვნა', en: 'Appointment', steps: ['hr', 'director'], fields: ['date', 'comment'] },
  { id: 'bonus', ka: 'პრემია', en: 'Bonus', steps: ['manager', 'finance', 'director'], fields: ['amount', 'comment'] },
  { id: 'lieu', ka: 'ანაზღაურებადი დასვენება', en: 'Day off in lieu', steps: ['manager'], fields: ['date', 'comment'] },
  { id: 'schedule', ka: 'გრაფიკის ცვლილება', en: 'Schedule change', steps: ['manager', 'hr'], fields: ['comment'] },
  { id: 'benefit', ka: 'ბენეფიტი', en: 'Benefit', steps: ['hr'], fields: ['amount', 'comment'] },
];

export function requestType(id: string) {
  return REQUEST_TYPES.find((type) => type.id === id);
}

export type ReportMeta = {
  slug: string;
  ka: string;
  en: string;
  blurbKa: string;
  blurbEn: string;
  sensitive: boolean;
};

export const REPORTS: ReportMeta[] = [
  { slug: 'personal', ka: 'პირადი მონაცემები', en: 'Personal data', blurbKa: 'სახელი, პირადი ნომერი, დაბადების თარიღი, მისამართი', blurbEn: 'Name, personal number, birth date, address', sensitive: false },
  { slug: 'employment', ka: 'სამსახურეობრივი ინფორმაცია', en: 'Employment', blurbKa: 'პოზიცია, განყოფილება, მიღების თარიღი, ხელშეკრულება', blurbEn: 'Position, department, hire date, contract', sensitive: false },
  { slug: 'contacts', ka: 'კონტაქტები', en: 'Contacts', blurbKa: 'ტელეფონი და ელფოსტა', blurbEn: 'Phone and email', sensitive: false },
  { slug: 'schedules', ka: 'გრაფიკები', en: 'Schedules', blurbKa: 'სამუშაო საათები და ცვლის ჩანაწერები', blurbEn: 'Working hours and shift records', sensitive: false },
  { slug: 'lateness', ka: 'დაგვიანებები', en: 'Lateness', blurbKa: 'გვიან მოსვლები წუთებში', blurbEn: 'Late arrivals in minutes', sensitive: false },
  { slug: 'early', ka: 'ადრე წასვლა', en: 'Early leaves', blurbKa: 'ცვლამდე წასვლის შემთხვევები', blurbEn: 'Departures before shift end', sensitive: false },
  { slug: 'overtime', ka: 'ზეგანაკვეთური', en: 'Overtime', blurbKa: 'გრაფიკს მიღმა ნამუშევარი საათები', blurbEn: 'Hours worked beyond the shift', sensitive: false },
  { slug: 'vacation', ka: 'შვებულების ბალანსი', en: 'Vacation balances', blurbKa: 'წლიური და სასწავლო ნაშთი', blurbEn: 'Annual and study leave remaining', sensitive: false },
  { slug: 'headcount', ka: 'რაოდენობა განყოფილებებით', en: 'Headcount', blurbKa: 'აქტიური თანამშრომლები და კანდიდატები', blurbEn: 'Active staff and candidates', sensitive: false },
  { slug: 'contracts', ka: 'ხელშეკრულების ვადები', en: 'Contract dates', blurbKa: 'ვადიანი ხელშეკრულებები და დარჩენილი დღეები', blurbEn: 'Fixed-term contracts and days left', sensitive: false },
  { slug: 'hires', ka: 'ახალი მიღებები', en: 'New hires', blurbKa: 'არჩეულ პერიოდში მიღებული თანამშრომლები', blurbEn: 'People hired in the selected period', sensitive: false },
  { slug: 'dismissals', ka: 'განთავისუფლებები', en: 'Dismissals', blurbKa: 'განთავისუფლების თარიღი და საფუძველი', blurbEn: 'Dismissal date and reason', sensitive: false },
  { slug: 'birthdays', ka: 'დაბადების დღეები', en: 'Birthdays', blurbKa: 'თვეების მიხედვით დალაგებული სია', blurbEn: 'List ordered by month and day', sensitive: false },
  { slug: 'salary', ka: 'ხელფასის რეესტრი', en: 'Salary register', blurbKa: 'დარიცხული, გადასახადი და ხელზე ასაღები', blurbEn: 'Accrued pay, tax, and net', sensitive: true },
  { slug: 'pension', ka: 'საპენსიო შენატანები', en: 'Pension', blurbKa: 'დასაქმებულის და დამსაქმებლის 2%', blurbEn: 'Employee and employer 2% contributions', sensitive: true },
  { slug: 'tax', ka: 'საშემოსავლო გადასახადი', en: 'Income tax', blurbKa: '20% საშემოსავლო დაკავება', blurbEn: '20% income tax withheld', sensitive: true },
  { slug: 'attendance', ka: 'დასწრების შეჯამება', en: 'Attendance summary', blurbKa: 'ნამუშევარი დღეები, გაცდენა, დაგვიანება', blurbEn: 'Days present, absences, lateness', sensitive: false },
  { slug: 'requests', ka: 'მოთხოვნები', en: 'Requests', blurbKa: 'სტატუსი და ტიპი არჩეულ პერიოდში', blurbEn: 'Status and type in the selected period', sensitive: false },
  { slug: 'documents', ka: 'დოკუმენტებზე წვდომა', en: 'Document access', blurbKa: 'ნახვა, გადმოწერა და ხელმოწერა', blurbEn: 'Seen, downloaded, and signed', sensitive: false },
  { slug: 'staffing', ka: 'საშტატო ნუსხა', en: 'Staffing plan', blurbKa: 'დაგეგმილი, დაკავებული და ვაკანტური ადგილები', blurbEn: 'Planned, filled, and vacant seats', sensitive: false },
  { slug: 'benefits', ka: 'ბენეფიტები', en: 'Benefits', blurbKa: 'დანიშნული ბენეფიტები და თანხა', blurbEn: 'Assigned benefits and amounts', sensitive: false },
  { slug: 'education', ka: 'განათლება', en: 'Education', blurbKa: 'სასწავლებელი, ხარისხი, წელი', blurbEn: 'School, degree, and year', sensitive: false },
];

export function reportMeta(slug: string) {
  return REPORTS.find((report) => report.slug === slug);
}

export const CONTRACT_TYPES = [
  { id: 'indefinite', ka: 'უვადო', en: 'Open-ended' },
  { id: 'fixed_term', ka: 'ვადიანი', en: 'Fixed-term' },
  { id: 'service', ka: 'მომსახურება', en: 'Service' },
  { id: 'internship', ka: 'სტაჟირება', en: 'Internship' },
] as const;

export const SALARY_TYPES = [
  { id: 'fixed', ka: 'ფიქსირებული', en: 'Fixed' },
  { id: 'variable', ka: 'ცვლადი', en: 'Variable' },
  { id: 'hybrid', ka: 'გაერთიანებული', en: 'Hybrid' },
  { id: 'output', ka: 'გამომუშავება', en: 'Output' },
] as const;

export const STATUSES = [
  { id: 'active', ka: 'თანამშრომელი', en: 'Employee' },
  { id: 'candidate', ka: 'კანდიდატი', en: 'Candidate' },
  { id: 'dismissed', ka: 'განთავისუფლებული', en: 'Dismissed' },
] as const;

export function labelOf(list: readonly { id: string; ka: string; en: string }[], id: string | null | undefined, locale: 'ka' | 'en') {
  const found = list.find((item) => item.id === id);
  if (!found) return id || '—';
  return locale === 'ka' ? found.ka : found.en;
}
