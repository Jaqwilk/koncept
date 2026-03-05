import bcrypt from 'bcryptjs';
import { PrismaClient, Role, UserStatus, ProjectStatus, TaskStatus, WorkflowStatus, FeedbackStatus, ApprovalStatus, InvoiceStatus, NotificationType, FileCategory, FileFolder, ProjectMembershipRole } from '@prisma/client';

const prisma = new PrismaClient();
const isProductionLike = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

if (isProductionLike && process.env.ALLOW_DEMO_SEED !== 'true') {
  throw new Error('Demo seed jest zablokowany w środowisku produkcyjnym. Użyj: npm run seed:admin');
}

async function createTask(projectId, sortOrder, taskKey, title, description, status = TaskStatus.PENDING) {
  return prisma.task.create({
    data: {
      projectId,
      sortOrder,
      taskKey,
      title,
      description,
      status,
      autoCompletable: true
    }
  });
}

async function main() {
  await prisma.messageAttachment.deleteMany();
  await prisma.message.deleteMany();
  await prisma.messageThread.deleteMany();
  await prisma.fileComment.deleteMany();
  await prisma.feedbackItem.deleteMany();
  await prisma.approvalRequest.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.fileAsset.deleteMany();
  await prisma.task.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.projectStage.deleteMany();
  await prisma.projectBrief.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.invite.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('demo12345', 12);

  const [admin, team, client] = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Natan Smogor',
        email: 'admin@koncept.pl',
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE
      }
    }),
    prisma.user.create({
      data: {
        name: 'Marta Studio',
        email: 'team@koncept.pl',
        passwordHash,
        role: Role.TEAM_MEMBER,
        status: UserStatus.ACTIVE
      }
    }),
    prisma.user.create({
      data: {
        name: 'Anna Vitals',
        email: 'client@koncept.pl',
        passwordHash,
        role: Role.CLIENT,
        status: UserStatus.ACTIVE
      }
    })
  ]);

  const project = await prisma.project.create({
    data: {
      name: 'Vitals Studio',
      slug: 'vitals-studio',
      description: 'Nowa strona internetowa i portal rezerwacji dla studia wellness.',
      status: ProjectStatus.DEVELOPMENT_PHASE,
      progressPercent: 64,
      estimatedCompletionDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 18)
    }
  });

  await prisma.projectMember.createMany({
    data: [
      {
        projectId: project.id,
        userId: admin.id,
        membershipRole: ProjectMembershipRole.OWNER
      },
      {
        projectId: project.id,
        userId: team.id,
        membershipRole: ProjectMembershipRole.COLLABORATOR
      },
      {
        projectId: project.id,
        userId: client.id,
        membershipRole: ProjectMembershipRole.CLIENT_CONTACT
      }
    ]
  });

  await prisma.projectBrief.create({
    data: {
      projectId: project.id,
      companyName: 'Vitals Studio',
      businessDescription: 'Studio wellness oferujące masaże, terapie manualne i konsultacje zdrowotne.',
      targetAudience: 'Kobiety i mężczyźni 28-55, mieszkający w dużym mieście, szukający usług premium.',
      servicesJson: ['Masaże', 'Terapie manualne', 'Pakiety abonamentowe'],
      desiredPagesJson: ['Strona główna', 'Usługi', 'Cennik', 'Rezerwacje', 'Kontakt'],
      colorPreferences: 'Jasne tła, akcenty błękitu, minimalizm premium.',
      inspirationJson: ['https://example.com/inspiration-1', 'https://example.com/inspiration-2'],
      contactName: 'Anna Vitals',
      contactEmail: 'biuro@vitalsstudio.pl',
      contactPhone: '+48 600 700 800',
      businessAddress: 'Warszawa, ul. Wellness 12',
      additionalNotes: 'Priorytetem są rezerwacje online i łatwe zarządzanie ofertą.',
      updatedById: client.id
    }
  });

  const tasks = await Promise.all([
    createTask(project.id, 1, 'upload_logo', 'Prześlij logo', 'Dodaj plik logo w wysokiej jakości.', TaskStatus.COMPLETED),
    createTask(project.id, 2, 'upload_brand_photos', 'Prześlij zdjęcia marki', 'Dodaj min. 10 zdjęć wnętrza i zespołu.', TaskStatus.PENDING),
    createTask(project.id, 3, 'provide_company_description', 'Dodaj opis firmy', 'Przygotuj podstawowy opis działalności.', TaskStatus.COMPLETED),
    createTask(project.id, 4, 'provide_services_list', 'Potwierdź listę usług', 'Sprawdź i uzupełnij listę usług.', TaskStatus.COMPLETED),
    createTask(project.id, 5, 'confirm_contact_details', 'Potwierdź dane kontaktowe', 'Zweryfikuj telefon, e-mail i adres.', TaskStatus.COMPLETED),
    createTask(project.id, 6, 'complete_brief', 'Uzupełnij brief', 'Odpowiedz na pytania projektowe.', TaskStatus.COMPLETED)
  ]);

  await prisma.projectStage.createMany({
    data: [
      {
        projectId: project.id,
        name: 'Zbieranie materiałów',
        description: 'Logo, zdjęcia, treści i dane firmy.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11),
        sortOrder: 1
      },
      {
        projectId: project.id,
        name: 'Wireframe',
        description: 'Architektura informacji i układ stron.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7),
        sortOrder: 2
      },
      {
        projectId: project.id,
        name: 'UI design',
        description: 'Projekt wizualny i responsywne widoki.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
        sortOrder: 3
      },
      {
        projectId: project.id,
        name: 'Development',
        description: 'Implementacja strony, CMS i formularzy.',
        status: WorkflowStatus.ACTIVE,
        sortOrder: 4
      },
      {
        projectId: project.id,
        name: 'Testy i launch',
        description: 'QA, poprawki i publikacja.',
        status: WorkflowStatus.PENDING,
        sortOrder: 5
      }
    ]
  });

  await prisma.milestone.createMany({
    data: [
      {
        projectId: project.id,
        name: 'Projekt utworzony',
        description: 'Konfiguracja projektu i kickoff.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15),
        sortOrder: 1
      },
      {
        projectId: project.id,
        name: 'Materiały przyjęte',
        description: 'Otrzymano komplet podstawowych danych.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11),
        sortOrder: 2
      },
      {
        projectId: project.id,
        name: 'Projekt graficzny ukończony',
        description: 'Klient zaakceptował główny kierunek wizualny.',
        status: WorkflowStatus.COMPLETED,
        completedDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
        sortOrder: 3
      },
      {
        projectId: project.id,
        name: 'Development w toku',
        description: 'Trwa wdrożenie strony i integracji.',
        status: WorkflowStatus.ACTIVE,
        sortOrder: 4
      },
      {
        projectId: project.id,
        name: 'Publikacja',
        description: 'Wdrożenie na domenę i launch.',
        status: WorkflowStatus.PENDING,
        sortOrder: 5
      }
    ]
  });

  const logoFile = await prisma.fileAsset.create({
    data: {
      projectId: project.id,
      category: FileCategory.LOGO,
      folder: FileFolder.MATERIALS,
      displayName: 'vitals-logo.svg',
      mimeType: 'image/svg+xml',
      sizeBytes: 18234,
      versionGroup: 'logo-main',
      versionNumber: 1,
      uploadedById: client.id
    }
  });

  const designFile = await prisma.fileAsset.create({
    data: {
      projectId: project.id,
      category: FileCategory.DELIVERABLE,
      folder: FileFolder.DELIVERABLES,
      displayName: 'homepage-design-v2.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 234567,
      versionGroup: 'homepage-design',
      versionNumber: 2,
      uploadedById: team.id
    }
  });

  await prisma.fileComment.create({
    data: {
      fileId: designFile.id,
      authorId: team.id,
      body: 'Wersja po poprawkach z sesji feedbackowej.'
    }
  });

  const thread = await prisma.messageThread.create({
    data: {
      projectId: project.id,
      title: 'Główny wątek projektu',
      createdById: admin.id
    }
  });

  await prisma.message.createMany({
    data: [
      {
        threadId: thread.id,
        authorId: team.id,
        body: 'Makiety mobilne są gotowe. Dzisiaj kończę wdrożenie sekcji usług.',
        isInternal: false
      },
      {
        threadId: thread.id,
        authorId: client.id,
        body: 'Dodałam nowe zdjęcia wnętrza. Daj znać, czy potrzeba jeszcze ujęć zespołu.',
        isInternal: false
      }
    ]
  });

  await prisma.feedbackItem.create({
    data: {
      projectId: project.id,
      title: 'Sekcja cennika',
      body: 'Poproszę o większy kontrast przy przyciskach i mniej tekstu pomocniczego.',
      status: FeedbackStatus.IN_PROGRESS,
      deliverableLabel: 'Homepage v2',
      attachmentFileId: designFile.id,
      createdById: client.id
    }
  });

  await prisma.approvalRequest.create({
    data: {
      projectId: project.id,
      title: 'Akceptacja projektu strony głównej',
      description: 'Potrzebujemy zielonego światła do wdrożenia finalnej wersji UI.',
      versionLabel: 'Homepage v2',
      status: ApprovalStatus.PENDING,
      requestedById: team.id
    }
  });

  await prisma.invoice.create({
    data: {
      projectId: project.id,
      invoiceNumber: 'FV/03/2026/004',
      amountCents: 450000,
      currency: 'PLN',
      status: InvoiceStatus.ISSUED,
      dueAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      createdById: admin.id
    }
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: client.id,
        projectId: project.id,
        type: NotificationType.APPROVAL_REQUIRED,
        title: 'Czeka akceptacja projektu',
        body: 'Sprawdź nową wersję projektu strony głównej.',
        link: `/portal/project/?id=${project.id}#approvals`
      },
      {
        userId: team.id,
        projectId: project.id,
        type: NotificationType.FILE_UPLOADED,
        title: 'Klient dodał logo',
        body: 'Anna Vitals przesłała plik logo.',
        link: `/portal/project/?id=${project.id}#materials`
      }
    ]
  });

  await prisma.activityLog.createMany({
    data: [
      {
        projectId: project.id,
        actorId: client.id,
        eventType: 'FILE_UPLOADED',
        entityType: 'FILE',
        entityId: logoFile.id,
        metadata: { category: 'LOGO', displayName: 'vitals-logo.svg' }
      },
      {
        projectId: project.id,
        actorId: team.id,
        eventType: 'MESSAGE_SENT',
        entityType: 'MESSAGE_THREAD',
        entityId: thread.id,
        metadata: { title: thread.title }
      },
      {
        projectId: project.id,
        actorId: admin.id,
        eventType: 'INVOICE_CREATED',
        entityType: 'INVOICE',
        metadata: { invoiceNumber: 'FV/03/2026/004' }
      }
    ]
  });

  console.log('Seed complete.');
  console.log('Admin:', admin.email, 'password: demo12345');
  console.log('Team:', team.email, 'password: demo12345');
  console.log('Client:', client.email, 'password: demo12345');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
