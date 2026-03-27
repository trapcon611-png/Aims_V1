import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // 2. Enable CORS (Allow local dev AND production IP)
  app.enableCors({
    origin: ['http://localhost:3000', 'http://76.13.247.225:3000'],
    credentials: true,
  });

  // 3. Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('AIMS Institute ERP')
    .setDescription('The API for AIMS Coaching Institute (Exams + Finance + Admissions)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // REMOVED the duplicate app.enableCors() here
  await app.listen(3001);
}
bootstrap();