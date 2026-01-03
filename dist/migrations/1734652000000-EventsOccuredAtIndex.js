"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsOccuredAtIndex1734652000000 = void 0;
class EventsOccuredAtIndex1734652000000 {
    constructor() {
        this.name = 'EventsOccuredAtIndex1734652000000';
    }
    async up(queryRunner) {
        await queryRunner.query('CREATE INDEX IF NOT EXISTS ng_events_circle_occurred_event_idx ON ng_events(circle_id, occurred_at DESC, event_id DESC);');
    }
    async down(queryRunner) {
        await queryRunner.query('DROP INDEX IF EXISTS ng_events_circle_occurred_event_idx;');
    }
}
exports.EventsOccuredAtIndex1734652000000 = EventsOccuredAtIndex1734652000000;
//# sourceMappingURL=1734652000000-EventsOccuredAtIndex.js.map