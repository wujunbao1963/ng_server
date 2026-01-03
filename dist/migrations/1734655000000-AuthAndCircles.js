"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthAndCircles1734655000000 = void 0;
class AuthAndCircles1734655000000 {
    constructor() {
        this.name = 'AuthAndCircles1734655000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_users (
        id uuid PRIMARY KEY,
        email text NOT NULL,
        display_name text NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS ng_users_email_uq ON ng_users(email);');
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_circles (
        id uuid PRIMARY KEY,
        name text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_circle_members (
        id bigserial PRIMARY KEY,
        circle_id uuid NOT NULL REFERENCES ng_circles(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES ng_users(id) ON DELETE CASCADE,
        role text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      );
    `);
        await queryRunner.query('CREATE UNIQUE INDEX IF NOT EXISTS ng_circle_members_circle_user_uq ON ng_circle_members(circle_id, user_id);');
        await queryRunner.query('CREATE INDEX IF NOT EXISTS ng_circle_members_user_id_idx ON ng_circle_members(user_id);');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP TABLE IF EXISTS ng_circle_members;');
        await queryRunner.query('DROP TABLE IF EXISTS ng_circles;');
        await queryRunner.query('DROP TABLE IF EXISTS ng_users;');
    }
}
exports.AuthAndCircles1734655000000 = AuthAndCircles1734655000000;
//# sourceMappingURL=1734655000000-AuthAndCircles.js.map