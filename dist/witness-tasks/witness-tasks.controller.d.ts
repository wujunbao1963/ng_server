import { WitnessTasksService, CreateTaskDto, ClaimTaskDto, ArriveDto, SubmitDto } from './witness-tasks.service';
import { JwtUser } from '../auth/auth.types';
export declare class WitnessTasksController {
    private readonly tasksService;
    constructor(tasksService: WitnessTasksService);
    createTask(circleId: string, dto: CreateTaskDto, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    listTasks(circleId: string, status?: string, limit?: string, offset?: string, req?: {
        user: JwtUser;
    }): Promise<{
        tasks: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        }[];
        total: number;
    }>;
    listAvailableTasks(circleId: string, req: {
        user: JwtUser;
    }): Promise<{
        tasks: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        }[];
    }>;
    getTask(circleId: string, taskId: string, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    offerTask(circleId: string, taskId: string, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    claimTask(circleId: string, taskId: string, dto: ClaimTaskDto, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    arriveAtTask(circleId: string, taskId: string, dto: ArriveDto, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    submitTask(circleId: string, taskId: string, dto: SubmitDto, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    closeTask(circleId: string, taskId: string, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    cancelTask(circleId: string, taskId: string, dto: {
        reason?: string;
    }, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        };
    }>;
    listMyTasks(req: {
        user: JwtUser;
    }): Promise<{
        tasks: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            status: any;
            creatorUserId: any;
            creatorRole: any;
            witnessUserId: any;
            createdAt: any;
            offeredAt: any;
            claimedAt: any;
            arrivedAt: any;
            submittedAt: any;
            closedAt: any;
            canceledAt: any;
            expiresAt: any;
            proximityVerified: any;
            proximityFailureReason: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
        }[];
    }>;
    private formatTask;
}
