import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';

import { AppModule } from './app.module';
import { NgExceptionFilter } from './common/errors/ng-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // 静态文件：提供 /index.html
  // 运行时 __dirname 通常是 dist/，所以用 dist/.. -> 项目根的 public
  app.useStaticAssets(join(__dirname, '..', 'public'));

  // Contract-aligned error envelope.
  app.useGlobalFilters(new NgExceptionFilter());

  // DTO validation（如果你项目原本就启用就保留；没启用也不影响静态文件）
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`NG server listening on http://localhost:${port}`);
}

bootstrap();

