import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EvidenceDownloadLeases1740654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
