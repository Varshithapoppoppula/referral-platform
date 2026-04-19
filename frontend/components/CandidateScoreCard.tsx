"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

interface ScoreResult {
  score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: "accept" | "review" | "decline";
  message_quality: "high" | "medium" | "low";
}

interface CandidateScoreCardProps {
  referralId: string;
  studentName: string;
  jobTitle: string;
  company: string;
  status: string;
  messageCount: number;
  chatUnlocked: boolean;
  onOpenChat: () => void;
  // Allow parent to inject a pre-computed score (for Score All)
  externalScore?: ScoreResult | null;
  scoring?: boolean;
}

const RECOMMENDATION_STYLE = {
  accept: "bg-green-100 text-green-700 border-green-200",
  review: "bg-amber-50 text-amber-700 border-amber-200",
  decline: "bg-red-50 text-red-600 border-red-200",
};

const RECOMMENDATION_LABEL = {
  accept: "Recommend referral",
  review: "Review further",
  decline: "Decline",
};

const MESSAGE_QUALITY_STYLE = {
  high: "bg-indigo-50 text-indigo-700 border-indigo-200",
  medium: "bg-gray-100 text-gray-600 border-gray-200",
  low: "bg-red-50 text-red-500 border-red-200",
};

const MESSAGE_QUALITY_LABEL = {
  high: "Strong message",
  medium: "Average message",
  low: "Weak message",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  accepted: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  expired: "bg-gray-100 text-gray-500 border-gray-200",
};

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 75
      ? "text-green-600"
      : score >= 50
        ? "text-amber-500"
        : "text-red-500";
  const ring =
    score >= 75
      ? "border-green-400"
      : score >= 50
        ? "border-amber-400"
        : "border-red-400";
  const bg =
    score >= 75
      ? "bg-green-50"
      : score >= 50
        ? "bg-amber-50"
        : "bg-red-50";

  return (
    <div
      className={`w-16 h-16 rounded-full border-4 ${ring} ${bg} flex flex-col items-center justify-center shrink-0`}
    >
      <span className={`text-lg font-bold leading-none ${color}`}>{score}</span>
      <span className="text-xs text-gray-400 leading-none mt-0.5">/100</span>
    </div>
  );
}

export default function CandidateScoreCard({
  referralId,
  studentName,
  jobTitle,
  company,
  status,
  messageCount,
  chatUnlocked,
  onOpenChat,
  externalScore,
  scoring: externalScoring,
}: CandidateScoreCardProps) {
  const [loading, setLoading] = useState(false);
  const [score, setScore] = useState<ScoreResult | null>(externalScore ?? null);
  const [error, setError] = useState("");

  // Sync external score when it arrives (Score All flow)
  if (externalScore && !score) {
    setScore(externalScore);
  }

  const isScoring = externalScoring ?? loading;

  async function handleScore() {
    setLoading(true);
    setError("");
    try {
      const data = await apiPost("/api/ai/shortlist-candidate", {
        referral_request_id: referralId,
      });
      setScore(data);
    } catch (err: any) {
      setError(err.message || "Could not score candidate. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const canChat =
    status !== "rejected" && status !== "expired";

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {studentName || "Unknown student"}
          </p>
          <p className="text-xs text-indigo-600 font-medium mt-0.5 truncate">
            {jobTitle} · {company}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${
              STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500 border-gray-200"
            }`}
          >
            {status}
          </span>
        </div>
      </div>

      {/* Score area */}
      <div className="px-5 pb-4">
        {!score && !isScoring && (
          <button
            onClick={handleScore}
            className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            Score candidate
          </button>
        )}

        {isScoring && !score && (
          <div className="flex items-center gap-2 text-xs text-gray-400 py-1">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </span>
            Scoring candidate...
          </div>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-1">{error}</p>
        )}

        {score && (
          <div className="mt-1">
            {/* Score + verdict */}
            <div className="flex items-center gap-4 mb-3">
              <ScoreCircle score={score.score} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-snug">
                  {score.verdict}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${
                      RECOMMENDATION_STYLE[score.recommendation]
                    }`}
                  >
                    {RECOMMENDATION_LABEL[score.recommendation]}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border ${
                      MESSAGE_QUALITY_STYLE[score.message_quality]
                    }`}
                  >
                    {MESSAGE_QUALITY_LABEL[score.message_quality]}
                  </span>
                </div>
              </div>
            </div>

            {/* Strengths + Weaknesses */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-green-600 mb-1.5">
                  Strengths
                </p>
                <ul className="space-y-1">
                  {score.strengths.map((s, i) => (
                    <li key={i} className="flex gap-1.5 items-start text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                      {s}
                    </li>
                  ))}
                  {score.strengths.length === 0 && (
                    <li className="text-xs text-gray-400">None identified</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1.5">
                  Weaknesses
                </p>
                <ul className="space-y-1">
                  {score.weaknesses.map((w, i) => (
                    <li key={i} className="flex gap-1.5 items-start text-xs text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1 shrink-0" />
                      {w}
                    </li>
                  ))}
                  {score.weaknesses.length === 0 && (
                    <li className="text-xs text-gray-400">None identified</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Re-score link */}
            <button
              onClick={handleScore}
              disabled={loading}
              className="text-xs text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
            >
              Re-score
            </button>
          </div>
        )}

        {/* Chat actions */}
        {canChat && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">
              {chatUnlocked
                ? "Chat unlocked"
                : `${messageCount}/3 messages sent`}
            </p>
            <button
              onClick={onOpenChat}
              className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              {chatUnlocked ? "Open chat" : "Reply to request"}
            </button>
          </div>
        )}
        {!canChat && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            {status === "rejected" && (
              <p className="text-xs text-red-500">This request was declined.</p>
            )}
            {status === "expired" && (
              <p className="text-xs text-gray-400">This request has expired.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
