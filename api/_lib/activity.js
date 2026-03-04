import { prisma } from './db.js';

export async function recordActivity({ projectId, actorId, eventType, entityType, entityId = null, metadata = null }) {
  return prisma.activityLog.create({
    data: {
      projectId,
      actorId,
      eventType,
      entityType,
      entityId,
      metadata
    }
  });
}
