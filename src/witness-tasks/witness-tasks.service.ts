import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { NgWitnessTask } from './ng-witness-task.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgUser } from '../auth/ng-user.entity';
import { CirclesService } from '../circles/circles.service';
import { WitnessAlertsService } from '../witness-alerts/witness-alerts.service';
import { NgHttpError, NgErrorCodes } from '../common/errors/ng-http-error';

// ============================================================================
// DTOs
// ============================================================================

export interface CreateTaskDto {
  title: string;
  description?: string;
  eventId?: string;
  // === E3: 协助请求字段 ===
  purpose?: string;      // CONFIRM_SAFETY,PHOTO_CHECK,VIDEO_CHECK (逗号分隔)
  targetEntry?: string;  // front_door | back_door | garage | side_door | window | yard | other
  // TTL 配置
  claimTtlSec?: number;    // default 600 (10 min)
  arriveTtlSec?: number;   // default 1200 (20 min)
  submitTtlSec?: number;   // default 600 (10 min)
}

export interface ClaimTaskDto {
  // 可选：Witness 初始位置
  latitude?: number;
  longitude?: number;
}

export interface ArriveDto {
  latitude: number;
  longitude: number;
  accuracy?: number;  // GPS 精度 (米)
}

export interface SubmitDto {
  // === E3: 结构化结论 ===
  conclusion?: 'SAFE' | 'ABNORMAL' | 'NEEDS_ACTION';
  conclusionNote?: string;
  // 旧字段，保留兼容
  notes?: string;
  photos?: Array<{ url: string }>;
}

// === E3: 风险退出 DTO ===
export interface RiskAbortDto {
  reason: string;
}

// ============================================================================
// Service
// ============================================================================

/**
 * Witness Tasks Service
 * 
 * 实现: NG_PRODUCT_SPEC_L2_v8 §4.3 Witness Assistance Flow
 * 实现: E3_NG_COLLAB_TASK_MODEL_v8 协助任务模型
 * 
 * 任务流程:
 * 1. Owner/Caretaker 创建任务 → CREATED
 * 2. 发布给 Witness → OFFERED
 * 3. Witness 领取 → CLAIMED
 * 4. Witness 到达 (proximity 验证) → ARRIVED
 * 5. Witness 提交报告 → SUBMITTED
 * 6. Creator 关闭 → CLOSED
 * 
 * 异常流程:
 * - RISK_ABORTED: Witness 风险退出 (现场危险)
 */
@Injectable()
export class WitnessTasksService {
  constructor(
    @InjectRepository(NgWitnessTask)
    private readonly tasksRepo: Repository<NgWitnessTask>,
    @InjectRepository(NgCircle)
    private readonly circlesRepo: Repository<NgCircle>,
    @InjectRepository(NgRole)
    private readonly rolesRepo: Repository<NgRole>,
    @InjectRepository(NgUser)
    private readonly usersRepo: Repository<NgUser>,
    private readonly circles: CirclesService,
    private readonly witnessAlerts: WitnessAlertsService,
  ) {}

  // ==========================================================================
  // 创建任务 (Owner / Caretaker)
  // ==========================================================================

  /**
   * 创建 Witness 任务
   * 
   * POST /api/circles/:circleId/witness-tasks
   */
  async createTask(userId: string, circleId: string, dto: CreateTaskDto): Promise<NgWitnessTask> {
    // 检查权限 - Owner 或 Caretaker
    const role = await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);

    const taskId = crypto.randomUUID();
    const now = new Date();
    const totalTtlSec = 30 * 60; // 30 分钟总超时
    const expiresAt = new Date(now.getTime() + totalTtlSec * 1000);

    const task = this.tasksRepo.create({
      id: taskId,
      circleId,
      eventId: dto.eventId ?? null,
      title: dto.title,
      description: dto.description ?? null,
      // === E3: 协助请求字段 ===
      purpose: dto.purpose ?? null,
      targetEntry: dto.targetEntry ?? null,
      // =========================
      status: 'created',
      creatorUserId: userId,
      creatorRole: role.role as 'owner' | 'caretaker',
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
      proximityRadiusM: 50, // 从 Circle 获取
    });

    // 获取 Circle 的 proximity radius
    const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
    if (circle?.proximityRadiusM) {
      task.proximityRadiusM = circle.proximityRadiusM;
    }

    await this.tasksRepo.save(task);
    return task;
  }

  // ==========================================================================
  // 发布任务 (Owner / Caretaker)
  // ==========================================================================

  /**
   * 发布任务给 Witnesses
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/offer
   */
  async offerTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask> {
    await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    if (task.status !== 'created') {
      throw this.makeError(400, 'INVALID_STATE', `Cannot offer task in status: ${task.status}`);
    }

    task.status = 'offered';
    task.offeredAt = new Date();

    await this.tasksRepo.save(task);

    // 通知圈子内所有成员（排除创建者自己）
    this.circles.getWitnessUserIds(circleId).then(allUserIds => {
      const recipients = allUserIds.filter(id => id !== userId);
      if (recipients.length > 0) {
        return this.witnessAlerts.notifyTaskOffered(
          recipients,
          { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
          userId,
        );
      }
    }).catch(err => console.error('[WitnessAlert] Failed to notify task offered:', err));

    return task;
  }

  // ==========================================================================
  // Witness 操作
  // ==========================================================================

  /**
   * 列出可领取的任务 (Witness)
   * 
   * GET /api/circles/:circleId/witness-tasks/available
   */
  async listAvailableTasks(userId: string, circleId: string): Promise<NgWitnessTask[]> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    // 先处理过期任务
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

  /**
   * 领取任务 (Witness)
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/claim
   */
  async claimTask(userId: string, circleId: string, taskId: string, dto?: ClaimTaskDto): Promise<NgWitnessTask> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    if (task.status !== 'offered') {
      throw this.makeError(400, 'INVALID_STATE', `Cannot claim task in status: ${task.status}`);
    }

    // 检查是否过期
    if (task.expiresAt && new Date() > task.expiresAt) {
      task.status = 'expired';
      await this.tasksRepo.save(task);
      throw this.makeError(400, 'TASK_EXPIRED', 'Task has expired');
    }

    task.status = 'claimed';
    task.witnessUserId = userId;
    task.claimedAt = new Date();

    // 记录初始位置
    if (dto?.latitude && dto?.longitude) {
      task.metadata = {
        ...task.metadata,
        claimLocation: { latitude: dto.latitude, longitude: dto.longitude },
      };
    }

    await this.tasksRepo.save(task);
    
    // 通知 Creator: 任务已被领取
    this.witnessAlerts.notifyTaskClaimed(
      task.creatorUserId,
      { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
      userId,
    ).catch(err => console.error('[WitnessAlert] Failed to notify task claimed:', err));
    
    return task;
  }

  /**
   * 到达确认 (Witness) - 带 proximity 验证
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/arrive
   */
  async arriveAtTask(userId: string, circleId: string, taskId: string, dto: ArriveDto): Promise<NgWitnessTask> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    if (task.status !== 'claimed') {
      throw this.makeError(400, 'INVALID_STATE', `Cannot arrive at task in status: ${task.status}`);
    }

    if (task.witnessUserId !== userId) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
    }

    // 检查是否超时 (CLAIMED 后 arriveTtlSec)
    const claimedAt = task.claimedAt!;
    const arriveDeadline = new Date(claimedAt.getTime() + task.arriveTtlSec * 1000);
    if (new Date() > arriveDeadline) {
      task.status = 'abandoned';
      await this.tasksRepo.save(task);
      throw this.makeError(400, 'TASK_ABANDONED', 'Task was abandoned due to arrival timeout');
    }

    // ========================================
    // GPS Proximity 验证 - 暂时禁用用于 PC 测试
    // 设置 SKIP_PROXIMITY_CHECK=true 可跳过验证
    // ========================================
    const skipProximityCheck = process.env.SKIP_PROXIMITY_CHECK === 'true';
    
    if (skipProximityCheck) {
      // 跳过 GPS 验证，直接标记为已验证
      task.arrivalLatitude = dto.latitude ?? 0;
      task.arrivalLongitude = dto.longitude ?? 0;
      task.arrivalAccuracyM = dto.accuracy ?? null;
      task.proximityVerified = true;
      task.proximityFailureReason = null;
      console.log('[WitnessTask] Proximity check SKIPPED (SKIP_PROXIMITY_CHECK=true)');
    } else {
      // 正常 Proximity 验证
      const circle = await this.circlesRepo.findOne({ where: { id: circleId } });
      const proximityResult = this.verifyProximity(
        dto.latitude,
        dto.longitude,
        circle?.latitude ?? null,
        circle?.longitude ?? null,
        task.proximityRadiusM,
        dto.accuracy,
      );

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
    
    // 通知 Creator: Witness 已到达现场
    this.witnessAlerts.notifyTaskArrived(
      task.creatorUserId,
      { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
      userId,
    ).catch(err => console.error('[WitnessAlert] Failed to notify task arrived:', err));
    
    return task;
  }

  /**
   * 提交报告 (Witness)
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/submit
   */
  async submitTask(userId: string, circleId: string, taskId: string, dto: SubmitDto): Promise<NgWitnessTask> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    // 允许 claimed 或 arrived 状态提交（到场确认功能暂时关闭）
    if (!['claimed', 'arrived'].includes(task.status)) {
      throw this.makeError(400, 'INVALID_STATE', `Cannot submit task in status: ${task.status}`);
    }

    if (task.witnessUserId !== userId) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
    }

    // 检查提交超时（仅在 arrived 状态时检查，claimed 状态跳过）
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
    
    // === E3: 结构化结论 ===
    task.conclusion = dto.conclusion ?? null;
    task.conclusionNote = dto.conclusionNote ?? null;
    
    // 旧字段，保留兼容 (notes 映射到 submissionNotes)
    task.submissionNotes = dto.notes ?? dto.conclusionNote ?? null;
    
    // 只有当 dto.photos 有值时才更新 submissionPhotos
    // 否则保留已通过 addEvidence 上传的证据
    if (dto.photos && dto.photos.length > 0) {
      task.submissionPhotos = dto.photos.map(p => ({
        url: p.url,
        uploadedAt: new Date().toISOString(),
      })) as any;
    }
    // 如果 dto.photos 为空，不修改 task.submissionPhotos，保留现有值

    await this.tasksRepo.save(task);
    
    // 通知 Creator: 报告已提交
    this.witnessAlerts.notifyTaskSubmitted(
      task.creatorUserId,
      { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
      userId,
      task.conclusion ?? undefined,
    ).catch(err => console.error('[WitnessAlert] Failed to notify task submitted:', err));
    
    return task;
  }

  /**
   * 风险退出 (Witness) - E3 规范
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/risk-abort
   * 
   * Witness 可在 CLAIMED 或 ARRIVED 状态下标记风险退出
   */
  async riskAbortTask(userId: string, circleId: string, taskId: string, dto: RiskAbortDto): Promise<NgWitnessTask> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    // 只有 CLAIMED 或 ARRIVED 状态可以风险退出
    if (!['claimed', 'arrived'].includes(task.status)) {
      throw this.makeError(400, 'INVALID_STATE', `Cannot risk-abort task in status: ${task.status}`);
    }

    if (task.witnessUserId !== userId) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, 'You are not the assigned witness');
    }

    if (!dto.reason || dto.reason.trim().length === 0) {
      throw this.makeError(400, 'INVALID_INPUT', 'Risk abort reason is required');
    }

    task.status = 'risk_aborted';
    task.riskAbortReason = dto.reason;
    task.riskAbortedAt = new Date();

    await this.tasksRepo.save(task);
    
    // 通知 Creator: 风险退出 (高优先级)
    this.witnessAlerts.notifyTaskRiskAborted(
      task.creatorUserId,
      { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
      userId,
      dto.reason,
    ).catch(err => console.error('[WitnessAlert] Failed to notify task risk aborted:', err));
    
    return task;
  }

  /**
   * 添加证据 (Witness / Acting Owner)
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/evidence
   * 
   * Witness 可在 CLAIMED 或 ARRIVED 状态上传证据
   */
  async addEvidence(
    userId: string,
    circleId: string,
    taskId: string,
    dto: {
      filename: string;
      originalName: string;
      mimetype: string;
      size: number;
      path: string;
    },
  ): Promise<{
    id: string;
    url: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    uploadedAt: string;
  }> {
    await this.circles.mustHaveRole(userId, circleId, ['witness', 'acting_owner']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    // 只能在 CLAIMED 或 ARRIVED 状态上传证据
    if (!['claimed', 'arrived'].includes(task.status)) {
      throw this.makeError(400, 'INVALID_STATE', `Cannot upload evidence in status: ${task.status}`);
    }

    // 验证是当前 Witness
    if (task.witnessUserId !== userId) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, 'Only assigned witness can upload evidence');
    }

    // 构建 URL
    const now = new Date();
    const datePath = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
    const baseUrl = process.env.BASE_URL || '';
    const url = `${baseUrl}/uploads/evidence/${datePath}/${dto.filename}`;

    // 创建证据记录
    const evidenceRecord = {
      id: crypto.randomUUID(),
      url,
      filename: dto.filename,
      originalName: dto.originalName,
      mimetype: dto.mimetype,
      size: dto.size,
      uploadedAt: new Date().toISOString(),
    };

    // 更新 submissionPhotos
    const existing = task.submissionPhotos ? [...task.submissionPhotos] : [];
    existing.push(evidenceRecord);
    task.submissionPhotos = existing as any;

    // 限制数量 (E3: 最多 10 个)
    if (existing.length > 10) {
      throw this.makeError(400, 'EVIDENCE_LIMIT', 'Maximum 10 evidence files allowed');
    }

    console.log('[addEvidence] taskId:', taskId);
    console.log('[addEvidence] saving submissionPhotos count:', existing.length);

    await this.tasksRepo.save(task);
    
    return evidenceRecord;
  }

  // ==========================================================================
  // 关闭/取消任务 (Owner / Caretaker)
  // ==========================================================================

  /**
   * 关闭任务
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/close
   */
  async closeTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask> {
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

  /**
   * 取消任务
   * 
   * POST /api/circles/:circleId/witness-tasks/:taskId/cancel
   */
  async cancelTask(userId: string, circleId: string, taskId: string, reason?: string): Promise<NgWitnessTask> {
    const role = await this.circles.mustHaveRole(userId, circleId, ['owner', 'caretaker']);

    const task = await this.getTaskOrThrow(taskId, circleId);

    // 只有未完成的任务可以取消
    const cancelableStatuses = ['created', 'offered', 'claimed', 'arrived'];
    if (!cancelableStatuses.includes(task.status)) {
      throw this.makeError(400, 'INVALID_STATE', `Cannot cancel task in status: ${task.status}`);
    }

    // Caretaker 只能取消自己创建的任务
    if (role.role === 'caretaker' && task.creatorUserId !== userId) {
      throw this.makeError(403, NgErrorCodes.FORBIDDEN, 'Caretakers can only cancel tasks they created');
    }

    task.status = 'canceled';
    task.canceledAt = new Date();
    task.canceledByUserId = userId;
    task.cancelReason = reason ?? null;

    await this.tasksRepo.save(task);
    
    // 通知 Witness: 任务已取消 (如果已有 Witness 领取)
    if (task.witnessUserId) {
      this.witnessAlerts.notifyTaskCanceled(
        task.witnessUserId,
        { id: task.id, circleId: task.circleId, eventId: task.eventId, title: task.title },
        userId,
        role.role,
        reason,
      ).catch(err => console.error('[WitnessAlert] Failed to notify task canceled:', err));
    }
    
    return task;
  }

  // ==========================================================================
  // 查询
  // ==========================================================================

  /**
   * 获取任务详情
   */
  async getTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask> {
    await this.circles.mustBeMember(userId, circleId);
    return this.getTaskOrThrow(taskId, circleId);
  }

  /**
   * 列出 Circle 的任务
   */
  async listTasks(
    userId: string,
    circleId: string,
    opts?: { status?: string; limit?: number; offset?: number },
  ): Promise<{ tasks: NgWitnessTask[]; total: number }> {
    const role = await this.circles.mustBeMember(userId, circleId);

    const where: any = { circleId };

    // Witness 只能看到与自己相关的任务 + offered 状态的任务
    if (role.role === 'witness') {
      // Witness 可以看到: offered (可领取) + 自己参与的任务
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
      
      // 合并去重
      const taskMap = new Map<string, NgWitnessTask>();
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

  /**
   * 列出我的任务 (Witness)
   */
  async listMyTasks(userId: string): Promise<NgWitnessTask[]> {
    return this.tasksRepo.find({
      where: { witnessUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 列出我创建的任务 (Owner/Caretaker)
   */
  async listMyCreatedTasks(userId: string): Promise<NgWitnessTask[]> {
    return this.tasksRepo.find({
      where: { creatorUserId: userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 列出所有圈子中可领取的任务 (跨圈子)
   *
   * GET /api/me/available-witness-tasks
   */
  async listAllAvailableTasks(userId: string): Promise<NgWitnessTask[]> {
    // 查找用户所有 caretaker/witness/acting_owner 角色
    const roles = await this.rolesRepo.find({
      where: { userId, role: In(['caretaker', 'witness', 'acting_owner']) },
    });

    const circleIds = roles.map(r => r.circleId);
    if (circleIds.length === 0) return [];

    // 处理过期任务
    for (const circleId of circleIds) {
      await this.expireOverdueTasks(circleId);
    }

    return this.tasksRepo.find({
      where: {
        circleId: In(circleIds),
        status: 'offered',
      },
      order: { createdAt: 'DESC' },
    });
  }

  // ==========================================================================
  // Helper Methods
  // ==========================================================================

  private async getTaskOrThrow(taskId: string, circleId: string): Promise<NgWitnessTask> {
    const task = await this.tasksRepo.findOne({
      where: { id: taskId, circleId },
    });

    if (!task) {
      throw this.makeError(404, NgErrorCodes.NOT_FOUND, 'Task not found');
    }

    return task;
  }

  /**
   * 处理过期任务
   */
  private async expireOverdueTasks(circleId: string): Promise<void> {
    const now = new Date();

    // 过期 OFFERED 任务 (claim timeout)
    await this.tasksRepo.update(
      {
        circleId,
        status: 'offered',
        expiresAt: LessThan(now),
      },
      { status: 'expired' },
    );

    // 过期 CLAIMED 任务 (arrive timeout) - 需要更复杂的逻辑
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

  /**
   * Proximity 验证
   */
  private verifyProximity(
    witnessLat: number,
    witnessLng: number,
    homeLat: number | null,
    homeLng: number | null,
    radiusM: number,
    accuracyM?: number,
  ): { verified: boolean; distance?: number; failureReason?: string } {
    // 检查 Home 坐标是否设置
    if (homeLat === null || homeLng === null) {
      return { verified: true, failureReason: undefined }; // 如果没设置，跳过验证
    }

    // 检查 GPS 精度
    if (accuracyM && accuracyM > 100) {
      return { verified: false, failureReason: 'Location accuracy insufficient (>100m)' };
    }

    // 计算距离 (Haversine formula)
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

  /**
   * Haversine 公式计算两点距离 (米)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 地球半径 (米)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private makeError(statusCode: number, code: string, message: string, details?: any): NgHttpError {
    return new NgHttpError({
      statusCode,
      error: statusCode === 400 ? 'Bad Request' : statusCode === 403 ? 'Forbidden' : 'Not Found',
      code,
      message,
      timestamp: new Date().toISOString(),
      retryable: false,
      details,
    });
  }
}
