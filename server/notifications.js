import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureMethod, handleApiError, json, readJson } from './_lib/http.js';

export default async function handler(request) {
  try {
    const user = await requireUser(request);

    if (request.method === 'GET') {
      const notifications = await prisma.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 30
      });

      return json({ notifications });
    }

    ensureMethod(request, ['POST']);
    const body = await readJson(request);

    if (body.markAll) {
      await prisma.notification.updateMany({
        where: {
          userId: user.id,
          readAt: null
        },
        data: {
          readAt: new Date()
        }
      });

      return json({ ok: true });
    }

    await prisma.notification.updateMany({
      where: {
        id: body.notificationId,
        userId: user.id
      },
      data: {
        readAt: new Date()
      }
    });

    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
