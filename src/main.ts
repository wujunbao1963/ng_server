import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as fs from 'fs';

import { AppModule } from './app.module';
import { NgExceptionFilter } from './common/errors/ng-exception.filter';

function exists(p: string) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // ---- DIAGNOSTICS (safe) ----
  const adapterType =
    (app.getHttpAdapter && app.getHttpAdapter().getType && app.getHttpAdapter().getType()) || 'unknown';

  const distPublic = join(__dirname, 'public');          // typically dist/public
  const rootPublic = join(process.cwd(), 'public');      // repo root/public (if present in runtime)

  const distIndex = join(distPublic, 'index.html');
  const rootIndex = join(rootPublic, 'index.html');

  // Railway sometimes provides these; safe to log.
  console.log('[diag] adapterType=', adapterType);
  console.log('[diag] __dirname=', __dirname);
  console.log('[diag] cwd=', process.cwd());
  console.log('[diag] env PORT=', process.env.PORT);
  console.log('[diag] env RAILWAY_GIT_COMMIT_SHA=', process.env.RAILWAY_GIT_COMMIT_SHA);
  console.log('[diag] distPublic=', distPublic, 'indexExists=', exists(distIndex));
  console.log('[diag] rootPublic=', rootPublic, 'indexExists=', exists(rootIndex));

  // Choose the first directory that has index.html
  const staticDir = exists(distIndex) ? distPublic : (exists(rootIndex) ? rootPublic : distPublic);
  console.log('[diag] staticDirChosen=', staticDir);

  // Serve /index.html from chosen static directory
  app.useStaticAssets(staticDir);

  // ========================================
  // 证据上传静态文件服务
  // ========================================
  const uploadDir = process.env.STATIC_UPLOAD_ROOT || './uploads';
  const uploadPath = uploadDir.startsWith('/') ? uploadDir : join(process.cwd(), uploadDir);
  
  // 确保上传目录存在
  if (!exists(uploadPath)) {
    try {
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log('[uploads] Created upload directory:', uploadPath);
    } catch (e) {
      console.log('[uploads] Failed to create upload directory:', String(e));
    }
  }
  
  // 提供 /uploads/ 路径访问证据文件
  app.useStaticAssets(uploadPath, {
    prefix: '/uploads/',
  });
  console.log('[uploads] Evidence files served from:', uploadPath, '-> /uploads/');

  // Optional: debug endpoint to view what server sees (no secrets)
  try {
    const http = app.getHttpAdapter();
    const inst: any = http.getInstance();
    if (inst && typeof inst.get === 'function') {
      inst.get('/__debug/static', (_req: any, res: any) => {
        res.json({
          adapterType,
          __dirname,
          cwd: process.cwd(),
          distPublic,
          rootPublic,
          distIndexExists: exists(distIndex),
          rootIndexExists: exists(rootIndex),
          staticDirChosen: staticDir,
          uploadDir: uploadPath,
        });
      });
    }
  } catch (e) {
    console.log('[diag] failed to register /__debug/static:', String(e));
  }
  // ---- END DIAGNOSTICS ----

  app.useGlobalFilters(new NgExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  console.log(`NG server listening on port ${port}`);
}

bootstrap();
