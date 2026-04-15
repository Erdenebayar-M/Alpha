import { Hono } from 'hono';
import { prisma } from '../lib/db/client';
import { hashPassword, comparePassword } from '../lib/auth/password';
import { signToken } from '../lib/auth/jwt';
import { ERRORS } from '../lib/errors';
import { registerSchema, loginSchema } from '../lib/validators/auth';

const auth = new Hono();

// POST /api/auth/register
auth.post('/register', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR('Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, name, password } = parsed.data;

  const existing = await prisma.parent.findUnique({ where: { email } });
  if (existing) {
    return ERRORS.CONFLICT('Email already registered');
  }

  const password_hash = await hashPassword(password);
  const parent = await prisma.parent.create({
    data: { email, name, password_hash },
  });

  const token = await signToken({ parent_id: parent.id });
  return c.json({ id: parent.id, email: parent.email, name: parent.name, token }, 201);
});

// POST /api/auth/login
auth.post('/login', async (c) => {
  const body = await c.req.json<unknown>().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return ERRORS.VALIDATION_ERROR('Invalid request body', parsed.error.flatten().fieldErrors);
  }

  const { email, password } = parsed.data;

  const parent = await prisma.parent.findUnique({ where: { email } });
  if (!parent) {
    return ERRORS.UNAUTHORIZED('Invalid credentials');
  }

  const valid = await comparePassword(password, parent.password_hash);
  if (!valid) {
    return ERRORS.UNAUTHORIZED('Invalid credentials');
  }

  const token = await signToken({ parent_id: parent.id });
  return c.json({ id: parent.id, email: parent.email, name: parent.name, token });
});

export default auth;
