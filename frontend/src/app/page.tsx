import Link from 'next/link';
import { ArrowRight, Code2, Trophy, Search, Sparkles } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col relative overflow-hidden select-none">
      {/* Background Decorative Grid Columns */}
      <div className="absolute inset-0 pointer-events-none flex justify-around max-w-7xl mx-auto opacity-20">
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
      </div>

      {/* Faint Code Watermarks in Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden font-mono text-xs text-[#94A3B8] opacity-[0.035] leading-loose p-10 z-0">
        <div className="absolute top-28 left-12">
          {`function solve() {\n  const res = [];\n  seen.set(nums[i], i);\n  return res;\n}\n\npublic class Learner {\n  private String id;\n  private Double score;\n}`}
        </div>
        <div className="absolute top-20 right-16 text-right">
          {`def three_sum(nums):\n    nums.sort()\n    for i in range(len(nums) - 2):\n        if nums[i] == nums[i-1]:\n            continue`}
        </div>
        <div className="absolute bottom-24 left-1/4">
          {`async function judgeSubmissions(subId) {\n  const job = await docker.createContainer();\n  return job.verdict;\n}`}
        </div>
        <div className="absolute bottom-20 right-28">
          {`MATCH (l:Learner)-[:SUBMITTED]->(s:Submission)\nWHERE s.verdict = 'WRONG_ANSWER'\nRETURN s, l;`}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="relative z-10 w-full border-b border-[#1E293B]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 tracking-wider group-hover:border-blue-500 transition">
              N
            </div>
            <span className="font-bold tracking-wider text-sm text-white group-hover:text-blue-400 transition">
              SHODH-A-CODE
            </span>
          </Link>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-4">
            <Link
              href="/contests"
              className="text-sm font-medium text-[#94A3B8] hover:text-white transition hidden sm:inline-block"
            >
              Sign In
            </Link>
            <Link
              href="/contests"
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 max-w-6xl mx-auto w-full">
        {/* Main Title & Subtitle */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Shodh-a-Code Platform
          </h1>
          <p className="text-base sm:text-lg text-[#94A3B8] leading-relaxed max-w-2xl mx-auto font-normal">
            A professional platform for competitive programming, active coding contests, and intelligent code analysis.
          </p>
        </div>

        {/* The Two Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
          {/* Card 1: View Contests */}
          <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-8 flex flex-col justify-between hover:border-slate-700/80 transition duration-200">
            <div>
              {/* Card Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#1A2234] border border-[#1E293B] flex items-center justify-center mb-6 relative">
                <Code2 className="w-6 h-6 text-[#94A3B8]" />
                <Trophy className="w-4 h-4 text-cyan-400 absolute -bottom-1.5 -right-1.5 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                View Contests
              </h2>
              <p className="text-sm text-[#94A3B8] leading-normal mb-8">
                Join available coding contests and solve problems.
              </p>
            </div>

            {/* CTA Button */}
            <div>
              <Link
                href="/contests"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <span>Browse Contests</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: AI Investigation */}
          <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-8 flex flex-col justify-between hover:border-slate-700/80 transition duration-200">
            <div>
              {/* Card Icon */}
              <div className="w-12 h-12 rounded-xl bg-[#1A2234] border border-[#1E293B] flex items-center justify-center mb-6 relative">
                <Code2 className="w-6 h-6 text-[#94A3B8]" />
                <div className="absolute -bottom-1.5 -right-1.5 flex items-center drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]">
                  <Search className="w-4 h-4 text-cyan-400" />
                  <Sparkles className="w-2.5 h-2.5 text-sky-300 -ml-1 -mt-1" />
                </div>
              </div>

              {/* Title & Description */}
              <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
                AI Investigation
              </h2>
              <p className="text-sm text-[#94A3B8] leading-normal mb-8">
                Ask the AI service about your submissions and judge events.
              </p>
            </div>

            {/* CTA Button */}
            <div>
              <Link
                href="/ai"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121824] border border-[#1E293B] hover:bg-[#1E293B] text-white text-sm font-medium rounded-lg transition shadow-sm"
              >
                <span>Launch Investigator</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>


      </main>
    </div>
  );
}

