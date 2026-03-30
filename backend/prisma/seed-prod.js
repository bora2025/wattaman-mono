const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function seed() {
  // Only seed if no admin user exists
  const existing = await prisma.user.findUnique({ where: { email: 'admin@test.com' } });
  if (existing) {
    console.log('Admin user already exists, skipping seed');
    return;
  }

  // Create default departments
  const departments = [
    { name: 'Human Resources', nameKh: 'ធនធានមនុស្ស', description: 'HR & personnel management' },
    { name: 'Finance', nameKh: 'ហិរញ្ញវត្ថុ', description: 'Accounting & finance' },
    { name: 'Administration', nameKh: 'រដ្ឋបាល', description: 'Administration & operations' },
    { name: 'Security', nameKh: 'សន្តិសុខ', description: 'Security & safety' },
    { name: 'Academics', nameKh: 'សិក្សា', description: 'Academic affairs' },
    { name: 'IT', nameKh: 'ព័ត៌មានវិទ្យា', description: 'Information technology' },
    { name: 'Maintenance', nameKh: 'ថែទាំ', description: 'Facilities & maintenance' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    });
  }
  console.log('Departments seeded');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: await bcrypt.hash('password', 10),
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin user created:', admin.email);
}

seed()
  .then(() => process.exit(0))
  .catch((e) => { console.error('Seed error:', e.message); process.exit(0); });
