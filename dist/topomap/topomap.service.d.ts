import { Repository } from 'typeorm';
import { NgTopoMap } from './ng-topomap.entity';
export declare class TopoMapService {
    private readonly repo;
    constructor(repo: Repository<NgTopoMap>);
    upsert(circleId: string, payload: {
        version: number;
        data: unknown;
    }): Promise<void>;
    get(circleId: string): Promise<{
        version: number;
        data: unknown;
    } | null>;
}
