import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class Outbox1742654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
