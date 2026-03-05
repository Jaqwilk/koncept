import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { SESSION_COOKIE } from './constants.js';
import { prisma } from './db.js';
import { ApiError, parseCookies, serializeCookie } from './http.js';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new ApiError(500, 'Brakuje zmiennej AUTH_SECRET.');
  }
  return new TextEncoder().encode(secret);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(password, passwordHash);
}

export async function createSessionToken(user) {
  return new SignJWT({
    role: user.role,
    email: user.email,
    name: user.name
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function readSessionToken(request) {
  const cookies = parseCookies(request);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload;
  } catch (error) {
    return null;
  }
}

export async function requireUser(request, allowedRoles = []) {
  const payload = await readSessionToken(request);
  if (!payload?.sub) {
    throw new ApiError(401, 'Zaloguj się, aby kontynuować.');
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.sub }
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new ApiError(401, 'Sesja wygasła. Zaloguj się ponownie.');
  }

  if (allowedRoles.length && !allowedRoles.includes(user.role)) {
    throw new ApiError(403, 'Brak uprawnień do tej operacji.');
  }

  return user;
}

export function createSessionCookie(token) {
  return serializeCookie(SESSION_COOKIE, token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

export function clearSessionCookie() {
  return serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    httpOnly: true,
    path: '/',
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

export function createInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function hashInviteToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}
