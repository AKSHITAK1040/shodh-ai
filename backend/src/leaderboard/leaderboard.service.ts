import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LeaderboardService {
  constructor(private prisma: PrismaService) {}

  async getLeaderboard(contestId: string) {
    return this.prisma.leaderboardEntry.findMany({
      where: { contestId },
      orderBy: { score: 'desc' },
    });
  }
}
