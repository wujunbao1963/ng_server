"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const typeorm_1 = require("typeorm");
function requireEnv(name) {
    const v = process.env[name];
    if (!v) {
        throw new Error(`${name} is required (set it in .env)`);
    }
    return v;
}
const sslEnabled = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';
exports.default = new typeorm_1.DataSource({
    type: 'postgres',
    url: requireEnv('DATABASE_URL'),
    ssl: sslEnabled ? { rejectUnauthorized } : false,
    entities: ['src/**/*.entity.ts'],
    migrations: ['src/migrations/*.ts'],
    migrationsTableName: 'ng_typeorm_migrations',
    synchronize: false,
    logging: ['error'],
});
//# sourceMappingURL=data-source.js.map