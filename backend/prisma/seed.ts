import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash('password', 10);

  // Users
  const student1 = await prisma.user.upsert({
    where: { email: 'alice@student.com' },
    update: {},
    create: { email: 'alice@student.com', password, name: 'Alice Smith', role: 'STUDENT' },
  });
  
  const student2 = await prisma.user.upsert({
    where: { email: 'bob@student.com' },
    update: {},
    create: { email: 'bob@student.com', password, name: 'Bob Jones', role: 'STUDENT' },
  });

  const instructor = await prisma.user.upsert({
    where: { email: 'instructor@school.com' },
    update: {},
    create: { email: 'instructor@school.com', password, name: 'Dr. Instructor', role: 'INSTRUCTOR' },
  });

  // Organization
  const org = await prisma.organization.create({
    data: { name: 'Shodh University' },
  });

  // Contest
  const contest = await prisma.contest.create({
    data: {
      title: 'Midterm Algorithms',
      description: 'Test your algo skills.',
      organizationId: org.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000),
    },
  });

  // Problems
  const problem1 = await prisma.problem.create({
    data: {
      contestId: contest.id,
      title: 'Two Sum',
      description: 'Given an array of integers, return indices of the two numbers such that they add up to a specific target.',
      points: 10,
      testCases: {
        create: [
          { input: '2 7 11 15\n9', expected: '0 1', isHidden: false },
          { input: '3 2 4\n6', expected: '1 2', isHidden: true },
        ],
      },
    },
  });

  // Submissions (Alice fails, Bob passes)
  // We won't judge them, just seed the final state for AI to investigate
  const sub1 = await prisma.submission.create({
    data: {
      userId: student1.id,
      problemId: problem1.id,
      code: 'def two_sum():\n  pass\n',
      language: 'python',
      status: 'COMPLETED',
      verdict: 'WRONG_ANSWER',
      score: 0,
    }
  });

  const sub2 = await prisma.submission.create({
    data: {
      userId: student2.id,
      problemId: problem1.id,
      code: 'def two_sum():\n  print("1 2")\n', // mock hardcoded
      language: 'python',
      status: 'COMPLETED',
      verdict: 'ACCEPTED',
      score: 10,
    }
  });

  // Judge event
  await prisma.judgeEvent.create({
    data: {
      type: 'INFRA_FAILURE',
      description: 'Worker worker-x123 crashed during processing due to out of memory.',
      affectedIds: JSON.stringify([sub1.id]),
    }
  });

  console.log('Database seeded!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
