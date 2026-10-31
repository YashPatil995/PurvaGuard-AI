const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function auditSchema() {
  console.log('--- 1. COLUMNS IN public."User" ---');
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'User' AND table_schema = 'public'
    ORDER BY ordinal_position;
  `);
  console.table(cols);

  console.log('--- 2. CONSTRAINTS & INDEXES ON public."User" ---');
  const indexes = await prisma.$queryRawUnsafe(`
    SELECT indexname, indexdef
    FROM pg_indexes
    WHERE tablename = 'User' AND schemaname = 'public';
  `);
  console.table(indexes);
}

auditSchema()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
