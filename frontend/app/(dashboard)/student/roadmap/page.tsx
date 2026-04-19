"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

export default function RoadmapPage() {
  const [goal, setGoal] = useState("");
  const [timeline, setTimeline] = useState("6");
  const [loading, setLoading] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [error, setError] = useState("");

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim()) return;
    setLoading(true);
    setError("");
    setRoadmap(null);

    try {
      const data = await apiPost("/api/ai/career-roadmap", {
        goal: goal.trim(),
        timeline_months: parseInt(timeline),
      });
      setRoadmap(data);
    } catch (err: any) {
      setError(err.message || "Could not generate roadmap. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Career roadmap</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tell us your goal and get a personalised week-by-week plan
        </p>
      </div>

      {/* Form card with indigo gradient top border */}
      <div className="bg-white rounded-2xl shadow-sm mb-6 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <form onSubmit={handleGenerate} className="p-5">
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              What is your career goal?
            </label>
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder='e.g. "Become a backend engineer at a fintech startup" or "Get a frontend role at a top product company"'
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Timeline
            </label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            >
              <option value="3">3 months</option>
              <option value="6">6 months</option>
              <option value="12">12 months</option>
            </select>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !goal.trim()}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Generating your roadmap..." : "Generate roadmap"}
          </button>
        </form>
      </div>

      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 bg-white rounded-2xl shadow-sm animate-pulse"
            />
          ))}
        </div>
      )}

      {roadmap && !loading && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Your roadmap</h2>
            <p className="text-sm font-semibold text-indigo-700 mb-1">
              {roadmap.goal_summary}
            </p>
            <p className="text-xs text-gray-500 mb-3">{roadmap.gap_analysis}</p>
            <div className="bg-indigo-50 rounded-xl p-3">
              <p className="text-xs text-indigo-500 mb-1 font-medium">Current level</p>
              <p className="text-sm text-gray-700">{roadmap.current_level}</p>
            </div>
          </div>

          {/* Phases */}
          {roadmap.phases?.map((phase: any) => (
            <div
              key={phase.phase}
              className="bg-white rounded-2xl shadow-sm p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {phase.phase}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {phase.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {phase.duration_weeks} weeks · {phase.focus}
                  </p>
                </div>
              </div>

              <ul className="space-y-1.5 mb-3">
                {phase.tasks?.map((task: string, i: number) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-600">
                    <span className="text-indigo-400 mt-0.5 shrink-0">→</span>
                    {task}
                  </li>
                ))}
              </ul>

              <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2">
                <p className="text-xs text-green-700 font-medium">
                  Milestone: {phase.milestone}
                </p>
              </div>
            </div>
          ))}

          {/* Key resources */}
          {roadmap.key_resources?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Key resources</h3>
              <ul className="space-y-1.5">
                {roadmap.key_resources.map((r: string, i: number) => (
                  <li key={i} className="text-xs text-indigo-700 flex gap-2">
                    <span className="text-indigo-400 shrink-0">→</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Success metrics */}
          {roadmap.success_metrics?.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                How you will know you are ready
              </h3>
              <ul className="space-y-1.5">
                {roadmap.success_metrics.map((m: string, i: number) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="text-green-500 shrink-0">✓</span>
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
