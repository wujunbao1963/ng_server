import { DataSource, Repository } from 'typeorm';
import { NgEdgeIngestAudit } from './ng-edge-ingest-audit.entity';
import { NgIncidentManifest } from './ng-incident-manifest.entity';
import { NgIncidentManifestRaw } from './ng-incident-manifest-raw.entity';
export type EdgeIncidentManifestUpsertV77 = {
    schemaVersion: 'v7.7';
    circleId: string;
    eventId: string;
    edgeInstanceId: string;
    updatedAt: string;
    sequence: number;
    manifest: Record<string, unknown>;
    [k: string]: unknown;
};
export type IncidentManifestUpsertResult = {
    applied: boolean;
    reason: 'applied' | 'stale_sequence' | 'stale_timestamp' | 'duplicate_payload';
};
export declare class IncidentManifestsService {
    private readonly rawRepo;
    private readonly manifestRepo;
    private readonly auditRepo;
    private readonly dataSource;
    constructor(rawRepo: Repository<NgIncidentManifestRaw>, manifestRepo: Repository<NgIncidentManifest>, auditRepo: Repository<NgEdgeIngestAudit>, dataSource: DataSource);
    storeManifestUpsert(payload: EdgeIncidentManifestUpsertV77): Promise<IncidentManifestUpsertResult>;
}
