import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess } from './_lib/permissions.js';
import { ensureMethod, getSearchParam, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';
import { syncProjectTasks } from './_lib/tasks.js';

const schema = z.object({
  projectId: z.string().min(1),
  companyName: z.string().optional().nullable(),
  businessDescription: z.string().optional().nullable(),
  targetAudience: z.string().optional().nullable(),
  services: z.array(z.string()).optional(),
  desiredPages: z.array(z.string()).optional(),
  colorPreferences: z.string().optional().nullable(),
  inspirations: z.array(z.string()).optional(),
  contactName: z.string().optional().nullable(),
  contactEmail: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  businessAddress: z.string().optional().nullable(),
  additionalNotes: z.string().optional().nullable()
});

export default async function handler(request) {
  try {
    const user = await requireUser(request);

    if (request.method === 'GET') {
      const projectId = getSearchParam(request, 'projectId');
      if (!projectId) throw new ApiError(400, 'Brakuje projectId.');
      await ensureProjectAccess(user, projectId);

      const brief = await prisma.projectBrief.findUnique({
        where: { projectId }
      });
      return json({ brief });
    }

    ensureMethod(request, ['POST']);
    const body = schema.parse(await readJson(request));
    const project = await ensureProjectAccess(user, body.projectId);

    const currentBrief = await prisma.projectBrief.findUnique({
      where: { projectId: body.projectId }
    });

    const brief = currentBrief
      ? await prisma.projectBrief.update({
          where: { projectId: body.projectId },
          data: {
            companyName: body.companyName,
            businessDescription: body.businessDescription,
            targetAudience: body.targetAudience,
            servicesJson: body.services,
            desiredPagesJson: body.desiredPages,
            colorPreferences: body.colorPreferences,
            inspirationJson: body.inspirations,
            contactName: body.contactName,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            businessAddress: body.businessAddress,
            additionalNotes: body.additionalNotes,
            version: {
              increment: 1
            },
            updatedById: user.id
          }
        })
      : await prisma.projectBrief.create({
          data: {
            projectId: body.projectId,
            companyName: body.companyName,
            businessDescription: body.businessDescription,
            targetAudience: body.targetAudience,
            servicesJson: body.services,
            desiredPagesJson: body.desiredPages,
            colorPreferences: body.colorPreferences,
            inspirationJson: body.inspirations,
            contactName: body.contactName,
            contactEmail: body.contactEmail,
            contactPhone: body.contactPhone,
            businessAddress: body.businessAddress,
            additionalNotes: body.additionalNotes,
            updatedById: user.id
          }
        });

    await syncProjectTasks(body.projectId);

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'BRIEF_UPDATED',
      entityType: 'PROJECT_BRIEF',
      entityId: brief.id,
      metadata: {
        version: brief.version
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'PROJECT_UPDATED',
      title: 'Brief projektu został zaktualizowany',
      body: `${user.name} uzupełnił brief projektu ${project.name}.`,
      link: `/portal/project/?id=${body.projectId}#overview`
    });

    return json({ ok: true, brief });
  } catch (error) {
    return handleApiError(error);
  }
}
