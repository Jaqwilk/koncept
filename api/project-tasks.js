import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const schema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  status: z.enum(['PENDING', 'COMPLETED'])
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    const body = schema.parse(await readJson(request));
    const project = await ensureProjectAccess(user, body.projectId);

    const task = await prisma.task.findFirst({
      where: {
        id: body.taskId,
        projectId: body.projectId
      }
    });

    if (!task) {
      throw new ApiError(404, 'Nie znaleziono zadania.');
    }

    const updatedTask = await prisma.task.update({
      where: { id: body.taskId },
      data: {
        status: body.status,
        completedAt: body.status === 'COMPLETED' ? new Date() : null,
        completedById: body.status === 'COMPLETED' ? user.id : null
      }
    });

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'TASK_STATUS_CHANGED',
      entityType: 'TASK',
      entityId: task.id,
      metadata: { status: body.status }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: body.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'PROJECT_UPDATED',
      title: body.status === 'COMPLETED' ? 'Zadanie ukończone' : 'Zadanie ponownie otwarte',
      body: `${user.name} zmienił status zadania "${task.title}" w projekcie ${project.name}.`,
      link: `/portal/project/?id=${body.projectId}#overview`
    });

    return json({ ok: true, task: updatedTask });
  } catch (error) {
    return handleApiError(error);
  }
}
