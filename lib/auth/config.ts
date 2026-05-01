import 'server-only';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { gebruikers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { edgeAuthConfig } from './edge-config';

export { ROLLEN_PAGINAS, KAN_SCHRIJVEN, KAN_OVERRIDE } from './edge-config';

const aanmeldSchema = z.object({
  email: z.string().email(),
  pincode: z.string().length(4).regex(/^\d{4}$/),
});

export const authConfig: NextAuthConfig = {
  ...edgeAuthConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        pincode: { label: 'Pincode', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = aanmeldSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, pincode } = parsed.data;

        const [gebruiker] = await db
          .select()
          .from(gebruikers)
          .where(eq(gebruikers.email, email))
          .limit(1);

        if (!gebruiker || !gebruiker.actief) return null;

        const geldig = await bcrypt.compare(pincode, gebruiker.pincodeHash);
        if (!geldig) return null;

        return {
          id: String(gebruiker.id),
          name: gebruiker.naam,
          email: gebruiker.email,
          rol: gebruiker.rol,
          surveillantId: gebruiker.surveillantId ?? undefined,
        };
      },
    }),
  ],
};
