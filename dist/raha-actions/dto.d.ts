export declare enum HumanActionType {
    RESOLVE = "RESOLVE",
    DISMISS = "DISMISS",
    DISARM = "DISARM",
    MODE_CHANGE = "MODE_CHANGE",
    STOP_SIREN = "STOP_SIREN"
}
export declare class ExecuteActionDto {
    action: HumanActionType;
    eventId?: string;
    params?: Record<string, any>;
}
export interface HumanActionResultDto {
    requestId: string;
    eventId: string | null;
    accepted: boolean;
    rejectedCode?: string;
    rejectedReason?: string;
    activeResolver?: {
        role: string;
        id: string;
    };
    lockExpiresAt?: string;
    ledgerSeqCommitted?: number;
    fromState?: string;
    toState?: string;
}
export interface EdgeDeviceInfo {
    deviceId: string;
    circleId: string;
    edgeUrl: string | null;
    edgeInstanceId: string | null;
    enabled: boolean;
}
