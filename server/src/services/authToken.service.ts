import jwt from 'jsonwebtoken';
import { HttpError } from '../utils/httpError.js';

export interface AccessTokenPayload {
  sub: number;
  email?: string;
  role?: 'user' | 'admin';
}

const getJwtSecret = (): string => {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) {
    return configured;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production');
  }

  return 'dev-insecure-jwt-secret-change-me';
};

/** Signs short-lived JWT for API authentication. */
export const signAccessToken = (payload: AccessTokenPayload): string => {
  const { sub, ...claims } = payload;

  const options: jwt.SignOptions = {
    subject: String(sub),
    expiresIn: (process.env.JWT_EXPIRES_IN?.trim() as jwt.SignOptions['expiresIn']) || '1h',
    issuer: 'laptop-store-api',
    audience: 'laptop-store-client',
  };

  return jwt.sign(claims, getJwtSecret(), options);
};

/** Verifies and decodes JWT payload. */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'laptop-store-api',
      audience: 'laptop-store-client',
    }) as jwt.JwtPayload;

    const subRaw = decoded.sub;
    const sub = typeof subRaw === 'string' ? Number.parseInt(subRaw, 10) : Number(subRaw);

    if (!Number.isInteger(sub) || sub <= 0) {
      throw new HttpError(401, 'Invalid authentication token');
    }

    const role = decoded.role === 'admin' ? 'admin' : 'user';

    return {
      sub,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      role,
    };
  } catch {
    throw new HttpError(401, 'Invalid authentication token');
  }
};
