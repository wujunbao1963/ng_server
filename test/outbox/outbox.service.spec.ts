import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { OutboxService } from '../../src/common/outbox/outbox.service';
import { NgOutbox } from '../../src/common/outbox/ng-outbox.entity';
import { NgLoggerService } from '../../src/common/infra/logger.service';
import { MockClock, CLOCK_PORT } from '../../src/common/infra/clock.port';

describe('OutboxService', () => {
  let service: OutboxService;
  let mockRepo: Partial<Repository<NgOutbox>>;
  let mockClock: MockClock;
  let savedMessages: NgOutbox[];

  beforeEach(async () => {
    savedMessages = [];
    mockClock = new MockClock('2025-01-02T12:00:00Z');

    mockRepo = {
      create: jest.fn((data) => ({ ...data, id: 'test-id-' + Date.now() } as NgOutbox)),
      save: jest.fn(async (entity) => {
        savedMessages.push(entity as NgOutbox);
        return entity as NgOutbox;
      }),
      findOne: jest.fn(),
      update: jest.fn(async () => ({ affected: 0 })),
      delete: jest.fn(async () => ({ affected: 0 })),
      createQueryBuilder: jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        setLock: jest.fn().mockReturnThis(),
        getMany: jest.fn(async () => []),
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
        NgLoggerService,
      ],
    }).compile();

    service = module.get<OutboxService>(OutboxService);
  });

  describe('enqueue', () => {
    it('should create a new outbox message', async () => {
      const result = await service.enqueue({
        messageType: 'PUSH_NOTIFICATION',
        payload: { title: 'Test', body: 'Test body' },
        aggregateId: 'notif-123',
        aggregateType: 'Notification',
      });

      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.messageType).toBe('PUSH_NOTIFICATION');
      expect(result.status).toBe('PENDING');
    });

    it('should set scheduled_at in the future for delayed messages', async () => {
      const result = await service.enqueue({
        messageType: 'PUSH_NOTIFICATION',
        payload: { title: 'Test' },
        delaySeconds: 60,
      });

      const createdMessage = (mockRepo.create as jest.Mock).mock.calls[0][0];
      const expectedScheduledAt = new Date(mockClock.now().getTime() + 60 * 1000);
      expect(createdMessage.scheduledAt.getTime()).toBe(expectedScheduledAt.getTime());
    });

    it('should set idempotency key if provided', async () => {
      await service.enqueue({
        messageType: 'PUSH_NOTIFICATION',
        payload: { title: 'Test' },
        idempotencyKey: 'unique-key-123',
      });

      const createdMessage = (mockRepo.create as jest.Mock).mock.calls[0][0];
      expect(createdMessage.idempotencyKey).toBe('unique-key-123');
    });
  });

  describe('markCompleted', () => {
    it('should update status and set completedAt', async () => {
      const message: NgOutbox = {
        id: 'msg-1',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PROCESSING',
        payload: {},
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: new Date(mockClock.now().getTime() - 100),
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: () => true,
      };

      await service.markCompleted(message);

      expect(message.status).toBe('COMPLETED');
      expect(message.completedAt).toBeDefined();
      expect(message.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('markFailed', () => {
    it('should increment retry count and set next retry time', async () => {
      const message: NgOutbox = {
        id: 'msg-1',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PROCESSING',
        payload: {},
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: new Date(),
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

      await service.markFailed(message, 'Test error', true);

      expect(message.status).toBe('FAILED');
      expect(message.retryCount).toBe(1);
      expect(message.lastError).toBe('Test error');
      expect(message.nextRetryAt).toBeDefined();
    });

    it('should move to DEAD if max retries exceeded', async () => {
      const message: NgOutbox = {
        id: 'msg-1',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PROCESSING',
        payload: {},
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 5, // already at max
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: new Date(),
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: function() { return this.retryCount < this.maxRetries; },
      };

      await service.markFailed(message, 'Final error', true);

      expect(message.status).toBe('DEAD');
      expect(message.retryCount).toBe(6);
    });

    it('should move to DEAD immediately if not retryable', async () => {
      const message: NgOutbox = {
        id: 'msg-1',
        messageType: 'PUSH_NOTIFICATION',
        status: 'PROCESSING',
        payload: {},
        aggregateId: null,
        aggregateType: null,
        idempotencyKey: null,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 5,
        nextRetryAt: null,
        lastError: null,
        startedAt: new Date(),
        completedAt: null,
        processingTimeMs: null,
        createdAt: new Date(),
        calculateNextRetry: () => new Date(),
        canRetry: () => true,
      };

      await service.markFailed(message, 'Non-retryable error', false);

      expect(message.status).toBe('DEAD');
    });
  });

  describe('getStats', () => {
    it('should return counts by status', async () => {
      (mockRepo.createQueryBuilder as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn(async () => [
          { status: 'PENDING', count: '5' },
          { status: 'COMPLETED', count: '100' },
          { status: 'FAILED', count: '2' },
        ]),
      });

      const stats = await service.getStats();

      expect(stats.PENDING).toBe(5);
      expect(stats.COMPLETED).toBe(100);
      expect(stats.FAILED).toBe(2);
      expect(stats.DEAD).toBe(0);
      expect(stats.PROCESSING).toBe(0);
    });
  });
});
