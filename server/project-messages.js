import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, isTeam } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const schema = z.object({
  projectId: z.string().min(1),
  threadId: z.string().optional(),
  body: z.string().trim().min(1),
  isInternal: z.boolean().optional().default(false),
  attachmentFileIds: z.array(z.string()).optional().default([])
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    const body = schema.parse(await readJson(request));
    const project = await ensureProjectAccess(user, body.projectId);

    if (body.isInternal && !isTeam(user)) {
      throw new ApiError(403, 'Notatki wewnętrzne są dostępne tylko dla zespołu.');
    }

    const thread =
      (body.threadId &&
        (await prisma.messageThread.findFirst({
          where: {
            id: body.threadId,
            projectId: body.projectId
          }
        }))) ||
      (await prisma.messageThread.findFirst({
        where: {
          projectId: body.projectId
        },
        orderBy: { createdAt: 'asc' }
      }));

    if (!thread) {
      throw new ApiError(404, 'Nie znaleziono wątku wiadomości.');
    }

    const message = await prisma.message.create({
      data: {
        threadId: thread.id,
        authorId: user.id,
        body: body.body,
        isInternal: body.isInternal
      }
    });

    const attachmentFileIds = Array.from(new Set(body.attachmentFileIds.filter(Boolean)));
    if (attachmentFileIds.length) {
      const validAttachmentCount = await prisma.fileAsset.count({
        where: {
          id: { in: attachmentFileIds },
          projectId: body.projectId
        }
      });

      if (validAttachmentCount !== attachmentFileIds.length) {
        throw new ApiError(400, 'Jeden z załączników nie należy do tego projektu.');
      }

      await prisma.messageAttachment.createMany({
        data: attachmentFileIds.map((fileId) => ({
          messageId: message.id,
          fileId
        }))
      });
    }

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'MESSAGE_SENT',
      entityType: 'MESSAGE',
      entityId: message.id,
      metadata: {
        isInternal: body.isInternal
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'MESSAGE_RECEIVED',
      title: 'Nowa wiadomość w projekcie',
      body: `${user.name} dodał wiadomość w projekcie ${project.name}.`,
      link: `/portal/project/?id=${body.projectId}#messages`,
      includeRoles: body.isInternal ? ['ADMIN', 'TEAM_MEMBER'] : ['ADMIN', 'TEAM_MEMBER', 'CLIENT']
    });

    return json({ ok: true, message });
  } catch (error) {
    return handleApiError(error);
  }
}
