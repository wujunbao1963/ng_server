import { Repository } from 'typeorm';
import { NgEdgeCommand } from './ng-edge-command.entity';
export type CreateEdgeCommandDto = {
    circleId: string;
    edgeInstanceId: string;
    commandType: 'resolve' | 'cancel' | 'disarm' | 'set_mode';
    commandPayload?: Record<string, unknown>;
    triggeredByUserId?: string;
    eventId?: string;
    expiresInSeconds?: number;
};
export type EdgeCommandDto = {
    commandId: string;
    commandType: string;
    commandPayload: Record<string, unknown> | null;
    eventId: string | null;
    createdAt: string;
    expiresAt: string;
};
export declare class EdgeCommandsService {
    private readonly commandRepo;
    private readonly logger;
    constructor(commandRepo: Repository<NgEdgeCommand>);
    createCommand(dto: CreateEdgeCommandDto): Promise<NgEdgeCommand>;
    getPendingCommands(circleId: string, edgeInstanceId: string, limit?: number): Promise<EdgeCommandDto[]>;
    acknowledgeCommand(commandId: string, edgeInstanceId: string): Promise<{
        success: boolean;
        message: string;
    }>;
    completeCommand(commandId: string, edgeInstanceId: string, result: {
        success: boolean;
        message?: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getCommandsByEventId(circleId: string, eventId: string): Promise<NgEdgeCommand[]>;
    cleanupExpiredCommands(olderThanDays?: number): Promise<number>;
}
