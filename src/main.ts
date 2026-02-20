// Node 18: crypto no es global (sí en Node 19+). Necesario para @nestjs/typeorm.
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as typeof globalThis & { crypto: Crypto }).crypto = require('node:crypto') as Crypto;
}

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
  );

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
