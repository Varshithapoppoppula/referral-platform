"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

interface Props {
  message: string;
  jobTitle: string;
  company: string;
  alumniName: string;
}

interface QualityResult {
  overall_score: number;
  dimensions: {
    specificity: number;
    personalisation: number;
    conciseness: number;
    clear_ask: number;
    skill_alignment: number;
  };
  tips: string[];
  verdict: string;
  ready_to_send: boolean;
}

const DIMENSIONS: { key: keyof QualityResult["dimensions"]; label: string }[] =
  [
    { key: "specificity", label: "Specificity" },
    { key: "personalisation", label: "Personalisation" },
    { key: "conciseness", label: "Conciseness" },
    { key: "clear_ask", label: "Clear ask" },
    { key: "skill_alignment", label: "Skill alignment" },
  ];

export default function MessageQualityChecker({
  message,
  jobTitle,
  company,
  alumniName,
}: Props) {
  const [result, setResult] = useState<QualityResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (message.trim().length <= 20) return null;

  async function handleCheck() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiPost("/api/ai/message-quality", {
        message,
        job_title: jobTitle,
        company,
        alumni_name: alumniName,
      });
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Could not check message quality. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const overallBarColor =
    result && result.overall_score >= 70
      ? "bg-green-500"
      : result && result.overall_score >= 50
        ? "bg-amber-400"
        : "bg-red-500";

  return (
    <div className="border border-gray-200 rounded-xl p-4 mt-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">Message quality</p>
        <button
          onClick={handleCheck}
          disabled={loading}
          className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors font-medium"
        >
          {loading ? "Checking..." : result ? "Re-check" : "Check message quality"}
        </button>
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {result && (
        <div className="mt-3 space-y-3">
          {/* Overall score bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-500">Overall score</p>
              <p className="text-xs font-bold text-gray-800">
                {result.overall_score} / 100
              </p>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${overallBarColor}`}
                style={{ width: `${result.overall_score}%` }}
              />
            </div>
          </div>

          {/* Dimension rows */}
          <div className="space-y-1.5">
            {DIMENSIONS.map(({ key, label }) => {
              const score = result.dimensions[key];
              const barColor =
                score >= 7
                  ? "bg-green-400"
                  : score >= 5
                    ? "bg-amber-400"
                    : "bg-red-400";
              return (
                <div key={key} className="flex items-center gap-3">
                  <p className="text-xs text-gray-500 w-32 shrink-0">{label}</p>
                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${barColor}`}
                      style={{ width: `${score * 10}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 w-6 text-right shrink-0">
                    {score}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Verdict */}
          {result.verdict && (
            <p className="text-xs text-gray-500 italic">{result.verdict}</p>
          )}

          {/* Tips */}
          {result.tips?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1.5">
                How to improve
              </p>
              <ul className="space-y-1">
                {result.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-xs text-gray-600 pl-3 border-l-2 border-amber-400"
                  >
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ready to send badge */}
          <div>
            {result.ready_to_send ? (
              <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-3 py-1 rounded-full">
                Ready to send
              </span>
            ) : (
              <span className="text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full">
                Needs improvement
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
