const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Running safe migration on public."User"...');
  
  // 1. Make email nullable
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;`);
  console.log('✓ email column set to NULLABLE');

  // 2. Add phone column if not exists
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;`);
  console.log('✓ phone column added');

  // 3. Create unique index on phone
  await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");`);
  console.log('✓ User_phone_key unique index created');

  // 4. Add firstName, lastName, authProvider
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "authProvider" TEXT DEFAULT 'PHONE_EMAIL';`);
  console.log('✓ firstName, lastName, authProvider columns added');

  const cols = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'User' AND table_schema = 'public'
    ORDER BY ordinal_position
  `);
  console.table(cols);
}

main()
  .catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
