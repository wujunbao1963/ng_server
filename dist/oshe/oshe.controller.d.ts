import { OsheService, CreateOsheDto } from './oshe.service';
import { JwtUser } from '../auth/auth.types';
export declare class OsheController {
    private readonly osheService;
    constructor(osheService: OsheService);
    createOshe(circleId: string, eventId: string, body: CreateOsheDto & {
        eventThreatState?: string;
        eventStateChangedAt?: string;
    }, req: {
        user: JwtUser;
    }): Promise<{
        oshe: {
            id: any;
            circleId: any;
            eventId: any;
            evidenceClass: any;
            mediaType: any;
            capturedAt: any;
            capturedByUserId: any;
            capturedByRole: any;
            afterThreatState: any;
            source: string;
            auditWeight: string;
            presenceVerified: any;
            presenceVerificationDegraded: any;
            presenceLocation: {
                latitude: any;
                longitude: any;
                accuracyM: any;
            } | null;
            file: {
                url: any;
                name: any;
                sizeBytes: any;
                hashSha256: any;
            };
            serverReceivedAt: any;
            timestampDiscrepancy: any;
            notes: any;
            witnessTaskId: any;
        };
    }>;
    listOshe(circleId: string, eventId: string, req: {
        user: JwtUser;
    }): Promise<{
        osheItems: {
            id: any;
            circleId: any;
            eventId: any;
            evidenceClass: any;
            mediaType: any;
            capturedAt: any;
            capturedByUserId: any;
            capturedByRole: any;
            afterThreatState: any;
            source: string;
            auditWeight: string;
            presenceVerified: any;
            presenceVerificationDegraded: any;
            presenceLocation: {
                latitude: any;
                longitude: any;
                accuracyM: any;
            } | null;
            file: {
                url: any;
                name: any;
                sizeBytes: any;
                hashSha256: any;
            };
            serverReceivedAt: any;
            timestampDiscrepancy: any;
            notes: any;
            witnessTaskId: any;
        }[];
        total: number;
    }>;
    getManifest(circleId: string, eventId: string, req: {
        user: JwtUser;
    }): Promise<{
        eventId: string;
        osheItems: {
            itemId: string;
            type: string;
            source: string;
            auditWeight: string;
            capturedAt: string;
            capturedByRole: string;
            afterThreatState: string;
        }[];
        count: number;
        note: string;
    }>;
    getOshe(circleId: string, eventId: string, osheId: string, req: {
        user: JwtUser;
    }): Promise<{
        oshe: {
            id: any;
            circleId: any;
            eventId: any;
            evidenceClass: any;
            mediaType: any;
            capturedAt: any;
            capturedByUserId: any;
            capturedByRole: any;
            afterThreatState: any;
            source: string;
            auditWeight: string;
            presenceVerified: any;
            presenceVerificationDegraded: any;
            presenceLocation: {
                latitude: any;
                longitude: any;
                accuracyM: any;
            } | null;
            file: {
                url: any;
                name: any;
                sizeBytes: any;
                hashSha256: any;
            };
            serverReceivedAt: any;
            timestampDiscrepancy: any;
            notes: any;
            witnessTaskId: any;
        };
    }>;
    private formatOshe;
}
