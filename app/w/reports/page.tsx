import Link from 'next/link';
import { redirect } from 'next/navigation';
import { canSeePayroll, requireUser } from '@/lib/auth';
import { REPORTS } from '@/lib/catalog';
import { getLocale, tx } from '@/lib/locale';
import { PageHeader } from '@/components/ui';

export default async function ReportsPage() {
  const user = await requireUser();
  if (user.role === 'employee') redirect('/w');
  const locale = await getLocale();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  const reports = REPORTS.filter((report) => !report.sensitive || canSeePayroll(user.role));
  return (
    <div>
      <PageHeader title={t('რეპორტები', 'Reports')} text={t('22 მზა ანგარიში ფილტრით და Excel ექსპორტით.', '22 ready reports with filters and Excel export.')} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report, index) => (
          <Link key={report.slug} href={`/w/reports/${report.slug}`} className="card p-4 hover:border-[#c4622d]">
            <p className="text-xs font-semibold text-[#c4622d]">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="mt-1 font-semibold">{locale === 'ka' ? report.ka : report.en}</h2>
            <p className="mt-1 text-sm text-[#6f675e]">{locale === 'ka' ? report.blurbKa : report.blurbEn}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
