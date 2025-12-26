import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});

async function createInitialAdmin() {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      return;
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'admin@saveful.in';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123456';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    const adminPhone = process.env.ADMIN_PHONE || '+917008485825';

    const passwordHash = await bcrypt.hash(adminPassword, 12);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        phoneNumber: adminPhone,
        name: adminName,
        role: 'ADMIN',
        tokenSet: { create: {} },
      },
    });

    console.log('Initial admin created successfully!');
    console.log('Email:', adminEmail);
    console.log('Password:', adminPassword);
    console.log('Please change the password after first login!');
    
    return admin;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createInitialAdmin()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
