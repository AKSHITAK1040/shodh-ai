import { Test, TestingModule } from '@nestjs/testing';
import { SubmissionsService } from './submissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      problem: { findUnique: vi.fn() },
      contestParticipant: { findUnique: vi.fn() },
      $transaction: vi.fn(),
      submission: { findUnique: vi.fn() }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubmissionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<SubmissionsService>(SubmissionsService);
    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  describe('submitCode', () => {
    it('throws NotFoundException if problem does not exist', async () => {
      prisma.problem.findUnique.mockResolvedValue(null);
      await expect(service.submitCode('user1', 'prob1', 'code', 'python'))
        .rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user has not joined contest', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'prob1', contestId: 'c1' });
      prisma.contestParticipant.findUnique.mockResolvedValue(null);
      await expect(service.submitCode('user1', 'prob1', 'code', 'python'))
        .rejects.toThrow(ForbiddenException);
    });

    it('creates submission and queues job, then attempts AI sync', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'prob1', contestId: 'c1' });
      prisma.contestParticipant.findUnique.mockResolvedValue({ userId: 'user1' });
      
      const mockResult = { id: 'sub1' };
      prisma.$transaction.mockResolvedValue(mockResult);

      const res = await service.submitCode('user1', 'prob1', 'print("hello")', 'python');
      expect(res).toBe(mockResult);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3002/index/record',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('supports multiple languages (e.g. javascript, cpp) and normalizes them', async () => {
      prisma.problem.findUnique.mockResolvedValue({ id: 'prob1', contestId: 'c1' });
      prisma.contestParticipant.findUnique.mockResolvedValue({ userId: 'user1' });
      
      const mockResult = { id: 'sub2', language: 'javascript' };
      prisma.$transaction.mockImplementation(async (cb) => {
        const fakeTx = {
          submission: {
            create: vi.fn().mockImplementation(({ data }) => ({ id: 'sub2', ...data })),
          },
          judgeJob: {
            create: vi.fn().mockResolvedValue({ id: 'job2' }),
          },
        };
        return cb(fakeTx);
      });

      const res = await service.submitCode('user1', 'prob1', 'console.log("hello")', 'JAVASCRIPT');
      expect(res.language).toBe('javascript');
    });
  });

  describe('getSubmission', () => {
    it('throws NotFoundException if submission does not exist', async () => {
      prisma.submission.findUnique.mockResolvedValue(null);
      await expect(service.getSubmission('invalid-sub', 'user1', 'STUDENT'))
        .rejects.toThrow(NotFoundException);
    });

    it('prevents student from viewing another student submission', async () => {
      prisma.submission.findUnique.mockResolvedValue({ id: 'sub1', userId: 'user2' });
      await expect(service.getSubmission('sub1', 'user1', 'STUDENT'))
        .rejects.toThrow(ForbiddenException);
    });

    it('allows student to view their own submission', async () => {
      const mockSub = { id: 'sub1', userId: 'user1', problem: {} };
      prisma.submission.findUnique.mockResolvedValue(mockSub);
      const res = await service.getSubmission('sub1', 'user1', 'STUDENT');
      expect(res).toMatchObject(mockSub);
    });
  });
});
