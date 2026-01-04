"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const topomap_module_1 = require("./topomap/topomap.module");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const health_module_1 = require("./health/health.module");
const auth_module_1 = require("./auth/auth.module");
const circles_module_1 = require("./circles/circles.module");
const edge_devices_module_1 = require("./edge-devices/edge-devices.module");
const device_auth_module_1 = require("./device-auth/device-auth.module");
const events_ingest_module_1 = require("./events-ingest/events-ingest.module");
const events_read_module_1 = require("./events-read/events-read.module");
const events_collab_module_1 = require("./events-collab/events-collab.module");
const evidence_module_1 = require("./evidence/evidence.module");
const edge_events_module_1 = require("./edge-events/edge-events.module");
const incident_read_module_1 = require("./incident-read/incident-read.module");
const evidence_tickets_module_1 = require("./evidence-tickets/evidence-tickets.module");
const admin_module_1 = require("./admin/admin.module");
const notifications_module_1 = require("./notifications/notifications.module");
const ng_exception_filter_1 = require("./common/errors/ng-exception.filter");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [topomap_module_1.TopoMapModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env'],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => {
                    const dbUrl = config.get('DATABASE_URL');
                    if (!dbUrl) {
                        throw new Error('DATABASE_URL is required (set it in .env)');
                    }
                    const sslEnabled = (config.get('DB_SSL') ?? 'true') === 'true';
                    const rejectUnauthorized = (config.get('DB_SSL_REJECT_UNAUTHORIZED') ?? 'false') !== 'false';
                    return {
                        type: 'postgres',
                        url: dbUrl,
                        synchronize: false,
                        migrationsRun: false,
                        autoLoadEntities: true,
                        logging: ['error'],
                        ssl: sslEnabled ? { rejectUnauthorized } : false,
                    };
                },
            }),
            health_module_1.HealthModule,
            auth_module_1.AuthModule,
            circles_module_1.CirclesModule,
            edge_devices_module_1.EdgeDevicesModule,
            device_auth_module_1.DeviceAuthModule,
            events_ingest_module_1.EventsIngestModule,
            events_read_module_1.EventsReadModule,
            events_collab_module_1.EventsCollabModule,
            edge_events_module_1.EdgeEventsModule,
            incident_read_module_1.IncidentReadModule,
            evidence_tickets_module_1.EvidenceTicketsModule,
            admin_module_1.AdminModule,
            evidence_module_1.EvidenceModule,
            notifications_module_1.NotificationsModule,],
        providers: [
            { provide: core_1.APP_FILTER, useClass: ng_exception_filter_1.NgExceptionFilter },
            {
                provide: core_1.APP_PIPE,
                useValue: new common_1.ValidationPipe({
                    transform: true,
                    whitelist: true,
                    forbidNonWhitelisted: true,
                }),
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map