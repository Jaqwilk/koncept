import { z } from 'zod';
import { createSessionCookie, createSessionToken, verifyPassword } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const body = schema.parse(await readJson(request));

    const user = await prisma.user.findUnique({
      where: { email: body.email.toLowerCase() }
    });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, 'Nieprawidłowy e-mail lub hasło.');
    }

    if (user.status !== 'ACTIVE') {
      throw new ApiError(403, 'To konto nie jest jeszcze aktywne.');
    }

    const token = await createSessionToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date()
      }
    });

    return json(
      {
        ok: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      },
      200,
      {
        'Set-Cookie': createSessionCookie(token)
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
