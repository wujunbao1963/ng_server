import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EvidenceItemsCircleIdCompat1734657400000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(_queryRunner: QueryRunner): Promise<void>;
}
