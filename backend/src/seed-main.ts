import { createPrismaClient } from './db.js';
import { seedDemoData } from './seed.js';

const databaseUrl = process.env['DATABASE_URL'];
if (databaseUrl === undefined || databaseUrl === '') {
  console.error('Missing required environment variable DATABASE_URL');
  process.exit(1);
}

const prisma = createPrismaClient(databaseUrl);
try {
  await seedDemoData(prisma, process.env);
  console.log('Demo data seeded');
} catch (err) {
  console.error(err instanceof Error ? err.message : 'Seeding failed');
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
