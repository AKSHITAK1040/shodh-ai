import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SubmissionsService {
  constructor(private prisma: PrismaService) {}

  async submitCode(userId: string, problemId: string, code: string, language: string) {
    // Check if user joined contest
    const problem = await this.prisma.problem.findUnique({ where: { id: problemId } });
    if (!problem) throw new NotFoundException('Problem not found');

    const participant = await this.prisma.contestParticipant.findUnique({
      where: { userId_contestId: { userId, contestId: problem.contestId } },
    });
    if (!participant) {
      throw new ForbiddenException('You must join the contest first');
    }

    const normalizedLang = (language || 'python').toLowerCase();

    // Create Submission and JudgeJob in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const submission = await tx.submission.create({
        data: {
          userId,
          problemId,
          code,
          language: normalizedLang,
          status: 'QUEUED',
        },
      });

      await tx.judgeJob.create({
        data: {
          submissionId: submission.id,
          status: 'QUEUED',
        },
      });

      return submission;
    });
    
    // AI Indexing (Eventual Consistency)
    try {
      fetch('http://localhost:3002/index/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: result.id,
          type: 'Submission',
          content: `Submission ${result.id} (${result.language}) by ${userId} for problem ${problemId}. Code: ${code.substring(0, 100)}`
        })
      }).catch(e => console.error("AI Sync failed, but continuing:", e));
    } catch (e) {}

    return result;
  }

  async getSubmission(id: string, userId: string, userRole: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id },
      include: {
        problem: true,
        testCaseResults: {
          include: { testCase: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    if (submission.userId !== userId && userRole === 'STUDENT') {
      throw new ForbiddenException('You can only view your own submissions');
    }

    const testCaseResults = submission.testCaseResults || [];
    const totalTestcases = testCaseResults.length;
    const passedTestcases = testCaseResults.filter((r) => r.passed).length;
    const maxScore = submission.problem?.points ?? 10;

    const sanitizedResults = testCaseResults.map((r) => {
      const isHidden = r.testCase?.isHidden ?? false;
      if (userRole === 'STUDENT' && isHidden) {
        return {
          id: r.id,
          testCaseId: r.testCaseId,
          visible: false,
          passed: r.passed,
          maxPoints: r.maxPoints,
          pointsAwarded: r.pointsAwarded,
          verdict: r.passed ? 'PASSED' : r.verdict,
          executionTimeMs: r.executionTimeMs,
          testCase: {
            id: r.testCase?.id,
            isHidden: true,
            order: r.testCase?.order,
            points: r.testCase?.points,
          },
        };
      }

      return {
        id: r.id,
        testCaseId: r.testCaseId,
        visible: !isHidden,
        passed: r.passed,
        maxPoints: r.maxPoints,
        pointsAwarded: r.pointsAwarded,
        verdict: r.verdict,
        executionTimeMs: r.executionTimeMs,
        memoryUsageMb: r.memoryUsageMb,
        stdout: r.stdout,
        stderr: r.stderr,
        testCase: {
          id: r.testCase?.id,
          isHidden: isHidden,
          order: r.testCase?.order,
          points: r.testCase?.points,
          input: (!isHidden || userRole !== 'STUDENT') ? r.testCase?.input : undefined,
          expected: (!isHidden || userRole !== 'STUDENT') ? r.testCase?.expected : undefined,
        },
      };
    });

    const hiddenCount = testCaseResults.filter((r) => r.testCase?.isHidden).length;
    const hiddenPassed = testCaseResults.filter((r) => r.testCase?.isHidden && r.passed).length;

    return {
      ...submission,
      maxScore,
      totalTestcases,
      passedTestcases,
      hiddenCount,
      hiddenPassed,
      testCaseResults: sanitizedResults,
      testcases: sanitizedResults,
    };
  }

  async getUserSubmissions(userId: string) {
    return this.prisma.submission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
