const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function check() {
  try {
    const users = await prisma.user.findMany();
    const classes = await prisma.class.findMany();
    const students = await prisma.student.findMany();

    console.log('Users:', users.length);
    console.log('Classes:', classes.length);
    console.log('Students:', students.length);

    if (classes.length > 0) {
      console.log('Class IDs:', classes.map(c => c.id));
    }
    if (students.length > 0) {
      console.log('Student classIds:', students.map(s => s.classId));
    }

    // Test the API query
    if (classes.length > 0) {
      const classId = classes[0].id;
      console.log('Testing getStudentsInClass for classId:', classId);
      const studentsInClass = await prisma.student.findMany({
        where: { classId: classId },
        include: { user: true },
      });
      console.log('Students in first class:', studentsInClass.length);
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();