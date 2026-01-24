export declare class NgWitnessTask {
    id: string;
    circleId: string;
    eventId: string | null;
    title: string;
    description: string | null;
    status: 'created' | 'offered' | 'claimed' | 'arrived' | 'submitted' | 'closed' | 'canceled' | 'expired' | 'abandoned';
    creatorUserId: string;
    creatorRole: 'owner' | 'caretaker';
    witnessUserId: string | null;
    createdAt: Date;
    offeredAt: Date | null;
    claimedAt: Date | null;
    arrivedAt: Date | null;
    submittedAt: Date | null;
    closedAt: Date | null;
    canceledAt: Date | null;
    expiresAt: Date | null;
    claimTtlSec: number;
    arriveTtlSec: number;
    submitTtlSec: number;
    proximityRadiusM: number;
    arrivalLatitude: number | null;
    arrivalLongitude: number | null;
    arrivalAccuracyM: number | null;
    proximityVerified: boolean;
    proximityFailureReason: string | null;
    submissionNotes: string | null;
    submissionPhotos: Array<{
        url: string;
        uploadedAt: string;
    }> | null;
    canceledByUserId: string | null;
    cancelReason: string | null;
    metadata: Record<string, any> | null;
}
