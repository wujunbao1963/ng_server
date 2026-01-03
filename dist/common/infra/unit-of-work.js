"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitOfWork = void 0;
exports.runInTransaction = runInTransaction;
exports.runInTransactionWithRunner = runInTransactionWithRunner;
async function runInTransaction(dataSource, work) {
    return dataSource.transaction(work);
}
async function runInTransactionWithRunner(dataSource, work, isolationLevel) {
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
    }
    catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
    }
    finally {
        await queryRunner.release();
    }
}
class UnitOfWork {
    constructor(dataSource) {
        this.dataSource = dataSource;
        this.queryRunner = null;
    }
    get manager() {
        if (!this.queryRunner) {
            throw new Error('UnitOfWork not started. Call begin() first.');
        }
        return this.queryRunner.manager;
    }
    get isActive() {
        return this.queryRunner?.isTransactionActive ?? false;
    }
    async begin() {
        if (this.queryRunner) {
            throw new Error('UnitOfWork already started');
        }
        this.queryRunner = this.dataSource.createQueryRunner();
        await this.queryRunner.connect();
        await this.queryRunner.startTransaction();
    }
    async commit() {
        if (!this.queryRunner) {
            throw new Error('UnitOfWork not started');
        }
        await this.queryRunner.commitTransaction();
        await this.queryRunner.release();
        this.queryRunner = null;
    }
    async rollback() {
        if (!this.queryRunner) {
            return;
        }
        await this.queryRunner.rollbackTransaction();
        await this.queryRunner.release();
        this.queryRunner = null;
    }
    async execute(work) {
        await this.begin();
        try {
            const result = await work(this.manager);
            await this.commit();
            return result;
        }
        catch (error) {
            await this.rollback();
            throw error;
        }
    }
}
exports.UnitOfWork = UnitOfWork;
//# sourceMappingURL=unit-of-work.js.map