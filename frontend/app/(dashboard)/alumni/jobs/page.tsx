"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function AlumniJobsPage() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    skills: "",
    location: "",
    is_remote: false,
    seniority_level: "mid",
    experience_min: 0,
    experience_max: 5,
    team: "",
  });

  useEffect(() => {
    loadMyJobs();
  }, []);

  async function loadMyJobs() {
    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      if (!userId) return;
      const data = await apiGet(`/api/jobs?posted_by=${userId}`);
      setJobs(data.jobs ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPosting(true);
    setError("");
    try {
      await apiPost("/api/jobs", {
        ...form,
        skills: form.skills
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setSuccess("Job posted successfully!");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        skills: "",
        location: "",
        is_remote: false,
        seniority_level: "mid",
        experience_min: 0,
        experience_max: 5,
        team: "",
      });
      loadMyJobs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-gray-900">Post jobs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Share openings at your company
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 transition-colors"
        >
          {showForm ? "Cancel" : "+ Post job"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          {success}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handlePost}
          className="bg-white border border-gray-200 rounded-xl p-5 mb-6 space-y-4"
        >
          <h2 className="text-sm font-medium text-gray-700">New job posting</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Job title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Team / Department
            </label>
            <input
              type="text"
              value={form.team}
              onChange={(e) => setForm({ ...form, team: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Engineering, Product, Design"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Skills (comma separated)
            </label>
            <input
              type="text"
              value={form.skills}
              onChange={(e) => setForm({ ...form, skills: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="React, Node.js, TypeScript"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Location
              </label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Seniority
              </label>
              <select
                value={form.seniority_level}
                onChange={(e) =>
                  setForm({ ...form, seniority_level: e.target.value })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_remote}
              onChange={(e) =>
                setForm({ ...form, is_remote: e.target.checked })
              }
              className="rounded"
            />
            <span className="text-sm text-gray-600">Remote position</span>
          </label>

          <button
            type="submit"
            disabled={posting}
            className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {posting ? "Posting..." : "Post job"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 bg-gray-100 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No jobs posted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {job.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.company} · {job.location ?? "Remote"} ·{" "}
                    {job.seniority_level}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full ${
                    job.is_active
                      ? "bg-green-50 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {job.is_active ? "Active" : "Closed"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
