import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('LeaderboardService', () => {
  let service: LeaderboardService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      leaderboardEntry: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
  });

  describe('getLeaderboard', () => {
    it('returns leaderboard entries sorted by score descending', async () => {
      const mockEntries = [
        { id: '1', contestId: 'contest1', userId: 'user1', score: 100 },
        { id: '2', contestId: 'contest1', userId: 'user2', score: 80 },
        { id: '3', contestId: 'contest1', userId: 'user3', score: 60 },
      ];
      prisma.leaderboardEntry.findMany.mockResolvedValue(mockEntries);

      const result = await service.getLeaderboard('contest1');

      expect(result).toBe(mockEntries);
      expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: { contestId: 'contest1' },
        orderBy: { score: 'desc' },
      });
    });

    it('returns empty array when no entries exist for contest', async () => {
      prisma.leaderboardEntry.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('unknown-contest');

      expect(result).toEqual([]);
      expect(prisma.leaderboardEntry.findMany).toHaveBeenCalledWith({
        where: { contestId: 'unknown-contest' },
        orderBy: { score: 'desc' },
      });
    });
  });
});
