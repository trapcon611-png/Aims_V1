import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // 2. Enable CORS (So your Frontend can talk to Backend)
  app.enableCors({
  origin: ['http://76.13.247.225:3000'],
  credentials: true,
});

  // 3. Setup Swagger (The API Documentation)
  const config = new DocumentBuilder()
    .setTitle('AIMS Institute ERP')
    .setDescription('The API for AIMS Coaching Institute (Exams + Finance + Admissions)')
    .setVersion('1.0')
    .addBearerAuth() // Adds the "Authorize" button for JWT tokens
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.enableCors()
  await app.listen(3001);
}
bootstrap();