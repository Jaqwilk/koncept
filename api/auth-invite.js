import { z } from 'zod';
import { createInviteToken, hashInviteToken, requireUser } from './_lib/auth.js';
import { INVITE_TTL_HOURS, ROLE_LABELS } from './_lib/constants.js';
import { prisma } from './_lib/db.js';
import { sendInviteEmail } from './_lib/email.js';
import { ensureProjectAccess, ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'TEAM_MEMBER', 'CLIENT']),
  name: z.string().trim().min(2).optional(),
  projectId: z.string().trim().optional(),
  membershipRole: z.enum(['OWNER', 'COLLABORATOR', 'CLIENT_CONTACT']).optional()
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const actor = await requireUser(request);
    ensureTeamMember(actor);

    const body = schema.parse(await readJson(request));
    if (body.role === 'ADMIN' && actor.role !== 'ADMIN') {
      throw new ApiError(403, 'Tylko admin może zapraszać kolejnych adminów.');
    }

    let project = null;
    if (body.projectId) {
      project = await ensureProjectAccess(actor, body.projectId);
    }

    const token = createInviteToken();
    const tokenHash = hashInviteToken(token);
    const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

    await prisma.invite.create({
      data: {
        email: body.email.toLowerCase(),
        role: body.role,
        membershipRole: body.membershipRole || (body.role === 'CLIENT' ? 'CLIENT_CONTACT' : 'COLLABORATOR'),
        tokenHash,
        expiresAt,
        projectId: body.projectId || null,
        createdById: actor.id
      }
    });

    const baseUrl = process.env.APP_BASE_URL || new URL(request.url).origin;
    const inviteUrl = `${baseUrl}/portal/invite/?token=${token}`;

    await sendInviteEmail({
      email: body.email,
      name: body.name,
      inviteUrl,
      roleLabel: ROLE_LABELS[body.role],
      projectName: project?.name
    });

    if (project) {
      await recordActivity({
        projectId: project.id,
        actorId: actor.id,
        eventType: 'INVITE_SENT',
        entityType: 'INVITE',
        metadata: {
          email: body.email,
          role: body.role
        }
      });
    }

    return json({
      ok: true,
      inviteUrl
    });
  } catch (error) {
    return handleApiError(error);
  }
}
