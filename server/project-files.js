import slugify from 'slugify';
import { z } from 'zod';
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

const fileCategorySchema = z.enum([
  'LOGO',
  'IMAGES',
  'BRAND_ASSETS',
  'TEXT_CONTENT',
  'COMPANY_INFORMATION',
  'OTHER',
  'DELIVERABLE',
  'DOCUMENT',
  'INVOICE',
  'CONTRACT'
]);

const fileFolderSchema = z.enum(['MATERIALS', 'DESIGN_FILES', 'WEBSITE_ASSETS', 'DOCUMENTS', 'CONTRACTS', 'DELIVERABLES', 'INVOICES']);

const commentSchema = z.object({
  projectId: z.string().trim().min(1),
  fileId: z.string().trim().min(1),
  comment: z.string().trim().min(1).max(4000)
});

const uploadSchema = z.object({
  projectId: z.string().trim().min(1),
  category: fileCategorySchema.default('OTHER'),
  folder: fileFolderSchema.default('MATERIALS'),
  displayName: z.string().trim().max(160).optional().default(''),
  versionGroup: z.string().trim().max(160).optional().default(''),
  comment: z.string().trim().max(4000).optional().default(''),
  replacedFileId: z.string().trim().optional().default('')
});

export default async function handler(request) {
  try {
    if (request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/json')) {
      const user = await requireUser(request);
      const body = commentSchema.parse(await request.json());
      await ensureProjectAccess(user, body.projectId);

      const file = await prisma.fileAsset.findFirst({
        where: {
          id: body.fileId,
          projectId: body.projectId
        }
      });

      if (!file) throw new ApiError(404, 'Nie znaleziono pliku.');

      const fileComment = await prisma.fileComment.create({
        data: {
          fileId: body.fileId,
          authorId: user.id,
          body: body.comment
        }
      });

      await recordActivity({
        projectId: body.projectId,
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
    const body = uploadSchema.parse({
      projectId: String(formData.get('projectId') || ''),
      category: String(formData.get('category') || 'OTHER'),
      folder: String(formData.get('folder') || 'MATERIALS'),
      displayName: String(formData.get('displayName') || ''),
      versionGroup: String(formData.get('versionGroup') || ''),
      comment: String(formData.get('comment') || ''),
      replacedFileId: String(formData.get('replacedFileId') || '')
    });
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ApiError(400, 'Brakuje projektu lub pliku.');
    }

    const project = await ensureProjectAccess(user, body.projectId);
    const upload = await uploadProjectFile({
      projectId: body.projectId,
      folder: body.folder,
      file
    });

    let replacedFile = null;
    if (body.replacedFileId) {
      replacedFile = await prisma.fileAsset.findFirst({
        where: {
          id: body.replacedFileId,
          projectId: body.projectId
        }
      });

      if (!replacedFile) {
        throw new ApiError(404, 'Nie znaleziono pliku do podmiany.');
      }
    }

    const versionGroup = body.versionGroup || safeVersionGroup(body.category, body.displayName || file.name);
    const currentVersion = await prisma.fileAsset.findFirst({
      where: {
        projectId: body.projectId,
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
        projectId: body.projectId,
        category: body.category,
        folder: body.folder,
        displayName: body.displayName || file.name,
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

    if (body.comment) {
      await prisma.fileComment.create({
        data: {
          fileId: storedFile.id,
          authorId: user.id,
          body: body.comment
        }
      });
    }

    await syncProjectTasks(body.projectId);

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: currentVersion ? 'FILE_REPLACED' : 'FILE_UPLOADED',
      entityType: 'FILE',
      entityId: storedFile.id,
      metadata: {
        category: body.category,
        displayName: storedFile.displayName,
        version: storedFile.versionNumber
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'FILE_UPLOADED',
      title: 'Nowy plik w projekcie',
      body: `${user.name} dodał plik "${storedFile.displayName}" w projekcie ${project.name}.`,
      link: `/portal/project/?id=${body.projectId}#materials`
    });

    return json({ ok: true, file: storedFile });
  } catch (error) {
    return handleApiError(error);
  }
}
