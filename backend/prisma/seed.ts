// ADR-0006: primeiro admin criado pelo seed, senha só via variável obrigatória.
// Sem SEED_ADMIN_EMAIL/SEED_ADMIN_PASSWORD, falha nomeando a que falta — nunca
// um default inseguro. Idempotente: se já existir um usuário ADMIN, não faz nada.
import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  const missing = [
    !email && 'SEED_ADMIN_EMAIL',
    !password && 'SEED_ADMIN_PASSWORD',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Seed do admin inicial exige: ${missing.join(', ')}`);
  }

  const existingAdmin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  if (existingAdmin) {
    console.log('Já existe um usuário ADMIN — seed não faz nada.');
    return;
  }

  const passwordHash = await argon2.hash(password as string);
  const admin = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: (email as string).toLowerCase(),
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`Admin inicial criado: ${admin.email}`);
}

main()
  .catch((err) => {
    console.error(err.message ?? err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
