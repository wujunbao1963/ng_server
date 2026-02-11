import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EvidenceDownloadAudit1739654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
