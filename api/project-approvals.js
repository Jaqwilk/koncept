import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, isTeam } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const requestSchema = z.object({
  action: z.literal('request'),
  projectId: z.string().min(1),
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  versionLabel: z.string().trim().min(1)
});

const respondSchema = z.object({
  action: z.literal('respond'),
  projectId: z.string().min(1),
  approvalId: z.string().min(1),
  status: z.enum(['APPROVED', 'REJECTED']),
  responseNote: z.string().trim().min(2)
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    const rawBody = await readJson(request);
    const body = rawBody.action === 'request' ? requestSchema.parse(rawBody) : respondSchema.parse(rawBody);
    const project = await ensureProjectAccess(user, body.projectId);

    if (body.action === 'request') {
      if (!isTeam(user)) {
        throw new ApiError(403, 'Tylko zespół może wysyłać prośby o akceptację.');
      }

      const approval = await prisma.approvalRequest.create({
        data: {
          projectId: body.projectId,
          title: body.title,
          description: body.description,
          versionLabel: body.versionLabel,
          requestedById: user.id
        }
      });

      await recordActivity({
        projectId: body.projectId,
        actorId: user.id,
        eventType: 'APPROVAL_REQUESTED',
        entityType: 'APPROVAL',
        entityId: approval.id,
        metadata: {
          versionLabel: body.versionLabel
        }
      });

      await notifyProjectMembers({
        projectId: body.projectId,
        actorId: user.id,
        type: 'APPROVAL_REQUIRED',
        title: 'Nowa prośba o akceptację',
        body: `${user.name} poprosił o akceptację etapu "${body.title}" w projekcie ${project.name}.`,
        link: `/portal/project/?id=${body.projectId}#approvals`
      });

      return json({ ok: true, approval });
    }

    const approval = await prisma.approvalRequest.findFirst({
      where: {
        id: body.approvalId,
        projectId: body.projectId
      }
    });

    if (!approval) {
      throw new ApiError(404, 'Nie znaleziono prośby o akceptację.');
    }

    const updatedApproval = await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: body.status,
        responseNote: body.responseNote,
        respondedById: user.id,
        respondedAt: new Date()
      }
    });

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'APPROVAL_RESPONDED',
      entityType: 'APPROVAL',
      entityId: approval.id,
      metadata: {
        status: body.status,
        versionLabel: approval.versionLabel
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'PROJECT_UPDATED',
      title: body.status === 'APPROVED' ? 'Etap zaakceptowany' : 'Etap odrzucony',
      body: `${user.name} ${body.status === 'APPROVED' ? 'zaakceptował' : 'odrzucił'} etap "${approval.title}".`,
      link: `/portal/project/?id=${body.projectId}#approvals`
    });

    return json({ ok: true, approval: updatedApproval });
  } catch (error) {
    return handleApiError(error);
  }
}
