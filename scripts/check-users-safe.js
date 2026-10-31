const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function maskPhone(phone) {
  if (!phone) return '';
  const clean = phone.trim();
  if (clean.length < 8) return clean;
  return clean.slice(0, 3) + ' ••••• •' + clean.slice(-4);
}

async function checkCurrentUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      role: true,
      authProvider: true,
      createdAt: true,
      lastLoginAt: true,
    }
  });

  console.log('Current total users in Supabase User table:', users.length);
  users.forEach(u => {
    console.log({
      id: u.id,
      name: u.name,
      firstName: u.firstName,
      lastName: u.lastName,
      maskedPhone: maskPhone(u.phone),
      role: u.role,
      authProvider: u.authProvider,
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    });
  });
}

checkCurrentUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
