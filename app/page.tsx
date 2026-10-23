import Link from 'next/link';
import { LangSwitch } from '@/components/lang';
import { getLocale, tx } from '@/lib/locale';

const modules = [
  ['თანამშრომლების მართვა', 'Employee records', 'აქტიური თანამშრომლები, კანდიდატები და განთავისუფლებულები, ფილტრებით და Excel ექსპორტით.', 'Active staff, candidates, and former employees, with filters and Excel export.'],
  ['თანამშრომლის პროფილი', 'Employee profile', 'პირადი მონაცემები, ხელშეკრულება, შვებულების ბალანსი, ბენეფიტები, განათლება და RS.ge სტატუსი.', 'Personal data, contract, leave balance, benefits, education, and RS.ge status.'],
  ['მოთხოვნები და დადასტურება', 'Requests & approvals', '22 ტიპის მოთხოვნა — შვებულება, ავანსი, მივლინება, პრემია — თავისი დადასტურების ჯაჭვით.', '22 request types — leave, advance, trip, bonus — each with its approval chain.'],
  ['თვიური ტაბელი', 'Monthly tabel', 'ოფიციალური სამუშაო დროის ფორმა გრაფიკით ან რეალური დასწრებით და მენეჯერის დადასტურებით.', 'Official work-time form from the schedule or real attendance, with manager confirmation.'],
  ['ცვლები და დასწრება', 'Shifts & attendance', 'თვის კალენდარი, დაგვიანება, ადრე წასვლა და ზეგანაკვეთური.', 'A monthly calendar with lateness, early leaves, and overtime.'],
  ['ხელფასი და გამომუშავება', 'Payroll & earnings', 'ფიქსირებული, ცვლადი, გაერთიანებული და გამომუშავების ანაზღაურება, გადასახადითა და საპენსიოთი.', 'Fixed, variable, hybrid, and output pay, with tax and pension.'],
  ['დოკუმენტები', 'Documents', 'ფერადი ფოლდერები, წვდომა არჩეულ თანამშრომლებზე, ნახვა, გადმოწერა და ხელმოწერა.', 'Color-coded folders, per-person access, seen, downloaded, and signed.'],
  ['რეპორტები', 'Reports', '22 მზა ანგარიში პირადი მონაცემებიდან დაგვიანებამდე, Excel-ში ერთი დაჭერით.', '22 ready reports, from personal data to lateness, with one-click Excel.'],
] as const;

export default async function HomePage() {
  const locale = await getLocale();
  const t = (ka: string, en: string) => tx(locale, ka, en);
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#17241e] text-sm text-[#f4efe6]">ა</span>
          Aibrain HR
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitch locale={locale} />
          <Link className="btn btn-dark btn-small" href="/login">{t('სამუშაო სივრცე', 'Open workspace')}</Link>
        </div>
      </header>
      <section className="mx-auto grid max-w-6xl gap-8 px-5 pb-12 pt-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold text-[#c4622d]">{t('HR სივრცე ქართული კომპანიისთვის', 'An HR workspace for a Georgian company')}</p>
          <h1 className="mt-3 max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {t('თანამშრომლები, ტაბელი და ხელფასი ერთ ანგარიშში', 'People, tabel, and payroll in one account')}
          </h1>
          <p className="mt-4 max-w-xl text-[#6f675e]">
            {t('რვა მოდული ყოველდღიური HR სამუშაოსთვის: ბაზა, დადასტურება, დასწრება, ანაზღაურება, დოკუმენტები და ანგარიშები.', 'Eight modules for day-to-day HR work: records, approvals, attendance, pay, documents, and reports.')}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="btn btn-primary" href="/login">{t('დემო კომპანიაში შესვლა', 'Enter the demo company')}</Link>
            <a className="btn btn-ghost" href="#modules">{t('მოდულები', 'Modules')}</a>
          </div>
        </div>
        <div className="card grid grid-cols-3 gap-3 p-4">
          {[
            ['8', t('მოდული', 'modules')],
            ['22', t('მოთხოვნა', 'requests')],
            ['22', t('რეპორტი', 'reports')],
          ].map(([value, label]) => (
            <div key={label} className="rounded-xl bg-[#f7f4ee] p-3">
              <p className="text-2xl font-semibold">{value}</p>
              <p className="text-xs text-[#6f675e]">{label}</p>
            </div>
          ))}
        </div>
      </section>
      <section id="modules" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-16">
        <h2 className="text-2xl font-semibold">{t('პლატფორმის მოდულები', 'Platform modules')}</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {modules.map(([ka, en, kaText, enText], index) => (
            <article key={en} className="card p-5">
              <p className="text-xs font-semibold text-[#c4622d]">0{index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold">{locale === 'ka' ? ka : en}</h3>
              <p className="mt-2 text-sm text-[#6f675e]">{locale === 'ka' ? kaText : enText}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
