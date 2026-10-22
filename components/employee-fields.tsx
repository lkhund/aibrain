import { CONTRACT_TYPES, SALARY_TYPES, STATUSES } from '@/lib/catalog';
import { tx, type Locale } from '@/lib/locale';
import type { EmployeeRow } from '@/lib/types';

export function EmployeeFields({
  locale,
  employee,
  departments,
  positions,
  managers,
}: {
  locale: Locale;
  employee?: EmployeeRow;
  departments: { id: number; name: string }[];
  positions: { id: number; title: string; department_id: number }[];
  managers: { id: number; name: string }[];
}) {
  const t = (ka: string, en: string) => tx(locale, ka, en);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">{t('სახელი', 'First name')}<input className="field" name="first_name" required defaultValue={employee?.first_name} /></label>
      <label className="grid gap-1 text-sm">{t('გვარი', 'Last name')}<input className="field" name="last_name" required defaultValue={employee?.last_name} /></label>
      <label className="grid gap-1 text-sm">{t('პირადი ნომერი', 'Personal No.')}<input className="field" name="personal_id" defaultValue={employee?.personal_id ?? ''} inputMode="numeric" /></label>
      <label className="grid gap-1 text-sm">{t('დაბადების თარიღი', 'Birth date')}<input className="field" type="date" name="birth_date" defaultValue={employee?.birth_date ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('სქესი', 'Gender')}
        <select className="field" name="gender" defaultValue={employee?.gender ?? ''}>
          <option value="">—</option>
          <option value="f">{t('მდედრობითი', 'Female')}</option>
          <option value="m">{t('მამრობითი', 'Male')}</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('ტელეფონი', 'Phone')}<input className="field" name="phone" defaultValue={employee?.phone ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('ელფოსტა', 'Email')}<input className="field" name="email" defaultValue={employee?.email ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('მისამართი', 'Address')}<input className="field" name="address" defaultValue={employee?.address ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('განყოფილება', 'Department')}
        <select className="field" name="department_id" defaultValue={employee?.department_id ?? ''}>
          <option value="">—</option>
          {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('პოზიცია', 'Position')}
        <select className="field" name="position_id" defaultValue={employee?.position_id ?? ''}>
          <option value="">—</option>
          {positions.map((position) => <option key={position.id} value={position.id}>{position.title}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('ხელმძღვანელი', 'Manager')}
        <select className="field" name="manager_id" defaultValue={employee?.manager_id ?? ''}>
          <option value="">—</option>
          {managers.map((manager) => <option key={manager.id} value={manager.id}>{manager.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('სტატუსი', 'Status')}
        <select className="field" name="status" defaultValue={employee?.status ?? 'active'}>
          {STATUSES.map((status) => <option key={status.id} value={status.id}>{locale === 'ka' ? status.ka : status.en}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('მიღების თარიღი', 'Hire date')}<input className="field" type="date" name="hire_date" defaultValue={employee?.hire_date ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('ხელშეკრულება', 'Contract')}
        <select className="field" name="contract_type" defaultValue={employee?.contract_type ?? ''}>
          <option value="">—</option>
          {CONTRACT_TYPES.map((contract) => <option key={contract.id} value={contract.id}>{locale === 'ka' ? contract.ka : contract.en}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('ხელშეკრულების ვადა', 'Contract end')}<input className="field" type="date" name="contract_end" defaultValue={employee?.contract_end ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('ანაზღაურების ტიპი', 'Salary type')}
        <select className="field" name="salary_type" defaultValue={employee?.salary_type ?? 'fixed'}>
          {SALARY_TYPES.map((salary) => <option key={salary.id} value={salary.id}>{locale === 'ka' ? salary.ka : salary.en}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm">{t('თვიური ხელფასი', 'Monthly gross')}<input className="field" name="salary_gross" type="number" step="0.01" defaultValue={employee?.salary_gross ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('საათობრივი ტარიფი', 'Hourly rate')}<input className="field" name="hourly_rate" type="number" step="0.01" defaultValue={employee?.hourly_rate ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('გამომუშავების ტარიფი', 'Output rate')}<input className="field" name="output_rate" type="number" step="0.01" defaultValue={employee?.output_rate ?? ''} /></label>
      <label className="grid gap-1 text-sm">{t('გრაფიკი, დასაწყისი', 'Schedule start')}<input className="field" name="schedule_start" defaultValue={employee?.schedule_start ?? '09:00'} /></label>
      <label className="grid gap-1 text-sm">{t('გრაფიკი, დასასრული', 'Schedule end')}<input className="field" name="schedule_end" defaultValue={employee?.schedule_end ?? '18:00'} /></label>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="pension_participant" defaultChecked={employee ? employee.pension_participant === 1 : true} />
        {t('საპენსიო სქემის მონაწილეა (2% + 2%)', 'Participates in the pension scheme (2% + 2%)')}
      </label>
    </div>
  );
}
