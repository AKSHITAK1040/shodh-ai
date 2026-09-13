'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface ProblemDef {
  id: string;
  number: number;
  title: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  concept: string;
  description: string;
  sampleInput: string;
  sampleOutput: string;
  starters: Record<string, string>;
}

const DEFAULT_PROBLEMS: ProblemDef[] = [
  {
    id: 'p1',
    number: 1,
    title: 'Two Sum',
    points: 10,
    difficulty: 'Easy',
    concept: 'Hash Map',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. You may assume each input has exactly one solution.',
    sampleInput: '2 7 11 15\n9',
    sampleOutput: '0 1',
    starters: {
      python: `import sys

def two_sum():
    # Read input from stdin
    # Write your solution here
    pass

if __name__ == '__main__':
    two_sum()
`,
      javascript: `const fs = require('fs');

function twoSum() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  // Write your solution here
}

twoSum();
`,
      cpp: `#include <iostream>
#include <vector>
#include <unordered_map>

using namespace std;

int main() {
    // Fast I/O
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    // Write your solution here

    return 0;
}
`,
      bash: `#!/bin/sh
# Read input and solve Two Sum
# Write your solution here

`
    }
  },
  {
    id: 'p2',
    number: 2,
    title: 'Palindrome Checker',
    points: 100,
    difficulty: 'Easy',
    concept: 'Two Pointers / String',
    description: 'Given a string s, determine if it is a palindrome, considering only alphanumeric characters and ignoring cases. Output "true" if it is a palindrome, or "false" otherwise.',
    sampleInput: 'racecar',
    sampleOutput: 'true',
    starters: {
      python: `import sys

def is_palindrome():
    s = sys.stdin.read().strip()
    filtered = ''.join(c.lower() for c in s if c.isalnum())
    print('true' if filtered == filtered[::-1] else 'false')

if __name__ == '__main__':
    is_palindrome()
`,
      javascript: `const fs = require('fs');

function isPalindrome() {
  const input = fs.readFileSync(0, 'utf-8').trim();
  const filtered = input.toLowerCase().replace(/[^a-z0-9]/g, '');
  console.log(filtered === filtered.split('').reverse().join('') ? 'true' : 'false');
}

isPalindrome();
`,
      cpp: `#include <iostream>
#include <string>
#include <cctype>
#include <algorithm>

using namespace std;

int main() {
    string input, filtered = "";
    getline(cin, input);
    for (char c : input) {
        if (isalnum(c)) filtered += tolower(c);
    }
    string rev = filtered;
    reverse(rev.begin(), rev.end());
    cout << (filtered == rev ? "true" : "false") << endl;
    return 0;
}
`,
      bash: `#!/bin/sh
read s
cleaned=$(echo "$s" | tr -cd '[:alnum:]' | tr '[:upper:]' '[:lower:]')
rev=$(echo "$cleaned" | rev)
if [ "$cleaned" = "$rev" ]; then
  echo "true"
else
  echo "false"
fi
`
    }
  },
  {
    id: 'p3',
    number: 3,
    title: 'Binary Search',
    points: 50,
    difficulty: 'Easy',
    concept: 'Divide and Conquer',
    description: 'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, return its index. Otherwise, return -1 in O(log n) runtime complexity.',
    sampleInput: '-1 0 3 5 9 12\n9',
    sampleOutput: '4',
    starters: {
      python: `import sys

def binary_search():
    lines = sys.stdin.read().strip().split('\\n')
    if len(lines) < 2: return
    nums = list(map(int, lines[0].split()))
    target = int(lines[1].strip())
    l, r = 0, len(nums) - 1
    ans = -1
    while l <= r:
        mid = (l + r) // 2
        if nums[mid] == target:
            ans = mid
            break
        elif nums[mid] < target:
            l = mid + 1
        else:
            r = mid - 1
    print(ans)

if __name__ == '__main__':
    binary_search()
`,
      javascript: `const fs = require('fs');

function binarySearch() {
  const input = fs.readFileSync(0, 'utf-8').trim().split('\\n');
  if (input.length < 2) return;
  const nums = input[0].trim().split(/\\s+/).map(Number);
  const target = Number(input[1].trim());
  let l = 0, r = nums.length - 1;
  let ans = -1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (nums[mid] === target) {
      ans = mid;
      break;
    } else if (nums[mid] < target) {
      l = mid + 1;
    } else {
      r = mid - 1;
    }
  }
  console.log(ans);
}

binarySearch();
`,
      cpp: `#include <iostream>
#include <vector>
#include <sstream>

using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    string line;
    if (!getline(cin, line)) return 0;
    stringstream ss(line);
    vector<int> nums;
    int x;
    while (ss >> x) nums.push_back(x);
    int target;
    if (!(cin >> target)) return 0;
    int l = 0, r = nums.size() - 1;
    int ans = -1;
    while (l <= r) {
        int mid = l + (r - l) / 2;
        if (nums[mid] == target) {
            ans = mid;
            break;
        } else if (nums[mid] < target) {
            l = mid + 1;
        } else {
            r = mid - 1;
        }
    }
    cout << ans << endl;
    return 0;
}
`,
      bash: `#!/bin/sh
read nums
read target
idx=0
found=-1
for n in $nums; do
  if [ "$n" -eq "$target" ]; then
    found=$idx
    break
  fi
  idx=$((idx + 1))
done
echo "$found"
`
    }
  }
];

const CONTEST_DB_ID = '6bde464d-7b9f-4ef3-9d5e-f6f1e5ee5d9d';

async function getAuthToken(): Promise<string> {
  if (typeof window === 'undefined') return '';
  let token = localStorage.getItem('token') || localStorage.getItem('jwt');
  if (token) return token;

  try {
    const res = await fetch('/api/backend/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'alice@student.com', password: 'password' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        return data.access_token;
      }
    }
  } catch (e) {
    console.warn("Auto-login via /api/backend/auth/login failed:", e);
  }
  return '';
}

export default function ContestDetail() {
  const params = useParams();
  const contestId = (params?.id as string) || 'contest-1';

  // Active problem state
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [problems, setProblems] = useState<ProblemDef[]>(DEFAULT_PROBLEMS);
  const currentProblem = problems[currentProblemIndex] || problems[0] || DEFAULT_PROBLEMS[0];

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(currentProblem.starters['python'] || '');

  const [submitting, setSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [aiSyncStatus, setAiSyncStatus] = useState<'idle' | 'indexing' | 'synced'>('idle');
  const [submissionsList, setSubmissionsList] = useState<any[]>([]);

  // Dynamically load contest problems from authoritative backend
  useEffect(() => {
    async function loadContest() {
      try {
        const token = await getAuthToken();
        const targetContestId = contestId.includes('-') && contestId.length > 20 ? contestId : CONTEST_DB_ID;
        const res = await fetch(`/api/backend/contests/${targetContestId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.problems) && data.problems.length > 0) {
            const mapped: ProblemDef[] = data.problems.map((p: any, idx: number) => {
              const fallback = DEFAULT_PROBLEMS.find((dp) => dp.id === p.id);
              const visibleTc = p.testCases?.find((tc: any) => !tc.isHidden);
              return {
                id: p.id,
                number: idx + 1,
                title: p.title,
                points: p.points ?? (fallback?.points || 10),
                difficulty: fallback?.difficulty || 'Medium',
                concept: fallback?.concept || 'Algorithms',
                description: p.description || fallback?.description || '',
                sampleInput: visibleTc?.input || fallback?.sampleInput || '',
                sampleOutput: visibleTc?.expected || fallback?.sampleOutput || '',
                starters: fallback?.starters || {
                  python: `# Solution for ${p.title}\nimport sys\n\ndef solve():\n    # Read input from stdin\n    input_data = sys.stdin.read().strip()\n    # TODO: Implement solution\n    pass\n\nif __name__ == '__main__':\n    solve()\n`,
                  javascript: `// Solution for ${p.title}\nconst fs = require('fs');\n\nfunction solve() {\n  const input = fs.readFileSync(0, 'utf-8').trim();\n  // TODO: Implement solution\n}\nsolve();\n`,
                  cpp: `// Solution for ${p.title}\n#include <iostream>\nusing namespace std;\n\nint main() {\n    // TODO: Implement solution\n    return 0;\n}\n`,
                  bash: `#!/bin/sh\n# Solution for ${p.title}\n# Read input and solve\n`
                }
              };
            });
            setProblems(mapped);
            if (mapped[0]) {
              setCode(mapped[0].starters[language] || mapped[0].starters['python'] || '');
            }
          }
        }
      } catch (err) {
        console.warn('Could not load contest problems dynamically, using defaults:', err);
      }
    }
    loadContest();
  }, [contestId]);

  // Switch active problem
  const handleSelectProblem = (idx: number) => {
    setCurrentProblemIndex(idx);
    const targetProblem = problems[idx];
    if (targetProblem) {
      setCode(targetProblem.starters[language] || targetProblem.starters['python'] || '');
    }
    setSubmissionResult(null);
    setAiSyncStatus('idle');
  };

  const handleNextProblem = () => {
    if (currentProblemIndex < problems.length - 1) {
      handleSelectProblem(currentProblemIndex + 1);
    }
  };

  const handlePrevProblem = () => {
    if (currentProblemIndex > 0) {
      handleSelectProblem(currentProblemIndex - 1);
    }
  };

  // Update starter code when language changes
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(currentProblem.starters[newLang] || currentProblem.starters['python'] || '');
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setAiSyncStatus('indexing');

    const tempId = 'sub-' + Math.random().toString(36).substring(2, 8);
    const initialSub = {
      id: tempId,
      problemId: currentProblem.id,
      problemTitle: currentProblem.title,
      language: language,
      status: 'SUBMITTING',
      verdict: 'PENDING',
      score: 0,
      testCasesPassed: 0,
      totalTestCases: 2,
      message: 'Submitting code to backend judging queue...',
      createdAt: new Date().toLocaleTimeString(),
      aiStatus: 'indexing',
    };

    setSubmissionResult(initialSub);

    try {
      const token = await getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Ensure participant record exists
      const targetContestId = contestId.includes('-') && contestId.length > 20 ? contestId : CONTEST_DB_ID;
      await fetch(`/api/backend/contests/${targetContestId}/join`, {
        method: 'POST',
        headers,
      }).catch(() => {});

      // Dispatch real submission to backend
      const subResponse = await fetch('/api/backend/submissions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          problemId: currentProblem.id,
          code: code,
          language: language,
        }),
      });

      if (!subResponse.ok) {
        const errData = await subResponse.json().catch(() => ({}));
        throw new Error(errData.message || `Submission rejected (HTTP ${subResponse.status})`);
      }

      const createdSub = await subResponse.json();
      const realSubId = createdSub.id;

      setSubmissionResult((prev: any) => ({
        ...prev,
        id: realSubId,
        status: 'QUEUED',
        message: 'Submission queued in database. Waiting for judge worker...',
      }));

      // Poll backend for real judge verdict and score
      let attempts = 0;
      const maxAttempts = 30;

      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const pollRes = await fetch(`/api/backend/submissions/${realSubId}`, {
            headers,
          });

          if (pollRes.ok) {
            const subData = await pollRes.json();

            if (subData.status === 'RUNNING') {
              setSubmissionResult((prev: any) => ({
                ...prev,
                status: 'RUNNING',
                message: 'Judge worker executing inside Docker sandbox container...',
              }));
            } else if (subData.status === 'COMPLETED' || subData.status === 'INFRA_FAILED') {
              clearInterval(pollInterval);

              const verdict = subData.verdict || (subData.status === 'INFRA_FAILED' ? 'INFRASTRUCTURE_ERROR' : 'UNKNOWN');
              const score = subData.score ?? 0;
              const maxScore = subData.maxScore ?? currentProblem.points;
              const passedTestcases = subData.passedTestcases ?? (verdict === 'ACCEPTED' ? (subData.totalTestcases || 1) : 0);
              const totalTestcases = subData.totalTestcases ?? (currentProblem.points ? 1 : 1);
              const hiddenCount = subData.hiddenCount ?? 0;
              const hiddenPassed = subData.hiddenPassed ?? 0;
              const testCaseResults = subData.testCaseResults || [];

              let feedbackMessage = '';
              if (verdict === 'ACCEPTED') {
                feedbackMessage = `All test cases passed! Solution accepted with score ${score}/${maxScore}.`;
              } else if (verdict === 'PARTIAL') {
                feedbackMessage = `Partial Credit: Passed ${passedTestcases} of ${totalTestcases} test cases. Score: ${score}/${maxScore}.`;
              } else if (verdict === 'WRONG_ANSWER') {
                feedbackMessage = `Wrong Answer: Program output did not match expected test case output. Score: ${score}/${maxScore}.`;
              } else if (verdict === 'COMPILE_ERROR') {
                feedbackMessage = `Compilation / Syntax Error: Code failed compiler syntax verification.`;
              } else if (verdict === 'RUNTIME_ERROR') {
                feedbackMessage = `Runtime Error: Container process exited with non-zero exit code.`;
              } else if (verdict === 'TIME_LIMIT_EXCEEDED') {
                feedbackMessage = `Time Limit Exceeded: Execution took longer than 5000ms.`;
              } else if (verdict === 'INFRASTRUCTURE_ERROR') {
                feedbackMessage = `Infrastructure Error: Docker daemon is unavailable on the judging server. Host execution refused.`;
              } else {
                feedbackMessage = `Finished with status: ${subData.status}, verdict: ${verdict}.`;
              }

              const finishedResult = {
                id: realSubId,
                problemId: currentProblem.id,
                problemTitle: currentProblem.title,
                language: subData.language || language,
                status: subData.status,
                verdict: verdict,
                score: score,
                maxScore: maxScore,
                testCasesPassed: passedTestcases,
                totalTestCases: totalTestcases,
                hiddenCount: hiddenCount,
                hiddenPassed: hiddenPassed,
                testCaseResults: testCaseResults,
                message: feedbackMessage,
                createdAt: new Date().toLocaleTimeString(),
                aiStatus: 'synced',
              };

              setSubmissionResult(finishedResult);
              setSubmissionsList((prev) => [finishedResult, ...prev.filter((s) => s.id !== realSubId)]);
              setAiSyncStatus('synced');
              setSubmitting(false);
              return;
            }
          }
        } catch (pollErr) {
          console.error("Polling error:", pollErr);
        }

        if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
          setSubmissionResult((prev: any) => ({
            ...prev,
            status: 'TIMEOUT',
            verdict: 'INFRASTRUCTURE_ERROR',
            message: 'Judging timed out waiting for worker response.',
            aiStatus: 'synced',
          }));
          setSubmitting(false);
        }
      }, 1000);

    } catch (err: any) {
      console.error("Submission failed:", err);
      const errorResult = {
        id: tempId,
        problemId: currentProblem.id,
        problemTitle: currentProblem.title,
        language: language,
        status: 'INFRA_FAILED',
        verdict: 'INFRASTRUCTURE_ERROR',
        score: 0,
        testCasesPassed: 0,
        totalTestCases: 2,
        message: `Failed to reach backend judging service: ${err.message || 'Network Error'}`,
        createdAt: new Date().toLocaleTimeString(),
        aiStatus: 'synced',
      };
      setSubmissionResult(errorResult);
      setSubmissionsList((prev) => [errorResult, ...prev]);
      setAiSyncStatus('synced');
      setSubmitting(false);
    }
  };

  const isLastProblem = currentProblemIndex === problems.length - 1;
  const lineCount = Math.max(code.split('\n').length, 18);

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white p-6 sm:p-8 flex flex-col relative overflow-hidden select-none">
      {/* Background Decorative Grid Columns */}
      <div className="absolute inset-0 pointer-events-none flex justify-around max-w-7xl mx-auto opacity-20">
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
      </div>

      <div className="max-w-6xl mx-auto w-full relative z-10">
        {/* Navigation & Contest Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1E293B] mb-6 gap-4">
          <div>
            <Link
              href="/contests"
              className="text-xs font-medium text-[#94A3B8] hover:text-white transition inline-flex items-center gap-1.5 mb-2"
            >
              <span>&larr;</span>
              <span>Back to Contests</span>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Midterm Algorithms Contest
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1">
              {problems.length} Problems &bull; {problems.reduce((sum, p) => sum + (p.points || 0), 0)} Total Points &bull; Multi-language Judging Sandbox
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/health"
              className="flex items-center gap-2 px-3 py-2 bg-[#1F131D] border border-rose-900/60 hover:border-rose-700 text-rose-300 rounded-xl text-xs font-semibold transition shadow-sm hidden sm:flex"
            >
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>Health Radar</span>
            </Link>
            <Link
              href={`/ai?q=${encodeURIComponent('What are the key concepts, prerequisites, and learning resources required to solve all problems in the Midterm Algorithms contest?')}&contest=Midterm+Algorithms`}
              className="flex items-center gap-2 px-4 py-2 bg-[#25173B] border border-purple-800/60 hover:border-purple-600 text-purple-300 rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <span>🤖</span>
              <span>Ask AI Assistant</span>
            </Link>
          </div>
        </div>

        {/* Problem Selection Tabs & Navigation Header */}
        <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-2.5 flex flex-wrap items-center justify-between gap-3 mb-6 shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto">
            {problems.map((prob, idx) => {
              const isActive = idx === currentProblemIndex;
              const hasAccepted = submissionsList.some(
                (s) => s.problemId === prob.id && s.verdict === 'ACCEPTED'
              );

              return (
                <button
                  key={prob.id}
                  onClick={() => handleSelectProblem(idx)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'border border-[#1E293B] bg-[#0A0E17]/40 text-[#94A3B8] hover:text-white hover:bg-[#1A2234]'
                  }`}
                >
                  <span>Problem {prob.number}: {prob.title} ({prob.points} pts)</span>
                  {hasAccepted && (
                    <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevProblem}
              disabled={currentProblemIndex === 0}
              className="px-3 py-1.5 border border-[#1E293B] rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#1A2234] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              &larr; Prev
            </button>
            <span className="text-xs font-medium text-[#94A3B8] px-2 font-mono">
              {currentProblemIndex + 1} of {problems.length}
            </span>
            <button
              onClick={handleNextProblem}
              disabled={isLastProblem}
              className="px-3 py-1.5 border border-[#1E293B] rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:bg-[#1A2234] disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              Next &rarr;
            </button>
          </div>
        </div>

        {/* Main 2-Column Split: Problem Info vs Code Editor */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Problem Statement Column */}
          <div className="lg:col-span-5 bg-[#121824] border border-[#1E293B] rounded-2xl p-6 flex flex-col justify-between shadow-sm space-y-4">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block mb-1">
                    PROBLEM {currentProblem?.number || (currentProblemIndex + 1)} OF {problems.length}
                  </span>
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">{currentProblem?.title}</h2>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-3 py-0.5 bg-emerald-950/60 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-800/80">
                    {currentProblem.points} Points
                  </span>
                  <span className="text-[11px] text-[#94A3B8] font-medium">
                    {currentProblem.difficulty} &bull; Concept: {currentProblem.concept}
                  </span>
                </div>
              </div>

              <p className="text-sm text-[#94A3B8] leading-relaxed pt-3">
                {currentProblem.description}
              </p>

              <div className="border-t border-[#1E293B] pt-4 mt-4 space-y-4">
                <div>
                  <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                    SAMPLE INPUT
                  </h3>
                  <pre className="bg-[#0A0E17] border border-[#1E293B]/70 p-3.5 rounded-xl text-xs font-mono text-slate-200 whitespace-pre-wrap">
                    {currentProblem.sampleInput}
                  </pre>
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
                    SAMPLE OUTPUT
                  </h3>
                  <pre className="bg-[#0A0E17] border border-[#1E293B]/70 p-3.5 rounded-xl text-xs font-mono text-slate-200 whitespace-pre-wrap">
                    {currentProblem.sampleOutput}
                  </pre>
                </div>
              </div>

              {/* AI Real-time Sync Status Banner */}
              <div className="mt-6 p-4 rounded-2xl bg-[#141B2D] border border-blue-900/50 shadow-sm">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>⚡</span> AI EVENTUAL CONSISTENCY ENGINE
                </h3>
                <p className="text-xs text-[#94A3B8] leading-normal mb-3">
                  Submissions are continuously indexed into ChromaDB (Vector) and Kùzu (Graph) without locking the contest.
                </p>
                {aiSyncStatus === 'indexing' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#251D12] border border-amber-800/70 text-amber-400 rounded-xl text-xs font-medium animate-pulse">
                    <span className="animate-spin">🔄</span>
                    <span>Indexing for AI (ChromaDB + Kùzu)...</span>
                  </div>
                )}
                {aiSyncStatus === 'synced' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0D1E18] border border-emerald-800/80 text-emerald-400 rounded-xl text-xs font-medium">
                    <span>✅</span>
                    <span>AI Indexed &amp; Synced &bull; Ready for Query</span>
                  </div>
                )}
                {aiSyncStatus === 'idle' && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0D1625] border border-emerald-900/60 rounded-xl text-xs font-medium text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>AI Sync Ready (Awaiting Submission)</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Problem Stepper Controls */}
            <div className="pt-4 border-t border-[#1E293B] flex items-center justify-between mt-6">
              <button
                onClick={handlePrevProblem}
                disabled={currentProblemIndex === 0}
                className="text-xs font-medium text-[#94A3B8] hover:text-white disabled:opacity-30 transition"
              >
                &larr; Previous Problem
              </button>
              {!isLastProblem ? (
                <button
                  onClick={handleNextProblem}
                  className="text-xs font-bold text-[#38BDF8] hover:text-cyan-300 transition"
                >
                  Next Problem ({problems[currentProblemIndex + 1]?.title}) &rarr;
                </button>
              ) : (
                <span className="text-xs text-[#94A3B8] font-medium">Last Problem</span>
              )}
            </div>
          </div>

          {/* Code Editor & Submission Column */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-6 shadow-sm flex-1 flex flex-col justify-between relative">
              {/* Language Toolbar Header */}
              <div className="flex items-center justify-between pb-4 border-b border-[#1E293B] mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-bold text-[#94A3B8] uppercase tracking-wider">
                    LANGUAGE:
                  </label>
                  <select
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    className="border border-[#1E293B] rounded-lg px-3 py-1.5 text-xs font-semibold bg-[#0A0E17] text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="python">Python 3 (python:3.10-alpine)</option>
                    <option value="javascript">JavaScript / Node.js (node:20-alpine)</option>
                    <option value="cpp">C++ (gcc:alpine)</option>
                    <option value="bash">Bash (alpine:latest)</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setCode(currentProblem.starters[language] || currentProblem.starters['python'])}
                    className="text-xs text-[#94A3B8] hover:text-white px-2.5 py-1 rounded-lg border border-[#1E293B] hover:bg-[#1E293B]/60 transition flex items-center gap-1"
                    title="Reset to starter skeleton"
                  >
                    <span>↺</span>
                    <span>Reset Skeleton</span>
                  </button>
                </div>
                <span className="text-xs font-mono text-[#94A3B8]">Sandbox: 128MB &bull; Non-Root &bull; No Net</span>
              </div>

              {/* Code Editor Area with Line Numbers */}
              <div className="bg-[#0A0E17] border border-[#1E293B]/70 rounded-xl p-4 flex font-mono text-xs leading-relaxed min-h-[360px] overflow-hidden">
                {/* Line Numbers Column */}
                <div className="text-right pr-3.5 text-[#94A3B8]/60 select-none border-r border-[#1E293B]/60 mr-3 flex flex-col">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <span key={i + 1} className="h-5 leading-5 block">{i + 1}</span>
                  ))}
                </div>

                {/* Editable Text Area */}
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  rows={16}
                  className="w-full flex-1 bg-transparent text-slate-100 focus:outline-none resize-none font-mono text-xs leading-5"
                  placeholder="Write your code here..."
                  spellCheck={false}
                />
              </div>

              {/* Bottom Action Bar */}
              <div className="mt-5 flex items-center justify-between">
                <div className="text-xs text-[#94A3B8]">
                  Solving: <span className="font-semibold text-white">{currentProblem.title}</span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition flex items-center gap-2 shadow-sm ${
                    submitting
                      ? 'bg-slate-700 cursor-not-allowed text-slate-300'
                      : 'bg-[#2563EB] hover:bg-blue-600'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin">⚙️</span>
                      <span>Judging &amp; Indexing...</span>
                    </>
                  ) : (
                    <>
                      <span>🚀</span>
                      <span>Submit Solution</span>
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* Submission Result / Live Sync Status Card with Next Problem Button */}
            {submissionResult && (
              <div className="bg-[#121824] p-5 rounded-2xl border border-[#1E293B] shadow-sm transition">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <span>📋</span> Submission Verdict &mdash; {submissionResult.problemTitle}
                  </h3>
                  <span className="text-xs text-[#94A3B8] font-mono">ID: {submissionResult.id}</span>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                  <div>
                    <span className="text-[#94A3B8] text-xs block">Language</span>
                    <span className="font-semibold uppercase text-xs text-white">{submissionResult.language}</span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] text-xs block">Judge Verdict</span>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold ${
                        submissionResult.verdict === 'ACCEPTED'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                          : submissionResult.verdict === 'PARTIAL'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/80'
                          : submissionResult.verdict === 'PENDING'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/80 animate-pulse'
                          : submissionResult.verdict === 'COMPILE_ERROR'
                          ? 'bg-purple-950/60 text-purple-400 border border-purple-800/80'
                          : submissionResult.verdict === 'INFRASTRUCTURE_ERROR'
                          ? 'bg-orange-950/60 text-orange-400 border border-orange-800/80'
                          : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                      }`}
                    >
                      {submissionResult.verdict}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] text-xs block">Score</span>
                    <span className={`font-bold ${submissionResult.score > 0 ? (submissionResult.verdict === 'ACCEPTED' ? 'text-emerald-400' : 'text-amber-400') : 'text-rose-400'}`}>
                      {submissionResult.score} / {submissionResult.maxScore ?? currentProblem.points}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94A3B8] text-xs block">Tests Passed</span>
                    <span className="font-bold text-slate-200">
                      {submissionResult.testCasesPassed ?? 0} / {submissionResult.totalTestCases ?? 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {submissionResult.aiStatus === 'indexing' ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#251D12] border border-amber-800/70 text-amber-400 text-xs font-semibold rounded-full animate-pulse">
                        <span className="animate-spin">🔄</span> Indexing for AI...
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D1E18] border border-emerald-800/80 text-emerald-400 text-xs font-semibold rounded-full">
                        <span>✅</span> AI Indexed
                      </span>
                    )}
                  </div>
                </div>

                {/* Judge Feedback / Execution Log Message */}
                {submissionResult.message && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-xs font-mono border ${
                      submissionResult.verdict === 'ACCEPTED'
                        ? 'bg-emerald-950/30 border-emerald-900/50 text-emerald-300'
                        : submissionResult.verdict === 'PARTIAL'
                        ? 'bg-amber-950/30 border-amber-900/50 text-amber-300'
                        : submissionResult.verdict === 'COMPILE_ERROR'
                        ? 'bg-purple-950/30 border-purple-900/50 text-purple-300'
                        : submissionResult.verdict === 'PENDING'
                        ? 'bg-amber-950/30 border-amber-900/50 text-amber-300'
                        : 'bg-rose-950/30 border-rose-900/50 text-rose-300'
                    }`}
                  >
                    <span className="font-bold mr-1.5">
                      {submissionResult.verdict === 'ACCEPTED'
                        ? '✓ Output:'
                        : submissionResult.verdict === 'PARTIAL'
                        ? '⚡ Partial:'
                        : submissionResult.verdict === 'COMPILE_ERROR'
                        ? '✗ Build:'
                        : '✗ Test:'}
                    </span>
                    {submissionResult.message}
                  </div>
                )}

                {/* Per-Testcase Breakdown */}
                {submissionResult.testCaseResults && submissionResult.testCaseResults.length > 0 && (
                  <div className="mb-4 p-3 bg-[#0A0E17] rounded-xl border border-[#1E293B]/80 text-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-slate-300">Testcase Breakdown</span>
                      {submissionResult.hiddenCount > 0 && (
                        <span className="text-slate-400 font-mono text-[11px]">
                          Hidden Tests: {submissionResult.hiddenPassed}/{submissionResult.hiddenCount} passed
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {submissionResult.testCaseResults.map((tcr: any, idx: number) => {
                        const isHidden = tcr.testCase?.isHidden;
                        return (
                          <div
                            key={tcr.id || idx}
                            className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 font-mono text-[11px] ${
                              tcr.passed
                                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-400'
                                : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
                            }`}
                          >
                            <span>{tcr.passed ? '✓' : '✗'}</span>
                            <span>{isHidden ? `Hidden #${idx + 1}` : `Test #${idx + 1}`}</span>
                            <span className="opacity-75">
                              ({tcr.pointsAwarded ?? (tcr.passed ? tcr.maxPoints : 0)}/{tcr.maxPoints ?? '-'} pts)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* THE "NEXT PROBLEM" ACTION BAR */}
                <div className="pt-3 border-t border-[#1E293B] flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/ai?q=${encodeURIComponent(`Why did my submission ${submissionResult.id} for problem ${submissionResult.problemTitle} receive verdict ${submissionResult.verdict} with score ${submissionResult.score}/${currentProblem.points}, and what concepts or learning resources should I review next?`)}&problem=${encodeURIComponent(submissionResult.problemTitle)}&sub=${encodeURIComponent(submissionResult.id)}`}
                    className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
                  >
                    <span>🤖</span> Ask AI why this code {submissionResult.verdict === 'ACCEPTED' ? 'passed' : 'failed'} &rarr;
                  </Link>

                  {submissionResult.verdict === 'ACCEPTED' ? (
                    !isLastProblem ? (
                      <button
                        onClick={handleNextProblem}
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-2 shadow-sm"
                      >
                        <span>Next Problem: {problems[currentProblemIndex + 1]?.title}</span>
                        <span>&rarr;</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-emerald-400 font-bold">🎉 All 3 Contest Problems Completed!</span>
                        <Link
                          href={`/ai?q=${encodeURIComponent('Analyze my overall performance across the Midterm Algorithms contest. Identify my prerequisite knowledge gaps across the 3 problems (Two Sum, Palindrome Checker, Binary Search) and recommend targeted learning resources.')}&contest=Midterm+Algorithms`}
                          className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-xs font-bold rounded-xl transition shadow-sm"
                        >
                          Investigate Full Contest with AI &rarr;
                        </Link>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-rose-400 font-medium">
                        Submission did not pass all tests. Modify your code and re-submit.
                      </span>
                      {!isLastProblem && (
                        <button
                          onClick={handleNextProblem}
                          className="px-3 py-1.5 border border-[#1E293B] hover:bg-[#1E293B] text-[#94A3B8] hover:text-white text-xs font-medium rounded-xl transition"
                        >
                          Skip to Next &rarr;
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submissions History Table */}
        {submissionsList.length > 0 && (
          <div className="mt-10 bg-[#121824] rounded-2xl border border-[#1E293B] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1E293B] flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Contest Submissions History</h3>
              <span className="text-xs text-[#94A3B8] font-mono">{submissionsList.length} submission(s)</span>
            </div>
            <table className="w-full text-left text-sm text-[#94A3B8]">
              <thead className="bg-[#0A0E17]/60 text-xs font-bold uppercase text-[#94A3B8] border-b border-[#1E293B]">
                <tr>
                  <th className="px-6 py-3 font-mono">Submission ID</th>
                  <th className="px-6 py-3">Problem</th>
                  <th className="px-6 py-3">Language</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Verdict</th>
                  <th className="px-6 py-3">Score</th>
                  <th className="px-6 py-3">AI Sync Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E293B]">
                {submissionsList.map((s) => (
                  <tr key={s.id} className="hover:bg-[#1A2234]/50 transition">
                    <td className="px-6 py-3.5 font-mono text-xs text-white">{s.id}</td>
                    <td className="px-6 py-3.5 font-bold text-xs text-white">{s.problemTitle}</td>
                    <td className="px-6 py-3.5 font-semibold text-xs uppercase text-slate-300">{s.language}</td>
                    <td className="px-6 py-3.5 text-xs text-[#94A3B8]">{s.status}</td>
                    <td className="px-6 py-3.5 font-bold text-xs">
                      <span
                        className={`px-2.5 py-0.5 rounded text-xs font-semibold ${
                          s.verdict === 'ACCEPTED'
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/80'
                            : s.verdict === 'PARTIAL'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/80'
                            : s.verdict === 'PENDING'
                            ? 'bg-amber-950/60 text-amber-400 border border-amber-800/80'
                            : s.verdict === 'COMPILE_ERROR'
                            ? 'bg-purple-950/60 text-purple-400 border border-purple-800/80'
                            : s.verdict === 'INFRASTRUCTURE_ERROR'
                            ? 'bg-orange-950/60 text-orange-400 border border-orange-800/80'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-800/80'
                        }`}
                      >
                        {s.verdict}
                      </span>
                    </td>
                    <td className={`px-6 py-3.5 font-bold text-xs ${s.score > 0 ? (s.verdict === 'ACCEPTED' ? 'text-emerald-400' : 'text-amber-400') : 'text-rose-400'}`}>
                      {s.score}
                    </td>
                    <td className="px-6 py-3.5">
                      {s.aiStatus === 'indexing' ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                          <span className="animate-spin">🔄</span> Indexing for AI...
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <span>✅</span> Synced &amp; Retrievable
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
