import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, isTeam } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const createSchema = z.object({
  action: z.literal('create'),
  projectId: z.string().min(1),
  title: z.string().trim().min(3),
  body: z.string().trim().min(3),
  deliverableLabel: z.string().trim().optional(),
  attachmentFileId: z.string().trim().optional()
});

const updateSchema = z.object({
  action: z.literal('update-status'),
  projectId: z.string().min(1),
  feedbackId: z.string().min(1),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  resolutionNote: z.string().trim().optional()
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    const rawBody = await readJson(request);
    const body = rawBody.action === 'create' ? createSchema.parse(rawBody) : updateSchema.parse(rawBody);
    const project = await ensureProjectAccess(user, body.projectId);

    if (body.action === 'create') {
      if (body.attachmentFileId) {
        const attachment = await prisma.fileAsset.findFirst({
          where: {
            id: body.attachmentFileId,
            projectId: body.projectId
          },
          select: { id: true }
        });

        if (!attachment) {
          throw new ApiError(400, 'Załączony plik nie należy do tego projektu.');
        }
      }

      const feedback = await prisma.feedbackItem.create({
        data: {
          projectId: body.projectId,
          title: body.title,
          body: body.body,
          deliverableLabel: body.deliverableLabel,
          attachmentFileId: body.attachmentFileId || null,
          createdById: user.id
        }
      });

      await recordActivity({
        projectId: body.projectId,
        actorId: user.id,
        eventType: 'FEEDBACK_CREATED',
        entityType: 'FEEDBACK',
        entityId: feedback.id
      });

      await notifyProjectMembers({
        projectId: body.projectId,
        actorId: user.id,
        type: 'FEEDBACK_REQUESTED',
        title: 'Nowy feedback do projektu',
        body: `${user.name} dodał nowy komentarz do projektu ${project.name}.`,
        link: `/portal/project/?id=${body.projectId}#feedback`
      });

      return json({ ok: true, feedback });
    }

    const feedback = await prisma.feedbackItem.findFirst({
      where: {
        id: body.feedbackId,
        projectId: body.projectId
      }
    });

    if (!feedback) {
      throw new ApiError(404, 'Nie znaleziono wpisu feedbackowego.');
    }

    if (body.status !== 'OPEN' && !isTeam(user)) {
      throw new ApiError(403, 'Tylko zespół może zamykać feedback.');
    }

    const updatedFeedback = await prisma.feedbackItem.update({
      where: { id: feedback.id },
      data: {
        status: body.status,
        resolvedAt: body.status === 'RESOLVED' ? new Date() : null,
        resolvedById: body.status === 'RESOLVED' ? user.id : null,
        body: body.resolutionNote ? `${feedback.body}\n\nNotatka: ${body.resolutionNote}` : feedback.body
      }
    });

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'FEEDBACK_STATUS_CHANGED',
      entityType: 'FEEDBACK',
      entityId: feedback.id,
      metadata: {
        status: body.status
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'PROJECT_UPDATED',
      title: 'Status feedbacku zmieniony',
      body: `${user.name} zmienił status feedbacku "${feedback.title}".`,
      link: `/portal/project/?id=${body.projectId}#feedback`
    });

    return json({ ok: true, feedback: updatedFeedback });
  } catch (error) {
    return handleApiError(error);
  }
}
