import { DataSource, EntityManager, QueryRunner } from 'typeorm';
export type TransactionWork<T> = (manager: EntityManager) => Promise<T>;
export declare function runInTransaction<T>(dataSource: DataSource, work: TransactionWork<T>): Promise<T>;
export declare function runInTransactionWithRunner<T>(dataSource: DataSource, work: (queryRunner: QueryRunner, manager: EntityManager) => Promise<T>, isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE'): Promise<T>;
export declare class UnitOfWork {
    private readonly dataSource;
    private queryRunner;
    constructor(dataSource: DataSource);
    get manager(): EntityManager;
    get isActive(): boolean;
    begin(): Promise<void>;
    commit(): Promise<void>;
    rollback(): Promise<void>;
    execute<T>(work: (manager: EntityManager) => Promise<T>): Promise<T>;
}
