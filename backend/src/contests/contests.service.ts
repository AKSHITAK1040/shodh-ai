import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContestsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.contest.findMany();
  }

  async findOne(id: string) {
    const contest = await this.prisma.contest.findUnique({
      where: { id },
      include: {
        problems: {
          include: {
            testCases: {
              where: { isHidden: false, enabled: true },
              select: { id: true, input: true, expected: true, isHidden: true, points: true, order: true },
            },
          },
        },
      },
    });
    if (!contest) throw new NotFoundException('Contest not found');
    return contest;
  }

  async create(data: { title: string; description: string; organizationId: string; startTime: Date; endTime: Date }) {
    return this.prisma.contest.create({ data });
  }

  async joinContest(contestId: string, userId: string) {
    return this.prisma.contestParticipant.upsert({
      where: { userId_contestId: { userId, contestId } },
      update: {},
      create: { userId, contestId },
    });
  }
}
