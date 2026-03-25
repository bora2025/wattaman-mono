import { Controller, Get, Post, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { SessionConfigService } from './session-config.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('session-config')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SessionConfigController {
  constructor(private sessionConfigService: SessionConfigService) {}

  @Get()
  async getConfigs(@Query('classId') classId?: string) {
    return this.sessionConfigService.getConfigs(classId || undefined);
  }

  @Get('global')
  async getGlobalDefaults() {
    return this.sessionConfigService.getGlobalDefaults();
  }

  @Get('staff')
  async getStaffDefaults() {
    return this.sessionConfigService.getStaffDefaults();
  }

  /** Save all 4 session configs (global or per-class) */
  @Post()
  async saveConfigs(
    @Body()
    body: {
      classId?: string | null;
      scope?: string;
      configs: Array<{ session: number; type: string; startTime: string; endTime: string }>;
    },
  ) {
    return this.sessionConfigService.saveAllConfigs(body.configs, body.classId, body.scope);
  }

  /** Delete class-specific overrides */
  @Delete()
  async deleteClassConfigs(@Query('classId') classId: string) {
    return this.sessionConfigService.deleteClassConfigs(classId);
  }
}
