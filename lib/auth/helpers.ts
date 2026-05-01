import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { KAN_SCHRIJVEN, KAN_OVERRIDE } from '@/lib/auth/config';
import type { Session } from 'next-auth';
import type { Rol } from '@/types/domain';

type AuthOk = { session: Session; error: null };
type AuthErr = { session: null; error: NextResponse };

export async function requireAuth(): Promise<AuthOk | AuthErr> {
  const rawSession = await auth();
  const session = rawSession as Session | null;
  if (!session) {
    return { session: null, error: NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 }) };
  }
  return { session, error: null };
}

export async function requireSchrijven(): Promise<AuthOk | AuthErr> {
  const result = await requireAuth();
  if (result.error) return result as AuthErr;
  const { session } = result as AuthOk;
  if (!KAN_SCHRIJVEN[session.user.rol as Rol]) {
    return { session: null, error: NextResponse.json({ error: 'Geen schrijfrechten voor deze rol' }, { status: 403 }) };
  }
  return { session, error: null };
}

export function kanOverride(rol: Rol): boolean {
  return KAN_OVERRIDE[rol] ?? false;
}
