import { get, put } from '@vercel/blob';
import { DEFAULT_MAX_UPLOAD_MB } from './constants.js';
import { ApiError } from './http.js';

function normalizeFileName(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
}

export function assertFileSize(file) {
  const maxBytes = DEFAULT_MAX_UPLOAD_MB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new ApiError(400, `Plik jest zbyt duży. Limit to ${DEFAULT_MAX_UPLOAD_MB} MB.`);
  }
}

export function assertAllowedMimeType(file, { allowPdf = true } = {}) {
  const allowedTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif',
    'image/svg+xml',
    'text/plain',
    'text/csv',
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/zip'
  ]);

  const mimeType = file.type || 'application/octet-stream';
  const isAllowed = (allowPdf && mimeType === 'application/pdf') || allowedTypes.has(mimeType);

  if (!isAllowed) {
    throw new ApiError(400, 'Ten typ pliku nie jest obsługiwany.');
  }
}

export async function uploadProjectFile({ projectId, folder, file }) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(500, 'Brakuje BLOB_READ_WRITE_TOKEN.');
  }

  assertFileSize(file);
  assertAllowedMimeType(file);

  const timestamp = Date.now();
  const pathname = `projects/${projectId}/${folder.toLowerCase()}/${timestamp}-${normalizeFileName(file.name)}`;
  const blob = await put(pathname, file, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });

  return {
    url: blob.url,
    downloadUrl: blob.downloadUrl || null,
    pathname: blob.pathname
  };
}

export async function readPrivateBlob(pathname) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    throw new ApiError(500, 'Brakuje BLOB_READ_WRITE_TOKEN.');
  }

  return get(pathname, {
    access: 'private',
    token: process.env.BLOB_READ_WRITE_TOKEN
  });
}
