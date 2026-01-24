import { Repository } from 'typeorm';
import { NgWitnessTask } from './ng-witness-task.entity';
import { NgCircle } from '../circles/ng-circle.entity';
import { NgRole } from '../roles/ng-role.entity';
import { NgUser } from '../auth/ng-user.entity';
import { CirclesService } from '../circles/circles.service';
export interface CreateTaskDto {
    title: string;
    description?: string;
    eventId?: string;
    claimTtlSec?: number;
    arriveTtlSec?: number;
    submitTtlSec?: number;
}
export interface ClaimTaskDto {
    latitude?: number;
    longitude?: number;
}
export interface ArriveDto {
    latitude: number;
    longitude: number;
    accuracy?: number;
}
export interface SubmitDto {
    notes?: string;
    photos?: Array<{
        url: string;
    }>;
}
export declare class WitnessTasksService {
    private readonly tasksRepo;
    private readonly circlesRepo;
    private readonly rolesRepo;
    private readonly usersRepo;
    private readonly circles;
    constructor(tasksRepo: Repository<NgWitnessTask>, circlesRepo: Repository<NgCircle>, rolesRepo: Repository<NgRole>, usersRepo: Repository<NgUser>, circles: CirclesService);
    createTask(userId: string, circleId: string, dto: CreateTaskDto): Promise<NgWitnessTask>;
    offerTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask>;
    listAvailableTasks(userId: string, circleId: string): Promise<NgWitnessTask[]>;
    claimTask(userId: string, circleId: string, taskId: string, dto?: ClaimTaskDto): Promise<NgWitnessTask>;
    arriveAtTask(userId: string, circleId: string, taskId: string, dto: ArriveDto): Promise<NgWitnessTask>;
    submitTask(userId: string, circleId: string, taskId: string, dto: SubmitDto): Promise<NgWitnessTask>;
    closeTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask>;
    cancelTask(userId: string, circleId: string, taskId: string, reason?: string): Promise<NgWitnessTask>;
    getTask(userId: string, circleId: string, taskId: string): Promise<NgWitnessTask>;
    listTasks(userId: string, circleId: string, opts?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        tasks: NgWitnessTask[];
        total: number;
    }>;
    listMyTasks(userId: string): Promise<NgWitnessTask[]>;
    private getTaskOrThrow;
    private expireOverdueTasks;
    private verifyProximity;
    private calculateDistance;
    private toRad;
    private makeError;
}
