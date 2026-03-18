import 'express-session';

declare module 'express-session' {
  interface SessionData {
    auth?: {
      id: number;
      name: string;
      email: string;
      role: 'user' | 'admin';
    };
  }
}
