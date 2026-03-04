import slugify from 'slugify';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, ApiError } from './_lib/http.js';
import { uploadProjectFile } from './_lib/storage.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';
import { syncProjectTasks } from './_lib/tasks.js';

function safeVersionGroup(category, displayName) {
  return slugify(`${category}-${displayName}`, { lower: true, strict: true });
}

export default async function handler(request) {
  try {
    if (request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/json')) {
      const user = await requireUser(request);
      const { projectId, fileId, comment } = await request.json();
      await ensureProjectAccess(user, projectId);

      const file = await prisma.fileAsset.findFirst({
        where: {
          id: fileId,
          projectId
        }
      });

      if (!file) throw new ApiError(404, 'Nie znaleziono pliku.');

      const fileComment = await prisma.fileComment.create({
        data: {
          fileId,
          authorId: user.id,
          body: String(comment || '').trim()
        }
      });

      await recordActivity({
        projectId,
        actorId: user.id,
        eventType: 'FILE_COMMENT_ADDED',
        entityType: 'FILE_COMMENT',
        entityId: fileComment.id
      });

      return json({ ok: true, comment: fileComment });
    }

    ensureMethod(request, ['POST']);
    const user = await requireUser(request);
    const formData = await request.formData();
    const projectId = String(formData.get('projectId') || '');
    const category = String(formData.get('category') || 'OTHER');
    const folder = String(formData.get('folder') || 'MATERIALS');
    const displayName = String(formData.get('displayName') || '');
    const versionGroupInput = String(formData.get('versionGroup') || '');
    const comment = String(formData.get('comment') || '');
    const replacedFileId = String(formData.get('replacedFileId') || '');
    const file = formData.get('file');

    if (!projectId || !(file instanceof File)) {
      throw new ApiError(400, 'Brakuje projektu lub pliku.');
    }

    const project = await ensureProjectAccess(user, projectId);
    const upload = await uploadProjectFile({
      projectId,
      folder,
      file
    });

    let replacedFile = null;
    if (replacedFileId) {
      replacedFile = await prisma.fileAsset.findFirst({
        where: {
          id: replacedFileId,
          projectId
        }
      });
    }

    const versionGroup = versionGroupInput || safeVersionGroup(category, displayName || file.name);
    const currentVersion = await prisma.fileAsset.findFirst({
      where: {
        projectId,
        versionGroup,
        isCurrentVersion: true
      },
      orderBy: { versionNumber: 'desc' }
    });

    if (currentVersion) {
      await prisma.fileAsset.update({
        where: { id: currentVersion.id },
        data: {
          isCurrentVersion: false
        }
      });
    }

    const storedFile = await prisma.fileAsset.create({
      data: {
        projectId,
        category,
        folder,
        displayName: displayName || file.name,
        blobUrl: upload.url,
        blobDownloadUrl: upload.downloadUrl,
        blobPath: upload.pathname,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        versionGroup,
        versionNumber: currentVersion ? currentVersion.versionNumber + 1 : 1,
        replacedFileId: replacedFile?.id || currentVersion?.id || null,
        uploadedById: user.id
      }
    });

    if (comment) {
      await prisma.fileComment.create({
        data: {
          fileId: storedFile.id,
          authorId: user.id,
          body: comment
        }
      });
    }

    await syncProjectTasks(projectId);

    await recordActivity({
      projectId,
      actorId: user.id,
      eventType: currentVersion ? 'FILE_REPLACED' : 'FILE_UPLOADED',
      entityType: 'FILE',
      entityId: storedFile.id,
      metadata: {
        category,
        displayName: storedFile.displayName,
        version: storedFile.versionNumber
      }
    });

    await notifyProjectMembers({
      projectId,
      actorId: user.id,
      type: 'FILE_UPLOADED',
      title: 'Nowy plik w projekcie',
      body: `${user.name} dodał plik "${storedFile.displayName}" w projekcie ${project.name}.`,
      link: `/portal/project/?id=${projectId}#materials`
    });

    return json({ ok: true, file: storedFile });
  } catch (error) {
    return handleApiError(error);
  }
}
