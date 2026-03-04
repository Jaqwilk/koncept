import { prisma } from './db.js';
import { sendNotificationEmail } from './email.js';

export async function notifyProjectMembers({
  projectId,
  actorId,
  type,
  title,
  body,
  link,
  includeRoles = ['ADMIN', 'TEAM_MEMBER', 'CLIENT']
}) {
  const memberships = await prisma.projectMember.findMany({
    where: {
      projectId,
      user: {
        role: {
          in: includeRoles
        },
        status: 'ACTIVE'
      }
    },
    include: {
      user: true
    }
  });

  const recipients = memberships.filter((membership) => membership.userId !== actorId);
  if (!recipients.length) return;

  await prisma.notification.createMany({
    data: recipients.map((membership) => ({
      userId: membership.userId,
      projectId,
      type,
      title,
      body,
      link
    }))
  });

  await Promise.all(
    recipients.map((membership) =>
      sendNotificationEmail({
        to: membership.user.email,
        subject: title,
        title,
        body,
        link: link ? `${process.env.APP_BASE_URL || ''}${link}` : null
      })
    )
  );
}
