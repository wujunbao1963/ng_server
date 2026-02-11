import { MigrationInterface, QueryRunner } from 'typeorm';
export declare class IncidentManifests1737654000000 implements MigrationInterface {
    name: string;
    up(queryRunner: QueryRunner): Promise<void>;
    down(queryRunner: QueryRunner): Promise<void>;
}
