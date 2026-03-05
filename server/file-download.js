import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess } from './_lib/permissions.js';
import { getSearchParam, ensureMethod, handleApiError, ApiError } from './_lib/http.js';
import { readPrivateBlob } from './_lib/storage.js';

export default async function handler(request) {
  try {
    ensureMethod(request, ['GET']);
    const user = await requireUser(request);
    const fileId = getSearchParam(request, 'fileId');
    if (!fileId) throw new ApiError(400, 'Brakuje fileId.');

    const file = await prisma.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!file || !file.projectId || !file.blobPath) {
      throw new ApiError(404, 'Nie znaleziono pliku.');
    }

    await ensureProjectAccess(user, file.projectId);
    const blob = await readPrivateBlob(file.blobPath);

    const stream = blob.body;
    if (!stream) {
      throw new ApiError(404, 'Plik nie jest dostępny w storage.');
    }

    const inlineMimeTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf']);
    const disposition = inlineMimeTypes.has(file.mimeType) ? 'inline' : 'attachment';

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': `${disposition}; filename="${file.displayName}"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (error) {
    return handleApiError(error);
  }
}
