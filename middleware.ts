import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE, decodeSession } from '@/lib/session';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  const session = token ? await decodeSession(token) : null;
  if (!session) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/w/:path*'],
};
