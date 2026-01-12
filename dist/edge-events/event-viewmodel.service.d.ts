import { TopoMapService } from '../topomap/topomap.service';
export interface EventViewModel {
    schemaVersion: 'ng.ui.event.viewmodel/1.0';
    edgeSpecVersion: 'v7.7';
    eventId: string;
    edgeInstanceId?: string;
    createdAt: string;
    updatedAt: string;
    timeText: string;
    mode: 'home' | 'away' | 'night' | 'disarm';
    modeLabel: string;
    entryPoint: {
        id?: string;
        label: string;
    };
    threatState: 'NONE' | 'PRE' | 'PENDING' | 'TRIGGERED' | 'RESOLVED' | 'CANCELED';
    triggerReason?: 'none' | 'entry_delay_expired' | 'glass_break' | 'tamper_verified_by_user' | 'life_safety';
    statusLabel: string;
    headlineText: string;
    workflowClass?: 'SECURITY_HEAVY' | 'SUSPICION_LIGHT' | 'LOGISTICS' | 'LIFE_SAFETY' | 'NONE';
    facts: Array<{
        iconKey?: string;
        text: string;
    }>;
    explanations?: Array<{
        text: string;
    }>;
    userActions?: Array<{
        type: string;
        at: string;
        note?: string;
    }>;
    nextActions: Array<{
        actionId: string;
        label: string;
        style?: 'primary' | 'secondary' | 'danger' | 'link';
    }>;
    media?: Array<{
        kind: 'key_clip' | 'snapshot' | 'incident_packet_item';
        title?: string;
        sizeBytes?: number;
        durationSec?: number;
        access?: {
            type: string;
            url?: string;
            expiresAt?: string;
        };
    }>;
    privacy: {
        level: 'summary_only' | 'authorized_media';
        note?: string;
    };
    debug?: Record<string, unknown>;
}
interface RawEventData {
    eventId: string;
    edgeInstanceId?: string;
    threatState: string;
    triggerReason?: string | null;
    edgeUpdatedAt: Date;
    summaryJson?: Record<string, unknown>;
    status?: string;
}
export declare class EventViewModelService {
    private readonly topoMapService;
    private readonly defaultEntryPointLabels;
    private readonly modeLabels;
    private readonly statusLabels;
    private readonly triggerReasonLabels;
    constructor(topoMapService: TopoMapService);
    toViewModel(raw: RawEventData, circleId: string, options?: {
        includeDebug?: boolean;
    }): Promise<EventViewModel>;
    toViewModelList(events: RawEventData[], circleId: string): Promise<EventViewModel[]>;
    private resolveEntryPointLabel;
    private generateHeadline;
    private formatTimeText;
    private generateFacts;
    private generateExplanations;
    private generateNextActions;
    private getIconKeyForTrigger;
}
export {};
