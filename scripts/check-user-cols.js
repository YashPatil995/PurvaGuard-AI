const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'User' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.log('Columns of User table:');
  console.table(cols);
}

main().finally(() => prisma.$disconnect());
