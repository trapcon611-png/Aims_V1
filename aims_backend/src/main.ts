import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Enable Validation
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  // 2. Enable CORS (Bulletproof configuration for NGINX & Domains)
  app.enableCors({
    origin: true, // Dynamically allows all origins (IPs, domains, localhost without port restrictions)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  // 3. Increase Payload Limits (Prevents crashes when uploading massive Base64 images)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // 4. Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('AIMS Institute ERP')
    .setDescription('The API for AIMS Coaching Institute (Exams + Finance + Admissions)')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3001);
}
bootstrap();