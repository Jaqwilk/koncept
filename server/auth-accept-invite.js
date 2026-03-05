import { z } from 'zod';
import { createSessionCookie, createSessionToken, hashInviteToken, hashPassword } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';

const schema = z.object({
  token: z.string().min(12),
  name: z.string().trim().min(2),
  password: z.string().min(8)
});

export default async function handler(request) {
  try {
    ensureMethod(request, ['POST']);
    const body = schema.parse(await readJson(request));
    const tokenHash = hashInviteToken(body.token);

    const invite = await prisma.invite.findUnique({
      where: { tokenHash },
      include: {
        project: true
      }
    });

    if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
      throw new ApiError(400, 'To zaproszenie jest nieprawidłowe lub wygasło.');
    }

    const passwordHash = await hashPassword(body.password);
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() }
    });

    const user = existingUser
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            name: body.name,
            passwordHash,
            role: invite.role,
            status: 'ACTIVE'
          }
        })
      : await prisma.user.create({
          data: {
            name: body.name,
            email: invite.email.toLowerCase(),
            passwordHash,
            role: invite.role,
            status: 'ACTIVE'
          }
        });

    await prisma.invite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date()
      }
    });

    if (invite.projectId) {
      await prisma.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId: invite.projectId,
            userId: user.id
          }
        },
        create: {
          projectId: invite.projectId,
          userId: user.id,
          membershipRole: invite.membershipRole || 'CLIENT_CONTACT'
        },
        update: {
          membershipRole: invite.membershipRole || 'CLIENT_CONTACT'
        }
      });

      await recordActivity({
        projectId: invite.projectId,
        actorId: user.id,
        eventType: 'INVITE_ACCEPTED',
        entityType: 'INVITE',
        entityId: invite.id,
        metadata: {
          email: user.email
        }
      });
    }

    const token = await createSessionToken(user);
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
