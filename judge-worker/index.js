let PrismaClient;
try {
  PrismaClient = require('@prisma/client').PrismaClient;
} catch (e) {
  PrismaClient = require('../backend/node_modules/@prisma/client').PrismaClient;
}
const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');

const localDbPath = path.resolve(__dirname, '../backend/prisma/dev.db');
const dbUrl = process.env.DB_URL || `file:${localDbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});

// Configure Docker connection (supports DOCKER_HOST env, Linux socket, or WSL fallback)
let docker;
if (process.env.DOCKER_HOST) {
  docker = new Docker();
} else if (process.env.DOCKER_SOCKET || fs.existsSync('/var/run/docker.sock')) {
  docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });
} else if (process.env.DOCKER_HOST_IP) {
  docker = new Docker({ host: process.env.DOCKER_HOST_IP, port: parseInt(process.env.DOCKER_PORT || '2375', 10) });
} else {
  // Fallback for Windows local WSL development
  docker = new Docker({ host: '172.26.98.35', port: 2375 });
}

const WORKER_ID = `worker-${Math.random().toString(36).substring(7)}`;

// Path translation helper for Windows to WSL/Docker path mapping
function toDockerPath(localPath) {
  const resolved = path.resolve(localPath);
  if (/^[a-zA-Z]:[\\\/]/.test(resolved)) {
    const drive = resolved.charAt(0).toLowerCase();
    const rest = resolved.substring(2).replace(/\\/g, '/');
    return `/mnt/${drive}${rest}`;
  }
  return resolved.replace(/\\/g, '/');
}

async function recoverStaleJobs() {
  try {
    const staleThreshold = new Date(Date.now() - 5 * 60000); // 5 minutes
    const staleJobs = await prisma.judgeJob.findMany({
      where: {
        status: 'RUNNING',
        startedAt: { lt: staleThreshold }
      }
    });

    for (const job of staleJobs) {
      console.log(`[${WORKER_ID}] Recovering stale job ${job.id}`);
      await prisma.judgeJob.update({
        where: { id: job.id },
        data: { status: 'INFRA_FAILED', completedAt: new Date(), logs: 'Worker crash recovery: Job marked as stale' },
      });
      await prisma.submission.update({
        where: { id: job.submissionId },
        data: { status: 'INFRA_FAILED', verdict: 'INFRASTRUCTURE_ERROR' },
      });
      
      await prisma.judgeEvent.create({
        data: {
          type: 'WORKER_CRASH',
          description: `Stale job ${job.id} recovered. Worker died during execution.`,
          affectedIds: JSON.stringify([job.submissionId]),
        }
      });
    }
  } catch (err) {
    console.error("Error during stale job recovery:", err);
  }
}

// Ensure image exists locally or pull it on demand
async function ensureImage(image) {
  try {
    await docker.getImage(image).inspect();
  } catch (e) {
    console.log(`[${WORKER_ID}] Image ${image} not found locally, pulling from Docker Hub...`);
    await new Promise((resolve, reject) => {
      docker.pull(image, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (followErr, res) => {
          if (followErr) return reject(followErr);
          resolve(res);
        });
      });
    });
    console.log(`[${WORKER_ID}] Successfully pulled ${image}`);
  }
}

// Execute command inside container with strict sandboxing
async function runInContainer(image, cmd, workDir, timeoutMs = 5000) {
  await ensureImage(image);

  const dockerMountPath = toDockerPath(workDir);
  const createOptions = {
    Image: image,
    Cmd: cmd,
    User: 'nobody',
    HostConfig: {
      Binds: [`${dockerMountPath}:/usr/src/app`],
      Memory: 128 * 1024 * 1024,
      CpuQuota: 100000,
      CpuPeriod: 100000,
      PidsLimit: 64,
      NetworkMode: 'none',
      ReadonlyRootfs: true,
    },
    WorkingDir: '/usr/src/app',
    Tty: false,
  };

  const container = await docker.createContainer(createOptions);
  const containerId = container.id;
  console.log(`[${WORKER_ID}] Created Docker container ${containerId.substring(0, 12)} (${image})`);

  try {
    await container.start();
    console.log(`[${WORKER_ID}] Started Docker container ${containerId.substring(0, 12)}`);
    const stream = await container.logs({ follow: true, stdout: true, stderr: true });
    let stdout = '';
    let stderr = '';

    stream.on('data', chunk => {
      const streamType = chunk[0];
      const text = chunk.toString('utf8').substring(8);
      if (streamType === 2) {
        stderr += text;
      } else {
        stdout += text;
      }
    });

    const waitPromise = new Promise((resolve, reject) => {
      container.wait((err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIME_LIMIT_EXCEEDED')), timeoutMs)
    );

    const waitData = await Promise.race([waitPromise, timeoutPromise]);
    const exitCode = waitData && typeof waitData.StatusCode === 'number' ? waitData.StatusCode : 0;
    return { exitCode, stdout, stderr, timedOut: false, containerId };
  } finally {
    await container.remove({ force: true }).catch(() => null);
    console.log(`[${WORKER_ID}] Destroyed Docker container ${containerId.substring(0, 12)}`);
  }
}

async function updateContestLeaderboard(contestId, userId) {
  try {
    const problems = await prisma.problem.findMany({
      where: { contestId },
      select: { id: true, points: true },
    });

    let totalContestScore = 0;
    for (const prob of problems) {
      const bestSub = await prisma.submission.findFirst({
        where: {
          userId,
          problemId: prob.id,
          status: 'COMPLETED',
        },
        orderBy: { score: 'desc' },
        select: { score: true },
      });
      if (bestSub && bestSub.score > 0) {
        const cappedScore = Math.min(prob.points || 0, bestSub.score);
        totalContestScore += cappedScore;
      }
    }

    await prisma.leaderboardEntry.upsert({
      where: { contestId_userId: { contestId, userId } },
      update: { score: totalContestScore },
      create: { contestId, userId, score: totalContestScore },
    });
  } catch (err) {
    console.error(`[${WORKER_ID}] Error updating leaderboard for user ${userId} in contest ${contestId}:`, err);
  }
}

async function processJob(job) {
  console.log(`[${WORKER_ID}] Processing job ${job.id} for submission ${job.submissionId}`);
  
  await prisma.judgeJob.update({
    where: { id: job.id },
    data: { status: 'RUNNING', workerId: WORKER_ID, startedAt: new Date() },
  });
  await prisma.submission.update({
    where: { id: job.submissionId },
    data: { status: 'RUNNING' },
  });

  const submission = await prisma.submission.findUnique({
    where: { id: job.submissionId },
    include: { problem: { include: { testCases: true } } },
  });

  if (!submission || !submission.problem) return;

  const judgeTmpBase = process.env.JUDGE_TMP_DIR || (process.platform === 'win32' ? path.join(__dirname, 'tmp') : '/tmp/shodh-judge');
  const workDir = path.join(judgeTmpBase, job.id);
  fs.mkdirSync(workDir, { recursive: true });
  try { fs.chmodSync(workDir, 0o777); } catch (_) {}

  let usedContainerId = null;

  try {
    const lang = (submission.language || 'python').toLowerCase();
    let fileName = 'script.py';
    let image = 'python:3.10-alpine';
    let compileCmd = ['python', '-m', 'py_compile', 'script.py'];
    let runCmd = ['sh', '-c', 'python script.py < input.txt'];

    if (lang === 'javascript' || lang === 'js' || lang === 'node') {
      fileName = 'script.js';
      image = 'node:20-alpine';
      compileCmd = ['node', '--check', 'script.js'];
      runCmd = ['sh', '-c', 'node script.js < input.txt'];
    } else if (lang === 'cpp' || lang === 'c++') {
      fileName = 'solution.cpp';
      image = 'gcc:alpine';
      compileCmd = ['g++', '-O2', 'solution.cpp', '-o', 'solution'];
      runCmd = ['sh', '-c', './solution < input.txt'];
    } else if (lang === 'bash' || lang === 'sh') {
      fileName = 'script.sh';
      image = 'alpine:latest';
      compileCmd = ['sh', '-n', 'script.sh'];
      runCmd = ['sh', '-c', 'sh script.sh < input.txt'];
    }

    let executableCode = submission.code;
    // Auto-harness: If user submitted function-only code without standard I/O boilerplate
    if (lang === 'python' && !submission.code.includes('print')) {
      executableCode += `\n
if __name__ == '__main__':
    import sys
    try:
        raw = sys.stdin.read().split()
        if raw:
            if 'Solution' in globals():
                sol = globals()['Solution']()
                for m in ['twoSum', 'two_sum', 'is_palindrome', 'isPalindrome', 'binary_search', 'binarySearch', 'solve']:
                    if hasattr(sol, m):
                        globals()[m] = getattr(sol, m)
            fn = globals().get('twoSum') or globals().get('two_sum') or globals().get('solve') or globals().get('solution')
            if fn:
                try:
                    nums = [int(x) for x in raw[:-1]]
                    target = int(raw[-1])
                    res = fn(nums, target)
                except Exception:
                    res = fn(raw)
                if isinstance(res, (list, tuple)):
                    print(' '.join(map(str, res)))
                elif res is not None:
                    print(res)
            fn_pal = globals().get('is_palindrome') or globals().get('isPalindrome')
            if fn_pal:
                res = fn_pal(raw[0])
                print(str(res).lower())
            fn_bs = globals().get('binary_search') or globals().get('binarySearch')
            if fn_bs:
                nums = [int(x) for x in raw[:-1]]
                target = int(raw[-1])
                res = fn_bs(nums, target)
                print(res)
    except Exception:
        pass
`;
    }

    fs.writeFileSync(path.join(workDir, fileName), executableCode);
    try { fs.chmodSync(path.join(workDir, fileName), 0o777); } catch (_) {}

    const rawTestCases = submission.problem.testCases || [];
    const activeTestCases = rawTestCases
      .filter(tc => tc.enabled !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    const explicitPointsSum = activeTestCases.reduce((sum, tc) => sum + (tc.points !== null && tc.points !== undefined ? tc.points : 0), 0);
    const unweightedCount = activeTestCases.filter(tc => tc.points === null || tc.points === undefined).length;
    const remainingPoints = Math.max(0, submission.problem.points - explicitPointsSum);
    const defaultWeight = unweightedCount > 0 ? (remainingPoints / unweightedCount) : (activeTestCases.length > 0 ? submission.problem.points / activeTestCases.length : 0);

    function getTestCaseMaxPoints(tc) {
      if (tc.points !== null && tc.points !== undefined) {
        return tc.points;
      }
      return defaultWeight;
    }

    // Phase 1: Compile / Syntax Check in Docker Container
    if (compileCmd) {
      let compileRes;
      try {
        compileRes = await runInContainer(image, compileCmd, workDir, 5000);
        usedContainerId = compileRes.containerId;
      } catch (err) {
        if (err.message === 'TIME_LIMIT_EXCEEDED') {
          await prisma.judgeJob.update({
            where: { id: job.id },
            data: { status: 'SUCCEEDED', completedAt: new Date(), logs: 'Compilation timed out (> 5000ms)' },
          });
          await prisma.submission.update({
            where: { id: submission.id },
            data: { status: 'COMPLETED', verdict: 'TIME_LIMIT_EXCEEDED', score: 0 },
          });
          return;
        }
        throw err; // Infrastructure failure
      }

      if (compileRes.exitCode !== 0) {
        const errorLog = (compileRes.stderr || compileRes.stdout || 'Compilation / syntax error').trim();
        console.log(`[${WORKER_ID}] Compile error for submission ${submission.id} in container ${compileRes.containerId.substring(0, 12)}: ${errorLog}`);
        
        // Persist COMPILE_ERROR for each testcase
        for (const tc of activeTestCases) {
          const maxPts = getTestCaseMaxPoints(tc);
          await prisma.testCaseResult.upsert({
            where: { submissionId_testCaseId: { submissionId: submission.id, testCaseId: tc.id } },
            update: { passed: false, maxPoints: maxPts, pointsAwarded: 0, verdict: 'COMPILE_ERROR', stderr: errorLog },
            create: { submissionId: submission.id, testCaseId: tc.id, passed: false, maxPoints: maxPts, pointsAwarded: 0, verdict: 'COMPILE_ERROR', stderr: errorLog },
          });
        }

        await prisma.judgeJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED', completedAt: new Date(), logs: `Container: ${compileRes.containerId.substring(0, 12)} | ${errorLog}` },
        });
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: 'COMPLETED', verdict: 'COMPILE_ERROR', score: 0 },
        });
        return;
      }
    }

    // Phase 2: Execute All Active Test Cases in Docker Container (Partial Credit Evaluation)
    const testResults = [];
    let totalPointsAwarded = 0;
    let executionLogs = '';

    for (let i = 0; i < activeTestCases.length; i++) {
      const testCase = activeTestCases[i];
      const maxPts = getTestCaseMaxPoints(testCase);
      fs.writeFileSync(path.join(workDir, 'input.txt'), testCase.input);
      try { fs.chmodSync(path.join(workDir, 'input.txt'), 0o777); } catch (_) {}

      const tStart = Date.now();
      let runRes = null;
      let timedOut = false;
      let tcVerdict = 'PASSED';
      let tcPassed = false;
      let tcPoints = 0;

      try {
        runRes = await runInContainer(image, runCmd, workDir, 5000);
        usedContainerId = runRes.containerId;
      } catch (err) {
        if (err.message === 'TIME_LIMIT_EXCEEDED') {
          timedOut = true;
          tcVerdict = 'TIME_LIMIT_EXCEEDED';
        } else {
          throw err; // Infrastructure failure
        }
      }

      const execTimeMs = Date.now() - tStart;

      if (timedOut) {
        tcVerdict = 'TIME_LIMIT_EXCEEDED';
        tcPassed = false;
        tcPoints = 0;
        if (!executionLogs) executionLogs = `Test ${i + 1} timed out (> 5000ms)`;
      } else if (runRes.exitCode !== 0) {
        tcVerdict = 'RUNTIME_ERROR';
        tcPassed = false;
        tcPoints = 0;
        if (!executionLogs) executionLogs = (runRes.stderr || runRes.stdout || `Test ${i + 1} process exited with code ${runRes.exitCode}`).trim();
      } else {
        const normalizedOutput = runRes.stdout.trim();
        const expectedOutput = testCase.expected.trim();

        if (normalizedOutput === expectedOutput) {
          tcPassed = true;
          tcVerdict = 'PASSED';
          tcPoints = maxPts;
        } else {
          tcPassed = false;
          tcVerdict = 'WRONG_ANSWER';
          tcPoints = 0;
          if (!executionLogs) executionLogs = `Test ${i + 1} output mismatch. Expected: "${expectedOutput}", got: "${normalizedOutput}"`;
        }
      }

      totalPointsAwarded += tcPoints;
      testResults.push({
        testCaseId: testCase.id,
        passed: tcPassed,
        maxPoints: maxPts,
        pointsAwarded: tcPoints,
        verdict: tcVerdict,
        execTimeMs,
        stdout: runRes ? runRes.stdout.substring(0, 1000) : null,
        stderr: runRes ? runRes.stderr.substring(0, 1000) : (timedOut ? 'Execution timed out (> 5000ms)' : null),
      });

      // Idempotent upsert of individual testcase result
      await prisma.testCaseResult.upsert({
        where: { submissionId_testCaseId: { submissionId: submission.id, testCaseId: testCase.id } },
        update: {
          passed: tcPassed,
          maxPoints: maxPts,
          pointsAwarded: tcPoints,
          verdict: tcVerdict,
          executionTimeMs: execTimeMs,
          stdout: runRes ? runRes.stdout.substring(0, 1000) : null,
          stderr: runRes ? runRes.stderr.substring(0, 1000) : (timedOut ? 'Execution timed out (> 5000ms)' : null),
        },
        create: {
          submissionId: submission.id,
          testCaseId: testCase.id,
          passed: tcPassed,
          maxPoints: maxPts,
          pointsAwarded: tcPoints,
          verdict: tcVerdict,
          executionTimeMs: execTimeMs,
          stdout: runRes ? runRes.stdout.substring(0, 1000) : null,
          stderr: runRes ? runRes.stderr.substring(0, 1000) : (timedOut ? 'Execution timed out (> 5000ms)' : null),
        },
      });

      // If execution timed out, skip subsequent tests deterministically
      if (timedOut) {
        for (let j = i + 1; j < activeTestCases.length; j++) {
          const remTc = activeTestCases[j];
          const remMaxPts = getTestCaseMaxPoints(remTc);
          testResults.push({
            testCaseId: remTc.id,
            passed: false,
            maxPoints: remMaxPts,
            pointsAwarded: 0,
            verdict: 'TIME_LIMIT_EXCEEDED',
            execTimeMs: 0,
            stdout: null,
            stderr: 'Skipped due to prior time limit exceeded',
          });
          await prisma.testCaseResult.upsert({
            where: { submissionId_testCaseId: { submissionId: submission.id, testCaseId: remTc.id } },
            update: { passed: false, maxPoints: remMaxPts, pointsAwarded: 0, verdict: 'TIME_LIMIT_EXCEEDED', executionTimeMs: 0 },
            create: { submissionId: submission.id, testCaseId: remTc.id, passed: false, maxPoints: remMaxPts, pointsAwarded: 0, verdict: 'TIME_LIMIT_EXCEEDED', executionTimeMs: 0 },
          });
        }
        break;
      }
    }

    const totalCount = activeTestCases.length;
    const passedCount = testResults.filter(r => r.passed).length;
    const finalScore = Math.max(0, Math.min(submission.problem.points, Math.round(totalPointsAwarded)));

    let finalVerdict = 'WRONG_ANSWER';
    if (totalCount > 0 && passedCount === totalCount) {
      finalVerdict = 'ACCEPTED';
    } else if (passedCount > 0) {
      finalVerdict = 'PARTIAL';
    } else {
      const anyTimeout = testResults.some(r => r.verdict === 'TIME_LIMIT_EXCEEDED');
      const anyRuntime = testResults.some(r => r.verdict === 'RUNTIME_ERROR');
      if (anyTimeout && totalCount > 0) {
        finalVerdict = 'TIME_LIMIT_EXCEEDED';
      } else if (anyRuntime && totalCount > 0) {
        finalVerdict = 'RUNTIME_ERROR';
      } else {
        finalVerdict = 'WRONG_ANSWER';
      }
    }

    const cidPrefix = usedContainerId ? `Container: ${usedContainerId.substring(0, 12)} | ` : '';
    const statusSummary = `Passed ${passedCount}/${totalCount} test cases. Score: ${finalScore}/${submission.problem.points}. Verdict: ${finalVerdict}`;

    await prisma.judgeJob.update({
      where: { id: job.id },
      data: { status: 'SUCCEEDED', completedAt: new Date(), logs: `${cidPrefix}${statusSummary} | ${executionLogs || 'All executed'}` },
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'COMPLETED', verdict: finalVerdict, score: finalScore },
    });

    // Update contest leaderboard with aggregated best scores
    await updateContestLeaderboard(submission.problem.contestId, submission.userId);

  } catch (err) {
    console.error(`Infrastructure failure for job ${job.id}:`, err.message);
    await prisma.judgeJob.update({
      where: { id: job.id },
      data: { status: 'INFRA_FAILED', completedAt: new Date(), logs: err.message },
    });
    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'INFRA_FAILED', verdict: 'INFRASTRUCTURE_ERROR', score: 0 },
    });
    
    await prisma.judgeEvent.create({
      data: {
        type: 'INFRA_FAILURE',
        description: `Worker ${WORKER_ID} failed to process job ${job.id}: ${err.message}`,
        affectedIds: JSON.stringify([submission.id]),
      }
    });
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

async function startWorker() {
  console.log(`[${WORKER_ID}] Judge Worker started with Docker connection`);
  
  await recoverStaleJobs();
  
  let lastRecovery = Date.now();

  while (true) {
    try {
      if (Date.now() - lastRecovery > 60000) {
        await recoverStaleJobs();
        lastRecovery = Date.now();
      }

      const job = await prisma.judgeJob.findFirst({
        where: { status: 'QUEUED' }
      });

      if (job) {
        await processJob(job);
      } else {
        await new Promise(res => setTimeout(res, 1000));
      }
    } catch (err) {
      console.error(`Worker loop error:`, err);
      await new Promise(res => setTimeout(res, 3000));
    }
  }
}

startWorker();
