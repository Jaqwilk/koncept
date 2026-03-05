import { z } from 'zod';
import { requireUser } from './_lib/auth.js';
import { prisma } from './_lib/db.js';
import { ensureProjectAccess, ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, ApiError } from './_lib/http.js';
import { uploadProjectFile } from './_lib/storage.js';
import { recordActivity } from './_lib/activity.js';
import { notifyProjectMembers } from './_lib/notifications.js';

const invoiceStatusSchema = z.enum(['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'CANCELLED']);

const statusUpdateSchema = z.object({
  projectId: z.string().trim().min(1),
  invoiceId: z.string().trim().min(1),
  status: invoiceStatusSchema
});

const invoiceCreateSchema = z.object({
  projectId: z.string().trim().min(1),
  invoiceNumber: z.string().trim().min(1).max(80),
  amountCents: z.number().int().min(0),
  dueAt: z.string().trim().min(1),
  status: invoiceStatusSchema.default('ISSUED')
});

export default async function handler(request) {
  try {
    const user = await requireUser(request);

    if (request.method === 'POST' && (request.headers.get('content-type') || '').includes('application/json')) {
      ensureTeamMember(user);
      const body = statusUpdateSchema.parse(await request.json());
      await ensureProjectAccess(user, body.projectId);

      const invoice = await prisma.invoice.findFirst({
        where: { id: body.invoiceId, projectId: body.projectId }
      });
      if (!invoice) throw new ApiError(404, 'Nie znaleziono faktury.');

      const updatedInvoice = await prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: body.status,
          paidAt: body.status === 'PAID' ? new Date() : null
        }
      });

      await recordActivity({
        projectId: body.projectId,
        actorId: user.id,
        eventType: 'INVOICE_STATUS_CHANGED',
        entityType: 'INVOICE',
        entityId: invoice.id,
        metadata: { status: body.status }
      });

      await notifyProjectMembers({
        projectId: body.projectId,
        actorId: user.id,
        type: 'INVOICE_AVAILABLE',
        title: 'Status faktury został zaktualizowany',
        body: `${user.name} zmienił status faktury ${invoice.invoiceNumber}.`,
        link: `/portal/project/?id=${body.projectId}#invoices`
      });

      return json({ ok: true, invoice: updatedInvoice });
    }

    ensureMethod(request, ['POST']);
    ensureTeamMember(user);
    const formData = await request.formData();
    const rawDueAt = String(formData.get('dueAt') || '');
    const dueAtDate = rawDueAt ? new Date(rawDueAt) : null;
    if (!dueAtDate || Number.isNaN(dueAtDate.getTime())) {
      throw new ApiError(400, 'Nieprawidłowa data terminu płatności.');
    }

    const body = invoiceCreateSchema.parse({
      projectId: String(formData.get('projectId') || ''),
      invoiceNumber: String(formData.get('invoiceNumber') || ''),
      amountCents: Number.parseInt(String(formData.get('amountCents') || '0'), 10),
      dueAt: rawDueAt,
      status: String(formData.get('status') || 'ISSUED')
    });
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ApiError(400, 'Brakuje danych faktury lub pliku PDF.');
    }

    if (file.type !== 'application/pdf') {
      throw new ApiError(400, 'Faktura musi być plikiem PDF.');
    }

    const project = await ensureProjectAccess(user, body.projectId);
    const upload = await uploadProjectFile({
      projectId: body.projectId,
      folder: 'INVOICES',
      file
    });

    const pdfFile = await prisma.fileAsset.create({
      data: {
        projectId: body.projectId,
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
        projectId: body.projectId,
        invoiceNumber: body.invoiceNumber,
        amountCents: body.amountCents,
        dueAt: dueAtDate,
        status: body.status,
        pdfFileId: pdfFile.id,
        createdById: user.id
      }
    });

    await recordActivity({
      projectId: body.projectId,
      actorId: user.id,
      eventType: 'INVOICE_CREATED',
      entityType: 'INVOICE',
      entityId: invoice.id,
      metadata: {
        invoiceNumber: body.invoiceNumber
      }
    });

    await notifyProjectMembers({
      projectId: body.projectId,
      actorId: user.id,
      type: 'INVOICE_AVAILABLE',
      title: 'Dodano nową fakturę',
      body: `${user.name} dodał fakturę ${body.invoiceNumber} do projektu ${project.name}.`,
      link: `/portal/project/?id=${body.projectId}#invoices`
    });

    return json({ ok: true, invoice });
  } catch (error) {
    return handleApiError(error);
  }
}
