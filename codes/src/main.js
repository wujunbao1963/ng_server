"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs = require("fs");
const app_module_1 = require("./app.module");
const ng_exception_filter_1 = require("./common/errors/ng-exception.filter");
function exists(p) {
    try {
        return fs.existsSync(p);
    }
    catch {
        return false;
    }
}
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        logger: ['error', 'warn', 'log'],
    });
    const adapterType = (app.getHttpAdapter && app.getHttpAdapter().getType && app.getHttpAdapter().getType()) || 'unknown';
    const distPublic = (0, path_1.join)(__dirname, 'public');
    const rootPublic = (0, path_1.join)(process.cwd(), 'public');
    const distIndex = (0, path_1.join)(distPublic, 'index.html');
    const rootIndex = (0, path_1.join)(rootPublic, 'index.html');
    console.log('[diag] adapterType=', adapterType);
    console.log('[diag] __dirname=', __dirname);
    console.log('[diag] cwd=', process.cwd());
    console.log('[diag] env PORT=', process.env.PORT);
    console.log('[diag] env RAILWAY_GIT_COMMIT_SHA=', process.env.RAILWAY_GIT_COMMIT_SHA);
    console.log('[diag] distPublic=', distPublic, 'indexExists=', exists(distIndex));
    console.log('[diag] rootPublic=', rootPublic, 'indexExists=', exists(rootIndex));
    const staticDir = exists(distIndex) ? distPublic : (exists(rootIndex) ? rootPublic : distPublic);
    console.log('[diag] staticDirChosen=', staticDir);
    app.useStaticAssets(staticDir);
    try {
        const http = app.getHttpAdapter();
        const inst = http.getInstance();
        if (inst && typeof inst.get === 'function') {
            inst.get('/__debug/static', (_req, res) => {
                res.json({
                    adapterType,
                    __dirname,
                    cwd: process.cwd(),
                    distPublic,
                    rootPublic,
                    distIndexExists: exists(distIndex),
                    rootIndexExists: exists(rootIndex),
                    staticDirChosen: staticDir,
                });
            });
        }
    }
    catch (e) {
        console.log('[diag] failed to register /__debug/static:', String(e));
    }
    app.useGlobalFilters(new ng_exception_filter_1.NgExceptionFilter());
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    const port = process.env.PORT ? Number(process.env.PORT) : 3000;
    await app.listen(port);
    console.log(`NG server listening on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map