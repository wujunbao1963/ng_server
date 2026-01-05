import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EvidenceItemsColumnCompat1734657300000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(_queryRunner: QueryRunner): Promise<void>;
}
