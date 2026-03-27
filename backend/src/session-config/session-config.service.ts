import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

const DEFAULT_CONFIGS = [
  { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:15' },
  { session: 2, type: 'CHECK_OUT', startTime: '12:00', endTime: '12:15' },
  { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:15' },
  { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:15' },
];

const STAFF_DEFAULT_CONFIGS = [
  { session: 1, type: 'CHECK_IN', startTime: '07:00', endTime: '07:30' },
  { session: 2, type: 'CHECK_OUT', startTime: '11:30', endTime: '12:00' },
  { session: 3, type: 'CHECK_IN', startTime: '13:00', endTime: '13:30' },
  { session: 4, type: 'CHECK_OUT', startTime: '17:00', endTime: '17:30' },
];

@Injectable()
export class SessionConfigService {
  constructor(private prisma: PrismaService) {}

  /** Deduplicate configs by session number — keeps the last (most recent) entry per session */
  private dedup(configs: any[]): any[] {
    const map = new Map<number, any>();
    for (const c of configs) map.set(c.session, c);
    return Array.from(map.values()).sort((a, b) => a.session - b.session);
  }

  /** Get session configs for a class (falls back to global defaults) */
  async getConfigs(classId?: string): Promise<any[]> {
    // Try class-specific first
    if (classId) {
      const classConfigs = await this.prisma.sessionConfig.findMany({
        where: { classId, scope: 'CLASS' },
        orderBy: { session: 'asc' },
      });
      if (classConfigs.length > 0) return this.dedup(classConfigs);
    }

    // Fall back to global (classId = null)
    const globalConfigs = await this.prisma.sessionConfig.findMany({
      where: { classId: null, scope: 'CLASS' },
      orderBy: { session: 'asc' },
    });

    if (globalConfigs.length > 0) return this.dedup(globalConfigs);

    // If nothing in DB, return hardcoded defaults
    return DEFAULT_CONFIGS.map((d, i) => ({ id: `default-${i}`, classId: null, scope: 'CLASS', ...d }));
  }

  /** Get global defaults only */
  async getGlobalDefaults(): Promise<any[]> {
    const configs = await this.prisma.sessionConfig.findMany({
      where: { classId: null, scope: 'CLASS' },
      orderBy: { session: 'asc' },
    });
    if (configs.length > 0) return this.dedup(configs);
    return DEFAULT_CONFIGS.map((d, i) => ({ id: `default-${i}`, classId: null, scope: 'CLASS', ...d }));
  }

  /** Get staff session defaults */
  async getStaffDefaults(): Promise<any[]> {
    const configs = await this.prisma.sessionConfig.findMany({
      where: { classId: null, scope: 'STAFF' },
      orderBy: { session: 'asc' },
    });
    if (configs.length > 0) return this.dedup(configs);
    return STAFF_DEFAULT_CONFIGS.map((d, i) => ({ id: `staff-default-${i}`, classId: null, scope: 'STAFF', ...d }));
  }

  /** Upsert session config (global or per-class) */
  async upsertConfig(data: {
    classId?: string | null;
    session: number;
    type: string;
    startTime: string;
    endTime: string;
    scope?: string;
  }) {
    const classId = data.classId || null;
    const scope = data.scope || 'CLASS';

    // Prisma compound unique doesn't support null in where, so use findFirst + update/create
    const existing = await this.prisma.sessionConfig.findFirst({
      where: { classId, session: data.session, scope },
    });

    if (existing) {
      return this.prisma.sessionConfig.update({
        where: { id: existing.id },
        data: {
          type: data.type,
          startTime: data.startTime,
          endTime: data.endTime,
        },
      });
    }

    return this.prisma.sessionConfig.create({
      data: {
        classId,
        session: data.session,
        type: data.type,
        startTime: data.startTime,
        endTime: data.endTime,
        scope,
      },
    });
  }

  /** Save all 4 sessions at once — delete old rows first to prevent duplicates */
  async saveAllConfigs(
    configs: Array<{ session: number; type: string; startTime: string; endTime: string }>,
    classId?: string | null,
    scope?: string,
  ) {
    const cid = classId || null;
    const sc = scope || 'CLASS';

    // Delete all existing configs for this classId + scope to avoid duplicates
    await this.prisma.sessionConfig.deleteMany({
      where: { classId: cid, scope: sc },
    });

    // Create fresh rows
    const results = [];
    for (const cfg of configs) {
      results.push(await this.prisma.sessionConfig.create({
        data: {
          classId: cid,
          session: cfg.session,
          type: cfg.type,
          startTime: cfg.startTime,
          endTime: cfg.endTime,
          scope: sc,
        },
      }));
    }
    return results;
  }

  /** Delete class-specific overrides (revert to global) */
  async deleteClassConfigs(classId: string) {
    return this.prisma.sessionConfig.deleteMany({ where: { classId } });
  }
}
