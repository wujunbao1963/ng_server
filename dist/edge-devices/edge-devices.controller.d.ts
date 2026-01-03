import { EdgeDevicesService } from './edge-devices.service';
import { RegisterEdgeDeviceDto } from './dto/register-edge-device.dto';
import { UpdateEdgeDeviceDto } from './dto/update-edge-device.dto';
import { JwtUser } from '../auth/auth.types';
import { ContractsValidatorService } from '../common/contracts/contracts-validator.service';
export declare class EdgeDevicesController {
    private readonly edgeDevices;
    private readonly contracts;
    constructor(edgeDevices: EdgeDevicesService, contracts: ContractsValidatorService);
    register(circleId: string, body: RegisterEdgeDeviceDto, req: {
        user: JwtUser;
    }): Promise<import("./edge-devices.service").RegisterEdgeDeviceResponse>;
    list(circleId: string, req: {
        user: JwtUser;
    }): Promise<{
        deviceId: string;
        name: string | null;
        enabled: boolean;
        pairedAt: string;
        lastSeenAt: string | null;
        capabilities: {
            fusion: boolean;
            evidenceUpload: boolean;
            topomap: boolean;
        };
        metadata: Record<string, any> | null;
    }[]>;
    setEnabled(circleId: string, deviceId: string, body: UpdateEdgeDeviceDto, req: {
        user: JwtUser;
    }): Promise<{
        deviceId: string;
        enabled: boolean;
    }>;
    rotateKey(circleId: string, deviceId: string, req: {
        user: JwtUser;
    }): Promise<{
        deviceId: string;
        deviceKey: string;
        rotatedAt: string;
    }>;
}
