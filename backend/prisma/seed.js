const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // 0. Standardize any datetime strings in SQLite before querying with Prisma
  try {
    await prisma.$executeRawUnsafe(`
      UPDATE Submission SET 
        createdAt = COALESCE(datetime(createdAt), datetime(createdAt / 1000, 'unixepoch'), datetime('now')),
        updatedAt = COALESCE(datetime(updatedAt), datetime(updatedAt / 1000, 'unixepoch'), datetime('now'))
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE JudgeJob SET 
        startedAt = COALESCE(datetime(startedAt), datetime(startedAt / 1000, 'unixepoch'), datetime('now')),
        completedAt = COALESCE(datetime(completedAt), datetime(completedAt / 1000, 'unixepoch'), datetime('now'))
      WHERE startedAt IS NOT NULL
    `);
    await prisma.$executeRawUnsafe(`
      UPDATE JudgeEvent SET 
        timestamp = COALESCE(datetime(timestamp), datetime(timestamp / 1000, 'unixepoch'), datetime('now'))
      WHERE timestamp IS NOT NULL
    `);
  } catch (e) {}

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
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'Shodh University' },
    });
  }

  // Contest
  const contestId = '6bde464d-7b9f-4ef3-9d5e-f6f1e5ee5d9d';
  const contest = await prisma.contest.upsert({
    where: { id: contestId },
    update: {},
    create: {
      id: contestId,
      title: 'Midterm Algorithms',
      description: 'Solve core algorithmic challenges under live contest conditions.',
      organizationId: org.id,
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000),
    },
  });

  // Ensure Alice joined contest
  await prisma.contestParticipant.upsert({
    where: { userId_contestId: { userId: student1.id, contestId: contest.id } },
    update: {},
    create: { userId: student1.id, contestId: contest.id },
  });

  // Problem 1: Two Sum
  await prisma.problem.upsert({
    where: { id: 'p1' },
    update: { title: 'Two Sum', points: 10 },
    create: {
      id: 'p1',
      contestId: contest.id,
      title: 'Two Sum',
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      points: 10,
    },
  });

  await prisma.testCase.deleteMany({ where: { problemId: 'p1' } });
  await prisma.testCase.createMany({
    data: [
      { id: 'tc_p1_1', problemId: 'p1', input: '2 7 11 15\n9', expected: '0 1', isHidden: false, points: null, order: 1, enabled: true },
      { id: 'tc_p1_2', problemId: 'p1', input: '3 2 4\n6', expected: '1 2', isHidden: false, points: null, order: 2, enabled: true },
      { id: 'tc_p1_3', problemId: 'p1', input: '3 3\n6', expected: '0 1', isHidden: true, points: null, order: 3, enabled: true },
      { id: 'tc_p1_4', problemId: 'p1', input: '1 5 3 7\n12', expected: '1 3', isHidden: true, points: null, order: 4, enabled: true },
    ],
  });

  // Problem 2: Palindrome Checker
  await prisma.problem.upsert({
    where: { id: 'p2' },
    update: { title: 'Palindrome Checker', points: 100 },
    create: {
      id: 'p2',
      contestId: contest.id,
      title: 'Palindrome Checker',
      description: 'Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases. Output true if it is a palindrome, or false otherwise.',
      points: 100,
    },
  });

  await prisma.testCase.deleteMany({ where: { problemId: 'p2' } });
  await prisma.testCase.createMany({
    data: [
      { id: 'tc_p2_1', problemId: 'p2', input: 'racecar', expected: 'true', isHidden: false, points: 10, order: 1, enabled: true },
      { id: 'tc_p2_2', problemId: 'p2', input: 'hello', expected: 'false', isHidden: false, points: 20, order: 2, enabled: true },
      { id: 'tc_p2_3', problemId: 'p2', input: 'A man a plan a canal Panama', expected: 'true', isHidden: true, points: 30, order: 3, enabled: true },
      { id: 'tc_p2_4', problemId: 'p2', input: 'never odd or even', expected: 'true', isHidden: true, points: 40, order: 4, enabled: true },
    ],
  });

  // Problem 3: Binary Search
  await prisma.problem.upsert({
    where: { id: 'p3' },
    update: { title: 'Binary Search', points: 50 },
    create: {
      id: 'p3',
      contestId: contest.id,
      title: 'Binary Search',
      description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums.',
      points: 50,
    },
  });

  await prisma.testCase.deleteMany({ where: { problemId: 'p3' } });
  await prisma.testCase.createMany({
    data: [
      { id: 'tc_p3_1', problemId: 'p3', input: '-1 0 3 5 9 12\n9', expected: '4', isHidden: false, points: null, order: 1, enabled: true },
      { id: 'tc_p3_2', problemId: 'p3', input: '-1 0 3 5 9 12\n2', expected: '-1', isHidden: false, points: null, order: 2, enabled: true },
      { id: 'tc_p3_3', problemId: 'p3', input: '5\n5', expected: '0', isHidden: false, points: null, order: 3, enabled: true },
      { id: 'tc_p3_4', problemId: 'p3', input: '1 3 5 7 9\n1', expected: '0', isHidden: true, points: null, order: 4, enabled: true },
      { id: 'tc_p3_5', problemId: 'p3', input: '1 3 5 7 9\n10', expected: '-1', isHidden: true, points: null, order: 5, enabled: true },
    ],
  });

  // Diagnostic Submissions for AI Health Radar & Diagnostics
  const subs = [
    { id: 'sub_accepted', userId: student1.id, problemId: 'p1', code: 'def two_sum(): pass', language: 'python', status: 'COMPLETED', verdict: 'ACCEPTED', score: 10 },
    { id: 'sub_wrong', userId: student1.id, problemId: 'p1', code: 'def two_sum(): pass', language: 'python', status: 'COMPLETED', verdict: 'WRONG_ANSWER', score: 0 },
    { id: 'sub_runtime_error', userId: student1.id, problemId: 'p1', code: '1/0', language: 'python', status: 'COMPLETED', verdict: 'RUNTIME_ERROR', score: 0 },
    { id: 'sub_timeout', userId: student1.id, problemId: 'p2', code: 'while True: pass', language: 'python', status: 'COMPLETED', verdict: 'TIME_LIMIT_EXCEEDED', score: 0 },
    { id: 'sub_missing_evidence', userId: student1.id, problemId: 'p1', code: '', language: 'python', status: 'INFRA_FAILED', verdict: 'INFRASTRUCTURE_ERROR', score: 0 },
    { id: 'sub_bob_private', userId: student2.id, problemId: 'p1', code: 'print("secret")', language: 'python', status: 'COMPLETED', verdict: 'ACCEPTED', score: 10 },
  ];

  for (const s of subs) {
    await prisma.submission.upsert({
      where: { id: s.id },
      update: { status: s.status, verdict: s.verdict, score: s.score },
      create: s,
    });
  }

  // Judge Events
  await prisma.judgeEvent.upsert({
    where: { id: 'event_crash_node9' },
    update: {},
    create: {
      id: 'event_crash_node9',
      type: 'WORKER_CRASH',
      description: 'Worker node worker-crash-node9 terminated unexpectedly due to host kernel panic / OOM on judge version 2.4-rc1.',
      timestamp: new Date(Date.now() - 3600000),
      affectedIds: JSON.stringify(['sub_inc_1', 'sub_inc_2', 'sub_inc_3', 'sub_inc_4', 'sub_inc_5', 'sub_missing_evidence']),
    },
  });

  await prisma.judgeEvent.upsert({
    where: { id: 'event_version_change' },
    update: {},
    create: {
      id: 'event_version_change',
      type: 'VERSION_UPGRADE',
      description: 'Worker node 9 updated to version 2.4-rc1',
      timestamp: new Date(Date.now() - 3630000),
      affectedIds: JSON.stringify(['worker-crash-node9']),
    },
  });

  console.log('Database seeded successfully with all contests, problems, testcases, and telemetry!');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
