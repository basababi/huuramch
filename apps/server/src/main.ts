import 'reflect-metadata';
import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { AppModule } from './app.module';
import { loadConfig, type ServerConfig } from './config';

try {
  process.loadEnvFile();
} catch {
  // No .env file: the environment (or the defaults) apply.
}

/** Socket.IO tuned for phones: quick dead-connection detection, small payloads only. */
class GameIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly config: ServerConfig,
  ) {
    super(app);
  }

  override createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      cors: { origin: this.config.corsOrigins },
      pingInterval: 10_000,
      pingTimeout: 10_000,
      maxHttpBufferSize: 16 * 1024,
    });
  }
}

async function bootstrap(): Promise<void> {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.enableCors({ origin: config.corsOrigins });
  app.useWebSocketAdapter(new GameIoAdapter(app, config));
  app.enableShutdownHooks();
  await app.listen(config.port, config.host);
  console.warn(`ХУУРАМЧ server listening on http://${config.host}:${config.port}`);
}

bootstrap().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
