import { prisma } from './db.js';

function hasValue(value) {
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value && String(value).trim());
}

export async function syncProjectTasks(projectId) {
  const [brief, files, tasks] = await Promise.all([
    prisma.projectBrief.findUnique({
      where: { projectId }
    }),
    prisma.fileAsset.findMany({
      where: {
        projectId,
        isCurrentVersion: true
      }
    }),
    prisma.task.findMany({
      where: { projectId }
    })
  ]);

  const flags = {
    upload_logo: files.some((file) => file.category === 'LOGO'),
    upload_brand_photos: files.some((file) => file.category === 'IMAGES'),
    provide_company_description: hasValue(brief?.businessDescription),
    provide_services_list: hasValue(brief?.servicesJson),
    confirm_contact_details: hasValue(brief?.contactEmail) || hasValue(brief?.contactPhone),
    complete_brief:
      hasValue(brief?.companyName) &&
      hasValue(brief?.businessDescription) &&
      hasValue(brief?.targetAudience) &&
      hasValue(brief?.servicesJson)
  };

  await Promise.all(
    tasks.map((task) => {
      if (!task.taskKey || typeof flags[task.taskKey] === 'undefined' || !task.autoCompletable) {
        return Promise.resolve();
      }

      const shouldBeCompleted = flags[task.taskKey];
      return prisma.task.update({
        where: { id: task.id },
        data: {
          status: shouldBeCompleted ? 'COMPLETED' : 'PENDING',
          completedAt: shouldBeCompleted ? task.completedAt || new Date() : null
        }
      });
    })
  );
}
