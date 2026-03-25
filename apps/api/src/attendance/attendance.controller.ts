import { Controller, Post, Patch, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Post('record')
  async recordAttendance(
    @Request() req,
    @Body() body: { studentId: string; classId: string; status: string; date?: string; session?: number; checkInTime?: string; latitude?: number; longitude?: number; location?: string },
  ) {
    try {
      const { studentId, classId, status, date, session, checkInTime, latitude, longitude, location } = body;
      const teacherId = req.user.userId;
      console.log('[attendance/record] body:', JSON.stringify({ studentId, classId, status, date, session, checkInTime: !!checkInTime, latitude, longitude }));
      const attendanceDate = date ? new Date(date) : undefined;
      const parsedCheckIn = checkInTime ? new Date(checkInTime) : undefined;
      return await this.attendanceService.recordAttendance(studentId, classId, status, teacherId, attendanceDate, session ?? 1, parsedCheckIn, latitude, longitude, location);
    } catch (err) {
      console.error('[attendance/record] ERROR:', err?.message || err, err?.stack);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  async recordBulkAttendance(
    @Request() req,
    @Body() body: {
      classId: string;
      date?: string;
      session?: number;
      records: Array<{ studentId: string; status: string; checkInTime?: string }>;
      latitude?: number;
      longitude?: number;
      location?: string;
    },
  ) {
    try {
      const { classId, date, session, records, latitude, longitude, location } = body;
      const teacherId = req.user.userId;
      const attendanceDate = date ? new Date(date) : undefined;
      const parsedRecords = records.map(r => ({
        studentId: r.studentId,
        status: r.status,
        checkInTime: r.checkInTime ? new Date(r.checkInTime) : undefined,
      }));
      return await this.attendanceService.recordBulkAttendance(parsedRecords, classId, teacherId, attendanceDate, session ?? 1, latitude, longitude, location);
    } catch (err) {
      console.error('[attendance/bulk] ERROR:', err?.message || err, err?.stack);
      throw err;
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-out')
  async recordCheckOut(
    @Request() req,
    @Body() body: { studentId: string; classId: string; session?: number; date?: string },
  ) {
    const { studentId, classId, session, date } = body;
    const attendanceDate = date ? new Date(date) : undefined;
    return this.attendanceService.recordCheckOut(studentId, classId, session ?? 1, attendanceDate);
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/record')
  async recordStaffAttendance(
    @Request() req,
    @Body() body: { userId: string; status: string; session?: number; date?: string; checkInTime?: string; latitude?: number; longitude?: number; location?: string },
  ) {
    const { userId, status, session, date, checkInTime, latitude, longitude, location } = body;
    const markedById = req.user.userId;
    const attendanceDate = date ? new Date(date) : undefined;
    const parsedCheckIn = checkInTime ? new Date(checkInTime) : undefined;
    return this.attendanceService.recordStaffAttendance(userId, status, markedById, attendanceDate, session ?? 1, parsedCheckIn, latitude, longitude, location);
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/check-out')
  async recordStaffCheckOut(
    @Request() req,
    @Body() body: { userId: string; session?: number; date?: string },
  ) {
    const { userId, session, date } = body;
    const attendanceDate = date ? new Date(date) : undefined;
    return this.attendanceService.recordStaffCheckOut(userId, session ?? 1, attendanceDate);
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/auto-scan')
  async autoScanStaffAttendance(
    @Request() req,
    @Body() body: { userId: string; latitude?: number; longitude?: number; location?: string },
  ) {
    const markedById = req.user.userId;
    return this.attendanceService.autoScanStaffAttendance(body.userId, markedById, body.latitude, body.longitude, body.location);
  }

  // ========== EMPLOYEE SELF-SCAN ==========

  @UseGuards(JwtAuthGuard)
  @Post('employee/self-scan')
  async employeeSelfScan(
    @Request() req,
    @Body() body: { qrData?: string; latitude?: number; longitude?: number; location?: string },
  ) {
    const userId = req.user.userId;
    return this.attendanceService.autoScanStaffAttendance(userId, userId, body.latitude, body.longitude, body.location);
  }

  @UseGuards(JwtAuthGuard)
  @Get('employee/my-records')
  async getMyAttendanceRecords(
    @Request() req,
    @Query('date') date?: string,
    @Query('month') month?: string,
  ) {
    const userId = req.user.userId;
    return this.attendanceService.getEmployeeOwnRecords(userId, date, month);
  }

  // ========== ADMIN EDIT ENDPOINTS ==========

  @UseGuards(JwtAuthGuard)
  @Get('records')
  async getStudentAttendanceRecords(
    @Query('classId') classId: string,
    @Query('date') date: string,
  ) {
    return this.attendanceService.getStudentAttendanceRecords(classId, date);
  }

  @UseGuards(JwtAuthGuard)
  @Get('staff/records')
  async getStaffAttendanceRecords(@Query('date') date: string) {
    return this.attendanceService.getStaffAttendanceRecords(date);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update')
  async updateAttendance(
    @Request() req,
    @Body() body: { attendanceId: string; status: string },
  ) {
    const adminId = req.user.userId;
    return this.attendanceService.updateAttendance(body.attendanceId, body.status, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('staff/update')
  async updateStaffAttendance(
    @Request() req,
    @Body() body: { staffAttendanceId: string; status: string },
  ) {
    const adminId = req.user.userId;
    return this.attendanceService.updateStaffAttendance(body.staffAttendanceId, body.status, adminId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create-record')
  async createAttendanceRecord(
    @Request() req,
    @Body() body: { studentId: string; classId: string; session: number; status: string; date: string },
  ) {
    const adminId = req.user.userId;
    return this.attendanceService.createAttendanceRecord(body.studentId, body.classId, body.session, body.status, adminId, body.date);
  }

  @UseGuards(JwtAuthGuard)
  @Post('staff/create-record')
  async createStaffAttendanceRecord(
    @Request() req,
    @Body() body: { userId: string; session: number; status: string; date: string },
  ) {
    const adminId = req.user.userId;
    return this.attendanceService.createStaffAttendanceRecord(body.userId, body.session, body.status, adminId, body.date);
  }
}