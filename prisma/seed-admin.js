import bcrypt from 'bcryptjs';
import { PrismaClient, Role, UserStatus } from '@prisma/client';

const prisma = new PrismaClient();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Brakuje wymaganej zmiennej środowiskowej: ${name}`);
  }
  return value;
}

async function main() {
  const email = requireEnv('BOOTSTRAP_ADMIN_EMAIL').toLowerCase();
  const name = requireEnv('BOOTSTRAP_ADMIN_NAME');
  const plainPassword = requireEnv('BOOTSTRAP_ADMIN_PASSWORD');
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const existing = await prisma.user.findUnique({
    where: { email }
  });

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        passwordHash,
        role: Role.ADMIN,
        status: UserStatus.ACTIVE
      }
    });
    console.log(`Zaktualizowano istniejące konto admina: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  console.log(`Utworzono konto admina: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
