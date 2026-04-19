"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

interface MatchedSkill {
  student_skill: string;
  job_skill: string;
  similarity: number;
}

interface MissingSkill {
  skill: string;
  importance: "high" | "medium" | "low";
  learn_in: string;
}

interface ExtraSkill {
  skill: string;
  relevance: "high" | "moderate" | "low";
}

interface GapAnalysisResult {
  overall_score: number;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  extra_skills: ExtraSkill[];
  summary: string;
  ready_to_apply: boolean;
}

const IMPORTANCE_BADGE: Record<string, string> = {
  high: "bg-red-50 text-red-600 border-red-200",
  medium: "bg-amber-50 text-amber-600 border-amber-200",
  low: "bg-gray-50 text-gray-500 border-gray-200",
};

const RELEVANCE_BADGE: Record<string, string> = {
  high: "bg-blue-50 text-blue-700 border-blue-200",
  moderate: "bg-sky-50 text-sky-600 border-sky-200",
  low: "bg-gray-50 text-gray-500 border-gray-200",
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

  return (
    <div className="flex flex-col items-center justify-center my-4">
      <div
        className={`w-24 h-24 rounded-full border-4 ${ring} flex flex-col items-center justify-center`}
      >
        <span className={`text-2xl font-bold ${color}`}>{score}%</span>
        <span className="text-xs text-gray-400">match</span>
      </div>
    </div>
  );
}

export default function SkillGapAnalyser({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);
  const [error, setError] = useState("");

  async function handleAnalyse() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiPost("/api/skills/gap-analysis", { job_id: jobId });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not analyse skill gap. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-sm font-medium text-gray-900">Skill gap analysis</h2>
        {!result && (
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="text-xs bg-black text-white px-4 py-1.5 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {loading ? "Analysing..." : "Analyse skill gap"}
          </button>
        )}
        {result && (
          <button
            onClick={handleAnalyse}
            disabled={loading}
            className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            {loading ? "Analysing..." : "Re-analyse"}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Compares your profile skills against this job semantically, including synonyms.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {loading && !result && (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-4 justify-center">
          <span className="flex gap-1">
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:300ms]" />
          </span>
          Analysing your skills...
        </div>
      )}

      {result && (
        <div>
          {/* Score + readiness */}
          <div className="flex items-center justify-between">
            <ScoreCircle score={result.overall_score} />
            <div className="flex-1 flex justify-end">
              {result.ready_to_apply ? (
                <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full">
                  Ready to apply
                </span>
              ) : (
                <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full">
                  Needs preparation
                </span>
              )}
            </div>
          </div>

          {/* Summary */}
          {result.summary && (
            <p className="text-xs text-gray-500 text-center mb-4 -mt-2">
              {result.summary}
            </p>
          )}

          {/* Three columns */}
          <div className="grid grid-cols-3 gap-3">
            {/* Matched */}
            <div className="bg-green-50 rounded-xl p-3">
              <p className="text-xs font-medium text-green-700 mb-2">
                Matched ({result.matched_skills.length})
              </p>
              {result.matched_skills.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <ul className="space-y-2">
                  {result.matched_skills.map((s, i) => (
                    <li key={i}>
                      <p className="text-xs font-medium text-gray-800 leading-tight">
                        {s.student_skill}
                      </p>
                      {s.student_skill.toLowerCase() !==
                        s.job_skill.toLowerCase() && (
                        <p className="text-xs text-gray-400">
                          ≈ {s.job_skill}
                        </p>
                      )}
                      <p className="text-xs text-green-600">
                        {Math.round(s.similarity * 100)}% match
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Missing */}
            <div className="bg-red-50 rounded-xl p-3">
              <p className="text-xs font-medium text-red-600 mb-2">
                Missing ({result.missing_skills.length})
              </p>
              {result.missing_skills.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <ul className="space-y-2">
                  {result.missing_skills.map((s, i) => (
                    <li key={i}>
                      <p className="text-xs font-medium text-gray-800 leading-tight">
                        {s.skill}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded border capitalize ${
                            IMPORTANCE_BADGE[s.importance] ??
                            IMPORTANCE_BADGE.low
                          }`}
                        >
                          {s.importance}
                        </span>
                        <span className="text-xs text-gray-400">
                          ~{s.learn_in}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Extra skills */}
            <div className="bg-blue-50 rounded-xl p-3">
              <p className="text-xs font-medium text-blue-700 mb-2">
                Extra ({result.extra_skills.length})
              </p>
              {result.extra_skills.length === 0 ? (
                <p className="text-xs text-gray-400">None</p>
              ) : (
                <ul className="space-y-2">
                  {result.extra_skills.map((s, i) => (
                    <li key={i}>
                      <p className="text-xs font-medium text-gray-800 leading-tight">
                        {s.skill}
                      </p>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded border capitalize ${
                          RELEVANCE_BADGE[s.relevance] ?? RELEVANCE_BADGE.low
                        }`}
                      >
                        {s.relevance}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
