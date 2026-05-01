import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { edgeAuthConfig, ROLLEN_PAGINAS } from '@/lib/auth/edge-config';
import type { Rol } from '@/types/domain';

const { auth } = NextAuth(edgeAuthConfig);

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isIngelogd = !!session;

  if (nextUrl.pathname.startsWith('/login')) {
    if (isIngelogd) {
      return NextResponse.redirect(new URL('/kalender', nextUrl));
    }
    return NextResponse.next();
  }

  if (!isIngelogd) {
    return NextResponse.redirect(new URL('/login', nextUrl));
  }

  const rol = session.user.rol as Rol;
  const toegestanePaginas = ROLLEN_PAGINAS[rol] ?? [];
  const paginaNaam = nextUrl.pathname.split('/')[1];

  if (paginaNaam && !toegestanePaginas.includes(paginaNaam)) {
    return NextResponse.redirect(new URL('/kalender', nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
