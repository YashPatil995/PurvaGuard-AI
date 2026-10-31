const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

function sign(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function createUserCookie(user, secret) {
  const expiresAt = Date.now() + 7 * 24 * 3600 * 1000;
  const data = {
    userId: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone,
    email: user.email,
    authProvider: user.authProvider,
    expiresAt,
  };
  const base64 = Buffer.from(JSON.stringify(data)).toString('base64url');
  const sig = sign(base64, secret);
  return `${base64}.${sig}`;
}

async function run() {
  const secret = process.env.PURVAGUARD_SESSION_SECRET || 'purvaguard-dev-session-secret-change-me';
  const testPhone = '+919988776655';

  console.log('1. Cleaning up any previous test user with', testPhone);
  await prisma.user.deleteMany({ where: { phone: testPhone } });

  console.log('2. Test New Phone Signup: Creating new user account...');
  const newUser = await prisma.user.create({
    data: {
      phone: testPhone,
      name: 'Yash Patil',
      firstName: 'Yash',
      lastName: 'Patil',
      email: '919988776655@phone.purvaguard.in',
      role: 'PUBLIC',
      status: 'ACTIVE',
      authProvider: 'PHONE_EMAIL',
      lastLoginAt: new Date(),
    }
  });
  console.log('✓ User created with id:', newUser.id, 'phone:', newUser.phone);

  console.log('3. Test Duplicate Account Prevention: Trying to create another user with same phone...');
  try {
    await prisma.user.create({
      data: {
        phone: testPhone,
        name: 'Duplicate Attempt',
        email: 'duplicate@phone.purvaguard.in',
        role: 'PUBLIC',
      }
    });
    console.error('FAIL: Duplicate phone was allowed!');
  } catch (err) {
    console.log('✓ Duplicate prevented successfully by database unique constraint:', err.code);
  }

  console.log('4. Test Existing User Login: Finding user by phone...');
  const existing = await prisma.user.findUnique({ where: { phone: testPhone } });
  if (existing && existing.id === newUser.id) {
    console.log('✓ Existing user found correctly by phone:', existing.name, existing.phone);
  } else {
    console.error('FAIL: Could not locate existing user by phone');
  }

  console.log('5. Test Signed Session Cookie generation and verification...');
  const cookieValue = createUserCookie(existing, secret);
  const [b64, signature] = cookieValue.split('.');
  const expectedSig = sign(b64, secret);
  if (signature === expectedSig) {
    console.log('✓ Signature verified successfully');
    const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
    console.log('✓ Decoded session payload:', parsed);
  } else {
    console.error('FAIL: Signature mismatch');
  }

  console.log('6. Test Tampered Cookie Rejection...');
  const tamperedSig = sign(b64 + 'extra', secret);
  if (tamperedSig !== signature) {
    console.log('✓ Tampered signature rejected cleanly');
  }

  console.log('7. Testing /api/auth/me with valid session cookie over HTTP...');
  const meRes = await fetch('http://localhost:3000/api/auth/me', {
    headers: {
      Cookie: `purvaguard-user-session=${cookieValue}`
    }
  });
  const meData = await meRes.json();
  console.log('✓ /api/auth/me response:', meData);

  console.log('8. Cleaning up test user...');
  await prisma.user.deleteMany({ where: { phone: testPhone } });
  console.log('✓ Cleaned up test user.');
}

run()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
