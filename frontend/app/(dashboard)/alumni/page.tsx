"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import CandidateScoreCard from "@/components/CandidateScoreCard";

interface ScoreResult {
  score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: "accept" | "review" | "decline";
  message_quality: "high" | "medium" | "low";
}

export default function AlumniDashboard() {
  const router = useRouter();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Score All state
  const [scoringAll, setScoringAll] = useState(false);
  const [scoreAllProgress, setScoreAllProgress] = useState(0);
  const [scores, setScores] = useState<Record<string, ScoreResult>>({});
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    try {
      const data = await apiGet("/api/referral/my");
      setReferrals(data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleScoreAll() {
    const pendingReferrals = referrals.filter((r) => r.status === "pending");
    if (pendingReferrals.length === 0) return;

    setScoringAll(true);
    setScoreAllProgress(0);

    for (let i = 0; i < pendingReferrals.length; i++) {
      const r = pendingReferrals[i];

      // Mark this one as in-progress
      setScoringIds((prev) => new Set(prev).add(r.id));

      try {
        const data = await apiPost("/api/ai/shortlist-candidate", {
          referral_request_id: r.id,
        });
        setScores((prev) => ({ ...prev, [r.id]: data }));
      } catch {
        // Skip failed scores silently — individual cards show their own errors
      } finally {
        setScoringIds((prev) => {
          const next = new Set(prev);
          next.delete(r.id);
          return next;
        });
      }

      setScoreAllProgress(i + 1);

      // 1 second delay between requests to avoid rate limiting
      if (i < pendingReferrals.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setScoringAll(false);
  }

  // Sort pending referrals by score descending (unscored go to bottom)
  function sortedByScore(list: any[]) {
    return [...list].sort((a, b) => {
      const sa = scores[a.id]?.score ?? -1;
      const sb = scores[b.id]?.score ?? -1;
      return sb - sa;
    });
  }

  const pending = referrals.filter((r) => r.status === "pending");
  const others = referrals.filter((r) => r.status !== "pending");
  const accepted = referrals.filter((r) => r.status === "accepted").length;
  const responseRate =
    referrals.length > 0
      ? Math.round(
          (referrals.filter((r) => r.status !== "pending").length /
            referrals.length) *
            100,
        )
      : 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Referral requests</h1>
        <p className="text-sm text-gray-500 mt-1">
          {pending.length} pending · {others.length} resolved
        </p>
      </div>

      {/* Stats row */}
      {!loading && referrals.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Pending requests</p>
            <p className="text-3xl font-bold text-amber-500">{pending.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total referred</p>
            <p className="text-3xl font-bold text-indigo-600">{accepted}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Response rate</p>
            <p className="text-3xl font-bold text-green-600">{responseRate}%</p>
          </div>
        </div>
      )}

      {/* AI shortlisting banner */}
      {!loading && pending.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl px-5 py-4 mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-indigo-900">
              AI candidate shortlisting
            </p>
            <p className="text-xs text-indigo-500 mt-0.5">
              Score candidates with AI to prioritise your referral queue
            </p>
          </div>
          {scoringAll ? (
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs text-indigo-600 font-medium">
                {scoreAllProgress}/{pending.length} scored
              </div>
              <div className="w-24 h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                  style={{
                    width: `${(scoreAllProgress / pending.length) * 100}%`,
                  }}
                />
              </div>
            </div>
          ) : (
            <button
              onClick={handleScoreAll}
              disabled={scoringAll}
              className="shrink-0 text-xs bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50"
            >
              Score All ({pending.length})
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white rounded-2xl shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl shadow-sm">
          No referral requests yet.
        </div>
      ) : (
        <div className="space-y-3">
          {pending.length > 0 && (
            <>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
                  Pending
                </p>
                {Object.keys(scores).length > 0 && (
                  <span className="text-xs text-gray-400">
                    · sorted by AI score
                  </span>
                )}
              </div>
              {sortedByScore(pending).map((r) => (
                <CandidateScoreCard
                  key={r.id}
                  referralId={r.id}
                  studentName={r.student?.full_name ?? "Unknown"}
                  jobTitle={r.job?.title ?? "Unknown role"}
                  company={r.job?.company ?? ""}
                  status={r.status}
                  messageCount={r.message_count ?? 0}
                  chatUnlocked={r.chat_unlocked ?? false}
                  onOpenChat={() => router.push(`/alumni/referrals/${r.id}`)}
                  externalScore={scores[r.id] ?? null}
                  scoring={scoringIds.has(r.id)}
                />
              ))}
            </>
          )}
          {others.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-6">
                Resolved
              </p>
              {others.map((r) => (
                <CandidateScoreCard
                  key={r.id}
                  referralId={r.id}
                  studentName={r.student?.full_name ?? "Unknown"}
                  jobTitle={r.job?.title ?? "Unknown role"}
                  company={r.job?.company ?? ""}
                  status={r.status}
                  messageCount={r.message_count ?? 0}
                  chatUnlocked={r.chat_unlocked ?? false}
                  onOpenChat={() => router.push(`/alumni/referrals/${r.id}`)}
                  externalScore={scores[r.id] ?? null}
                  scoring={scoringIds.has(r.id)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
