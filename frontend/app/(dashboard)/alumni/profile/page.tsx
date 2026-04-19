"use client";
import { useEffect, useState } from "react";
import { apiGet, apiPatch } from "@/lib/api";

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

const SENIORITY_OPTIONS = ["junior", "mid", "senior", "lead", "principal"];

export default function AlumniProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [customSkillDuplicate, setCustomSkillDuplicate] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    bio: "",
    skills: [] as string[],
    company: "",
    company_normalised: "",
    team: "",
    location: "",
    linkedin_url: "",
    github_url: "",
    seniority_level: "mid",
    experience_years: 0,
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await apiGet("/api/users/me");
      setForm({
        full_name: data.full_name ?? "",
        bio: data.bio ?? "",
        skills: data.skills ?? [],
        company: data.company ?? "",
        company_normalised: data.company_normalised ?? "",
        team: data.team ?? "",
        location: data.location ?? "",
        linkedin_url: data.linkedin_url ?? "",
        github_url: data.github_url ?? "",
        seniority_level: data.seniority_level ?? "mid",
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      // Auto-normalise company name to lowercase
      const payload = {
        ...form,
        company_normalised: form.company.toLowerCase().trim(),
      };
      await apiPatch("/api/users/me", payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <div className="animate-pulse space-y-4 max-w-2xl">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    );

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-medium text-gray-900">My profile</h1>
        <p className="text-sm text-gray-500 mt-1">
          Keep your profile updated so students can find you
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 text-green-700 text-sm px-4 py-3 rounded-lg mb-4">
          Profile saved successfully.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Basic info</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Full name
            </label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
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
                Years of experience
              </label>
              <input
                type="number"
                value={form.experience_years}
                onChange={(e) =>
                  setForm({ ...form, experience_years: Number(e.target.value) })
                }
                min={0}
                max={40}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Work info</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Company name
            </label>
            <input
              type="text"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="e.g. Google"
            />
            <p className="text-xs text-gray-400 mt-1">
              Students search by company to find alumni who can refer them
            </p>
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
              Seniority level
            </label>
            <select
              value={form.seniority_level}
              onChange={(e) =>
                setForm({ ...form, seniority_level: e.target.value })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            >
              {SENIORITY_OPTIONS.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-3">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {SKILLS_OPTIONS.map((skill) => (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  form.skills.includes(skill)
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
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
                  className="text-xs px-3 py-1.5 rounded-full border transition-colors bg-black text-white border-black"
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
              className="bg-black text-white rounded-xl px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
            >
              Add
            </button>
          </div>
          {customSkillDuplicate && (
            <p className="text-xs text-amber-600 mt-1">Already added</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-medium text-gray-700">Links</h2>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              LinkedIn URL
            </label>
            <input
              type="url"
              value={form.linkedin_url}
              onChange={(e) =>
                setForm({ ...form, linkedin_url: e.target.value })
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="https://linkedin.com/in/..."
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              GitHub URL
            </label>
            <input
              type="url"
              value={form.github_url}
              onChange={(e) => setForm({ ...form, github_url: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="https://github.com/..."
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full bg-black text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </div>
  );
}
