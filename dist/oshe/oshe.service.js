"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OsheService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_oshe_evidence_entity_1 = require("./ng-oshe-evidence.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const circles_service_1 = require("../circles/circles.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
const ALLOWED_MEDIA_TYPES = {
    video: ['mp4', 'mov', 'webm'],
    image: ['jpg', 'jpeg', 'png', 'heic', 'webp'],
    audio: ['m4a', 'aac', 'mp3', 'wav'],
};
const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
const MAX_FILES_PER_EVENT = 10;
const MAX_TOTAL_SIZE_PER_EVENT = 500 * 1024 * 1024;
const TIMESTAMP_DISCREPANCY_THRESHOLD_MS = 5 * 60 * 1000;
const RESOLVED_WINDOW_HOURS = 48;
let OsheService = class OsheService {
    constructor(osheRepo, circlesRepo, rolesRepo, circles) {
        this.osheRepo = osheRepo;
        this.circlesRepo = circlesRepo;
        this.rolesRepo = rolesRepo;
        this.circles = circles;
    }
    async createOshe(userId, circleId, dto, eventContext) {
        const role = await this.circles.mustBeMember(userId, circleId);
        this.validateOsheRole(role.role);
        this.validateEventState(eventContext, dto.afterThreatState);
        this.validateTimeWindow(eventContext);
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        const proximityResult = await this.validatePresence(dto.latitude, dto.longitude, dto.accuracy, circle?.latitude ?? null, circle?.longitude ?? null, circle?.proximityRadiusM ?? 50, dto.presenceVerificationDegraded);
        this.validateFileConstraints(dto, circleId, dto.eventId);
        const serverReceivedAt = new Date();
        const capturedAt = new Date(dto.capturedAt);
        const timestampDiscrepancy = Math.abs(serverReceivedAt.getTime() - capturedAt.getTime()) > TIMESTAMP_DISCREPANCY_THRESHOLD_MS;
        const oshe = this.osheRepo.create({
            id: crypto.randomUUID(),
            circleId,
            eventId: dto.eventId,
            evidenceClass: 'ON_SCENE_HUMAN',
            mediaType: dto.mediaType,
            capturedAt,
            capturedByUserId: userId,
            capturedByRole: role.role,
            afterThreatState: dto.afterThreatState,
            source: 'human_on_scene',
            presenceVerified: proximityResult.verified,
            presenceLatitude: dto.latitude ?? null,
            presenceLongitude: dto.longitude ?? null,
            presenceAccuracyM: dto.accuracy ?? null,
            presenceVerificationDegraded: dto.presenceVerificationDegraded ?? false,
            fileUrl: dto.fileUrl,
            fileName: dto.fileName ?? null,
            fileSizeBytes: dto.fileSizeBytes ?? null,
            fileHashSha256: dto.fileHashSha256 ?? null,
            serverReceivedAt,
            timestampDiscrepancy,
            notes: dto.notes ?? null,
            witnessTaskId: dto.witnessTaskId ?? null,
            metadata: {
                proximityDistance: proximityResult.distance,
                proximityRequired: circle?.proximityRadiusM ?? 50,
            },
        });
        await this.osheRepo.save(oshe);
        return oshe;
    }
    async createFromWitnessTask(userId, circleId, witnessTaskId, photos, eventContext, location) {
        if (!photos || photos.length === 0) {
            return [];
        }
        if (!eventContext) {
            return [];
        }
        const results = [];
        for (const photo of photos) {
            try {
                const oshe = await this.createOshe(userId, circleId, {
                    eventId: eventContext.eventId,
                    mediaType: 'image',
                    capturedAt: new Date().toISOString(),
                    afterThreatState: eventContext.threatState,
                    fileUrl: photo.url,
                    fileName: photo.fileName,
                    fileSizeBytes: photo.fileSizeBytes,
                    latitude: location.latitude,
                    longitude: location.longitude,
                    accuracy: location.accuracy,
                    witnessTaskId,
                }, eventContext);
                results.push(oshe);
            }
            catch (e) {
                console.error(`Failed to create OSHE from witness task photo: ${e}`);
            }
        }
        return results;
    }
    async listByEvent(userId, circleId, eventId) {
        await this.circles.mustBeMember(userId, circleId);
        return this.osheRepo.find({
            where: { circleId, eventId },
            order: { capturedAt: 'ASC' },
        });
    }
    async getOshe(userId, circleId, eventId, osheId) {
        await this.circles.mustBeMember(userId, circleId);
        const oshe = await this.osheRepo.findOne({
            where: { id: osheId, circleId, eventId },
        });
        if (!oshe) {
            throw this.makeError(404, ng_http_error_1.NgErrorCodes.NOT_FOUND, 'OSHE evidence not found');
        }
        return oshe;
    }
    async getManifestItems(circleId, eventId) {
        const items = await this.osheRepo.find({
            where: { circleId, eventId },
            order: { capturedAt: 'ASC' },
        });
        return items.map(item => ({
            itemId: item.id,
            type: item.mediaType === 'video' ? 'clip' : item.mediaType === 'audio' ? 'audio' : 'snapshot',
            source: 'human_on_scene',
            auditWeight: 'supplemental',
            capturedAt: item.capturedAt.toISOString(),
            capturedByRole: item.capturedByRole,
            afterThreatState: item.afterThreatState,
        }));
    }
    validateOsheRole(role) {
        const allowedRoles = ['owner', 'caretaker', 'acting_owner', 'witness'];
        if (!allowedRoles.includes(role)) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, `Role '${role}' is not authorized to create OSHE`);
        }
    }
    validateEventState(context, declaredState) {
        const allowedStates = ['TRIGGERED', 'RESOLVED'];
        if (!allowedStates.includes(context.threatState)) {
            throw this.makeError(400, 'INVALID_EVENT_STATE', `OSHE can only be created for events in TRIGGERED or RESOLVED state. Current: ${context.threatState}`);
        }
        if (context.threatState !== declaredState) {
            throw this.makeError(400, 'STATE_MISMATCH', `Declared afterThreatState (${declaredState}) does not match event state (${context.threatState})`);
        }
    }
    validateTimeWindow(context) {
        if (context.threatState === 'TRIGGERED') {
            return;
        }
        const now = new Date();
        const windowEnd = new Date(context.stateChangedAt.getTime() + RESOLVED_WINDOW_HOURS * 60 * 60 * 1000);
        if (now > windowEnd) {
            throw this.makeError(400, 'OSHE_WINDOW_EXPIRED', `OSHE creation window expired. Event was RESOLVED at ${context.stateChangedAt.toISOString()}, ` +
                `window closed at ${windowEnd.toISOString()}`);
        }
    }
    async validatePresence(witnessLat, witnessLng, accuracy, homeLat, homeLng, radiusM, degradedMode) {
        if (degradedMode) {
            return { verified: false };
        }
        if (witnessLat === undefined || witnessLng === undefined) {
            throw this.makeError(400, 'PRESENCE_REQUIRED', 'GPS location is required for OSHE creation. Use presenceVerificationDegraded=true if GPS unavailable.');
        }
        if (accuracy && accuracy > 100) {
            throw this.makeError(400, 'ACCURACY_INSUFFICIENT', `GPS accuracy insufficient (${accuracy}m). Required: <100m`);
        }
        if (homeLat === null || homeLng === null) {
            return { verified: true };
        }
        const distance = this.calculateDistance(witnessLat, witnessLng, homeLat, homeLng);
        if (distance > radiusM) {
            throw this.makeError(400, 'PROXIMITY_FAILED', `Too far from location (${Math.round(distance)}m, required: ${radiusM}m)`, {
                distance,
                required: radiusM,
            });
        }
        return { verified: true, distance };
    }
    async validateFileConstraints(dto, circleId, eventId) {
        if (!['video', 'image', 'audio'].includes(dto.mediaType)) {
            throw this.makeError(400, 'INVALID_MEDIA_TYPE', `Invalid media type '${dto.mediaType}'. Allowed: video, image, audio`);
        }
        if (dto.fileSizeBytes && dto.fileSizeBytes > MAX_FILE_SIZE_BYTES) {
            throw this.makeError(400, 'FILE_TOO_LARGE', `File size ${dto.fileSizeBytes} exceeds maximum ${MAX_FILE_SIZE_BYTES} bytes`);
        }
        const fileName = dto.fileName ?? dto.fileUrl;
        const extension = fileName.split('.').pop()?.toLowerCase();
        if (extension) {
            const allowedExtensions = ALLOWED_MEDIA_TYPES[dto.mediaType] ?? [];
            if (allowedExtensions.length > 0 && !allowedExtensions.includes(extension)) {
                throw this.makeError(400, 'INVALID_FILE_TYPE', `File extension '${extension}' not allowed for media type '${dto.mediaType}'. ` +
                    `Allowed: ${allowedExtensions.join(', ')}`);
            }
        }
        const existingCount = await this.osheRepo.count({
            where: { circleId, eventId },
        });
        if (existingCount >= MAX_FILES_PER_EVENT) {
            throw this.makeError(400, 'MAX_FILES_EXCEEDED', `Maximum ${MAX_FILES_PER_EVENT} OSHE files per event reached`);
        }
    }
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const dLat = this.toRad(lat2 - lat1);
        const dLng = this.toRad(lng2 - lng1);
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
                Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
    toRad(deg) {
        return deg * (Math.PI / 180);
    }
    makeError(statusCode, code, message, details) {
        return new ng_http_error_1.NgHttpError({
            statusCode,
            error: statusCode === 400 ? 'Bad Request' : statusCode === 403 ? 'Forbidden' : 'Not Found',
            code,
            message,
            timestamp: new Date().toISOString(),
            retryable: false,
            details,
        });
    }
};
exports.OsheService = OsheService;
exports.OsheService = OsheService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_oshe_evidence_entity_1.NgOsheEvidence)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        circles_service_1.CirclesService])
], OsheService);
//# sourceMappingURL=oshe.service.js.map