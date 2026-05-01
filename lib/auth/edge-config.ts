import type { NextAuthConfig } from 'next-auth';
import type { Rol } from '@/types/domain';

export const ROLLEN_PAGINAS: Record<Rol, string[]> = {
  planner: ['kalender', 'examens', 'surveillanten', 'rapporten'],
  hoofd_operations: ['kalender', 'examens', 'surveillanten', 'rapporten'],
  programmacoördinator: ['kalender', 'examens'],
  surveillant: ['beschikbaarheid'],
  examencommissie: ['kalender', 'examens', 'rapporten'],
};

export const KAN_SCHRIJVEN: Record<Rol, boolean> = {
  planner: true,
  hoofd_operations: true,
  programmacoördinator: false,
  surveillant: false,
  examencommissie: false,
};

export const KAN_OVERRIDE: Record<Rol, boolean> = {
  planner: false,
  hoofd_operations: true,
  programmacoördinator: false,
  surveillant: false,
  examencommissie: false,
};

// Edge-safe NextAuth config: no DB imports, no Credentials provider.
// Used by middleware (Edge Runtime) and spread into the full config for API routes.
export const edgeAuthConfig: NextAuthConfig = {
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.rol = (user as { rol: Rol }).rol;
        token.surveillantId = (user as { surveillantId?: number }).surveillantId;
      }
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.rol = token.rol as Rol;
        session.user.surveillantId = token.surveillantId as number | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};
