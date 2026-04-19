"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

const SKILLS_OPTIONS = [
  "React",
  "Node.js",
  "TypeScript",
  "JavaScript",
  "Python",
  "AWS",
  "Docker",
  "MongoDB",
  "PostgreSQL",
  "Express",
  "Next.js",
  "Redis",
  "GraphQL",
  "Git",
  "Java",
  "Go",
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [resumeSuccess, setResumeSuccess] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [customSkillDuplicate, setCustomSkillDuplicate] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    skills: [] as string[],
    company: "",
    location: "",
    linkedin_url: "",
    github_url: "",
    experience_years: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet("/api/users/me");
      setProfile(data);
      setForm({
        full_name: data.full_name ?? "",
        bio: data.bio ?? "",
        skills: data.skills ?? [],
        company: data.company ?? "",
        location: data.location ?? "",
        linkedin_url: data.linkedin_url ?? "",
        github_url: data.github_url ?? "",
        experience_years: data.experience_years ?? 0,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function toggleSkill(skill: string) {
    setForm((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  }

  function addCustomSkill() {
    const trimmed = customSkill.trim();
    if (!trimmed) return;
    const duplicate = form.skills.some(
      (s) => s.toLowerCase() === trimmed.toLowerCase(),
    );
    if (duplicate) {
      setCustomSkillDuplicate(true);
      setTimeout(() => setCustomSkillDuplicate(false), 2000);
      return;
    }
    setForm((prev) => ({ ...prev, skills: [...prev.skills, trimmed] }));
    setCustomSkill("");
    setCustomSkillDuplicate(false);
  }

  async function handleResumeUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalysing(true);
    setError("");
    setResumeSuccess(false);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const data = await apiPost("/api/ai/analyse-resume", {
        pdf_base64: base64,
      });

      setForm((prev) => ({
        ...prev,
        full_name: data.full_name || prev.full_name,
        bio: data.bio || prev.bio,
        skills: data.skills?.length > 0 ? data.skills : prev.skills,
        experience_years: data.experience_years || prev.experience_years,
        location: data.location || prev.location,
        linkedin_url: data.linkedin_url || prev.linkedin_url,
        github_url: data.github_url || prev.github_url,
      }));

      setResumeSuccess(true);
      setTimeout(() => setResumeSuccess(false), 5000);
    } catch (err: any) {
      setError(err.message || "Could not analyse resume. Make sure it is a valid PDF.");
    } finally {
      setAnalysing(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const data = await apiPatch("/api/users/me", form);
      setProfile(data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const completeness = profile?.profile_completeness ?? 0;

  if (loading)
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-white rounded-2xl shadow-sm" />
        ))}
      </div>
    );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Keep your profile complete to improve match scores
        </p>
      </div>

      {/* Profile completeness */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">Profile completeness</p>
          <span className="text-sm font-bold text-indigo-600">{completeness}%</span>
        </div>
        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
            style={{ width: `${completeness}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 border border-green-100">
          Profile saved successfully.
        </div>
      )}

      {/* Resume upload */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5 border-l-4 border-violet-400">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">
          Auto-fill from resume
        </h2>
        <p className="text-xs text-gray-400 mb-3">
          Upload your PDF resume and AI will extract your skills and fill your profile automatically.
        </p>
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".pdf"
              onChange={handleResumeUpload}
              className="hidden"
              disabled={analysing}
            />
            <span
              className={`inline-flex items-center gap-2 text-xs px-4 py-2 rounded-xl border transition-colors ${
                analysing
                  ? "bg-gray-100 text-gray-400 border-gray-200"
                  : "bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100 cursor-pointer"
              }`}
            >
              {analysing ? "Analysing resume..." : "Upload PDF resume"}
            </span>
          </label>
          {resumeSuccess && (
            <span className="text-xs text-green-600 font-medium">
              Profile filled from resume!
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Basic info */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border-l-4 border-indigo-400">
          <h2 className="text-sm font-semibold text-gray-700">Basic info</h2>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Full name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Years of experience</label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) =>
                  setForm({ ...form, experience_years: Number(e.target.value) })
                }
                min={0}
                max={40}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-green-400">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {SKILLS_OPTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors font-medium ${
                  form.skills.includes(skill)
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                {skill}
              </button>
            ))}
            {form.skills
              .filter((s) => !SKILLS_OPTIONS.includes(s))
              .map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors font-medium bg-indigo-600 text-white border-indigo-600"
                >
                  {skill}
                </button>
              ))}
          </div>
          <p className="text-xs text-gray-400 mb-2">
            Can't find your skill? Add it manually
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customSkill}
              onChange={(e) => {
                setCustomSkill(e.target.value);
                setCustomSkillDuplicate(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="Type a skill and press Enter..."
              className="flex-1 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={addCustomSkill}
              className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </div>
          {customSkillDuplicate && (
            <p className="text-xs text-amber-600 mt-1">Already added</p>
          )}
        </div>

        {/* Links */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-4 border-l-4 border-blue-400">
          <h2 className="text-sm font-semibold text-gray-700">Links</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">LinkedIn URL</label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) =>
                setForm({ ...form, linkedin_url: e.target.value })
              }
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">GitHub URL</label>
            <input
              type="url"
              value={form.github_url}
              onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="https://github.com/..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
