import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const schema = z.object({
  projectId: z.string().min(1),
  stageId: z.string().min(1),
  status: z.enum(['PENDING', 'ACTIVE', 'COMPLETED', 'BLOCKED']),
  progressPercent: z.number().int().min(0).max(100).optional(),
  projectStatus: z.enum(['WAITING_FOR_MATERIALS', 'DESIGN_PHASE', 'DEVELOPMENT_PHASE', 'REVIEW_PHASE', 'COMPLETED']).optional()
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    ensureTeamMember(user);

    const body = schema.parse(await readJson(request));
    const project = await ensureProjectAccess(user, body.projectId);

    const stage = await prisma.projectStage.findFirst({
      where: {
        id: body.stageId,
        projectId: body.projectId
      }
    });

    if (!stage) {
      throw new ApiError(404, 'Nie znaleziono etapu.');
    }

    const updatedStage = await prisma.projectStage.update({
      where: { id: stage.id },
      data: {
        status: body.status,
        completedDate: body.status === 'COMPLETED' ? new Date() : null
      }
    });

    const updatedProject = await prisma.project.update({
      where: { id: body.projectId },
      data: {
        progressPercent: body.progressPercent ?? project.progressPercent,
        status: body.projectStatus ?? project.status,
        completedAt: body.projectStatus === 'COMPLETED' ? new Date() : project.completedAt
      }
    });

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'STAGE_UPDATED',
      entityType: 'PROJECT_STAGE',
      entityId: stage.id,
      metadata: {
        stage: stage.name,
        status: body.status,
        progressPercent: updatedProject.progressPercent
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'PROJECT_UPDATED',
      title: 'Status projektu został zaktualizowany',
      body: `${user.name} zmienił etap "${stage.name}" na status ${body.status}.`,
      link: `/portal/project/?id=${body.projectId}#timeline`
    });

    return json({ ok: true, stage: updatedStage, project: updatedProject });
  } catch (error) {
    return handleApiError(error);
  }
}
