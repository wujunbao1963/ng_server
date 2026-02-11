"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerIngestModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const ng_ledger_entry_entity_1 = require("./ng-ledger-entry.entity");
const ledger_ingest_service_1 = require("./ledger-ingest.service");
const ledger_ingest_controller_1 = require("./ledger-ingest.controller");
const circles_module_1 = require("../circles/circles.module");
const device_auth_module_1 = require("../device-auth/device-auth.module");
let LedgerIngestModule = class LedgerIngestModule {
};
exports.LedgerIngestModule = LedgerIngestModule;
exports.LedgerIngestModule = LedgerIngestModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([ng_ledger_entry_entity_1.NgLedgerEntry]),
            circles_module_1.CirclesModule,
            device_auth_module_1.DeviceAuthModule,
        ],
        controllers: [ledger_ingest_controller_1.LedgerIngestController],
        providers: [ledger_ingest_service_1.LedgerIngestService],
        exports: [ledger_ingest_service_1.LedgerIngestService],
    })
], LedgerIngestModule);
//# sourceMappingURL=ledger-ingest.module.js.map