import { ConfigService } from '@nestjs/config';
export declare class EvidenceStorageService {
    private readonly config;
    private readonly mode;
    private readonly expiresSec;
    private readonly bucket?;
    private readonly region?;
    private readonly endpoint?;
    private readonly forcePathStyle?;
    private readonly accessKeyId?;
    private readonly secretAccessKey?;
    private aws?;
    private s3Client?;
    constructor(config: ConfigService);
    presignUploadUrl(args: {
        circleId: string;
        eventId: string;
        sha256: string;
        contentType: string;
    }): Promise<{
        url: string;
        objectKey: string;
        expiresAt: string;
    }>;
    presignDownloadUrl(args: {
        circleId: string;
        eventId: string;
        sha256: string;
    }): Promise<{
        url: string;
        expiresAt: string;
    }>;
    private ensureAws;
    private ensureS3;
    private objectKey;
    private mustGet;
}
