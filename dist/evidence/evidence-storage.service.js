"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceStorageService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let EvidenceStorageService = class EvidenceStorageService {
    constructor(config) {
        this.config = config;
        this.mode = (this.config.get('EVIDENCE_STORAGE_MODE') ?? 'mock');
        this.expiresSec = Number(this.config.get('EVIDENCE_URL_EXPIRES_SEC') ?? '900');
        if (this.mode === 's3') {
            this.bucket = this.mustGet('EVIDENCE_S3_BUCKET');
            this.region = this.config.get('EVIDENCE_S3_REGION') ?? 'auto';
            this.endpoint = this.config.get('EVIDENCE_S3_ENDPOINT') ?? undefined;
            this.forcePathStyle = (this.config.get('EVIDENCE_S3_FORCE_PATH_STYLE') ?? 'false') === 'true';
            this.accessKeyId = this.mustGet('EVIDENCE_S3_ACCESS_KEY_ID');
            this.secretAccessKey = this.mustGet('EVIDENCE_S3_SECRET_ACCESS_KEY');
        }
    }
    async presignUploadUrl(args) {
        const key = this.objectKey(args.circleId, args.eventId, args.sha256);
        const expiresAt = new Date(Date.now() + this.expiresSec * 1000).toISOString();
        if (this.mode === 'mock') {
            return {
                url: `https://mock.neighborguard.local/upload/${args.sha256}?key=${encodeURIComponent(key)}`,
                objectKey: key,
                expiresAt,
            };
        }
        const { PutObjectCommand, getSignedUrl } = await this.ensureAws();
        const s3 = await this.ensureS3();
        const bucket = this.bucket;
        const cmd = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: args.contentType,
        });
        const url = await getSignedUrl(s3, cmd, { expiresIn: this.expiresSec });
        return { url, objectKey: key, expiresAt };
    }
    async presignDownloadUrl(args) {
        const key = this.objectKey(args.circleId, args.eventId, args.sha256);
        const expiresAt = new Date(Date.now() + this.expiresSec * 1000).toISOString();
        if (this.mode === 'mock') {
            return { url: `https://mock.neighborguard.local/download/${args.sha256}?key=${encodeURIComponent(key)}`, expiresAt };
        }
        const { GetObjectCommand, getSignedUrl } = await this.ensureAws();
        const s3 = await this.ensureS3();
        const bucket = this.bucket;
        const cmd = new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        });
        const url = await getSignedUrl(s3, cmd, { expiresIn: this.expiresSec });
        return { url, expiresAt };
    }
    async ensureAws() {
        if (this.aws)
            return this.aws;
        const s3mod = await Promise.resolve().then(() => require('@aws-sdk/client-s3'));
        const presigner = await Promise.resolve().then(() => require('@aws-sdk/s3-request-presigner'));
        this.aws = {
            S3Client: s3mod.S3Client,
            PutObjectCommand: s3mod.PutObjectCommand,
            GetObjectCommand: s3mod.GetObjectCommand,
            getSignedUrl: presigner.getSignedUrl,
        };
        return this.aws;
    }
    async ensureS3() {
        if (this.s3Client)
            return this.s3Client;
        const { S3Client } = await this.ensureAws();
        this.s3Client = new S3Client({
            region: this.region,
            endpoint: this.endpoint,
            forcePathStyle: this.forcePathStyle,
            credentials: {
                accessKeyId: this.accessKeyId,
                secretAccessKey: this.secretAccessKey,
            },
        });
        return this.s3Client;
    }
    objectKey(circleId, eventId, sha256) {
        return `circles/${circleId}/events/${eventId}/${sha256}`;
    }
    mustGet(name) {
        const v = this.config.get(name);
        if (!v) {
            throw new Error(`${name} is required when EVIDENCE_STORAGE_MODE=s3`);
        }
        return v;
    }
};
exports.EvidenceStorageService = EvidenceStorageService;
exports.EvidenceStorageService = EvidenceStorageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EvidenceStorageService);
//# sourceMappingURL=evidence-storage.service.js.map