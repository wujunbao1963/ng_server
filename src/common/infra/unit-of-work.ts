import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * UnitOfWork - 事务管理 helper
 *
 * 封装 TypeORM 的事务管理，确保：
 * 1. 多个数据库操作在同一事务中执行
 * 2. 失败时自动回滚
 * 3. 支持嵌套事务检测
 */

export type TransactionWork<T> = (manager: EntityManager) => Promise<T>;

/**
 * 在事务中执行工作
 *
 * @example
 * ```typescript
 * const result = await runInTransaction(dataSource, async (manager) => {
 *   await manager.getRepository(Entity1).save(entity1);
 *   await manager.getRepository(Entity2).save(entity2);
 *   return { success: true };
 * });
 * ```
 */
export async function runInTransaction<T>(
  dataSource: DataSource,
  work: TransactionWork<T>,
): Promise<T> {
  return dataSource.transaction(work);
}

/**
 * 在事务中执行工作（带 QueryRunner 控制）
 *
 * 用于需要更精细控制的场景，如：
 * - 需要使用悲观锁
 * - 需要设置事务隔离级别
 *
 * @example
 * ```typescript
 * const result = await runInTransactionWithRunner(dataSource, async (qr, manager) => {
 *   // 悲观锁查询
 *   const row = await manager.getRepository(Entity).findOne({
 *     where: { id },
 *     lock: { mode: 'pessimistic_write' },
 *   });
 *   // ...
 * });
 * ```
 */
export async function runInTransactionWithRunner<T>(
  dataSource: DataSource,
  work: (queryRunner: QueryRunner, manager: EntityManager) => Promise<T>,
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE',
): Promise<T> {
  const queryRunner = dataSource.createQueryRunner();

  await queryRunner.connect();

  if (isolationLevel) {
    await queryRunner.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
  }

  await queryRunner.startTransaction();

  try {
    const result = await work(queryRunner, queryRunner.manager);
    await queryRunner.commitTransaction();
    return result;
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * UnitOfWork 类 - 适用于需要在多个方法间共享事务的场景
 *
 * @example
 * ```typescript
 * const uow = new UnitOfWork(dataSource);
 * await uow.begin();
 * try {
 *   await uow.manager.getRepository(Entity1).save(entity1);
 *   await uow.manager.getRepository(Entity2).save(entity2);
 *   await uow.commit();
 * } catch (error) {
 *   await uow.rollback();
 *   throw error;
 * }
 * ```
 */
export class UnitOfWork {
  private queryRunner: QueryRunner | null = null;

  constructor(private readonly dataSource: DataSource) {}

  get manager(): EntityManager {
    if (!this.queryRunner) {
      throw new Error('UnitOfWork not started. Call begin() first.');
    }
    return this.queryRunner.manager;
  }

  get isActive(): boolean {
    return this.queryRunner?.isTransactionActive ?? false;
  }

  async begin(): Promise<void> {
    if (this.queryRunner) {
      throw new Error('UnitOfWork already started');
    }
    this.queryRunner = this.dataSource.createQueryRunner();
    await this.queryRunner.connect();
    await this.queryRunner.startTransaction();
  }

  async commit(): Promise<void> {
    if (!this.queryRunner) {
      throw new Error('UnitOfWork not started');
    }
    await this.queryRunner.commitTransaction();
    await this.queryRunner.release();
    this.queryRunner = null;
  }

  async rollback(): Promise<void> {
    if (!this.queryRunner) {
      return; // Already rolled back or never started
    }
    await this.queryRunner.rollbackTransaction();
    await this.queryRunner.release();
    this.queryRunner = null;
  }

  /**
   * 执行工作并自动管理事务生命周期
   */
  async execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    await this.begin();
    try {
      const result = await work(this.manager);
      await this.commit();
      return result;
    } catch (error) {
      await this.rollback();
      throw error;
    }
  }
}
