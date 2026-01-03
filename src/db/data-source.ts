import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is required (set it in .env)`);
  }
  return v;
}

const sslEnabled = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

/**
 * 检测运行环境：
 * - 开发环境 (ts-node): __filename 以 .ts 结尾
 * - 生产环境 (node): __filename 以 .js 结尾
 */
const isDev = __filename.endsWith('.ts');

/**
 * TypeORM CLI DataSource.
 * 
 * 开发环境: npm run db:migrate (使用 ts-node，指向 src/*.ts)
 * 生产环境: npm run migration:run (使用 node，指向 dist/*.js)
 */
export default new DataSource({
  type: 'postgres',
  url: requireEnv('DATABASE_URL'),
  ssl: sslEnabled ? { rejectUnauthorized } : false,

  // 根据环境选择正确的路径
  entities: isDev
    ? [join(__dirname, '..', '**', '*.entity.ts')]
    : [join(__dirname, '..', '**', '*.entity.js')],
  migrations: isDev
    ? [join(__dirname, '..', 'migrations', '*.ts')]
    : [join(__dirname, '..', 'migrations', '*.js')],

  migrationsTableName: 'ng_typeorm_migrations',
  synchronize: false,
  logging: ['error'],
});
