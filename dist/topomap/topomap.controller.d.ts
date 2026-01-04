import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
import { TopoMapService } from './topomap.service';
export declare class TopoMapController {
    private readonly topo;
    private readonly contracts;
    constructor(topo: TopoMapService, contracts: ContractsValidatorService);
    putTopoMap(circleId: string, _device: any, body: unknown): Promise<{
        ok: boolean;
    }>;
    getTopoMap(circleId: string): Promise<{
        version: number;
        data: unknown;
    }>;
}
