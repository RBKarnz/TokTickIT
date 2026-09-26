import crypto from 'crypto';
import * as argon2 from 'argon2';
import { getPrisma } from './prisma.js';
import { Request, Response, NextFunction } from 'express';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
export const COOKIE_NAME = 'session_token';
export const SESSION_IDLE_MS = 8 * 60 * 60 * 1000; // 8 hours
export const SESSION_ABSOLUTE_MS = 24 * 60 * 60 * 1000; // 24 hours

// Pre-computed / cached dummy hash for timing-safe rejection
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) {
    dummyHashPromise = argon2.hash('__timing_prevention_dummy__', {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  }
  return dummyHashPromise;
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------
export function getCookieOptions(isSecure: boolean) {
  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_ABSOLUTE_MS, // Express expects maxAge in milliseconds; 24-hr absolute window
  };
}

// ---------------------------------------------------------------------------
// Token utilities
// ---------------------------------------------------------------------------
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ---------------------------------------------------------------------------
// CSRF protection (spec §15.2): Origin validation + session-bound token.
// Token = HMAC-SHA256(raw session token); nothing extra is stored in the DB.
// ---------------------------------------------------------------------------
export const CSRF_HEADER = 'x-csrf-token';
// Falls back to a per-process random secret so no secret is committed; tokens
// are re-fetched from /api/auth/me after a server restart.
const CSRF_SECRET = process.env.CSRF_SECRET || crypto.randomBytes(32).toString('hex');

export function csrfTokenFor(sessionToken: string): string {
  return crypto.createHmac('sha256', CSRF_SECRET).update(sessionToken).digest('hex');
}

function allowedOrigins(): string[] {
  return (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((o) => o.trim());
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
// Login has no session yet (only Origin is checked); logout must always succeed.
const TOKEN_EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/logout']);

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) return next();

  const origin = req.headers.origin;
  if (origin && !allowedOrigins().includes(origin)) {
    return res.status(403).json({ error: { code: 'CSRF_ORIGIN_MISMATCH', message: 'Cross-origin request rejected.' } });
  }

  const sessionToken = req.cookies?.[COOKIE_NAME];
  if (!sessionToken || TOKEN_EXEMPT_PATHS.has(req.path)) return next();

  const sent = req.headers[CSRF_HEADER];
  const expected = csrfTokenFor(sessionToken);
  const valid = typeof sent === 'string' && sent.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
  if (!valid) {
    return res.status(403).json({ error: { code: 'CSRF_TOKEN_INVALID', message: 'Missing or invalid CSRF token.' } });
  }
  return next();
}

// ---------------------------------------------------------------------------
// Session creation
// ---------------------------------------------------------------------------
export async function createSession(userId: number): Promise<string> {
  const prisma = getPrisma();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const now = new Date();

  await prisma.session.create({
    data: {
      userId,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
      expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_MS),
    },
  });

  return token; // raw token is only sent in HttpOnly cookie, never in JSON body
}

// ---------------------------------------------------------------------------
// Session validation
// ---------------------------------------------------------------------------
export async function getSessionUser(token: string) {
  const prisma = getPrisma();
  const tokenHash = hashToken(token);
  const now = new Date();

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.revokedAt) return null;
  if (session.expiresAt < now) return null; // absolute timeout
  if (new Date(session.lastSeenAt.getTime() + SESSION_IDLE_MS) < now) return null; // idle timeout
  if (!session.user.isActive) return null;

  // Slide idle window
  await prisma.session.update({
    where: { tokenHash },
    data: { lastSeenAt: now },
  });

  return session.user;
}

// ---------------------------------------------------------------------------
// Session revocation
// ---------------------------------------------------------------------------
export async function revokeSession(tokenHash: string): Promise<void> {
  const prisma = getPrisma();
  await prisma.session.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  const prisma = getPrisma();
  await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Password utilities
// ---------------------------------------------------------------------------
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain.trim(), {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Constant-time dummy verify to prevent timing-based user enumeration */
export async function dummyVerify(plain: string): Promise<void> {
  try {
    const dummyHash = await getDummyHash();
    await argon2.verify(dummyHash, plain);
  } catch {
    // Ignore error
  }
}

// ---------------------------------------------------------------------------
// Password policy
// ---------------------------------------------------------------------------
export function validatePasswordPolicy(password: string): string | null {
  const t = password.trim();
  if (t.length < 8 || t.length > 128) return 'Password must be 8–128 characters.';
  if (!/[A-Z]/.test(t)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(t)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(t)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(t)) return 'Password must include at least one special character.';
  return null;
}

// ---------------------------------------------------------------------------
// Express type augmentation
// ---------------------------------------------------------------------------
declare global {
  namespace Express {
    interface Request {
      sessionUser?: {
        id: number;
        name: string;
        email: string;
        role: string;
        mustChangePassword: boolean;
        isActive: boolean;
      };
      sessionTokenHash?: string;
    }
  }
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/** Requires a valid session. Attaches sessionUser and sessionTokenHash to req. */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required.' } });
      return;
    }

    const user = await getSessionUser(token);
    if (!user) {
      res.clearCookie(COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Session expired or invalid.' } });
      return;
    }

    req.sessionUser = user;
    req.sessionTokenHash = hashToken(token);
    next();
  } catch (err) {
    next(err);
  }
}

/** Like requireAuth, but also blocks first-login restricted sessions from normal routes. */
export async function requireNormalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.sessionUser?.mustChangePassword) {
      res.status(403).json({
        error: { code: 'FORBIDDEN', message: 'Password change required before accessing this resource.' },
      });
      return;
    }
    next();
  });
}

/** Role guard — use AFTER requireAuth or requireNormalAuth. */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.sessionUser || !roles.includes(req.sessionUser.role)) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied.' } });
      return;
    }
    next();
  };
}
