import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, ApiError } from './_lib/http.js';
import { uploadProjectFile } from './_lib/storage.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

export default async function handler(request) {
  try {
    const user = await requireUser(request);

    if (request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/json')) {
      ensureTeamMember(user);
      const { projectId, invoiceId, status } = await request.json();
      await ensureProjectAccess(user, projectId);

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, projectId }
      });
      if (!invoice) throw new ApiError(404, 'Nie znaleziono faktury.');

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status,
          paidAt: status === 'PAID' ? new Date() : null
        }
      });

      await recordActivity({
        projectId,
        actorId: user.id,
        eventType: 'INVOICE_STATUS_CHANGED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        metadata: { status }
      });

      await notifyProjectMembers({
        projectId,
        actorId: user.id,
        type: 'INVOICE_AVAILABLE',
        title: 'Status faktury został zaktualizowany',
        body: `${user.name} zmienił status faktury ${invoice.invoiceNumber}.`,
        link: `/portal/project/?id=${projectId}#invoices`
      });

      return json({ ok: true, invoice: updatedInvoice });
    }

    ensureMethod(request, ['POST']);
    ensureTeamMember(user);
    const formData = await request.formData();
    const projectId = String(formData.get('projectId') || '');
    const invoiceNumber = String(formData.get('invoiceNumber') || '');
    const amountCents = Number.parseInt(String(formData.get('amountCents') || '0'), 10);
    const dueAt = String(formData.get('dueAt') || '');
    const status = String(formData.get('status') || 'ISSUED');
    const file = formData.get('file');

    if (!projectId || !invoiceNumber || !dueAt || !(file instanceof File)) {
      throw new ApiError(400, 'Brakuje danych faktury lub pliku PDF.');
    }

    if (file.type !== 'application/pdf') {
      throw new ApiError(400, 'Faktura musi być plikiem PDF.');
    }

    const project = await ensureProjectAccess(user, projectId);
    const upload = await uploadProjectFile({
      projectId,
      folder: 'INVOICES',
      file
    });

    const pdfFile = await prisma.fileAsset.create({
      data: {
        projectId,
        category: 'INVOICE',
        folder: 'INVOICES',
        displayName: file.name,
        blobUrl: upload.url,
        blobDownloadUrl: upload.downloadUrl,
        blobPath: upload.pathname,
        mimeType: file.type,
        sizeBytes: file.size,
        uploadedById: user.id
      }
    });

    const invoice = await prisma.invoice.create({
      data: {
        projectId,
        invoiceNumber,
        amountCents,
        dueAt: new Date(dueAt),
        status,
        pdfFileId: pdfFile.id,
        createdById: user.id
      }
    });

    await recordActivity({
      projectId,
      actorId: user.id,
      eventType: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      metadata: {
        invoiceNumber
      }
    });

    await notifyProjectMembers({
      projectId,
      actorId: user.id,
      type: 'INVOICE_AVAILABLE',
      title: 'Dodano nową fakturę',
      body: `${user.name} dodał fakturę ${invoiceNumber} do projektu ${project.name}.`,
      link: `/portal/project/?id=${projectId}#invoices`
    });

    return json({ ok: true, invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
