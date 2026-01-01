import {
  BadGatewayException,
  Controller,
  ForbiddenException,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Req,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'stream';
import { EvidenceTicketsService } from './evidence-tickets.service';

@Controller('/api/evidence/tickets')
export class EvidenceTicketDownloadController {
  constructor(
    private readonly svc: EvidenceTicketsService,
  ) {}

  /**
   * Download evidence via ticket
   * 
   * 注意：此端点不使用 JWT 认证，因为：
   * 1. Ticket 本身就是短期认证凭证 (TTL 通常 10 分钟)
   * 2. Ticket 创建时已验证用户身份和 circle 权限
   * 3. <video> 和 <img> 标签无法发送 Authorization header
   * 
   * 安全措施：
   * - Ticket 有过期时间
   * - Ticket 绑定特定 evidenceKey
   * - 每次下载都记录审计日志
   */
  @Get(':ticketId/download')
  async download(
    @Param('ticketId', new ParseUUIDPipe({ version: '4' })) ticketId: string,
    @Req() req: { headers?: Record<string, string | string[] | undefined> },
    @Res() res: Response,
  ) {
    const { ticket, manifest } = await this.svc.resolveTicket({ ticketId });
    if (!ticket) throw new NotFoundException('ticket not found');

    const now = Date.now();
    if (ticket.expiresAt.getTime() <= now) {
      throw new ForbiddenException('ticket expired');
    }

    if (!manifest) {
      throw new NotFoundException('incident manifest not found');
    }

    const edgeUrl = this.svc.extractEdgeUrl({ ticket, manifest });
    if (!edgeUrl) {
      throw new NotFoundException('evidence not available');
    }

    // Note: Lease mechanism disabled for now because:
    // 1. Video players send multiple Range requests concurrently
    // 2. Ticket itself has expiration and is bound to evidenceKey
    // 3. Audit logging still tracks all downloads
    
    // Proxy download from edgeUrl. Support HTTP Range requests (video/large files).
    const range = (req.headers?.['range'] as string | undefined) || undefined;
    const ac = new AbortController();
    const timeout = setTimeout(() => ac.abort(), 15000);
    let upstream: globalThis.Response;
    try {
      upstream = await fetch(edgeUrl, {
        signal: ac.signal,
        headers: range ? { Range: range } : undefined,
      });
    } catch (e) {
      await this.svc.writeDownloadAudit({
        ticket,
        requesterUserId: ticket.requesterUserId,
        requestedRange: range || null,
        upstreamStatus: 0,
        bytesSent: null,
      });
      
      throw new BadGatewayException('failed to fetch evidence');
    } finally {
      clearTimeout(timeout);
    }

    // For common upstream errors, pass through the HTTP status rather than masking as 502.
    if (!upstream.body) {
      await this.svc.writeDownloadAudit({
        ticket,
        requesterUserId: ticket.requesterUserId,
        requestedRange: range || null,
        upstreamStatus: upstream.status,
        bytesSent: null,
      });
      
      throw new BadGatewayException(`upstream responded ${upstream.status}`);
    }
    if (!(upstream.status === 200 || upstream.status === 206)) {
      // 4xx/5xx from upstream
      await this.svc.writeDownloadAudit({
        ticket,
        requesterUserId: ticket.requesterUserId,
        requestedRange: range || null,
        upstreamStatus: upstream.status,
        bytesSent: null,
      });
      
      throw new HttpException(`upstream responded ${upstream.status}`, upstream.status);
    }

    res.status(upstream.status);

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    const len = upstream.headers.get('content-length');
    if (len) res.setHeader('Content-Length', len);

    const acceptRanges = upstream.headers.get('accept-ranges');
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    // Audit (best-effort).
    // IMPORTANT: do this BEFORE starting to stream the response body.
    // Otherwise the HTTP response can finish before audit insert completes
    // (causing flaky tests and "Connection terminated" on shutdown).
    try {
      await this.svc.writeDownloadAudit({
        ticket,
        requesterUserId: ticket.requesterUserId,
        requestedRange: range || null,
        upstreamStatus: upstream.status,
        bytesSent: len ? Number(len) : null,
      });
    } catch {
      // Swallow audit errors (do not fail download path)
    }

    // Pipe web stream to Node response.
    const nodeReadable = Readable.fromWeb(upstream.body as any);
    nodeReadable.pipe(res);
  }
}
