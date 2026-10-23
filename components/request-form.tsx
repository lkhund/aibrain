'use client';

import { useState } from 'react';
import { createRequest } from '@/lib/actions';
import type { FieldKey, RequestType } from '@/lib/catalog';
import type { Locale } from '@/lib/locale';

const labels: Record<FieldKey, { ka: string; en: string }> = {
  start: { ka: 'დასაწყისი', en: 'Start' },
  end: { ka: 'დასასრული', en: 'End' },
  date: { ka: 'თარიღი', en: 'Date' },
  hours: { ka: 'საათი', en: 'Hours' },
  amount: { ka: 'თანხა (₾)', en: 'Amount (GEL)' },
  destination: { ka: 'მიმართულება', en: 'Destination' },
  comment: { ka: 'კომენტარი', en: 'Comment' },
};

export function RequestForm({
  types,
  employees,
  locale,
  selfId,
  canPick,
}: {
  types: RequestType[];
  employees: { id: number; name: string }[];
  locale: Locale;
  selfId: number | null;
  canPick: boolean;
}) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '');
  const spec = types.find((type) => type.id === typeId) ?? types[0];
  const t = (ka: string, en: string) => (locale === 'ka' ? ka : en);
  return (
    <form action={createRequest} className="card grid gap-4 p-5">
      <label className="grid gap-1 text-sm">
        {t('ტიპი', 'Type')}
        <select className="field" name="type" value={typeId} onChange={(event) => setTypeId(event.target.value)}>
          {types.map((type) => <option key={type.id} value={type.id}>{locale === 'ka' ? type.ka : type.en}</option>)}
        </select>
      </label>
      {canPick ? (
        <label className="grid gap-1 text-sm">
          {t('თანამშრომელი', 'Employee')}
          <select className="field" name="employee_id" defaultValue={selfId ?? employees[0]?.id}>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
        </label>
      ) : <input type="hidden" name="employee_id" value={selfId ?? ''} />}
      {spec.fields.map((field) => (
        <label key={field} className="grid gap-1 text-sm">
          {locale === 'ka' ? labels[field].ka : labels[field].en}
          {field === 'comment' ? (
            <textarea className="field" name="comment" rows={3} />
          ) : (
            <input
              className="field"
              name={field}
              required
              type={field === 'amount' || field === 'hours' ? 'number' : field === 'destination' ? 'text' : field === 'date' || field === 'start' || field === 'end' ? 'date' : 'text'}
              step={field === 'amount' || field === 'hours' ? '0.01' : undefined}
              min={field === 'amount' || field === 'hours' ? '0.01' : undefined}
            />
          )}
        </label>
      ))}
      <p className="text-xs text-[#6f675e]">{t('ჯაჭვი', 'Chain')}: {spec.steps.join(' → ')}</p>
      <button className="btn btn-primary w-fit" type="submit">{t('გაგზავნა', 'Submit')}</button>
    </form>
  );
}
