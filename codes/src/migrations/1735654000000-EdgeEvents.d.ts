import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class EdgeEvents1735654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
