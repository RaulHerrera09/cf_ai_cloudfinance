import { createMiddleware } from 'hono/factory';
import { verifyJWT } from '../utils/jwt';
import type { Bindings, Variables } from '../types';

export const authMiddleware = createMiddleware<{
  Bindings: Bindings;
  Variables: Variables;
}>(async (c, next) => {
  if (!c.env.JWT_SECRET) {
    return c.json({ error: 'Server configuration error' }, 500);
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const payload = await verifyJWT(token, c.env.JWT_SECRET);

  if (!payload) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  c.set('user', {
    id: payload.sub,
    email: payload.email,
    name: payload.name,
  });

  await next();
});
