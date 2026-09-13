import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProblemsService {
  constructor(private prisma: PrismaService) {}

  async findOne(id: string, userRole: string) {
    const problem = await this.prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: userRole === 'STUDENT' ? { where: { isHidden: false } } : true,
      },
    });
    if (!problem) throw new NotFoundException('Problem not found');
    return problem;
  }

  async create(data: { contestId: string; title: string; description: string; points: number; testCases: any[] }) {
    const { testCases, ...problemData } = data;
    return this.prisma.problem.create({
      data: {
        ...problemData,
        testCases: {
          create: testCases,
        },
      },
      include: { testCases: true },
    });
  }
}
