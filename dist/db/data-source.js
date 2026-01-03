"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
const path_1 = require("path");
function requireEnv(name) {
    const v = process.env[name];
    if (!v) {
        throw new Error(`${name} is required (set it in .env)`);
    }
    return v;
}
const sslEnabled = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const isDev = __filename.endsWith('.ts');
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: requireEnv('DATABASE_URL'),
    ssl: sslEnabled ? { rejectUnauthorized } : false,
    entities: isDev
        ? [(0, path_1.join)(__dirname, '..', '**', '*.entity.ts')]
        : [(0, path_1.join)(__dirname, '..', '**', '*.entity.js')],
    migrations: isDev
        ? [(0, path_1.join)(__dirname, '..', 'migrations', '*.ts')]
        : [(0, path_1.join)(__dirname, '..', 'migrations', '*.js')],
    migrationsTableName: 'ng_typeorm_migrations',
    synchronize: false,
    logging: ['error'],
});
//# sourceMappingURL=data-source.js.map