import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';

/**
 * RAHA Action Types
 * Per NG_INTERFACE_CONTRACT_MASTER_v8 §B.3.2
 */
export enum HumanActionType {
  RESOLVE = 'RESOLVE',
  DISMISS = 'DISMISS',
  DISARM = 'DISARM',
  MODE_CHANGE = 'MODE_CHANGE',
  STOP_SIREN = 'STOP_SIREN',
}

/**
 * Request DTO for executing a RAHA
 */
export class ExecuteActionDto {
  @IsEnum(HumanActionType)
  action!: HumanActionType;

  @IsOptional()
  @IsString()
  eventId?: string;

  @IsOptional()
  @IsObject()
  params?: Record<string, any>;
}

/**
 * Response for RAHA execution
 */
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

/**
 * Edge device info needed for RAHA forwarding
 */
export interface EdgeDeviceInfo {
  deviceId: string;
  circleId: string;
  edgeUrl: string | null;
  edgeInstanceId: string | null;
  enabled: boolean;
}
