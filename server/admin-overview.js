import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json } from './_lib/http.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);
    const user = await requireUser(request);
    ensureTeamMember(user);

    const [users, invites, projects] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true
        }
      }),
      prisma.invite.findMany({
        orderBy: { createdAt: 'desc' },
        take: 25,
        include: {
          project: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }),
      prisma.project.findMany({
        orderBy: { updatedAt: 'desc' },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  role: true
                }
              }
            }
          }
        }
      })
    ]);

    return json({ users, invites, projects });
  } catch (error) {
    return handleApiError(error);
  }
}
