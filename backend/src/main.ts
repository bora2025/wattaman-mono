import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['log', 'error', 'warn'],
  });

  // Security headers (X-Frame-Options, X-Content-Type-Options, HSTS, etc.)
  app.use(helmet());

  // Parse cookies (needed for HttpOnly token cookies)
  app.use(cookieParser());

  // Body size limits to prevent DoS via large payloads
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compress all responses
  app.use(compression());

  // Global input validation — strips unknown properties, rejects invalid data
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // CORS — use env var in production
  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:3000', 'http://localhost:3004'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.enableShutdownHooks();

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`API server running on port ${port}`);
}
bootstrap();