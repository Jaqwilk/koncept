import { z } from 'zod';
import slugify from 'slugify';
import { requireUser } from './_lib/auth.js';
import { DEFAULT_THREAD_TITLE } from './_lib/constants.js';
import { prisma } from './_lib/db.js';
import { ensureTeamMember } from './_lib/permissions.js';
import { ensureMethod, handleApiError, json, readJson, ApiError } from './_lib/http.js';
import { recordActivity } from './_lib/activity.js';

const schema = z.object({
  name: z.string().trim().min(3),
  description: z.string().trim().min(10),
  estimatedCompletionDate: z.string().datetime().optional(),
  clientEmail: z.string().email().optional(),
  clientName: z.string().trim().min(2).optional()
});

async function createDefaultProjectData(projectId) {
  await prisma.task.createMany({
    data: [
      { projectId, taskKey: 'upload_logo', title: 'Prześlij logo', description: 'Dodaj logo w pliku wektorowym lub PNG.', sortOrder: 1 },
      { projectId, taskKey: 'upload_brand_photos', title: 'Prześlij zdjęcia marki', description: 'Dodaj zdjęcia produktu, zespołu lub wnętrza.', sortOrder: 2 },
      { projectId, taskKey: 'provide_company_description', title: 'Uzupełnij opis firmy', description: 'Opisz czym zajmuje się firma i dla kogo działa.', sortOrder: 3 },
      { projectId, taskKey: 'provide_services_list', title: 'Potwierdź listę usług', description: 'Uzupełnij ofertę, którą pokazujemy na stronie.', sortOrder: 4 },
      { projectId, taskKey: 'confirm_contact_details', title: 'Potwierdź dane kontaktowe', description: 'Zweryfikuj e-mail, telefon i adres.', sortOrder: 5 },
      { projectId, taskKey: 'complete_brief', title: 'Wypełnij brief', description: 'Odpowiedz na pytania projektowe.', sortOrder: 6 }
    ]
  });

  await prisma.projectStage.createMany({
    data: [
      { projectId, name: 'Zbieranie materiałów', description: 'Logo, treści, zdjęcia i dane firmy.', sortOrder: 1, status: 'ACTIVE' },
      { projectId, name: 'Wireframe', description: 'Układ treści i architektura informacji.', sortOrder: 2 },
      { projectId, name: 'UI design', description: 'Projekt wizualny i widoki mobilne.', sortOrder: 3 },
      { projectId, name: 'Development', description: 'Implementacja i integracje.', sortOrder: 4 },
      { projectId, name: 'Testy i launch', description: 'QA, poprawki i publikacja.', sortOrder: 5 }
    ]
  });

  await prisma.milestone.createMany({
    data: [
      { projectId, name: 'Projekt utworzony', description: 'Kickoff i konfiguracja procesu.', sortOrder: 1, status: 'COMPLETED', completedDate: new Date() },
      { projectId, name: 'Materiały otrzymane', description: 'Klient dostarczył komplet wejściowy.', sortOrder: 2 },
      { projectId, name: 'Projekt graficzny ukończony', description: 'Gotowy kierunek wizualny.', sortOrder: 3 },
      { projectId, name: 'Development ukończony', description: 'Wdrożona wersja do review.', sortOrder: 4 },
      { projectId, name: 'Strona opublikowana', description: 'Launch na domenie produkcyjnej.', sortOrder: 5 }
    ]
  });

  await prisma.messageThread.create({
    data: {
      projectId,
      title: DEFAULT_THREAD_TITLE
    }
  });
}

export default async function handler(request) {
  try {
    if (request.method === 'GET') {
      const user = await requireUser(request);
      ensureTeamMember(user);
      const projects = await prisma.project.findMany({
        orderBy: { updatedAt: 'desc' }
      });
      return json({ projects });
    }

    ensureMethod(request, ['POST']);
    const actor = await requireUser(request);
    ensureTeamMember(actor);

    const body = schema.parse(await readJson(request));
    const slugBase = slugify(body.name, { lower: true, strict: true, locale: 'pl' });

    const existing = await prisma.project.findFirst({
      where: {
        slug: {
          startsWith: slugBase
        }
      },
      select: { slug: true }
    });

    const slug = existing ? `${slugBase}-${Date.now().toString().slice(-4)}` : slugBase;

    const project = await prisma.project.create({
      data: {
        name: body.name,
        slug,
        description: body.description,
        estimatedCompletionDate: body.estimatedCompletionDate ? new Date(body.estimatedCompletionDate) : null
      }
    });

    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: actor.id,
        membershipRole: 'OWNER'
      }
    });

    await createDefaultProjectData(project.id);

    if (body.clientEmail) {
      const existingClient = await prisma.user.findUnique({
        where: { email: body.clientEmail.toLowerCase() }
      });

      if (existingClient) {
        await prisma.projectMember.upsert({
          where: {
            projectId_userId: {
              projectId: project.id,
              userId: existingClient.id
            }
          },
          create: {
            projectId: project.id,
            userId: existingClient.id,
            membershipRole: 'CLIENT_CONTACT'
          },
          update: {
            membershipRole: 'CLIENT_CONTACT'
          }
        });
      }
    }

    await recordActivity({
      projectId: project.id,
      actorId: actor.id,
      eventType: 'PROJECT_CREATED',
      entityType: 'PROJECT',
      entityId: project.id
    });

    return json({
      ok: true,
      project
    });
  } catch (error) {
    return handleApiError(error);
  }
}
