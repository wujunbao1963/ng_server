declare class CapabilitiesDto {
    fusion?: boolean;
    evidenceUpload?: boolean;
    topomap?: boolean;
}
export declare class RegisterEdgeDeviceDto {
    deviceName?: string;
    platform?: 'home_assistant' | 'edge_agent' | 'other';
    haInstanceId?: string;
    softwareVersion?: string;
    publicKey?: string;
    capabilities?: CapabilitiesDto;
}
export {};
