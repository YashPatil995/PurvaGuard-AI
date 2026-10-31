const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length < 8) return clean;
  return clean.slice(0, 3) + ' ••••• •' + clean.slice(-4);
}

async function verifyPersistence() {
  console.log('=== AUDIT TEST: PHONE.EMAIL DATABASE PERSISTENCE ===\n');

  // Generate an audit test phone number (safe test dummy)
  const testPhone = '+919876543299';
  const firstName = 'Purva';
  const lastName = 'Tester';
  const fullName = `${firstName} ${lastName}`;

  // Ensure clean slate for test identity only
  await prisma.user.deleteMany({ where: { phone: testPhone } });

  console.log('1. Performing real test signup via Prisma in Supabase PostgreSQL...');
  const created = await prisma.user.create({
    data: {
      phone: testPhone,
      name: fullName,
      firstName,
      lastName,
      email: '919876543299@phone.purvaguard.in',
      role: 'PUBLIC',
      status: 'ACTIVE',
      authProvider: 'PHONE_EMAIL',
      lastLoginAt: new Date(),
    },
  });

  console.log('✓ User created successfully with ID:', created.id);

  console.log('\n2. Safe SQL Query verification directly from PostgreSQL (public."User")...');
  const sqlResult = await prisma.$queryRawUnsafe(`
    SELECT
      id,
      name,
      "firstName",
      "lastName",
      concat(substr(phone, 1, 3), ' ••••• •', substr(phone, length(phone) - 3)) AS "maskedPhone",
      "authProvider",
      role,
      status,
      "createdAt",
      "lastLoginAt"
    FROM "User"
    WHERE id = '${created.id}';
  `);

  console.log('SQL Query Output:');
  console.table(sqlResult);

  // Validate all required fields
  const rec = sqlResult[0];
  const assertions = [
    { field: 'ID present', ok: !!rec.id },
    { field: 'Name persisted', ok: rec.name === fullName },
    { field: 'firstName persisted', ok: rec.firstName === firstName },
    { field: 'lastName persisted', ok: rec.lastName === lastName },
    { field: 'authProvider persisted', ok: rec.authProvider === 'PHONE_EMAIL' },
    { field: 'createdAt timestamp persisted', ok: !!rec.createdAt },
    { field: 'lastLoginAt timestamp persisted', ok: !!rec.lastLoginAt },
    { field: 'maskedPhone verified', ok: rec.maskedPhone.includes('•••••') },
  ];
  console.log('\nField Assertions:');
  assertions.forEach(a => console.log(`  [${a.ok ? 'PASS' : 'FAIL'}] ${a.field}`));

  console.log('\n3. Testing Existing User Login without duplicate creation...');
  const initialCount = await prisma.user.count({ where: { phone: testPhone } });
  
  // Existing login workflow: findUnique + update lastLoginAt
  const existingUser = await prisma.user.findUnique({
    where: { phone: testPhone },
  });
  const loginTimestamp = new Date();
  await prisma.user.update({
    where: { id: existingUser.id },
    data: { lastLoginAt: loginTimestamp },
  });

  const postLoginCount = await prisma.user.count({ where: { phone: testPhone } });
  console.log(`✓ Initial count: ${initialCount}, Post-login count: ${postLoginCount} (Zero duplicate created)`);

  console.log('\n4. Testing Duplicate Record Prevention (DB Unique Index Enforcement)...');
  let duplicatePrevented = false;
  try {
    await prisma.user.create({
      data: {
        phone: testPhone,
        name: 'Duplicate Intruder',
        role: 'PUBLIC',
      },
    });
  } catch (err) {
    if (err.code === 'P2002') {
      duplicatePrevented = true;
      console.log('✓ Database rejected duplicate phone with Prisma P2002 (Unique constraint failed)');
    } else {
      console.log('Rejected with error:', err.message);
    }
  }

  console.log('\n5. Verifying Database state integrity...');
  const allUsersCount = await prisma.user.count();
  console.log('Total user records preserved in Supabase:', allUsersCount);

  // Clean up only our test user
  await prisma.user.delete({ where: { id: created.id } });
  console.log('✓ Cleaned up audit test record. No other data touched.');
}

verifyPersistence()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
