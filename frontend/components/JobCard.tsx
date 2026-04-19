"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  is_remote: boolean;
  skills: string[];
  seniority_level?: string;
  source: string;
}

function MatchRing({ score }: { score: number }) {
  const colorClass =
    score >= 80
      ? "text-indigo-600 border-indigo-200 bg-indigo-50"
      : score >= 60
        ? "text-amber-600 border-amber-200 bg-amber-50"
        : "text-red-500 border-red-200 bg-red-50";

  return (
    <div
      className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 ${colorClass}`}
    >
      <span className="text-xs font-semibold">{score}%</span>
    </div>
  );
}

export default function JobCard({ job }: { job: Job }) {
  const router = useRouter();
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [loadingScore, setLoadingScore] = useState(true);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    fetchMatchScore();
  }, [job.id]);

  async function fetchMatchScore() {
    try {
      const data = await apiPost("/api/ai/match-score", { job_id: job.id });
      setMatchScore(data.score);
    } catch {
      setMatchScore(null);
    } finally {
      setLoadingScore(false);
    }
  }

  return (
    <div
      onClick={() => router.push(`/student/jobs/${job.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-2xl shadow-sm hover:shadow-md p-5 cursor-pointer transition-all duration-200 relative"
    >
      {/* Hover arrow */}
      <span
        className={`absolute top-4 right-4 text-indigo-400 text-lg transition-opacity duration-150 ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        →
      </span>

      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 mr-3">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {job.title}
          </h3>
          <p className="text-sm font-medium text-indigo-600 mt-0.5">
            {job.company}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {job.source === "internal" && (
            <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
              Direct
            </span>
          )}
          {loadingScore ? (
            <div className="w-12 h-12 rounded-full border-2 border-gray-100 bg-gray-50 animate-pulse" />
          ) : matchScore !== null ? (
            <MatchRing score={matchScore} />
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-3">
        {job.location && <span>{job.location}</span>}
        {job.is_remote && (
          <>
            <span>·</span>
            <span className="bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
              Remote
            </span>
          </>
        )}
        {job.seniority_level && (
          <>
            <span>·</span>
            <span className="capitalize">{job.seniority_level}</span>
          </>
        )}
      </div>

      {job.skills?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {job.skills.slice(0, 4).map((skill: string) => (
            <span
              key={skill}
              className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full"
            >
              {skill}
            </span>
          ))}
          {job.skills.length > 4 && (
            <span className="text-xs text-gray-400">
              +{job.skills.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
