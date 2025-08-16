import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: { origin: process.env.CORS_ORIGIN?.split(',') || '*' },
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
  const config = new DocumentBuilder()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .setTitle('PM API')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .setVersion('1.0')
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .addBearerAuth()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    .build();
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const doc = SwaggerModule.createDocument(app, config);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  SwaggerModule.setup('docs', app, doc);

  await app.listen(process.env.PORT || 3000);
  console.log(`Server running on ${await app.getUrl()}`);
}
bootstrap();

