import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true, // Auto-transform payload to DTO instance
      transformOptions: {
        enableImplicitConversion: true, // Auto-convert types
      },
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
