import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OutboxWorker, OUTBOX_HANDLERS, OutboxHandler } from '../../src/common/outbox/outbox.worker';
import { OutboxService, ProcessResult } from '../../src/common/outbox/outbox.service';
import { NgOutbox, OutboxMessageType } from '../../src/common/outbox/ng-outbox.entity';
import { NgLoggerService } from '../../src/common/infra/logger.service';
import { MockClock, CLOCK_PORT } from '../../src/common/infra/clock.port';
import { ConfigService } from '@nestjs/config';

// Mock Handler for testing
class MockHandler implements OutboxHandler {
  readonly messageType: OutboxMessageType = 'PUSH_NOTIFICATION';
  public handledMessages: NgOutbox[] = [];
  public shouldFail = false;
  public failRetryable = true;

  async handle(message: NgOutbox): Promise<ProcessResult> {
    this.handledMessages.push(message);
    
    if (this.shouldFail) {
      return {
        success: false,
        error: 'Mock failure',
        retryable: this.failRetryable,
      };
    }
    
    return { success: true };
  }

  reset(): void {
    this.handledMessages = [];
    this.shouldFail = false;
    this.failRetryable = true;
  }
}

describe('OutboxWorker Integration', () => {
  let worker: OutboxWorker;
  let outboxService: OutboxService;
  let mockHandler: MockHandler;
  let mockRepo: Partial<Repository<NgOutbox>>;
  let mockClock: MockClock;
  let pendingMessages: NgOutbox[];

  beforeEach(async () => {
    pendingMessages = [];
    mockClock = new MockClock('2025-01-02T12:00:00Z');
    mockHandler = new MockHandler();

    mockRepo = {
      create: jest.fn((data) => ({
        ...data,
        id: 'msg-' + Date.now() + Math.random(),
        calculateNextRetry: function() {
          const baseDelayMs = 60 * 1000;
          const multiplier = Math.pow(5, this.retryCount);
          return new Date(Date.now() + baseDelayMs * multiplier);
        },
        canRetry: function() { return this.retryCount < this.maxRetries; },
      } as NgOutbox)),
      save: jest.fn(async (entity) => entity as NgOutbox),
      findOne: jest.fn(),
      update: jest.fn(async () => ({ affected: 0 })),
      delete: jest.fn(async () => ({ affected: 0 })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => pendingMessages),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => []),
      })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboxService,
        {
          provide: getRepositoryToken(NgOutbox),
          useValue: mockRepo,
        },
        {
          provide: CLOCK_PORT,
          useValue: mockClock,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: string) => {
              const config: Record<string, string> = {
                OUTBOX_WORKER_ENABLED: 'false', // disable auto-start
                OUTBOX_POLL_INTERVAL_MS: '100',
                OUTBOX_BATCH_SIZE: '10',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: OUTBOX_HANDLERS,
          useValue: [mockHandler],
        },
        NgLoggerService,
        OutboxWorker,
      ],
    }).compile();

    outboxService = module.get<OutboxService>(OutboxService);
    worker = module.get<OutboxWorker>(OutboxWorker);
  });

  afterEach(() => {
    mockHandler.reset();
  });

  describe('Message Processing', () => {
    it('should process pending messages', async () => {
      // Setup pending message
      const message: NgOutbox = {
        id: 'msg-1',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PENDING',
        payload: { title: 'Test', body: 'Test body' },
        aggregateId: 'notif-123',
        aggregateType: 'Notification',
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: null,
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: () => true,
      };
      pendingMessages.push(message);

      // Trigger poll
      await worker.triggerPoll();

      // Verify handler was called
      expect(mockHandler.handledMessages).toHaveLength(1);
      expect(mockHandler.handledMessages[0].id).toBe('msg-1');
    });

    it('should mark message as completed on success', async () => {
      const message: NgOutbox = {
        id: 'msg-2',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PENDING',
        payload: { title: 'Test' },
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: null,
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: () => true,
      };
      pendingMessages.push(message);

      await worker.triggerPoll();

      expect(message.status).toBe('COMPLETED');
      expect(message.completedAt).toBeDefined();
    });

    it('should mark message as failed on handler error', async () => {
      mockHandler.shouldFail = true;
      mockHandler.failRetryable = true;

      const message: NgOutbox = {
        id: 'msg-3',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PENDING',
        payload: { title: 'Test' },
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: null,
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: function() {
          const baseDelayMs = 60 * 1000;
          const multiplier = Math.pow(5, this.retryCount);
          return new Date(Date.now() + baseDelayMs * multiplier);
        },
        canRetry: function() { return this.retryCount < this.maxRetries; },
      };
      pendingMessages.push(message);

      await worker.triggerPoll();

      expect(message.status).toBe('FAILED');
      expect(message.retryCount).toBe(1);
      expect(message.lastError).toBe('Mock failure');
      expect(message.nextRetryAt).toBeDefined();
    });

    it('should move to DEAD on non-retryable error', async () => {
      mockHandler.shouldFail = true;
      mockHandler.failRetryable = false;

      const message: NgOutbox = {
        id: 'msg-4',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PENDING',
        payload: { title: 'Test' },
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: null,
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: () => true,
      };
      pendingMessages.push(message);

      await worker.triggerPoll();

      expect(message.status).toBe('DEAD');
    });
  });

  describe('getStats', () => {
    it('should return worker stats', async () => {
      const stats = await worker.getStats();

      expect(stats.enabled).toBe(false); // disabled in test
      expect(stats.handlersCount).toBe(1);
      expect(stats.messageStats).toBeDefined();
    });
  });
});
