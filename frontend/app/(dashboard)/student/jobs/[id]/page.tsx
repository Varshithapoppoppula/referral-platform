"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import AlumniCard from "@/components/AlumniCard";
import SkillGapAnalyser from "@/components/SkillGapAnalyser";
import MessageQualityChecker from "@/components/MessageQualityChecker";

export default function JobDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [job, setJob] = useState<any>(null);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlumni, setSelectedAlumni] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [drafting, setDrafting] = useState(false);
  const [draftedMessages, setDraftedMessages] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<Record<string, any>>({});

  useEffect(() => {
    loadJob();
  }, [id]);

  async function loadJob() {
    try {
      const jobData = await apiGet(`/api/jobs/${id}`);
      setJob(jobData);
      const alumniData = await apiGet(
        `/api/users/alumni?company=${encodeURIComponent(jobData.company_normalised ?? jobData.company)}`,
      );
      setAlumni(alumniData ?? []);
      if (alumniData?.length) {
        fetchPredictions(alumniData, jobData.id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPredictions(alumniList: any[], jobId: string) {
    for (let i = 0; i < alumniList.length; i++) {
      const alumnus = alumniList[i];
      try {
        const data = await apiPost("/api/ai/predict-acceptance", {
          alumni_id: alumnus.id,
          job_id: jobId,
        });
        setPredictions((prev) => ({ ...prev, [alumnus.id]: data }));
      } catch {
        // Skip failed predictions silently
      }
      if (i < alumniList.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 600));
      }
    }
  }

  async function handleSendReferral() {
    if (!selectedAlumni || !message.trim()) return;
    setSending(true);
    setError("");
    try {
      await apiPost("/api/referral", {
        alumni_id: selectedAlumni,
        job_id: id,
        message: message.trim(),
      });
      setSent(true);
      setMessage("");
      setSelectedAlumni(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleDraftWithAI() {
    if (!selectedAlumni) return;
    setDrafting(true);
    setError("");
    try {
      const data = await apiPost("/api/ai/draft-message", {
        job_id: id,
        alumni_id: selectedAlumni,
      });
      setDraftedMessages(data.messages ?? []);
    } catch (err: any) {
      setError(err.message || "Could not generate messages. Try again.");
    } finally {
      setDrafting(false);
    }
  }

  const selectedAlumniObj = alumni.find((a) => a.id === selectedAlumni) ?? null;

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-100 rounded w-1/3" />
        <div className="h-4 bg-gray-100 rounded w-1/4" />
      </div>
    );

  if (!job) return <div className="text-gray-500 text-sm">Job not found.</div>;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-medium text-gray-900">{job.title}</h1>
            <p className="text-gray-500 mt-1">{job.company}</p>
          </div>
          {job.source === "internal" && (
            <span className="text-xs bg-green-50 text-green-700 px-3 py-1 rounded-full">
              Direct referral available
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-4">
          {job.location && <span>{job.location}</span>}
          {job.is_remote && <span className="text-blue-500">· Remote</span>}
          {job.seniority_level && (
            <span className="capitalize">· {job.seniority_level}</span>
          )}
        </div>

        {job.skills?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {job.skills.map((skill: string) => (
              <span
                key={skill}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {job.description && (
          <p className="text-sm text-gray-600 leading-relaxed">
            {job.description}
          </p>
        )}
      </div>

      <SkillGapAnalyser jobId={id as string} />

      <div className="mb-4">
        <h2 className="text-lg font-medium text-gray-900">
          Alumni at {job.company} ({alumni.length})
        </h2>
        {alumni.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            Ranked by AI likelihood to refer
          </p>
        )}
      </div>

      {alumni.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
          No alumni from this company on the platform yet.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {[...alumni]
            .sort((a, b) => {
              const sa = predictions[a.id]?.score_percent ?? -1;
              const sb = predictions[b.id]?.score_percent ?? -1;
              return sb - sa;
            })
            .map((a) => (
              <AlumniCard
                key={a.id}
                alumni={a}
                selected={selectedAlumni === a.id}
                onSelect={() =>
                  setSelectedAlumni(selectedAlumni === a.id ? null : a.id)
                }
                prediction={predictions[a.id] ?? null}
              />
            ))}
        </div>
      )}

      {selectedAlumni && !sent && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">
              Write your referral message
            </h3>
            <button
              onClick={handleDraftWithAI}
              disabled={drafting}
              className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 disabled:opacity-50 transition-colors"
            >
              {drafting ? "Drafting..." : "Draft with AI"}
            </button>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            You have 3 messages before the alumni responds. Make it count.
          </p>

          {/* AI drafted messages */}
          {draftedMessages.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 mb-2">
                AI drafted messages — click one to use it
              </p>
              <div className="space-y-2">
                {draftedMessages.map((draft) => (
                  <div
                    key={draft.attempt}
                    onClick={() => setMessage(draft.text)}
                    className="border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-purple-300 hover:bg-purple-50 transition-colors"
                  >
                    <p className="text-xs font-medium text-purple-700 mb-1">
                      {draft.label}
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {draft.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your message or click Draft with AI above..."
            rows={4}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none mb-3"
          />
          <MessageQualityChecker
            message={message}
            jobTitle={job?.title || ""}
            company={job?.company || ""}
            alumniName={selectedAlumniObj?.full_name || ""}
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            onClick={handleSendReferral}
            disabled={sending || !message.trim()}
            className="bg-black text-white px-5 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {sending ? "Sending..." : "Send referral request"}
          </button>
        </div>
      )}

      {sent && (
        <div className="bg-green-50 text-green-700 px-5 py-4 rounded-xl text-sm">
          Referral request sent successfully! You will be notified when the
          alumni responds.
        </div>
      )}
    </div>
  );
}
