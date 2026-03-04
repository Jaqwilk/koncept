import { prisma } from './db.js';
import { ensureProjectAccess, isAdmin, isTeam } from './permissions.js';

const workspaceInclude = {
  members: {
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true
        }
      }
    }
  },
  brief: true,
  tasks: {
    orderBy: { sortOrder: 'asc' }
  },
  milestones: {
    orderBy: { sortOrder: 'asc' }
  },
  stages: {
    orderBy: { sortOrder: 'asc' }
  },
  files: {
    orderBy: { createdAt: 'desc' },
    include: {
      uploadedBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true
            }
          }
        }
      }
    }
  },
  threads: {
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          attachments: {
            include: {
              file: true
            }
          }
        }
      }
    }
  },
  feedbackItems: {
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      resolvedBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      attachmentFile: true
    }
  },
  approvals: {
    orderBy: { requestedAt: 'desc' },
    include: {
      requestedBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      },
      respondedBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  },
  invoices: {
    orderBy: { issuedAt: 'desc' },
    include: {
      pdfFile: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  },
  activities: {
    orderBy: { createdAt: 'desc' },
    take: 20,
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          role: true
        }
      }
    }
  }
};

export async function getDashboardData(user) {
  const projectWhere = isAdmin(user)
    ? {}
    : {
        members: {
          some: {
            userId: user.id
          }
        }
      };

  const activityWhere = isAdmin(user)
    ? {}
    : {
        project: {
          members: {
            some: {
              userId: user.id
            }
          }
        }
      };

  const [projects, notifications, recentActivity] = await Promise.all([
    prisma.project.findMany({
      where: projectWhere,
      include: {
        tasks: true,
        approvals: true,
        milestones: {
          orderBy: { sortOrder: 'asc' }
        },
        activities: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    }),
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 12
    }),
    prisma.activityLog.findMany({
      where: activityWhere,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            role: true
          }
        },
        project: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 12
    })
  ]);

  const activeProjects = projects.filter((project) => project.status !== 'COMPLETED');
  const completedProjects = projects.filter((project) => project.status === 'COMPLETED');
  const pendingTasks = projects.flatMap((project) =>
    project.tasks.filter((task) => task.status === 'PENDING').map((task) => ({ ...task, projectName: project.name, projectId: project.id }))
  );
  const unreadMessages = notifications.filter((item) => item.type === 'MESSAGE_RECEIVED' && !item.readAt).length;
  const pendingApprovals = projects.flatMap((project) =>
    project.approvals.filter((item) => item.status === 'PENDING').map((item) => ({ ...item, projectId: project.id, projectName: project.name }))
  );

  return {
    user,
    summary: {
      activeProjects: activeProjects.length,
      completedProjects: completedProjects.length,
      pendingTasks: pendingTasks.length,
      unreadMessages
    },
    projects: projects.map((project) => ({
      id: project.id,
      name: project.name,
      status: project.status,
      progressPercent: project.progressPercent,
      nextMilestone: project.milestones.find((milestone) => milestone.status !== 'COMPLETED')?.name || 'Zamknięty etap',
      lastActivity: project.activities[0]?.createdAt || project.updatedAt,
      pendingTasks: project.tasks.filter((task) => task.status === 'PENDING').length
    })),
    recentActivity,
    notifications,
    pendingTasks: pendingTasks.slice(0, 10),
    pendingApprovals
  };
}

export async function getProjectWorkspace(user, projectId) {
  await ensureProjectAccess(user, projectId);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: workspaceInclude
  });

  if (!project) {
    return null;
  }

  if (!isTeam(user)) {
    project.threads = project.threads.map((thread) => ({
      ...thread,
      messages: thread.messages.filter((message) => !message.isInternal)
    }));
  }

  return project;
}
