"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerAndRoles1743654000000 = void 0;
class LedgerAndRoles1743654000000 {
    constructor() {
        this.name = 'LedgerAndRoles1743654000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_ledger_entries (
        id TEXT PRIMARY KEY,
        edge_instance_id TEXT NOT NULL,
        circle_id UUID NOT NULL,
        ledger_seq BIGINT NOT NULL,
        entry_type TEXT NOT NULL,
        event_id TEXT,
        actor_id TEXT,
        actor_role TEXT,
        device_time TIMESTAMPTZ NOT NULL,
        mono_time BIGINT,
        time_quality TEXT DEFAULT 'SYNCED',
        payload JSONB DEFAULT '{}'::jsonb,
        contract_version TEXT DEFAULT 'ng.edge.server/8.0',
        edge_spec_version TEXT DEFAULT 'v7.7',
        idempotency_key TEXT NOT NULL,
        received_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_edge_seq 
      ON ng_ledger_entries (edge_instance_id, ledger_seq)
    `);
        await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ledger_entries_idempotency 
      ON ng_ledger_entries (idempotency_key)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_circle 
      ON ng_ledger_entries (circle_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_event 
      ON ng_ledger_entries (event_id) WHERE event_id IS NOT NULL
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_ledger_entries_type 
      ON ng_ledger_entries (entry_type)
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_roles (
        id UUID PRIMARY KEY,
        circle_id UUID NOT NULL,
        user_id UUID NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('owner', 'caretaker', 'acting_owner', 'witness')),
        email TEXT,
        display_name TEXT,
        valid_from TIMESTAMPTZ NOT NULL,
        valid_until TIMESTAMPTZ,
        suspended BOOLEAN DEFAULT FALSE,
        pin_hash TEXT,
        permissions JSONB,
        sync_version INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (circle_id, user_id)
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_circle 
      ON ng_roles (circle_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_user 
      ON ng_roles (user_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_sync_version 
      ON ng_roles (circle_id, sync_version)
    `);
        await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ng_role_audit (
        id UUID PRIMARY KEY,
        circle_id UUID NOT NULL,
        role_id UUID NOT NULL,
        target_user_id UUID NOT NULL,
        actor_user_id UUID NOT NULL,
        action TEXT NOT NULL,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_circle 
      ON ng_role_audit (circle_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_role 
      ON ng_role_audit (role_id)
    `);
        await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_role_audit_created 
      ON ng_role_audit (created_at DESC)
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP TABLE IF EXISTS ng_role_audit`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_roles`);
        await queryRunner.query(`DROP TABLE IF EXISTS ng_ledger_entries`);
    }
}
exports.LedgerAndRoles1743654000000 = LedgerAndRoles1743654000000;
//# sourceMappingURL=1743654000000-LedgerAndRoles.js.map