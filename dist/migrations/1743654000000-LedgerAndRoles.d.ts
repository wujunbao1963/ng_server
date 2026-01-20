import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class LedgerAndRoles1743654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
