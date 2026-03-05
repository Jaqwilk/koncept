import { prisma } from './_lib/db.js';
import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);

    await prisma.$queryRaw`SELECT 1`;

    return json({
      ok: true,
      service: 'koncept-api',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return handleApiError(error);
  }
}
