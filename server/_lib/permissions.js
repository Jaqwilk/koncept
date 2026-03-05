import { prisma } from './db.js';
import { ApiError } from './http.js';

export function isAdmin(user) {
  return user.role === 'ADMIN';
}

export function isTeam(user) {
  return user.role === 'ADMIN' || user.role === 'TEAM_MEMBER';
}

export async function ensureProjectAccess(user, projectId) {
  if (isAdmin(user)) {
    return prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        }
      }
    });
  }

  const membership = await prisma.projectMember.findFirst({
    where: {
      projectId,
      userId: user.id
    },
    include: {
      project: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!membership) {
    throw new ApiError(403, 'Ten projekt nie jest dla Ciebie dostępny.');
  }

  return membership.project;
}

export function ensureTeamMember(user) {
  if (!isTeam(user)) {
    throw new ApiError(403, 'Ta akcja wymaga uprawnień zespołu.');
  }
}
