import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AttendanceGateway } from './attendance.gateway';
import { NotificationService } from '../notification/notification.service';
import { SessionConfigService } from '../session-config/session-config.service';

function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Get current time in Cambodia (GMT+7) */
function nowCambodia(): Date {
  const now = new Date();
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'] as const;

/** Check if a given date is a scheduled day-off for the class */
function isScheduledDayOff(schedule: string | null | undefined, dateUtc: Date): boolean {
  if (!schedule) return false;
  try {
    const parsed = JSON.parse(schedule);
    // Use Cambodia time to determine the day of week
    const cambodiaDate = new Date(dateUtc.getTime() + 7 * 60 * 60 * 1000);
    const dayName = DAY_NAMES[cambodiaDate.getUTCDay()];
    return parsed[dayName] === 'day-off';
  } catch {
    return false;
  }
}

@Injectable()
export class AttendanceService {
  constructor(
    private prisma: PrismaService,
    private attendanceGateway: AttendanceGateway,
    private notificationService: NotificationService,
    private sessionConfigService: SessionConfigService,
  ) {}

  async recordAttendance(
    studentId: string,
    classId: string,
    status: string,
    teacherId: string,
    date?: Date,
    session: number = 1,
    providedCheckInTime?: Date,
    latitude?: number,
    longitude?: number,
    location?: string,
  ) {
    const raw = date || new Date();
    const attendanceDate = toUTCMidnight(raw);
    // Use the actual scan time from the frontend if provided, otherwise fall back to now
    const checkInTime = providedCheckInTime || new Date();

    // Validate that student exists and is in the class
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, classId },
      include: { user: { select: { name: true } }, class: { select: { schedule: true } } },
    });

    if (!student) {
      throw new NotFoundException(`Student with ID ${studentId} not found in class ${classId}`);
    }

    // Auto-force DAY_OFF if today is a scheduled day-off for this class
    const classSchedule = (student as any).class?.schedule;
    if (isScheduledDayOff(classSchedule, attendanceDate) && status !== 'DAY_OFF') {
      status = 'DAY_OFF';
    }

    // Determine final status — auto-detect LATE if check-in >20 min after session start time
    let finalStatus = status;
    if (status === 'PRESENT') {
      try {
        const configs = await this.sessionConfigService.getConfigs(classId);
        const cfg = configs.find((c: any) => c.session === session);
        if (cfg) {
          const [h, m] = cfg.startTime.split(':').map(Number);
          const lateAfterMinutes = h * 60 + m + 20;
          const cambodiaCheckIn = new Date(checkInTime.getTime() + 7 * 60 * 60 * 1000);
          const checkInMinutes = cambodiaCheckIn.getUTCHours() * 60 + cambodiaCheckIn.getUTCMinutes();
          if (checkInMinutes > lateAfterMinutes) {
            finalStatus = 'LATE';
          }
        }
      } catch (err) {
        console.error('Late detection failed, defaulting to PRESENT:', err?.message || err);
      }
    }

    // For DAY_OFF: no checkInTime needed
    const isAttending = finalStatus === 'PRESENT' || finalStatus === 'LATE';

    // Check if a record already exists — preserve the first check-in time and its status
    const existingRecord = await this.prisma.attendance.findUnique({
      where: { studentId_classId_date_session: { studentId, classId, date: attendanceDate, session } },
    });
    const keepOriginal = existingRecord?.checkInTime && isAttending;

    // Use upsert to handle re-submissions
    const attendance = await this.prisma.attendance.upsert({
      where: {
        studentId_classId_date_session: {
          studentId,
          classId,
          date: attendanceDate,
          session,
        },
      },
      update: {
        status: keepOriginal ? existingRecord.status : finalStatus as any,
        markedById: teacherId,
        checkInTime: keepOriginal ? existingRecord.checkInTime : (isAttending ? checkInTime : null),
        ...(latitude != null ? { scanLatitude: latitude } : {}),
        ...(longitude != null ? { scanLongitude: longitude } : {}),
        ...(location ? { scanLocation: location } : {}),
      },
      create: {
        studentId,
        classId,
        date: attendanceDate,
        session,
        status: finalStatus as any,
        markedById: teacherId,
        checkInTime: isAttending ? checkInTime : null,
        ...(latitude != null ? { scanLatitude: latitude } : {}),
        ...(longitude != null ? { scanLongitude: longitude } : {}),
        ...(location ? { scanLocation: location } : {}),
      },
    });

    // Notify real-time
    const attendanceData = {
      studentId,
      studentName: student.user?.name ?? student.id,
      status: finalStatus,
      session,
      timestamp: attendance.timestamp,
    };
    this.attendanceGateway.notifyAttendanceUpdate(classId, attendanceData);

    // Send notification if absent
    if (finalStatus === 'ABSENT') {
      try {
        await this.notificationService.sendAbsenceNotification(studentId);
      } catch (err) {
        console.error('Failed to send absence notification:', err?.message || err);
      }
    }

    return attendance;
  }

  async recordBulkAttendance(
    records: Array<{ studentId: string; status: string; checkInTime?: Date }>,
    classId: string,
    teacherId: string,
    date?: Date,
    session: number = 1,
    latitude?: number,
    longitude?: number,
    location?: string,
  ) {
    const raw = date || new Date();
    const attendanceDate = toUTCMidnight(raw);

    const locData = {
      ...(latitude != null ? { scanLatitude: latitude } : {}),
      ...(longitude != null ? { scanLongitude: longitude } : {}),
      ...(location ? { scanLocation: location } : {}),
    };

    // Fetch all students in the class in one query
    const studentIds = records.map(r => r.studentId);
    const students = await this.prisma.student.findMany({
      where: { id: { in: studentIds }, classId },
      include: { user: { select: { name: true } }, class: { select: { schedule: true } } },
    });
    const studentMap = new Map(students.map(s => [s.id, s]));

    // Check if today is a scheduled day-off for this class
    const classSchedule = students.length > 0 ? (students[0] as any).class?.schedule : null;
    const isDayOff = isScheduledDayOff(classSchedule, attendanceDate);

    // Look up session config for late detection
    let lateAfterMinutes: number | null = null;
    try {
      const configs = await this.sessionConfigService.getConfigs(classId);
      const cfg = configs.find((c: any) => c.session === session);
      if (cfg) {
        const [h, m] = cfg.startTime.split(':').map(Number);
        lateAfterMinutes = h * 60 + m + 20;
      }
    } catch (err) {
      console.error('Failed to load session config for late detection:', err?.message || err);
    }

    const results: Array<{ studentId: string; success: boolean; error?: string }> = [];

    // Process all records in a single transaction
    await this.prisma.$transaction(async (tx) => {
      for (const record of records) {
        const student = studentMap.get(record.studentId);
        if (!student) {
          results.push({ studentId: record.studentId, success: false, error: 'Student not found in class' });
          continue;
        }

        let finalStatus = record.status;
        const checkInTime = record.checkInTime || new Date();

        // Auto-force DAY_OFF if today is a scheduled day-off for this class
        if (isDayOff && finalStatus !== 'DAY_OFF') {
          finalStatus = 'DAY_OFF';
        }

        // Auto-detect LATE based on session config start time
        if (record.status === 'PRESENT' && lateAfterMinutes !== null && record.checkInTime) {
          const cambodiaCheckIn = new Date(record.checkInTime.getTime() + 7 * 60 * 60 * 1000);
          const checkInMinutes = cambodiaCheckIn.getUTCHours() * 60 + cambodiaCheckIn.getUTCMinutes();
          if (checkInMinutes > lateAfterMinutes) {
            finalStatus = 'LATE';
          }
        }

        const isAttending = finalStatus === 'PRESENT' || finalStatus === 'LATE';

        // Check if a record already exists — preserve the first check-in time and its status
        const existingBulk = await tx.attendance.findUnique({
          where: { studentId_classId_date_session: { studentId: record.studentId, classId, date: attendanceDate, session } },
        });
        const keepOriginalBulk = existingBulk?.checkInTime && isAttending;

        await tx.attendance.upsert({
          where: {
            studentId_classId_date_session: {
              studentId: record.studentId,
              classId,
              date: attendanceDate,
              session,
            },
          },
          update: {
            status: keepOriginalBulk ? existingBulk.status : finalStatus as any,
            markedById: teacherId,
            checkInTime: keepOriginalBulk ? existingBulk.checkInTime : (isAttending ? checkInTime : null),
            ...locData,
          },
          create: {
            studentId: record.studentId,
            classId,
            date: attendanceDate,
            session,
            status: finalStatus as any,
            markedById: teacherId,
            checkInTime: isAttending ? checkInTime : null,
            ...locData,
          },
        });

        results.push({ studentId: record.studentId, success: true });

        // Notify real-time
        this.attendanceGateway.notifyAttendanceUpdate(classId, {
          studentId: record.studentId,
          studentName: student.user?.name ?? student.id,
          status: finalStatus,
          session,
          timestamp: new Date(),
        });
      }
    });

    // Send absence notifications outside the transaction (non-blocking)
    const absentStudentIds = records
      .filter(r => r.status === 'ABSENT')
      .map(r => r.studentId);
    for (const sid of absentStudentIds) {
      try {
        await this.notificationService.sendAbsenceNotification(sid);
      } catch (err) {
        console.error('Failed to send absence notification:', err?.message || err);
      }
    }

    return { total: records.length, success: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length, results };
  }

  async recordCheckOut(studentId: string, classId: string, session: number, date?: Date) {
    const raw = date || new Date();
    const attendanceDate = toUTCMidnight(raw);
    const checkOutTime = new Date();

    // CHECK_OUT sessions pair with the preceding CHECK_IN session's record
    let targetSession = session;
    try {
      const configs = await this.sessionConfigService.getConfigs(classId);
      const cfg = configs.find((c: any) => c.session === session);
      if (cfg && cfg.type === 'CHECK_OUT') {
        const preceding = configs
          .filter((c: any) => c.type === 'CHECK_IN' && c.session < session)
          .sort((a: any, b: any) => b.session - a.session);
        if (preceding.length > 0) {
          targetSession = preceding[0].session;
        }
      }
    } catch (err) {
      console.error('Failed to load session config for check-out pairing:', err?.message || err);
    }

    const existing = await this.prisma.attendance.findUnique({
      where: {
        studentId_classId_date_session: { studentId, classId, date: attendanceDate, session: targetSession },
      },
    });

    if (!existing) {
      throw new NotFoundException('No attendance record found for check-out');
    }

    return this.prisma.attendance.update({
      where: { id: existing.id },
      data: { checkOutTime },
    });
  }

  async recordStaffAttendance(
    userId: string,
    status: string,
    markedById: string,
    date?: Date,
    session: number = 1,
    providedCheckInTime?: Date,
    latitude?: number,
    longitude?: number,
    location?: string,
  ) {
    try {
      const raw = date || new Date();
      const attendanceDate = toUTCMidnight(raw);
      const checkInTime = providedCheckInTime || new Date();
      console.log('[staff-attendance/record] userId:', userId, 'status:', status, 'session:', session, 'date:', attendanceDate.toISOString());

      // Validate user exists and is staff
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) {
        throw new NotFoundException(`Staff member not found for userId: ${userId}`);
      }

      // Auto-detect LATE if check-in >20 min after session start time
      let finalStatus = status;
      if (status === 'PRESENT') {
        try {
          const configs = await this.sessionConfigService.getStaffDefaults();
          const cfg = configs.find((c: any) => c.session === session);
          if (cfg && cfg.type === 'CHECK_IN') {
            const [h, m] = cfg.startTime.split(':').map(Number);
            const lateAfterMinutes = h * 60 + m + 20;
            const cambodiaCheckIn = new Date(checkInTime.getTime() + 7 * 60 * 60 * 1000);
            const checkInMinutes = cambodiaCheckIn.getUTCHours() * 60 + cambodiaCheckIn.getUTCMinutes();
            if (checkInMinutes > lateAfterMinutes) {
              finalStatus = 'LATE';
            }
          }
        } catch (err) {
          console.error('Staff late detection failed, defaulting to PRESENT:', err?.message || err);
        }
      }

      const isAttending = finalStatus === 'PRESENT' || finalStatus === 'LATE';

      // Check if a record already exists — preserve the first check-in time and its status
      const existingStaff = await this.prisma.staffAttendance.findUnique({
        where: { userId_date_session: { userId, date: attendanceDate, session } },
      });
      const keepOriginalStaff = existingStaff?.checkInTime && isAttending;

      const record = await this.prisma.staffAttendance.upsert({
        where: {
          userId_date_session: { userId, date: attendanceDate, session },
        },
        update: {
          status: keepOriginalStaff ? existingStaff.status : finalStatus,
          markedById,
          checkInTime: keepOriginalStaff ? existingStaff.checkInTime : (isAttending ? checkInTime : null),
          ...(latitude != null ? { scanLatitude: latitude } : {}),
          ...(longitude != null ? { scanLongitude: longitude } : {}),
          ...(location ? { scanLocation: location } : {}),
        },
        create: {
          userId,
          date: attendanceDate,
          session,
          status: finalStatus,
          markedById,
          checkInTime: isAttending ? checkInTime : null,
          ...(latitude != null ? { scanLatitude: latitude } : {}),
          ...(longitude != null ? { scanLongitude: longitude } : {}),
          ...(location ? { scanLocation: location } : {}),
        },
      });

      return record;
    } catch (err) {
      console.error('[staff-attendance/record] ERROR:', err?.message || err, err?.stack);
      throw err;
    }
  }

  async recordStaffCheckOut(userId: string, session: number, date?: Date) {
    try {
      const raw = date || new Date();
      const attendanceDate = toUTCMidnight(raw);
      const checkOutTime = new Date();
      console.log('[staff-attendance/check-out] userId:', userId, 'session:', session, 'date:', attendanceDate.toISOString());

      // CHECK_OUT sessions pair with the preceding CHECK_IN session's record
      let targetSession = session;
      try {
        const configs = await this.sessionConfigService.getStaffDefaults();
        const cfg = configs.find((c: any) => c.session === session);
        if (cfg && cfg.type === 'CHECK_OUT') {
          const preceding = configs
            .filter((c: any) => c.type === 'CHECK_IN' && c.session < session)
            .sort((a: any, b: any) => b.session - a.session);
          if (preceding.length > 0) {
            targetSession = preceding[0].session;
          }
        }
      } catch (err) {
        console.error('Failed to load session config for staff check-out pairing:', err?.message || err);
      }

      const existing = await this.prisma.staffAttendance.findUnique({
        where: {
          userId_date_session: { userId, date: attendanceDate, session: targetSession },
        },
      });

      if (!existing) {
        throw new NotFoundException('No staff attendance record found for check-out');
      }

      return this.prisma.staffAttendance.update({
        where: { id: existing.id },
        data: { checkOutTime },
      });
    } catch (err) {
      console.error('[staff-attendance/check-out] ERROR:', err?.message || err, err?.stack);
      throw err;
    }
  }

  async updateAttendance(
    attendanceId: string,
    status: string,
    adminId: string,
  ) {
    const record = await this.prisma.attendance.findUnique({ where: { id: attendanceId } });
    if (!record) throw new NotFoundException('Attendance record not found');

    return this.prisma.attendance.update({
      where: { id: attendanceId },
      data: {
        status,
        markedById: adminId,
      },
    });
  }

  async updateStaffAttendance(
    staffAttendanceId: string,
    status: string,
    adminId: string,
  ) {
    const record = await this.prisma.staffAttendance.findUnique({ where: { id: staffAttendanceId } });
    if (!record) throw new NotFoundException('Staff attendance record not found');

    return this.prisma.staffAttendance.update({
      where: { id: staffAttendanceId },
      data: {
        status,
        markedById: adminId,
      },
    });
  }

  async getStudentAttendanceRecords(classId: string, date: string) {
    const d = new Date(date);
    const attendanceDate = toUTCMidnight(d);

    const students = await this.prisma.student.findMany({
      where: { classId },
      include: { user: { select: { name: true } } },
      orderBy: { studentNumber: 'asc' },
    });

    const attendances = await this.prisma.attendance.findMany({
      where: { classId, date: attendanceDate },
    });

    return students.map(s => {
      const records = attendances.filter(a => a.studentId === s.id);
      return {
        studentId: s.id,
        studentNumber: s.studentNumber || '',
        studentName: s.user?.name || '',
        sessions: [1, 2, 3, 4].map(session => {
          const rec = records.find(r => r.session === session);
          return {
            session,
            attendanceId: rec?.id || null,
            status: rec?.status || null,
            checkInTime: rec?.checkInTime?.toISOString() || null,
            checkOutTime: rec?.checkOutTime?.toISOString() || null,
          };
        }),
      };
    });
  }

  async getStaffAttendanceRecords(date: string) {
    const d = new Date(date);
    const attendanceDate = toUTCMidnight(d);

    const staff = await this.prisma.user.findMany({
      where: { role: { in: ['TEACHER', 'ADMIN'] } },
      orderBy: { name: 'asc' },
    });

    const attendances = await this.prisma.staffAttendance.findMany({
      where: { date: attendanceDate },
    });

    return staff.map(s => {
      const records = attendances.filter(a => a.userId === s.id);
      return {
        userId: s.id,
        staffName: s.name,
        role: s.role,
        sessions: [1, 2, 3, 4].map(session => {
          const rec = records.find(r => r.session === session);
          return {
            session,
            attendanceId: rec?.id || null,
            status: rec?.status || null,
            checkInTime: rec?.checkInTime?.toISOString() || null,
            checkOutTime: rec?.checkOutTime?.toISOString() || null,
          };
        }),
      };
    });
  }

  async createAttendanceRecord(
    studentId: string,
    classId: string,
    session: number,
    status: string,
    adminId: string,
    date: string,
  ) {
    const attendanceDate = toUTCMidnight(new Date(date));
    const isAttending = status === 'PRESENT' || status === 'LATE';

    return this.prisma.attendance.upsert({
      where: {
        studentId_classId_date_session: { studentId, classId, date: attendanceDate, session },
      },
      update: { status, markedById: adminId },
      create: {
        studentId,
        classId,
        date: attendanceDate,
        session,
        status,
        markedById: adminId,
        checkInTime: isAttending ? new Date() : null,
      },
    });
  }

  async createStaffAttendanceRecord(
    userId: string,
    session: number,
    status: string,
    adminId: string,
    date: string,
  ) {
    const attendanceDate = toUTCMidnight(new Date(date));
    const isAttending = status === 'PRESENT' || status === 'LATE';

    return this.prisma.staffAttendance.upsert({
      where: {
        userId_date_session: { userId, date: attendanceDate, session },
      },
      update: { status, markedById: adminId },
      create: {
        userId,
        date: attendanceDate,
        session,
        status,
        markedById: adminId,
        checkInTime: isAttending ? new Date() : null,
      },
    });
  }

  /**
   * Smart auto-scan: determines check-in or check-out from staff session configs
   * and correctly pairs CHECK_OUT with the preceding CHECK_IN session record.
   */
  async autoScanStaffAttendance(userId: string, markedById: string, latitude?: number, longitude?: number, location?: string) {
    try {
      const now = nowCambodia();
      const hhmm = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`;
      const attendanceDate = toUTCMidnight(new Date());

      const locData = {
        ...(latitude != null ? { scanLatitude: latitude } : {}),
        ...(longitude != null ? { scanLongitude: longitude } : {}),
        ...(location ? { scanLocation: location } : {}),
      };

      // Validate user is staff (any role except STUDENT and PARENT)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: { department: { select: { id: true, name: true, nameKh: true } } },
      });
      const nonStaffRoles = ['STUDENT', 'PARENT'];
      if (!user || nonStaffRoles.includes(user.role)) {
        throw new NotFoundException(`Staff member not found for userId: ${userId}`);
      }

      const userInfo = { userName: user.name, userPhoto: user.photo, userRole: user.role, userDepartment: user.department };

      // Get staff session configs
      const configs = await this.sessionConfigService.getStaffDefaults();
      const sorted = [...configs]
        .filter(c => c.startTime !== c.endTime) // skip disabled sessions
        .sort((a, b) => a.session - b.session);

      // Convert current time to minutes for comparison
      const nowMinutes = parseInt(hhmm.split(':')[0]) * 60 + parseInt(hhmm.split(':')[1]);
      const toMinutes = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };

      // Find current or nearest session
      let matched = sorted.find(c => hhmm >= c.startTime && hhmm <= c.endTime);
      if (!matched) {
        // If within 30min before a session's start → pick that upcoming session
        matched = sorted.find(c => {
          const startMin = toMinutes(c.startTime);
          return nowMinutes >= startMin - 30 && nowMinutes < startMin;
        });
      }
      if (!matched) {
        // Pick the most recently started session (latest startTime <= now)
        const past = sorted.filter(c => c.startTime <= hhmm);
        if (past.length > 0) {
          matched = past[past.length - 1];
        } else {
          // Before any session today → pick first upcoming
          matched = sorted[0] || configs[configs.length - 1];
        }
      }

      console.log('[staff/auto-scan] userId:', userId, 'time:', hhmm, 'matched session:', matched.session, 'type:', matched.type, 'lat:', latitude, 'lng:', longitude);

      if (matched.type === 'CHECK_IN') {
        // Create/upsert check-in record using this session number
        const checkInTime = new Date();

        // Auto-detect LATE: if check-in is >20 min after session start time
        let status = 'PRESENT';
        try {
          const [sh, sm] = matched.startTime.split(':').map(Number);
          const lateAfterMinutes = sh * 60 + sm + 20;
          const cambodiaCheckIn = new Date(checkInTime.getTime() + 7 * 60 * 60 * 1000);
          const checkInMinutes = cambodiaCheckIn.getUTCHours() * 60 + cambodiaCheckIn.getUTCMinutes();
          if (checkInMinutes > lateAfterMinutes) {
            status = 'LATE';
          }
        } catch (err) {
          console.error('Staff late detection failed, defaulting to PRESENT:', err?.message || err);
        }

        // Check if a record already exists — preserve the first check-in time and its status
        const existingAutoScan = await this.prisma.staffAttendance.findUnique({
          where: { userId_date_session: { userId, date: attendanceDate, session: matched.session } },
        });
        const keepOriginalAutoScan = existingAutoScan?.checkInTime;

        const record = await this.prisma.staffAttendance.upsert({
          where: { userId_date_session: { userId, date: attendanceDate, session: matched.session } },
          update: {
            status: keepOriginalAutoScan ? existingAutoScan.status : status,
            markedById,
            checkInTime: keepOriginalAutoScan ? existingAutoScan.checkInTime : checkInTime,
            ...locData,
          },
          create: { userId, date: attendanceDate, session: matched.session, status, markedById, checkInTime, ...locData },
        });
        return { ...record, action: 'CHECK_IN', sessionName: `Session ${matched.session}`, ...userInfo };
      } else {
        // CHECK_OUT: find the preceding CHECK_IN session to pair with
        const checkInConfigs = sorted.filter(c => c.type === 'CHECK_IN' && c.session < matched!.session);
        const pairedCheckIn = checkInConfigs[checkInConfigs.length - 1]; // nearest preceding CHECK_IN
        const targetSession = pairedCheckIn ? pairedCheckIn.session : matched.session;

        console.log('[staff/auto-scan] CHECK_OUT pairing: session', matched.session, '→ check-in session', targetSession);

        const existing = await this.prisma.staffAttendance.findUnique({
          where: { userId_date_session: { userId, date: attendanceDate, session: targetSession } },
        });

        if (existing) {
          const record = await this.prisma.staffAttendance.update({
            where: { id: existing.id },
            data: { checkOutTime: new Date(), ...locData },
          });
          return { ...record, action: 'CHECK_OUT', sessionName: `Session ${matched.session}`, ...userInfo };
        } else {
          // No prior check-in — create a record with both check-in (null) and check-out
          const record = await this.prisma.staffAttendance.create({
            data: { userId, date: attendanceDate, session: targetSession, status: 'PRESENT', markedById, checkOutTime: new Date(), ...locData },
          });
          return { ...record, action: 'CHECK_OUT', sessionName: `Session ${matched.session}`, ...userInfo };
        }
      }
    } catch (err) {
      console.error('[staff/auto-scan] ERROR:', err?.message || err, err?.stack);
      throw err;
    }
  }

  /** Get attendance records for the logged-in employee */
  async getEmployeeOwnRecords(userId: string, date?: string, month?: string) {
    const now = new Date();
    let dateStart: Date;
    let dateEnd: Date;

    if (date) {
      dateStart = new Date(date + 'T00:00:00.000Z');
      dateEnd = new Date(date + 'T23:59:59.999Z');
    } else if (month) {
      // month format: "2026-03"
      const [y, m] = month.split('-').map(Number);
      dateStart = new Date(Date.UTC(y, m - 1, 1));
      dateEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    } else {
      // Default: current month
      dateStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      dateEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999));
    }

    const records = await this.prisma.staffAttendance.findMany({
      where: {
        userId,
        date: { gte: dateStart, lte: dateEnd },
      },
      orderBy: [{ date: 'desc' }, { session: 'asc' }],
    });

    // Also get today's records for the dashboard summary
    const todayStart = toUTCMidnight(new Date());
    const todayRecords = await this.prisma.staffAttendance.findMany({
      where: { userId, date: todayStart },
      orderBy: { session: 'asc' },
    });

    // Compute summary
    const total = records.length;
    const present = records.filter(r => r.status === 'PRESENT').length;
    const late = records.filter(r => r.status === 'LATE').length;
    const absent = records.filter(r => r.status === 'ABSENT').length;

    return {
      records,
      todayRecords,
      summary: { total, present, late, absent },
    };
  }
}