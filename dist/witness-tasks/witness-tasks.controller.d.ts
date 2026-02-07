import { WitnessTasksService, CreateTaskDto, ClaimTaskDto, ArriveDto, SubmitDto, RiskAbortDto } from './witness-tasks.service';
import { JwtUser } from '../auth/auth.types';
interface MulterFile {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer?: Buffer;
}
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
        };
    }>;
    riskAbortTask(circleId: string, taskId: string, dto: RiskAbortDto, req: {
        user: JwtUser;
    }): Promise<{
        task: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
        };
    }>;
    uploadEvidence(circleId: string, taskId: string, file: MulterFile, req: {
        user: JwtUser;
    }): Promise<{
        success: boolean;
        evidence: {
            id: string;
            url: string;
            filename: string;
            originalName: string;
            mimetype: string;
            size: number;
            uploadedAt: string;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
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
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
        }[];
    }>;
    listAllAvailableTasks(req: {
        user: JwtUser;
    }): Promise<{
        tasks: {
            id: any;
            circleId: any;
            eventId: any;
            title: any;
            description: any;
            purpose: any;
            targetEntry: any;
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
            conclusion: any;
            conclusionNote: any;
            submissionNotes: any;
            submissionPhotos: any;
            cancelReason: any;
            riskAbortReason: any;
            riskAbortedAt: any;
        }[];
    }>;
    private formatTask;
}
export {};
