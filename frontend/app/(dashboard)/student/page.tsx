"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import JobCard from "@/components/JobCard";

export default function StudentPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [isAISearch, setIsAISearch] = useState(false);
  const [filtersUsed, setFiltersUsed] = useState<any>(null);

  useEffect(() => {
    loadJobs();
  }, []);

  async function loadJobs() {
    setLoading(true);
    setError("");
    setIsAISearch(false);
    setFiltersUsed(null);
    try {
      const data = await apiGet("/api/jobs?limit=20");
      setJobs(data.jobs ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!search.trim()) {
      loadJobs();
      return;
    }

    setSearching(true);
    setError("");

    try {
      const data = await apiPost("/api/ai/search-jobs", { query: search });
      setJobs(data.jobs ?? []);
      setFiltersUsed(data.filters_used);
      setIsAISearch(true);
    } catch (err: any) {
      try {
        const data = await apiGet(
          `/api/jobs?search=${encodeURIComponent(search)}`,
        );
        setJobs(data.jobs ?? []);
        setIsAISearch(false);
      } catch (fallbackErr: any) {
        setError(fallbackErr.message);
      }
    } finally {
      setSearching(false);
    }
  }

  function handleClearSearch() {
    setSearch("");
    loadJobs();
  }

  return (
    <div>
      {/* Hero section */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 mb-6 text-white">
        <h1 className="text-3xl font-bold mb-1">Find your next opportunity</h1>
        <p className="text-indigo-200 text-sm mb-4">
          Search naturally — try "remote React jobs" or "senior Python engineer at Google"
        </p>
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            placeholder='Try "remote React jobs in Bangalore" or "senior backend engineer"...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-indigo-200 focus:outline-none focus:ring-2 focus:ring-white/50"
          />
          <button
            type="submit"
            disabled={searching}
            className="bg-white text-indigo-700 font-medium px-5 rounded-xl text-sm hover:bg-indigo-50 disabled:opacity-60 transition-colors"
          >
            {searching ? "Searching..." : "Search"}
          </button>
          {isAISearch && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="text-sm text-white/70 border border-white/20 px-4 rounded-xl hover:bg-white/10 transition-colors"
            >
              Clear
            </button>
          )}
        </form>
      </div>

      {/* AI filters used */}
      {isAISearch && filtersUsed && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-indigo-700 mb-1">
              AI search —{" "}
              <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                {jobs.length} results
              </span>
            </p>
            <div className="flex flex-wrap gap-1.5">
              {filtersUsed.title_keywords && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  role: {filtersUsed.title_keywords}
                </span>
              )}
              {filtersUsed.company && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  company: {filtersUsed.company}
                </span>
              )}
              {filtersUsed.is_remote === true && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  remote
                </span>
              )}
              {filtersUsed.seniority_level && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {filtersUsed.seniority_level}
                </span>
              )}
              {filtersUsed.skills?.map((s: string) => (
                <span
                  key={s}
                  className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
              {filtersUsed.location && (
                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {filtersUsed.location}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Job count */}
      {!loading && !searching && !isAISearch && jobs.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full">
            {jobs.length} jobs found
          </span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {loading || searching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 bg-white rounded-2xl shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl shadow-sm">
          No jobs found. Try a different search.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
