import type { Rol } from './domain';

declare module 'next-auth' {
  interface User {
    rol: Rol;
    surveillantId?: number;
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      rol: Rol;
      surveillantId?: number;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    rol: Rol;
    surveillantId?: number;
  }
}
