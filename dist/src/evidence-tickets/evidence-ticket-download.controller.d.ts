import { Response } from 'express';
import { EvidenceTicketsService } from './evidence-tickets.service';
export declare class EvidenceTicketDownloadController {
    private readonly svc;
    constructor(svc: EvidenceTicketsService);
    download(ticketId: string, req: {
        headers?: Record<string, string | string[] | undefined>;
    }, res: Response): Promise<void>;
}
