import { WitnessAlertsService } from './witness-alerts.service';
import { JwtUser } from '../auth/auth.types';
export declare class WitnessAlertsController {
    private readonly witnessAlertsService;
    constructor(witnessAlertsService: WitnessAlertsService);
    listAlerts(req: {
        user: JwtUser;
    }, unreadOnly?: string, types?: string, circleId?: string, limit?: string, offset?: string): Promise<{
        alerts: {
            id: any;
            type: any;
            priority: any;
            title: any;
            body: any;
            circleId: any;
            taskId: any;
            eventId: any;
            actorUserId: any;
            actorRole: any;
            read: any;
            readAt: any;
            data: any;
            createdAt: any;
        }[];
        total: number;
        unreadCount: number;
    }>;
    getUnreadCount(req: {
        user: JwtUser;
    }): Promise<{
        unreadCount: number;
    }>;
    markAsRead(alertId: string, req: {
        user: JwtUser;
    }): Promise<{
        success: boolean;
    }>;
    markAllAsRead(req: {
        user: JwtUser;
    }): Promise<{
        success: boolean;
        markedCount: number;
    }>;
    deleteAlert(alertId: string, req: {
        user: JwtUser;
    }): Promise<{
        success: boolean;
    }>;
    private formatAlert;
}
