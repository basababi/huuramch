import { timingSafeEqual } from 'node:crypto';
import { LOCKED_PACK_IDS } from '@khuuramch/game-core';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Inject,
  Ip,
  NotFoundException,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { CONFIG, type ServerConfig } from '../config';
import { RateLimiter } from '../game/rate-limiter';
import { AnalyticsService } from './analytics.service';
import { computeStats, type Stats } from './stats';

function sameSecret(given: string | undefined, expected: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Tiny admin-only stats route (§8), protected by ADMIN_SECRET. Disabled when it is not set. */
@Controller('admin')
export class AdminController {
  constructor(
    @Inject(CONFIG) private readonly config: ServerConfig,
    @Inject(AnalyticsService) private readonly analytics: AnalyticsService,
  ) {}

  @Get('stats')
  async stats(
    @Headers('x-admin-secret') secret: string | undefined,
    @Query('days') daysParam?: string,
  ): Promise<Stats> {
    if (!this.config.adminSecret) throw new NotFoundException();
    if (!sameSecret(secret, this.config.adminSecret)) throw new UnauthorizedException();
    const days = Math.min(365, Math.max(1, Number(daysParam) || 30));
    const events = await this.analytics.since(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
    return computeStats(events, days);
  }
}

type PackEvent = { type?: unknown; packId?: unknown };

/** Anonymous interest in locked packs (§9): `pack_viewed_locked` and `pack_interest`. */
@Controller('api/events')
export class EventsController {
  private readonly limiter = new RateLimiter(20, 1);

  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Post()
  @HttpCode(204)
  record(@Body() body: PackEvent, @Ip() ip: string): void {
    // The IP is only a rate-limit key in memory; it is never stored (§8).
    if (!this.limiter.take(ip, Date.now())) throw new BadRequestException('rate limited');
    const type = body?.type;
    const packId = body?.packId;
    if (type !== 'pack_viewed_locked' && type !== 'pack_interest') throw new BadRequestException();
    if (!(LOCKED_PACK_IDS as readonly unknown[]).includes(packId)) throw new BadRequestException();
    this.analytics.record(type, { packId }, null);
  }
}
