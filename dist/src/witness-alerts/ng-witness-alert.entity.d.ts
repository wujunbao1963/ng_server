export declare enum WitnessAlertType {
    TASK_CREATED = "task_created",
    TASK_CLAIMED = "task_claimed",
    TASK_ARRIVED = "task_arrived",
    TASK_SUBMITTED = "task_submitted",
    TASK_CLOSED = "task_closed",
    TASK_CANCELED = "task_canceled",
    TASK_EXPIRED = "task_expired",
    TASK_ABANDONED = "task_abandoned",
    TASK_RISK_ABORTED = "task_risk_aborted"
}
export declare enum WitnessAlertPriority {
    LOW = "low",
    NORMAL = "normal",
    HIGH = "high",
    URGENT = "urgent"
}
export declare class NgWitnessAlert {
    id: string;
    userId: string;
    type: WitnessAlertType;
    priority: WitnessAlertPriority;
    title: string;
    body: string | null;
    circleId: string | null;
    taskId: string | null;
    eventId: string | null;
    actorUserId: string | null;
    actorRole: string | null;
    read: boolean;
    readAt: Date | null;
    data: Record<string, any> | null;
    createdAt: Date;
    expiresAt: Date | null;
}
