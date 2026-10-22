import { redirect } from 'next/navigation';
import { resetDemo, saveChains, saveCompany } from '@/lib/actions';
import { canManageEmployees, requireUser } from '@/lib/auth';
import { REQUEST_TYPES } from '@/lib/catalog';
import { all, get, getDb } from '@/lib/db';
import { getLocale, tx } from '@/lib/locale';
import { ErrorNote, PageHeader, one } from '@/components/ui';

export default async function SettingsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  if (!canManageEmployees(user.role)) redirect('/w');
  const locale = await getLocale();
  const params = await searchParams;
  const company = get<{ name: string; tax_id: string; address: string }>(getDb(), `SELECT name, tax_id, address FROM companies WHERE id = ?`, user.companyId);
  const chains = all<{ request_type: string; steps: string }>(getDb(), `SELECT request_type, steps FROM approval_chains WHERE company_id = ?`, user.companyId);
  const t = (ka: string, en: string) => tx(locale, ka, en);
  return (
    <div className="grid max-w-3xl gap-5">
      <PageHeader title={t('პარამეტრები', 'Settings')} text={t('კომპანია, დადასტურების ჯაჭვები და დემო მონაცემები.', 'Company, approval chains, and demo data.')} />
      <ErrorNote locale={locale} code={one(params.error)} />
      <form action={saveCompany} className="card grid gap-3 p-4">
        <h2 className="font-semibold">{t('კომპანია', 'Company')}</h2>
        <input className="field" name="name" defaultValue={company?.name} />
        <input className="field" name="tax_id" defaultValue={company?.tax_id} />
        <input className="field" name="address" defaultValue={company?.address} />
        <button className="btn btn-primary w-fit" type="submit">{t('შენახვა', 'Save')}</button>
      </form>
      <form action={saveChains} className="card grid gap-3 p-4">
        <h2 className="font-semibold">{t('დადასტურების ჯაჭვები', 'Approval chains')}</h2>
        <p className="text-xs text-[#6f675e]">manager, hr, finance, director</p>
        {REQUEST_TYPES.map((type) => {
          const stored = chains.find((chain) => chain.request_type === type.id);
          const value = stored ? (JSON.parse(stored.steps) as string[]).join(', ') : type.steps.join(', ');
          return (
            <label key={type.id} className="grid gap-1 text-sm">
              {locale === 'ka' ? type.ka : type.en}
              <input className="field" name={`steps_${type.id}`} defaultValue={value} />
            </label>
          );
        })}
        <button className="btn btn-dark w-fit" type="submit">{t('ჯაჭვების შენახვა', 'Save chains')}</button>
      </form>
      <form action={resetDemo} className="card p-4">
        <h2 className="font-semibold">{t('დემო მონაცემების აღდგენა', 'Restore demo data')}</h2>
        <p className="mt-1 text-sm text-[#6f675e]">{t('წაშლის შენს ცვლილებებს და დააბრუნებს საწყის კომპანიას.', 'This clears your changes and restores the sample company.')}</p>
        <button className="btn btn-ghost mt-3" type="submit">{t('აღდგენა', 'Restore')}</button>
      </form>
    </div>
  );
}
