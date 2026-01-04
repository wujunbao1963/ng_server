import { Repository } from 'typeorm';
import { NgIncidentManifest } from '../edge-events/ng-incident-manifest.entity';
export declare class IncidentReadService {
    private readonly repo;
    constructor(repo: Repository<NgIncidentManifest>);
    getManifest(circleId: string, eventId: string): Promise<NgIncidentManifest | null>;
}
