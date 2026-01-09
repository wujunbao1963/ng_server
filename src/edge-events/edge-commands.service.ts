import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { NgEdgeCommand } from './ng-edge-command.entity';

export type CreateEdgeCommandDto = {
  circleId: string;
  edgeInstanceId: string;
  commandType: 'resolve' | 'cancel' | 'disarm' | 'set_mode';
  commandPayload?: Record<string, unknown>;
  triggeredByUserId?: string;
  eventId?: string;
  expiresInSeconds?: number; // 默认 300 秒 (5 分钟)
};

export type EdgeCommandDto = {
  commandId: string;
  commandType: string;
  commandPayload: Record<string, unknown> | null;
  eventId: string | null;
  createdAt: string;
  expiresAt: string;
};

@Injectable()
export class EdgeCommandsService {
  private readonly logger = new Logger(EdgeCommandsService.name);

  constructor(
    @InjectRepository(NgEdgeCommand)
    private readonly commandRepo: Repository<NgEdgeCommand>,
  ) {}

  /**
   * 创建新命令
   */
  async createCommand(dto: CreateEdgeCommandDto): Promise<NgEdgeCommand> {
    const expiresInSeconds = dto.expiresInSeconds ?? 300; // 默认 5 分钟
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    const command = this.commandRepo.create({
      circleId: dto.circleId,
      edgeInstanceId: dto.edgeInstanceId,
      commandType: dto.commandType,
      commandPayload: dto.commandPayload ?? null,
      triggeredByUserId: dto.triggeredByUserId ?? null,
      eventId: dto.eventId ?? null,
      status: 'pending',
      expiresAt,
    });

    const saved = await this.commandRepo.save(command);
    this.logger.log(
      `Created command: ${saved.id} type=${dto.commandType} edge=${dto.edgeInstanceId}`,
    );
    return saved;
  }

  /**
   * 获取 Edge 待执行的命令
   * 
   * 返回所有 pending 状态且未过期的命令
   */
  async getPendingCommands(
    circleId: string,
    edgeInstanceId: string,
    limit: number = 10,
  ): Promise<EdgeCommandDto[]> {
    const now = new Date();

    // 先将过期命令标记为 expired
    await this.commandRepo.update(
      {
        circleId,
        edgeInstanceId,
        status: 'pending',
        expiresAt: LessThan(now),
      },
      { status: 'expired' },
    );

    // 获取待执行命令
    const commands = await this.commandRepo.find({
      where: {
        circleId,
        edgeInstanceId,
        status: 'pending',
      },
      order: { createdAt: 'ASC' },
      take: limit,
    });

    return commands.map((cmd) => ({
      commandId: cmd.id,
      commandType: cmd.commandType,
      commandPayload: cmd.commandPayload,
      eventId: cmd.eventId,
      createdAt: cmd.createdAt.toISOString(),
      expiresAt: cmd.expiresAt.toISOString(),
    }));
  }

  /**
   * Edge 确认收到命令
   */
  async acknowledgeCommand(
    commandId: string,
    edgeInstanceId: string,
  ): Promise<{ success: boolean; message: string }> {
    const command = await this.commandRepo.findOne({
      where: { id: commandId, edgeInstanceId },
    });

    if (!command) {
      return { success: false, message: 'Command not found' };
    }

    if (command.status !== 'pending') {
      return { success: false, message: `Command already ${command.status}` };
    }

    if (command.expiresAt < new Date()) {
      await this.commandRepo.update(commandId, { status: 'expired' });
      return { success: false, message: 'Command expired' };
    }

    await this.commandRepo.update(commandId, {
      status: 'delivered',
      deliveredAt: new Date(),
    });

    this.logger.log(`Command acknowledged: ${commandId}`);
    return { success: true, message: 'Acknowledged' };
  }

  /**
   * Edge 报告命令执行完成
   */
  async completeCommand(
    commandId: string,
    edgeInstanceId: string,
    result: { success: boolean; message?: string },
  ): Promise<{ success: boolean; message: string }> {
    const command = await this.commandRepo.findOne({
      where: { id: commandId, edgeInstanceId },
    });

    if (!command) {
      return { success: false, message: 'Command not found' };
    }

    if (!['pending', 'delivered'].includes(command.status)) {
      return { success: false, message: `Command already ${command.status}` };
    }

    const newStatus = result.success ? 'executed' : 'failed';
    await this.commandRepo.update(commandId, {
      status: newStatus,
      executedAt: new Date(),
      resultMessage: result.message ?? null,
    });

    this.logger.log(
      `Command completed: ${commandId} status=${newStatus} message=${result.message}`,
    );
    return { success: true, message: 'Recorded' };
  }

  /**
   * 根据事件 ID 获取相关命令
   */
  async getCommandsByEventId(
    circleId: string,
    eventId: string,
  ): Promise<NgEdgeCommand[]> {
    return this.commandRepo.find({
      where: { circleId, eventId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * 清理过期命令 (可由定时任务调用)
   */
  async cleanupExpiredCommands(olderThanDays: number = 7): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const result = await this.commandRepo.delete({
      status: In(['expired', 'executed', 'failed']),
      createdAt: LessThan(cutoff),
    });
    return result.affected ?? 0;
  }
}
