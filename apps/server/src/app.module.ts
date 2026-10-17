import { Module } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { AdminController, EventsController } from './analytics/analytics.controllers';
import { AnalyticsService } from './analytics/analytics.service';
import { CONFIG, loadConfig, type ServerConfig } from './config';
import { ContentService } from './content/content.service';
import { DATA_SOURCE, openDatabase } from './database/database';
import { ENTITLEMENTS, NoEntitlements } from './entitlements/entitlement.service';
import { GameGateway } from './game/game.gateway';
import { InMemoryRoomStore, InMemorySessionStore } from './game/room-store';
import { RoomService } from './game/room.service';
import { HealthController } from './health/health.controller';

/*
 * The game logic classes are plain TypeScript built with factories: no decorator metadata is
 * needed to construct or test them. Nest wires them to Socket.IO and HTTP.
 */
@Module({
  controllers: [HealthController, AdminController, EventsController],
  providers: [
    { provide: CONFIG, useFactory: (): ServerConfig => loadConfig() },
    {
      provide: DATA_SOURCE,
      inject: [CONFIG],
      useFactory: async (config: ServerConfig) =>
        config.databaseUrl ? openDatabase(config.databaseUrl) : null,
    },
    {
      provide: ContentService,
      inject: [DATA_SOURCE],
      useFactory: async (db: DataSource | null) => {
        const content = new ContentService(db);
        await content.load();
        return content;
      },
    },
    {
      provide: AnalyticsService,
      inject: [DATA_SOURCE],
      useFactory: (db: DataSource | null) => new AnalyticsService(db),
    },
    { provide: ENTITLEMENTS, useClass: NoEntitlements },
    {
      provide: RoomService,
      inject: [ContentService, AnalyticsService],
      useFactory: (content: ContentService, analytics: AnalyticsService) =>
        new RoomService({
          store: new InMemoryRoomStore(),
          sessions: new InMemorySessionStore(),
          content,
          analytics,
        }),
    },
    GameGateway,
  ],
})
export class AppModule {}
