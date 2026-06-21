import { Hono } from 'hono';
import { hashPassword, verifyPassword, hashToken } from '../utils/crypto';
import { signAccessToken } from '../utils/jwt';
import { authMiddleware } from '../middleware/auth';
import type { Bindings, Variables } from '../types';

const auth = new Hono<{ Bindings: Bindings; Variables: Variables }>();

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function isValidPassword(password: string): boolean {
  return password.length >= 8 && /\d/.test(password);
}

function issueRefreshExpiry(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

async function insertRefreshToken(
  db: D1Database,
  userId: string,
  token: string,
  now: string
): Promise<void> {
  const tokenHash = await hashToken(token);
  await db
    .prepare(
      'INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(crypto.randomUUID(), userId, tokenHash, issueRefreshExpiry(), now)
    .run();
}

// POST /api/auth/register
auth.post('/register', async (c) => {
  if (!c.env.JWT_SECRET) return c.json({ error: 'Server configuration error' }, 500);

  let body: { email?: unknown; password?: unknown; name?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, password, name } = body;

  if (typeof name !== 'string' || !name.trim() || name.length > 100) {
    return c.json({ error: 'Name is required (max 100 characters)', field: 'name' }, 400);
  }
  if (typeof email !== 'string' || !isValidEmail(email)) {
    return c.json({ error: 'Valid email is required (max 254 characters)', field: 'email' }, 400);
  }
  if (typeof password !== 'string' || !isValidPassword(password)) {
    return c.json(
      { error: 'Password must be at least 8 characters and contain a number', field: 'password' },
      400
    );
  }

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  await c.env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, name, created_at) VALUES (?, ?, ?, ?, ?)'
  )
    .bind(userId, email.toLowerCase(), passwordHash, name.trim(), now)
    .run();

  const accessToken = await signAccessToken(
    { sub: userId, email: email.toLowerCase(), name: name.trim() },
    c.env.JWT_SECRET
  );
  const refreshToken = crypto.randomUUID();
  await insertRefreshToken(c.env.DB, userId, refreshToken, now);

  return c.json(
    { user: { id: userId, email: email.toLowerCase(), name: name.trim() }, accessToken, refreshToken },
    201
  );
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  if (!c.env.JWT_SECRET) return c.json({ error: 'Server configuration error' }, 500);

  let body: { email?: unknown; password?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { email, password } = body;
  if (typeof email !== 'string' || typeof password !== 'string') {
    return c.json({ error: 'Email and password are required' }, 400);
  }

  const user = await c.env.DB.prepare('SELECT id, email, password_hash, name FROM users WHERE email = ?')
    .bind(email.toLowerCase())
    .first<{ id: string; email: string; password_hash: string; name: string }>();

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) return c.json({ error: 'Invalid credentials' }, 401);

  const now = new Date().toISOString();
  const accessToken = await signAccessToken(
    { sub: user.id, email: user.email, name: user.name },
    c.env.JWT_SECRET
  );
  const refreshToken = crypto.randomUUID();
  await insertRefreshToken(c.env.DB, user.id, refreshToken, now);

  return c.json({ user: { id: user.id, email: user.email, name: user.name }, accessToken, refreshToken });
});

// POST /api/auth/refresh
auth.post('/refresh', async (c) => {
  if (!c.env.JWT_SECRET) return c.json({ error: 'Server configuration error' }, 500);

  let body: { refreshToken?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body' }, 400);
  }

  const { refreshToken } = body;
  if (typeof refreshToken !== 'string') {
    return c.json({ error: 'Refresh token is required' }, 400);
  }

  const tokenHash = await hashToken(refreshToken);
  const stored = await c.env.DB.prepare(
    'SELECT id, user_id, expires_at, revoked_at FROM refresh_tokens WHERE token_hash = ?'
  )
    .bind(tokenHash)
    .first<{ id: string; user_id: string; expires_at: string; revoked_at: string | null }>();

  if (!stored) return c.json({ error: 'Invalid refresh token' }, 401);
  if (stored.revoked_at) return c.json({ error: 'Refresh token revoked' }, 401);
  if (new Date(stored.expires_at) < new Date()) return c.json({ error: 'Refresh token expired' }, 401);

  const user = await c.env.DB.prepare('SELECT id, email, name FROM users WHERE id = ?')
    .bind(stored.user_id)
    .first<{ id: string; email: string; name: string }>();
  if (!user) return c.json({ error: 'User not found' }, 401);

  const now = new Date().toISOString();
  await c.env.DB.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?')
    .bind(now, stored.id)
    .run();

  const accessToken = await signAccessToken(
    { sub: user.id, email: user.email, name: user.name },
    c.env.JWT_SECRET
  );
  const newRefreshToken = crypto.randomUUID();
  await insertRefreshToken(c.env.DB, user.id, newRefreshToken, now);

  return c.json({ accessToken, refreshToken: newRefreshToken });
});

// POST /api/auth/logout
auth.post('/logout', async (c) => {
  let body: { refreshToken?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ success: true });
  }

  const { refreshToken } = body;
  if (typeof refreshToken === 'string') {
    const tokenHash = await hashToken(refreshToken);
    const now = new Date().toISOString();
    await c.env.DB.prepare(
      'UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL'
    )
      .bind(now, tokenHash)
      .run();
  }

  return c.json({ success: true });
});

// GET /api/auth/me
auth.get('/me', authMiddleware, (c) => {
  return c.json({ user: c.get('user') });
});

export default auth;
