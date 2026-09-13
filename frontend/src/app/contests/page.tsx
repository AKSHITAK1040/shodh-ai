'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Code2,
  Radio,
  Sparkles,
  Trophy,
  Terminal,
  Search,
  Users,
  Clock,
  Calendar,
  Bell,
  CheckCircle2,
} from 'lucide-react';

interface ContestItem {
  id: string;
  title: string;
  description: string;
  problemsCount: number;
  totalPoints: number;
  status: 'LIVE' | 'UPCOMING' | 'PRACTICE';
  timeLabel: string;
  participants: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'All Levels';
  problems: string[];
  registered?: boolean;
}

const ALL_CONTESTS: ContestItem[] = [
  {
    id: 'mock-1',
    title: 'Midterm Algorithms Contest',
    description:
      'Solve core algorithmic challenges under live contest conditions. Features containerized Docker sandbox judging, real-time score tracking, and automated AI prerequisite gap analysis.',
    problemsCount: 3,
    totalPoints: 160,
    status: 'LIVE',
    timeLabel: '1h 45m remaining',
    participants: 342,
    difficulty: 'Medium',
    problems: ['Two Sum (10 pts)', 'Palindrome Checker (100 pts)', 'Binary Search (50 pts)'],
  },
  {
    id: 'mock-2',
    title: 'Weekly Speedrun #42: Graphs & Trees',
    description:
      'High-velocity algorithmic sprint focusing on graph traversals, shortest path algorithms, and binary tree balance. Judged with strict memory and CPU quotas.',
    problemsCount: 3,
    totalPoints: 50,
    status: 'LIVE',
    timeLabel: '3h 12m remaining',
    participants: 518,
    difficulty: 'Hard',
    problems: ['Number of Islands (15 pts)', 'Lowest Common Ancestor (15 pts)', 'Course Schedule (20 pts)'],
  },
  {
    id: 'mock-3',
    title: 'Dynamic Programming Invitational 2026',
    description:
      'Premier collegiate challenge on state compression, knapsack variants, and tree DP. Practice your subproblem memoization and bottom-up space optimizations.',
    problemsCount: 4,
    totalPoints: 80,
    status: 'UPCOMING',
    timeLabel: 'Starts in 4 hours (18:00 UTC)',
    participants: 890,
    difficulty: 'Hard',
    problems: ['Coin Change II', 'Longest Common Subsequence', 'Edit Distance', 'Matrix Chain Multiplication'],
    registered: false,
  },
  {
    id: 'mock-4',
    title: 'Systems & Concurrency Sprint',
    description:
      'Practice archive testing race conditions, thread-safe queues, bit manipulation, and cache eviction policies. Open 24/7 for self-paced training.',
    problemsCount: 3,
    totalPoints: 45,
    status: 'PRACTICE',
    timeLabel: 'Open Training Archive',
    participants: 1240,
    difficulty: 'All Levels',
    problems: ['Bitwise Range AND (10 pts)', 'LRU Cache Design (20 pts)', 'Bounded Buffer (15 pts)'],
  },
];

export default function Contests() {
  const [contests, setContests] = useState<ContestItem[]>(ALL_CONTESTS);
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'PRACTICE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [registeredIds, setRegisteredIds] = useState<Record<string, boolean>>({});

  const toggleRegister = (id: string) => {
    setRegisteredIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredContests = useMemo(() => {
    return contests.filter((c) => {
      const matchesFilter = filter === 'ALL' || c.status === filter;
      const matchesSearch =
        c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.problems.some((p) => p.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [contests, filter, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white flex flex-col relative overflow-hidden select-none">
      {/* Background Decorative Grid Columns */}
      <div className="absolute inset-0 pointer-events-none flex justify-around max-w-7xl mx-auto opacity-20">
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 w-full border-b border-[#1E293B] bg-[#0A0E17]/80 backdrop-blur-md">
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

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <Link
              href="/instructor/health"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#121824] border border-rose-900/60 hover:border-rose-700 text-rose-400 text-xs font-semibold rounded-lg transition shadow-sm"
            >
              <Radio className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
              <span>AI Health Radar</span>
            </Link>
            <Link
              href="/ai"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-[#121824] border border-[#1E293B] hover:border-blue-500/60 text-[#94A3B8] hover:text-white text-xs font-semibold rounded-lg transition shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Assistant</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto w-full px-6 py-10">
        {/* Page Title & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#1E293B] mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">Active Contests Hub</h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                2 Live Contests
              </span>
            </div>
            <p className="text-sm text-[#94A3B8]">
              Isolated Docker execution sandbox &bull; Multi-language judging &bull; Real-time AI synchronization
            </p>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {/* Status Tabs */}
          <div className="flex items-center bg-[#121824] p-1 rounded-xl border border-[#1E293B] text-xs font-semibold w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap ${
                filter === 'ALL'
                  ? 'bg-[#2563EB] text-white shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              All ({contests.length})
            </button>
            <button
              onClick={() => setFilter('LIVE')}
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'LIVE'
                  ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-800/80 shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live (2)
            </button>
            <button
              onClick={() => setFilter('UPCOMING')}
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'UPCOMING'
                  ? 'bg-amber-950/90 text-amber-300 border border-amber-800/80 shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              <Clock className="w-3 h-3 text-amber-400" />
              Upcoming (1)
            </button>
            <button
              onClick={() => setFilter('PRACTICE')}
              className={`px-3.5 py-1.5 rounded-lg transition whitespace-nowrap flex items-center gap-1.5 ${
                filter === 'PRACTICE'
                  ? 'bg-[#1E293B] text-white shadow-sm font-bold'
                  : 'text-[#94A3B8] hover:text-white'
              }`}
            >
              Practice (1)
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by topic or problem..."
              className="w-full bg-[#121824] border border-[#1E293B] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-[#94A3B8]/60 focus:outline-none focus:border-blue-500 transition font-medium"
            />
          </div>
        </div>

        {/* Contests List */}
        <div className="grid gap-6">
          {filteredContests.length === 0 ? (
            <div className="bg-[#121824] border border-[#1E293B] rounded-2xl p-12 text-center text-[#94A3B8]">
              <p className="text-base font-semibold text-white mb-1">No contests found</p>
              <p className="text-xs">Try adjusting your search query or status filter.</p>
            </div>
          ) : (
            filteredContests.map((c) => {
              const isRegistered = registeredIds[c.id];

              return (
                <div
                  key={c.id}
                  className="bg-[#121824] border border-[#1E293B] rounded-2xl p-7 hover:border-slate-700/80 transition duration-200 flex flex-col justify-between space-y-6 shadow-sm"
                >
                  {/* Contest Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#1A2234] border border-[#1E293B] flex items-center justify-center text-cyan-400 shrink-0">
                        <Trophy className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-xl font-bold text-white tracking-tight">{c.title}</h2>
                          <span className="text-xs font-mono text-[#94A3B8]/80">ID: {c.id}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-[#94A3B8] mt-1 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{c.timeLabel}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-[#94A3B8]" />
                            <span>{c.participants} {c.status === 'PRACTICE' ? 'solved' : 'active'}</span>
                          </span>
                          <span>&bull;</span>
                          <span className="px-2 py-0.2 rounded text-[11px] font-semibold bg-[#1A2234] text-slate-300 border border-[#1E293B]">
                            {c.difficulty}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {c.status === 'LIVE' && (
                        <span className="px-3 py-1 bg-emerald-950/60 text-emerald-400 text-xs font-semibold rounded-full border border-emerald-800/80 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          LIVE NOW
                        </span>
                      )}
                      {c.status === 'UPCOMING' && (
                        <span className="px-3 py-1 bg-amber-950/60 text-amber-400 text-xs font-semibold rounded-full border border-amber-800/80 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-amber-400" />
                          UPCOMING
                        </span>
                      )}
                      {c.status === 'PRACTICE' && (
                        <span className="px-3 py-1 bg-slate-900 text-slate-400 text-xs font-semibold rounded-full border border-slate-700 flex items-center gap-1.5">
                          PRACTICE ARCHIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    {c.description}
                  </p>

                  {/* Problems included in contest */}
                  {c.problems && (
                    <div className="bg-[#0A0E17]/60 border border-[#1E293B]/70 rounded-xl p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-2.5 flex items-center gap-1.5">
                        <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                        <span>
                          Challenge Problems ({c.problemsCount} Challenges &bull; {c.totalPoints} Total Points)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {c.problems.map((pName: string, pIdx: number) => (
                          <span
                            key={pIdx}
                            className="px-2.5 py-1 rounded-lg bg-[#121824] border border-[#1E293B] text-xs font-medium text-slate-200"
                          >
                            {pName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Footer Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-[#1E293B]">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#94A3B8]">
                      <span className="font-medium text-white flex items-center gap-1">
                        <Terminal className="w-3.5 h-3.5 text-[#94A3B8]" />
                        Supported:
                      </span>
                      <span className="px-2 py-0.5 bg-[#1A2234] border border-[#1E293B] rounded text-slate-300 font-mono">Python 3</span>
                      <span className="px-2 py-0.5 bg-[#1A2234] border border-[#1E293B] rounded text-slate-300 font-mono">Node.js</span>
                      <span className="px-2 py-0.5 bg-[#1A2234] border border-[#1E293B] rounded text-slate-300 font-mono">C++</span>
                      <span className="px-2 py-0.5 bg-[#1A2234] border border-[#1E293B] rounded text-slate-300 font-mono">Bash</span>
                    </div>

                    {c.status === 'LIVE' ? (
                      <Link
                        href={`/contests/${c.id === 'mock-2' ? 'mock-1' : c.id}`}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2563EB] hover:bg-blue-600 text-white font-semibold text-sm rounded-xl transition shadow-sm"
                      >
                        <span>Solve Problems</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    ) : c.status === 'UPCOMING' ? (
                      <button
                        onClick={() => toggleRegister(c.id)}
                        className={`inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition shadow-sm ${
                          isRegistered
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                            : 'bg-[#121824] border border-[#1E293B] hover:border-amber-500/60 text-amber-300'
                        }`}
                      >
                        {isRegistered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Registered &bull; Reminder Set</span>
                          </>
                        ) : (
                          <>
                            <Bell className="w-3.5 h-3.5 text-amber-400" />
                            <span>Register / Set Reminder</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href="/contests/mock-1"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#121824] border border-[#1E293B] hover:bg-[#1E293B] text-slate-200 font-semibold text-xs rounded-xl transition shadow-sm"
                      >
                        <span>Enter Practice Mode</span>
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}


