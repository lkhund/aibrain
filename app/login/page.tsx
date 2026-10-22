import Link from 'next/link';
import { login } from '@/lib/actions';
import { getCurrentUser } from '@/lib/auth';
import { getLocale, tx } from '@/lib/locale';
import { ErrorNote, one } from '@/components/ui';
import { redirect } from 'next/navigation';

const demos = [
  ['nino@demo.ge', 'HR'],
  ['luka@demo.ge', 'Manager'],
  ['mariam@demo.ge', 'Finance'],
  ['giorgi@demo.ge', 'Director'],
  ['ana@demo.ge', 'Employee'],
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await getCurrentUser()) redirect('/w');
  const locale = await getLocale();
  const params = await searchParams;
  const next = one(params.next) || '/w';
  const t = (ka: string, en: string) => tx(locale, ka, en);
  return (
    <div className="mx-auto grid min-h-screen max-w-5xl items-center gap-8 px-5 py-10 lg:grid-cols-2">
      <div>
        <Link href="/" className="text-sm text-[#6f675e]">{t('← მთავარი', '← Home')}</Link>
        <h1 className="mt-4 text-3xl font-semibold">{t('შესვლა სამუშაო სივრცეში', 'Sign in to the workspace')}</h1>
        <p className="mt-2 text-sm text-[#6f675e]">{t('დემო პაროლი ყველა ანგარიშზე არის demo1234.', 'The demo password for every account is demo1234.')}</p>
        <div className="mt-5 grid gap-2">
          {demos.map(([email, role]) => (
            <form key={email} action={login} className="flex items-center justify-between gap-3 rounded-xl border border-[#e4ddd0] bg-white px-3 py-2">
              <input type="hidden" name="email" value={email} />
              <input type="hidden" name="password" value="demo1234" />
              <input type="hidden" name="next" value={next} />
              <span className="text-sm"><strong>{role}</strong> · {email}</span>
              <button className="btn btn-ghost btn-small" type="submit">{t('შესვლა', 'Sign in')}</button>
            </form>
          ))}
        </div>
      </div>
      <form action={login} className="card grid gap-3 p-5">
        <ErrorNote locale={locale} code={one(params.error)} />
        <input type="hidden" name="next" value={next} />
        <label className="grid gap-1 text-sm">{t('ელფოსტა', 'Email')}<input className="field" name="email" type="email" required /></label>
        <label className="grid gap-1 text-sm">{t('პაროლი', 'Password')}<input className="field" name="password" type="password" required /></label>
        <button className="btn btn-primary" type="submit">{t('შესვლა', 'Sign in')}</button>
      </form>
    </div>
  );
}
