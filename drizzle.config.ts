import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle/migrations',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'file:examenplanning.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
