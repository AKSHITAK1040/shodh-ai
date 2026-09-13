import { PrismaClient } from '@prisma/client';
import Docker from 'dockerode';
import * as fs from 'fs';
import * as path from 'path';

const localDbPath = path.resolve(__dirname, '../backend/prisma/dev.db');
const dbUrl = process.env.DB_URL || `file:${localDbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: { url: dbUrl }
  }
});
const docker = new Docker();
const WORKER_ID = `worker-${Math.random().toString(36).substring(7)}`;

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

// Execute command inside container with strict sandboxing
async function runInContainer(image: string, cmd: string[], workDir: string, timeoutMs: number = 5000) {
  const createOptions: Docker.ContainerCreateOptions = {
    Image: image,
    Cmd: cmd,
    User: 'nobody',
    HostConfig: {
      Binds: [`${workDir}:/usr/src/app`],
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
  try {
    await container.start();
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

    const waitPromise = new Promise<any>((resolve, reject) => {
      container.wait((err: any, data: any) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIME_LIMIT_EXCEEDED')), timeoutMs)
    );

    const waitData = await Promise.race([waitPromise, timeoutPromise]);
    const exitCode = waitData && typeof waitData.StatusCode === 'number' ? waitData.StatusCode : 0;
    return { exitCode, stdout, stderr, timedOut: false };
  } finally {
    await container.remove({ force: true }).catch(() => null);
  }
}

async function processJob(job: any) {
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

  if (!submission) return;

  const workDir = path.join(__dirname, 'tmp', job.id);
  fs.mkdirSync(workDir, { recursive: true });

  try {
    const lang = (submission.language || 'python').toLowerCase();
    let fileName = 'script.py';
    let image = 'python:3.10-alpine';
    let compileCmd: string[] | null = ['python', '-m', 'py_compile', 'script.py'];
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

    // Phase 1: Compile / Syntax Check
    if (compileCmd) {
      let compileRes: any;
      try {
        compileRes = await runInContainer(image, compileCmd, workDir, 5000);
      } catch (err: any) {
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
        throw err;
      }

      if (compileRes.exitCode !== 0) {
        const errorLog = (compileRes.stderr || compileRes.stdout || 'Compilation / syntax error').trim();
        console.log(`[${WORKER_ID}] Compile error for submission ${submission.id}: ${errorLog}`);
        await prisma.judgeJob.update({
          where: { id: job.id },
          data: { status: 'SUCCEEDED', completedAt: new Date(), logs: errorLog },
        });
        await prisma.submission.update({
          where: { id: submission.id },
          data: { status: 'COMPLETED', verdict: 'COMPILE_ERROR', score: 0 },
        });
        return;
      }
    }

    // Phase 2: Execute Test Cases
    const testCases = submission.problem.testCases;
    const pointPerTest = submission.problem.points / (testCases.length || 1);
    let allPassed = true;
    let score = 0;
    let finalVerdict = 'ACCEPTED';
    let executionLogs = '';

    for (const testCase of testCases) {
      fs.writeFileSync(path.join(workDir, 'input.txt'), testCase.input);

      let runRes: any;
      try {
        runRes = await runInContainer(image, runCmd, workDir, 5000);
      } catch (err: any) {
        if (err.message === 'TIME_LIMIT_EXCEEDED') {
          finalVerdict = 'TIME_LIMIT_EXCEEDED';
          allPassed = false;
          executionLogs = 'Execution timed out (> 5000ms)';
          break;
        }
        throw err;
      }

      if (runRes.exitCode !== 0) {
        finalVerdict = 'RUNTIME_ERROR';
        allPassed = false;
        executionLogs = (runRes.stderr || runRes.stdout || `Process exited with code ${runRes.exitCode}`).trim();
        break;
      }

      const normalizedOutput = runRes.stdout.trim();
      const expectedOutput = testCase.expected.trim();

      if (normalizedOutput === expectedOutput) {
        score += pointPerTest;
      } else {
        finalVerdict = 'WRONG_ANSWER';
        allPassed = false;
        executionLogs = `Output mismatch. Expected: "${expectedOutput}", got: "${normalizedOutput}"`;
        break;
      }
    }

    const finalScore = allPassed ? submission.problem.points : 0;

    await prisma.judgeJob.update({
      where: { id: job.id },
      data: { status: 'SUCCEEDED', completedAt: new Date(), logs: executionLogs || 'Finished processing' },
    });

    await prisma.submission.update({
      where: { id: submission.id },
      data: { status: 'COMPLETED', verdict: finalVerdict, score: finalScore },
    });

    if (finalVerdict === 'ACCEPTED') {
      const existingEntry = await prisma.leaderboardEntry.findUnique({
        where: { contestId_userId: { contestId: submission.problem.contestId, userId: submission.userId } }
      });
      if (!existingEntry || existingEntry.score < finalScore) {
        await prisma.leaderboardEntry.upsert({
          where: { contestId_userId: { contestId: submission.problem.contestId, userId: submission.userId } },
          update: { score: finalScore },
          create: { contestId: submission.problem.contestId, userId: submission.userId, score: finalScore },
        });
      }
    }

  } catch (err: any) {
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
  console.log(`[${WORKER_ID}] Judge Worker started`);
  
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
        await new Promise(res => setTimeout(res, 2000));
      }
    } catch (err) {
      console.error(`Worker loop error:`, err);
      await new Promise(res => setTimeout(res, 5000));
    }
  }
}

startWorker();
