import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async createClass(data: { name: string; subject?: string; teacherId: string; schedule?: string }) {
    return this.prisma.class.create({
      data,
      include: { teacher: { select: { name: true } } },
    });
  }

  async updateClass(id: string, data: { name?: string; subject?: string; teacherId?: string; schedule?: string }) {
    return this.prisma.class.update({
      where: { id },
      data,
      include: { teacher: { select: { name: true } } },
    });
  }

  async getClasses(teacherId?: string) {
    const where = teacherId ? { teacherId } : {};
    return this.prisma.class.findMany({
      where,
      include: { teacher: { select: { name: true } } },
    });
  }

  async getStudentsInClass(classId: string) {
    const students = await this.prisma.student.findMany({
      where: { classId },
      include: { user: true, class: true },
    });
    return students.map(s => ({
      id: s.id,
      studentNumber: s.studentNumber || '',
      userId: s.userId,
      name: s.user.name,
      email: s.user.email,
      phone: s.user.phone || '',
      qrCode: s.qrCode,
      photo: s.photo,
      sex: s.sex,
      className: s.class?.name || null,
    }));
  }

  async addStudentToClass(classId: string, studentId: string) {
    // studentId could be either a Student record id or a User id
    // Try finding by Student id first, then by userId
    let existingStudent = await this.prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!existingStudent) {
      existingStudent = await this.prisma.student.findUnique({
        where: { userId: studentId },
      });
    }

    if (existingStudent) {
      // Backfill studentNumber if missing
      const updateData: any = { classId };
      if (!existingStudent.studentNumber) {
        updateData.studentNumber = await this.generateStudentNumber(classId);
      }
      return this.prisma.student.update({
        where: { id: existingStudent.id },
        data: updateData,
        include: { user: true, class: true },
      });
    } else {
      // Create new student record — studentId must be a userId
      const studentNumber = await this.generateStudentNumber(classId);
      return this.prisma.student.create({
        data: {
          userId: studentId,
          classId,
          studentNumber,
        },
        include: { user: true, class: true },
      });
    }
  }

  private async generateStudentNumber(classId: string): Promise<string> {
    const count = await this.prisma.student.count({ where: { classId } });
    return String(count + 1).padStart(4, '0');
  }

  async removeStudentFromClass(classId: string, studentId: string) {
    return this.prisma.student.update({
      where: { id: studentId },
      data: { classId: null },
      include: { user: true },
    });
  }

  async getAvailableStudents(classId: string) {
    const students = await this.prisma.student.findMany({
      where: {
        classId: null,
      },
      include: { user: true },
    });
    return students.map(s => ({
      id: s.id,
      name: s.user.name,
      email: s.user.email,
      qrCode: s.qrCode,
      photo: s.photo,
      sex: s.sex,
    }));
  }

  async deleteClass(id: string) {
    // Remove class association from students first
    await this.prisma.student.updateMany({
      where: { classId: id },
      data: { classId: null },
    });
    return this.prisma.class.delete({ where: { id } });
  }

  async bulkAddStudentsFromCsv(classId: string, fileBuffer: Buffer) {
    const content = fileBuffer.toString('utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      throw new BadRequestException('CSV file must have a header row and at least one data row');
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    // Support flexible column names
    const idIdx = header.findIndex(h => h === 'id');
    const nameIdx = header.findIndex(h => h === 'name');
    const sexIdx = header.findIndex(h => h === 'sex');
    const classIdx = header.findIndex(h => h === 'class');
    const contactIdx = header.findIndex(h => h.includes('mail') || h.includes('phone') || h.includes('email') || h.includes('contact'));
    const photoIdx = header.findIndex(h => h === 'photo');
    const passwordIdx = header.findIndex(h => h === 'password');

    if (nameIdx === -1) {
      throw new BadRequestException('CSV must have a "Name" column');
    }

    // Verify class exists
    const classRecord = await this.prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) {
      throw new BadRequestException('Class not found');
    }

    const results: { row: number; id: string; name: string; email: string; status: string; error?: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCsvLine(lines[i]);
      const studentId = idIdx !== -1 ? cols[idIdx]?.trim() : String(i).padStart(4, '0');
      const name = cols[nameIdx]?.trim();
      const rawSex = sexIdx !== -1 ? cols[sexIdx]?.trim() : '';
      const contact = contactIdx !== -1 ? cols[contactIdx]?.trim() : '';
      const photo = photoIdx !== -1 ? cols[photoIdx]?.trim() : '';
      const password = passwordIdx !== -1 ? cols[passwordIdx]?.trim() : '';

      if (!name) {
        results.push({ row: i + 1, id: studentId, name: '', email: '', status: 'skipped', error: 'Missing name' });
        continue;
      }

      // Map sex: support Khmer (ប្រុស=MALE, ស្រី=FEMALE) and English
      let sex: string | undefined;
      if (rawSex === 'ប្រុស' || rawSex.toUpperCase() === 'MALE' || rawSex.toUpperCase() === 'M') {
        sex = 'MALE';
      } else if (rawSex === 'ស្រី' || rawSex.toUpperCase() === 'FEMALE' || rawSex.toUpperCase() === 'F') {
        sex = 'FEMALE';
      }

      // Generate email: if contact looks like email use it, otherwise auto-generate
      let email: string;
      if (contact && contact.includes('@')) {
        email = contact;
      } else {
        email = `student${studentId}@school.local`;
      }

      // Use provided password or default
      const finalPassword = password || `student${studentId}`;

      try {
        // Check if user with this email already exists
        let user = await this.prisma.user.findUnique({ where: { email } });

        if (!user) {
          const hashedPassword = await bcrypt.hash(finalPassword, 10);
          user = await this.prisma.user.create({
            data: { email, password: hashedPassword, name, role: 'STUDENT', ...(contact ? { phone: contact } : {}) },
          });
        } else {
          // Update name and phone if user exists
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: { name, ...(contact ? { phone: contact } : {}) },
          });
        }

        // Check if student profile exists
        let student = await this.prisma.student.findUnique({ where: { userId: user.id } });

        const studentData: any = {
          classId,
          studentNumber: studentId,
          ...(sex ? { sex } : {}),
          ...(photo ? { photo } : {}),
        };

        if (!student) {
          student = await this.prisma.student.create({
            data: { userId: user.id, ...studentData },
          });
        } else {
          student = await this.prisma.student.update({
            where: { id: student.id },
            data: studentData,
          });
        }

        results.push({ row: i + 1, id: studentId, name, email, status: 'success' });
      } catch (err: any) {
        results.push({ row: i + 1, id: studentId, name, email, status: 'error', error: err.message || 'Unknown error' });
      }
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return { total: results.length, success: successCount, errors: errorCount, skipped: skippedCount, details: results };
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++;
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          result.push(current);
          current = '';
        } else {
          current += char;
        }
      }
    }
    result.push(current);
    return result;
  }

  async updateStudent(studentId: string, data: { name?: string; sex?: string; phone?: string; photo?: string }) {
    // Update student fields (sex, photo)
    const studentData: any = {};
    if (data.sex !== undefined) studentData.sex = data.sex;
    if (data.photo !== undefined) studentData.photo = data.photo;

    const student = await this.prisma.student.update({
      where: { id: studentId },
      data: studentData,
      include: { user: true, class: true },
    });

    // Update user fields (name, phone) if provided
    const userData: any = {};
    if (data.name) userData.name = data.name;
    if (data.phone !== undefined) userData.phone = data.phone;
    if (Object.keys(userData).length > 0) {
      await this.prisma.user.update({
        where: { id: student.userId },
        data: userData,
      });
    }

    const updatedUser = data.name
      ? await this.prisma.user.findUnique({ where: { id: student.userId } })
      : student.user;

    return {
      id: student.id,
      studentNumber: student.studentNumber || '',
      userId: student.userId,
      name: updatedUser?.name || student.user.name,
      email: updatedUser?.email || student.user.email,
      phone: updatedUser?.phone || student.user.phone || '',
      qrCode: student.qrCode,
      photo: student.photo,
      sex: student.sex,
      className: student.class?.name || null,
    };
  }
}