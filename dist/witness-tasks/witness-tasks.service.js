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
exports.WitnessTasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const crypto = require("crypto");
const ng_witness_task_entity_1 = require("./ng-witness-task.entity");
const ng_circle_entity_1 = require("../circles/ng-circle.entity");
const ng_role_entity_1 = require("../roles/ng-role.entity");
const ng_user_entity_1 = require("../auth/ng-user.entity");
const circles_service_1 = require("../circles/circles.service");
const witness_alerts_service_1 = require("../witness-alerts/witness-alerts.service");
const ng_http_error_1 = require("../common/errors/ng-http-error");
let WitnessTasksService = class WitnessTasksService {
    constructor(tasksRepo, circlesRepo, rolesRepo, usersRepo, circles, witnessAlerts) {
        this.tasksRepo = tasksRepo;
        this.circlesRepo = circlesRepo;
        this.rolesRepo = rolesRepo;
        this.usersRepo = usersRepo;
        this.circles = circles;
        this.witnessAlerts = witnessAlerts;
    }
    async createTask(userId, circleId, dto) {
        const role = await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);
        const taskId = crypto.randomUUID();
        const now = new Date();
        const totalTtlSec = 30 * 60;
        const expiresAt = new Date(now.getTime() + totalTtlSec * 1000);
        const task = this.tasksRepo.create({
            id: taskId,
            circleId,
            eventId: dto.eventId ?? null,
            title: dto.title,
            description: dto.description ?? null,
            purpose: dto.purpose ?? null,
            targetEntry: dto.targetEntry ?? null,
            status: 'created',
            creatorUserId: userId,
            creatorRole: role.role,
            witnessUserId: null,
            offeredAt: null,
            claimedAt: null,
            arrivedAt: null,
            submittedAt: null,
            closedAt: null,
            canceledAt: null,
            expiresAt,
            claimTtlSec: dto.claimTtlSec ?? 600,
            arriveTtlSec: dto.arriveTtlSec ?? 1200,
            submitTtlSec: dto.submitTtlSec ?? 600,
            proximityRadiusM: 50,
        });
        const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
        if (circle?.proximityRadiusM) {
            task.proximityRadiusM = circle.proximityRadiusM;
        }
        await this.tasksRepo.save(task);
        return task;
    }
    async offerTask(userId, circleId, taskId) {
        await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (task.status !== 'created') {
            throw this.makeError(400, 'INVALID_STATE', `Cannot offer task in status: ${task.status}`);
        }
        task.status = 'offered';
        task.offeredAt = new Date();
        await this.tasksRepo.save(task);
        this.circles.getWitnessUserIds(circleId).then(witnessUserIds => {
            if (witnessUserIds.length > 0) {
                return this.witnessAlerts.notifyTaskOffered(witnessUserIds, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId);
            }
        }).catch(err => console.error('[WitnessAlert] Failed to notify task offered:', err));
        return task;
    }
    async listAvailableTasks(userId, circleId) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        await this.expireOverdueTasks(circleId);
        const tasks = await this.tasksRepo.find({
            where: {
                circleId,
                status: 'offered',
            },
            order: { createdAt: 'DESC' },
        });
        return tasks;
    }
    async claimTask(userId, circleId, taskId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (task.status !== 'offered') {
            throw this.makeError(400, 'INVALID_STATE', `Cannot claim task in status: ${task.status}`);
        }
        if (task.expiresAt && new Date() > task.expiresAt) {
            task.status = 'expired';
            await this.tasksRepo.save(task);
            throw this.makeError(400, 'TASK_EXPIRED', 'Task has expired');
        }
        task.status = 'claimed';
        task.witnessUserId = userId;
        task.claimedAt = new Date();
        if (dto?.latitude && dto?.longitude) {
            task.metadata = {
                ...task.metadata,
                claimLocation: { latitude: dto.latitude, longitude: dto.longitude },
            };
        }
        await this.tasksRepo.save(task);
        this.witnessAlerts.notifyTaskClaimed(task.creatorUserId, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId).catch(err => console.error('[WitnessAlert] Failed to notify task claimed:', err));
        return task;
    }
    async arriveAtTask(userId, circleId, taskId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (task.status !== 'claimed') {
            throw this.makeError(400, 'INVALID_STATE', `Cannot arrive at task in status: ${task.status}`);
        }
        if (task.witnessUserId !== userId) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
        }
        const claimedAt = task.claimedAt;
        const arriveDeadline = new Date(claimedAt.getTime() + task.arriveTtlSec * 1000);
        if (new Date() > arriveDeadline) {
            task.status = 'abandoned';
            await this.tasksRepo.save(task);
            throw this.makeError(400, 'TASK_ABANDONED', 'Task was abandoned due to arrival timeout');
        }
        const skipProximityCheck = process.env.SKIP_PROXIMITY_CHECK === 'true';
        if (skipProximityCheck) {
            task.arrivalLatitude = dto.latitude ?? 0;
            task.arrivalLongitude = dto.longitude ?? 0;
            task.arrivalAccuracyM = dto.accuracy ?? null;
            task.proximityVerified = true;
            task.proximityFailureReason = null;
            console.log('[WitnessTask] Proximity check SKIPPED (SKIP_PROXIMITY_CHECK=true)');
        }
        else {
            const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
            const proximityResult = this.verifyProximity(dto.latitude, dto.longitude, circle?.latitude ?? null, circle?.longitude ?? null, task.proximityRadiusM, dto.accuracy);
            task.arrivalLatitude = dto.latitude;
            task.arrivalLongitude = dto.longitude;
            task.arrivalAccuracyM = dto.accuracy ?? null;
            task.proximityVerified = proximityResult.verified;
            task.proximityFailureReason = proximityResult.failureReason ?? null;
            if (!proximityResult.verified) {
                throw this.makeError(400, 'PROXIMITY_FAILED', proximityResult.failureReason ?? 'Proximity verification failed', {
                    distance: proximityResult.distance,
                    required: task.proximityRadiusM,
                    reason: proximityResult.failureReason,
                });
            }
        }
        task.status = 'arrived';
        task.arrivedAt = new Date();
        await this.tasksRepo.save(task);
        this.witnessAlerts.notifyTaskArrived(task.creatorUserId, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId).catch(err => console.error('[WitnessAlert] Failed to notify task arrived:', err));
        return task;
    }
    async submitTask(userId, circleId, taskId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (!['claimed', 'arrived'].includes(task.status)) {
            throw this.makeError(400, 'INVALID_STATE', `Cannot submit task in status: ${task.status}`);
        }
        if (task.witnessUserId !== userId) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
        }
        if (task.status === 'arrived' && task.arrivedAt) {
            const submitDeadline = new Date(task.arrivedAt.getTime() + task.submitTtlSec * 1000);
            if (new Date() > submitDeadline) {
                task.status = 'abandoned';
                await this.tasksRepo.save(task);
                throw this.makeError(400, 'TASK_ABANDONED', 'Task was abandoned due to submission timeout');
            }
        }
        task.status = 'submitted';
        task.submittedAt = new Date();
        task.conclusion = dto.conclusion ?? null;
        task.conclusionNote = dto.conclusionNote ?? null;
        task.submissionNotes = dto.notes ?? dto.conclusionNote ?? null;
        if (dto.photos && dto.photos.length > 0) {
            task.submissionPhotos = dto.photos.map(p => ({
                url: p.url,
                uploadedAt: new Date().toISOString(),
            }));
        }
        await this.tasksRepo.save(task);
        this.witnessAlerts.notifyTaskSubmitted(task.creatorUserId, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId, task.conclusion ?? undefined).catch(err => console.error('[WitnessAlert] Failed to notify task submitted:', err));
        return task;
    }
    async riskAbortTask(userId, circleId, taskId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (!['claimed', 'arrived'].includes(task.status)) {
            throw this.makeError(400, 'INVALID_STATE', `Cannot risk-abort task in status: ${task.status}`);
        }
        if (task.witnessUserId !== userId) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
        }
        if (!dto.reason || dto.reason.trim().length === 0) {
            throw this.makeError(400, 'INVALID_INPUT', 'Risk abort reason is required');
        }
        task.status = 'risk_aborted';
        task.riskAbortReason = dto.reason;
        task.riskAbortedAt = new Date();
        await this.tasksRepo.save(task);
        this.witnessAlerts.notifyTaskRiskAborted(task.creatorUserId, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId, dto.reason).catch(err => console.error('[WitnessAlert] Failed to notify task risk aborted:', err));
        return task;
    }
    async addEvidence(userId, circleId, taskId, dto) {
        await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (!['claimed', 'arrived'].includes(task.status)) {
            throw this.makeError(400, 'INVALID_STATE', `Cannot upload evidence in status: ${task.status}`);
        }
        if (task.witnessUserId !== userId) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, 'Only assigned witness can upload evidence');
        }
        const now = new Date();
        const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        const baseUrl = process.env.BASE_URL || '';
        const url = `${baseUrl}/uploads/evidence/${datePath}/${dto.filename}`;
        const evidenceRecord = {
            id: crypto.randomUUID(),
            url,
            filename: dto.filename,
            originalName: dto.originalName,
            mimetype: dto.mimetype,
            size: dto.size,
            uploadedAt: new Date().toISOString(),
        };
        const existing = task.submissionPhotos ? [...task.submissionPhotos] : [];
        existing.push(evidenceRecord);
        task.submissionPhotos = existing;
        if (existing.length > 10) {
            throw this.makeError(400, 'EVIDENCE_LIMIT', 'Maximum 10 evidence files allowed');
        }
        console.log('[addEvidence] taskId:', taskId);
        console.log('[addEvidence] saving submissionPhotos count:', existing.length);
        await this.tasksRepo.save(task);
        return evidenceRecord;
    }
    async closeTask(userId, circleId, taskId) {
        await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        if (task.status !== 'submitted') {
            throw this.makeError(400, 'INVALID_STATE', `Cannot close task in status: ${task.status}`);
        }
        task.status = 'closed';
        task.closedAt = new Date();
        await this.tasksRepo.save(task);
        return task;
    }
    async cancelTask(userId, circleId, taskId, reason) {
        const role = await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);
        const task = await this.getTaskOrThrow(taskId, circleId);
        const cancelableStatuses = ['created', 'offered', 'claimed', 'arrived'];
        if (!cancelableStatuses.includes(task.status)) {
            throw this.makeError(400, 'INVALID_STATE', `Cannot cancel task in status: ${task.status}`);
        }
        if (role.role === 'caretaker' && task.creatorUserId !== userId) {
            throw this.makeError(403, ng_http_error_1.NgErrorCodes.FORBIDDEN, 'Caretakers can only cancel tasks they created');
        }
        task.status = 'canceled';
        task.canceledAt = new Date();
        task.canceledByUserId = userId;
        task.cancelReason = reason ?? null;
        await this.tasksRepo.save(task);
        if (task.witnessUserId) {
            this.witnessAlerts.notifyTaskCanceled(task.witnessUserId, { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title }, userId, role.role, reason).catch(err => console.error('[WitnessAlert] Failed to notify task canceled:', err));
        }
        return task;
    }
    async getTask(userId, circleId, taskId) {
        await this.circles.mustBeMember(userId, circleId);
        return this.getTaskOrThrow(taskId, circleId);
    }
    async listTasks(userId, circleId, opts) {
        const role = await this.circles.mustBeMember(userId, circleId);
        const where = { circleId };
        if (role.role === 'witness') {
            const [offeredTasks, myTasks] = await Promise.all([
                this.tasksRepo.find({
                    where: { circleId, status: 'offered' },
                    order: { createdAt: 'DESC' },
                }),
                this.tasksRepo.find({
                    where: { circleId, witnessUserId: userId },
                    order: { createdAt: 'DESC' },
                }),
            ]);
            const taskMap = new Map();
            [...offeredTasks, ...myTasks].forEach(t => taskMap.set(t.id, t));
            const tasks = Array.from(taskMap.values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return { tasks, total: tasks.length };
        }
        if (opts?.status) {
            where.status = opts.status;
        }
        const [tasks, total] = await this.tasksRepo.findAndCount({
            where,
            order: { createdAt: 'DESC' },
            take: opts?.limit ?? 50,
            skip: opts?.offset ?? 0,
        });
        return { tasks, total };
    }
    async listMyTasks(userId) {
        return this.tasksRepo.find({
            where: { witnessUserId: userId },
            order: { createdAt: 'DESC' },
        });
    }
    async listMyCreatedTasks(userId) {
        return this.tasksRepo.find({
            where: { creatorUserId: userId },
            order: { createdAt: 'DESC' },
        });
    }
    async listAllAvailableTasks(userId) {
        const roles = await this.rolesRepo.find({
            where: { userId, role: (0, typeorm_2.In)(['witness', 'acting_owner']) },
        });
        const circleIds = roles.map(r => r.circleId);
        if (circleIds.length === 0)
            return [];
        for (const circleId of circleIds) {
            await this.expireOverdueTasks(circleId);
        }
        return this.tasksRepo.find({
            where: {
                circleId: (0, typeorm_2.In)(circleIds),
                status: 'offered',
            },
            order: { createdAt: 'DESC' },
        });
    }
    async getTaskOrThrow(taskId, circleId) {
        const task = await this.tasksRepo.findOne({
            where: { id: taskId, circleId },
        });
        if (!task) {
            throw this.makeError(404, ng_http_error_1.NgErrorCodes.NOT_FOUND, 'Task not found');
        }
        return task;
    }
    async expireOverdueTasks(circleId) {
        const now = new Date();
        await this.tasksRepo.update({
            circleId,
            status: 'offered',
            expiresAt: (0, typeorm_2.LessThan)(now),
        }, { status: 'expired' });
        const claimedTasks = await this.tasksRepo.find({
            where: { circleId, status: 'claimed' },
        });
        for (const task of claimedTasks) {
            if (task.claimedAt) {
                const deadline = new Date(task.claimedAt.getTime() + task.arriveTtlSec * 1000);
                if (now > deadline) {
                    task.status = 'abandoned';
                    await this.tasksRepo.save(task);
                }
            }
        }
    }
    verifyProximity(witnessLat, witnessLng, homeLat, homeLng, radiusM, accuracyM) {
        if (homeLat === null || homeLng === null) {
            return { verified: true, failureReason: undefined };
        }
        if (accuracyM && accuracyM > 100) {
            return { verified: false, failureReason: 'Location accuracy insufficient (>100m)' };
        }
        const distance = this.calculateDistance(witnessLat, witnessLng, homeLat, homeLng);
        if (distance > radiusM) {
            return {
                verified: false,
                distance,
                failureReason: `Too far from home (${Math.round(distance)}m, required: ${radiusM}m)`,
            };
        }
        return { verified: true, distance };
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
exports.WitnessTasksService = WitnessTasksService;
exports.WitnessTasksService = WitnessTasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(ng_witness_task_entity_1.NgWitnessTask)),
    __param(1, (0, typeorm_1.InjectRepository)(ng_circle_entity_1.NgCircle)),
    __param(2, (0, typeorm_1.InjectRepository)(ng_role_entity_1.NgRole)),
    __param(3, (0, typeorm_1.InjectRepository)(ng_user_entity_1.NgUser)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        circles_service_1.CirclesService,
        witness_alerts_service_1.WitnessAlertsService])
], WitnessTasksService);
//# sourceMappingURL=witness-tasks.service.js.map