'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface TimelineEvent {
  time: string;
  label: string;
  detail: string;
  status: 'normal' | 'event' | 'incident' | 'spike' | 'recovery';
}

interface AffectedSubmission {
  submission_id: string;
  learner: string;
  problem: string;
  verdict: string;
  worker: string;
  timestamp: string;
  classification: 'LIKELY_INFRASTRUCTURE' | 'LIKELY_STUDENT_ERROR' | 'SUCCESSFUL_PASS' | 'UNCERTAIN';
  logs_preview: string;
}

interface EvidenceItem {
  id: string;
  type: string;
  timestamp: string;
  content: string;
}

interface HealthRadarReport {
  status: 'HEALTHY' | 'POSSIBLE_JUDGE_INCIDENT' | 'UNCERTAIN_FAILURE_SPIKE';
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  baseline_failure_rate: number;
  incident_failure_rate: number;
  spike_multiplier: number;
  timeline: TimelineEvent[];
  affected_submissions: AffectedSubmission[];
  evidence: EvidenceItem[];
  ai_investigation?: string;
}

export default function ContestHealthRadarPage() {
  const [role, setRole] = useState<'INSTRUCTOR' | 'STUDENT'>('INSTRUCTOR');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<HealthRadarReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealthRadar = async (currentRole: 'INSTRUCTOR' | 'STUDENT') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/instructor/contest-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_role: currentRole,
          user_id: currentRole === 'INSTRUCTOR' ? 'u_instructor' : 'u1',
        }),
      });

      if (!res.ok) {
        if (res.status === 403) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'UNAUTHORIZED: Contest health radar is strictly restricted to instructors.');
        }
        throw new Error(`HTTP error ${res.status}`);
      }

      const data: HealthRadarReport = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with AI Service');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthRadar(role);
  }, [role]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'POSSIBLE_JUDGE_INCIDENT':
        return {
          bg: 'bg-[#1F131D] border-rose-900/80 text-rose-200',
          dot: 'bg-rose-500 animate-ping',
          title: '🚨 Possible Judge Incident Detected',
        };
      case 'UNCERTAIN_FAILURE_SPIKE':
        return {
          bg: 'bg-[#1F1A12] border-amber-900/80 text-amber-200',
          dot: 'bg-amber-500',
          title: '⚠️ Uncertain Failure Spike (No Correlated Event)',
        };
      default:
        return {
          bg: 'bg-[#0D1E18] border-emerald-900/80 text-emerald-200',
          dot: 'bg-emerald-500',
          title: '✅ Judge Infrastructure Healthy & Nominal',
        };
    }
  };

  const getClassificationBadge = (cls: string) => {
    switch (cls) {
      case 'LIKELY_INFRASTRUCTURE':
        return 'bg-rose-950/80 text-rose-400 border-rose-800/80 font-bold';
      case 'LIKELY_STUDENT_ERROR':
        return 'bg-amber-950/80 text-amber-400 border-amber-800/80 font-semibold';
      case 'SUCCESSFUL_PASS':
        return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 font-semibold';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E17] text-white pb-16 relative overflow-hidden select-none">
      {/* Background Decorative Grid Columns */}
      <div className="absolute inset-0 pointer-events-none flex justify-around max-w-7xl mx-auto opacity-20">
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
        <div className="w-px h-full bg-[#1E293B]" />
      </div>

      {/* Top Header */}
      <header className="bg-[#0A0E17]/80 backdrop-blur-md border-b border-[#1E293B] sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-[#1E293B] border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 tracking-wider hover:border-blue-500 transition">
              N
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white tracking-tight">AI CONTEST HEALTH RADAR</h1>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-blue-950/80 text-blue-400 border border-blue-800/80">
                  INSTRUCTOR ONLY
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Multi-Hop Graph &bull; Authoritative Telemetry &bull; Infrastructure Incident Isolation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* RBAC Role Switcher */}
            <div className="flex items-center bg-[#121824] p-1 rounded-xl border border-[#1E293B] text-xs font-semibold">
              <button
                onClick={() => setRole('INSTRUCTOR')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  role === 'INSTRUCTOR'
                    ? 'bg-[#2563EB] text-white font-bold shadow-sm'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                👨‍🏫 Instructor Mode
              </button>
              <button
                onClick={() => setRole('STUDENT')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  role === 'STUDENT'
                    ? 'bg-rose-950 text-rose-300 font-bold shadow-sm border border-rose-800'
                    : 'text-[#94A3B8] hover:text-white'
                }`}
              >
                🎓 Student Role (Test RBAC)
              </button>
            </div>

            <button
              onClick={() => fetchHealthRadar(role)}
              disabled={loading}
              className="px-3.5 py-1.5 bg-[#121824] hover:bg-[#1E293B] border border-[#1E293B] text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
            >
              {loading ? 'Analyzing...' : '🔄 Re-Analyze'}
            </button>

            <Link
              href="/contests"
              className="px-3.5 py-1.5 bg-[#121824] hover:bg-[#1E293B] border border-[#1E293B] text-[#94A3B8] hover:text-white rounded-xl text-xs font-semibold transition"
            >
              Contests &rarr;
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8 relative z-10">
        {/* Error / RBAC Rejection State */}
        {error && (
          <div className="p-6 bg-[#1F131D] border-2 border-rose-900/80 rounded-2xl shadow-sm text-rose-200 space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚫</span>
              <div>
                <h2 className="text-lg font-bold text-white">Access Denied (RBAC Boundary Protected)</h2>
                <p className="text-sm font-mono text-rose-300">{error}</p>
              </div>
            </div>
            <p className="text-xs text-rose-400 pt-2 border-t border-rose-900/60">
              Contest telemetry, infrastructure node events, and failure rate radar are strictly restricted to instructor accounts. Switch back to Instructor Mode above to view radar diagnostics.
            </p>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !report && !error && (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-[#94A3B8]">
              Querying Kùzu Graph, SQLite FTS5, and judge telemetry...
            </p>
          </div>
        )}

        {/* Report Content */}
        {report && (
          <>
            {/* Status Hero Banner */}
            {(() => {
              const statusCfg = getStatusBadge(report.status);
              return (
                <div className={`p-6 rounded-2xl border-2 shadow-sm ${statusCfg.bg} transition`}>
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className={`w-3.5 h-3.5 rounded-full ${statusCfg.dot}`} />
                      <h2 className="text-xl font-black text-white tracking-tight">{statusCfg.title}</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase font-bold text-[#94A3B8]">Verdict Confidence:</span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                          report.confidence === 'HIGH'
                            ? 'bg-[#2563EB] text-white shadow-sm'
                            : 'bg-amber-600 text-white'
                        }`}
                      >
                        {report.confidence} CONFIDENCE
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium mt-3 text-slate-200">{report.summary}</p>
                  <p className="text-xs text-[#94A3B8] mt-2 italic">
                    State Notice: System operates in read-only diagnostic mode. No submission scores, verdicts, or leaderboard standings are modified.
                  </p>
                </div>
              );
            })()}

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-[#121824] p-5 rounded-2xl border border-[#1E293B] shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase text-[#94A3B8]">Baseline Failure Rate</span>
                <div className="text-3xl font-black text-white">{report.baseline_failure_rate}%</div>
                <p className="text-xs text-[#94A3B8]">Normal operational window before incident</p>
              </div>

              <div className="bg-[#121824] p-5 rounded-2xl border border-[#1E293B] shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase text-[#94A3B8]">Incident Window Failure Rate</span>
                <div className="text-3xl font-black text-rose-400">{report.incident_failure_rate}%</div>
                <p className="text-xs text-[#94A3B8]">During correlated worker outage window</p>
              </div>

              <div className="bg-[#121824] p-5 rounded-2xl border border-[#1E293B] shadow-sm space-y-1">
                <span className="text-xs font-bold uppercase text-[#94A3B8]">Anomaly Spike Multiplier</span>
                <div className="text-3xl font-black text-[#38BDF8]">{report.spike_multiplier}x</div>
                <p className="text-xs text-[#94A3B8]">Multiplier over baseline failure threshold</p>
              </div>
            </div>

            {/* Timeline of Events */}
            <div className="bg-[#121824] p-6 rounded-2xl border border-[#1E293B] shadow-sm space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>⏱️</span> Contest Operational Timeline
              </h3>
              <div className="divide-y divide-[#1E293B]">
                {report.timeline.map((evt, idx) => (
                  <div key={idx} className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-[#94A3B8] w-28">{evt.time}</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          evt.status === 'incident'
                            ? 'bg-rose-500'
                            : evt.status === 'spike'
                            ? 'bg-amber-500'
                            : evt.status === 'recovery'
                            ? 'bg-blue-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <span className="font-semibold text-white">{evt.label}</span>
                    </div>
                    <span className="text-xs text-[#94A3B8]">{evt.detail}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Affected Submissions Diagnostic Table */}
            <div className="bg-[#121824] p-6 rounded-2xl border border-[#1E293B] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>🔬</span> Evaluated Incident Submissions ({report.affected_submissions.length})
                </h3>
                <span className="text-xs text-[#94A3B8]">
                  Separating infrastructure crashes vs genuine student errors
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#1E293B] text-xs font-bold text-[#94A3B8] uppercase">
                      <th className="py-2.5 px-3">Submission</th>
                      <th className="py-2.5 px-3">Problem</th>
                      <th className="py-2.5 px-3">Verdict</th>
                      <th className="py-2.5 px-3">Worker Node</th>
                      <th className="py-2.5 px-3">Classification</th>
                      <th className="py-2.5 px-3">Telemetry / Logs Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E293B]">
                    {report.affected_submissions.map((sub) => (
                      <tr key={sub.submission_id} className="hover:bg-[#1A2234]/50 transition">
                        <td className="py-2.5 px-3 font-mono text-xs font-semibold text-white">
                          {sub.submission_id}
                        </td>
                        <td className="py-2.5 px-3 text-slate-200 font-medium">{sub.problem}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              sub.verdict === 'ACCEPTED'
                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/80'
                                : sub.verdict === 'INFRASTRUCTURE_ERROR'
                                ? 'bg-rose-950/80 text-rose-400 border border-rose-800/80'
                                : 'bg-slate-900 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {sub.verdict}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-xs text-[#94A3B8]">{sub.worker}</td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs border ${getClassificationBadge(
                              sub.classification
                            )}`}
                          >
                            {sub.classification}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs font-mono text-[#94A3B8] max-w-xs truncate">
                          {sub.logs_preview}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* AI Synthesized Diagnostic Report */}
            {report.ai_investigation && (
              <div className="bg-[#121824] p-6 rounded-2xl border border-blue-900/60 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🤖</span>
                    <h3 className="text-base font-bold text-white">
                      Grounded AI Diagnostic Synthesis (Bounded Groq Agent)
                    </h3>
                  </div>
                  <span className="text-xs font-mono bg-[#0A0E17] text-[#38BDF8] px-2.5 py-1 rounded-lg border border-blue-900/60">
                    Max 3 Tool Iterations &bull; Kùzu Multi-Hop Grounded
                  </span>
                </div>

                <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap font-sans text-slate-200">
                  {report.ai_investigation}
                </div>
              </div>
            )}

            {/* Inspectable Telemetry Evidence Drawer */}
            <div className="bg-[#121824] p-6 rounded-2xl border border-[#1E293B] space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#94A3B8]">
                Authoritative Audit Evidence ({report.evidence.length} Records)
              </h3>
              <div className="space-y-2">
                {report.evidence.map((ev, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-[#0A0E17] rounded-xl border border-[#1E293B] text-xs font-mono text-slate-300 flex flex-wrap items-center justify-between gap-2 shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#38BDF8]">[{ev.type}]</span>
                      <span className="font-bold text-white">{ev.id}:</span>
                      <span>{ev.content}</span>
                    </div>
                    <span className="text-[#94A3B8] text-2xs">{ev.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
