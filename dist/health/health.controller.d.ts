import { HealthService } from './health.service';
export declare class HealthController {
    private readonly healthService;
    constructor(healthService: HealthService);
    health(): Promise<{
        ok: boolean;
        db: string;
        error?: undefined;
    } | {
        ok: boolean;
        db: string;
        error: any;
    }>;
    apiHealth(): Promise<{
        ok: boolean;
        db: string;
        error?: undefined;
    } | {
        ok: boolean;
        db: string;
        error: any;
    }>;
    private doHealthCheck;
}
