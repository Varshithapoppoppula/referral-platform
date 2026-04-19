"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function AlumniReferralPage() {
  const params = useParams();
  const referralId = Array.isArray(params.id)
    ? params.id[0]
    : (params.id as string);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [referral, setReferral] = useState<any>(null);
  const [application, setApplication] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [notes, setNotes] = useState("");
  const [zoomLink, setZoomLink] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let socket: Socket;

    async function setup() {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000", {
        auth: { token },
      });
      socketRef.current = socket;

      socket.emit("join_conversation", referralId);

      socket.on("new_message", (msg: any) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    setup();
    loadData();

    return () => {
      socket?.disconnect();
    };
  }, [referralId]);

  async function loadData() {
    try {
      const [refs, msgs, apps] = await Promise.all([
        apiGet("/api/referral/my"),
        apiGet(`/api/referral/${referralId}/messages`),
        apiGet("/api/applications/my"),
      ]);

      const found = refs.find((r: any) => r.id === referralId);
      setReferral(found);
      setMessages(msgs ?? []);

      if (found) {
        const app = apps.find((a: any) => a.referral_request_id === referralId);
        setApplication(app ?? null);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleReply() {
    if (!reply.trim()) return;
    const content = reply.trim();
    setSending(true);
    try {
      await apiPost(`/api/referral/${referralId}/message`, { content });
      setReply("");
      socketRef.current?.emit("send_message", {
        referralRequestId: referralId,
        content,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function handleScheduleInterview() {
    if (!zoomLink.trim()) return;
    setError("");
    setSuccess("");
    try {
      await apiPost("/api/applications", {
        referral_request_id: referralId,
        zoom_link: zoomLink.trim(),
        zoom_scheduled_at: new Date(
          Date.now() + 24 * 60 * 60 * 1000,
        ).toISOString(),
        assignment_prompt:
          "Write a function that reverses a string without using the built-in reverse method.",
      });
      setSuccess("Interview scheduled and assignment sent to student!");
      setZoomLink("");
      loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDecide(decision: "accept" | "reject") {
    if (!application) return;
    setDeciding(true);
    setError("");
    setSuccess("");
    try {
      await apiPost(`/api/applications/${application.id}/decide`, {
        decision,
        notes,
      });
      setSuccess(
        `Candidate ${decision === "accept" ? "accepted" : "rejected"} successfully.`,
      );
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeciding(false);
    }
  }

  if (loading)
    return <div className="animate-pulse h-64 bg-gray-100 rounded-xl" />;

  if (!referral)
    return <div className="text-gray-500 text-sm">Referral not found.</div>;

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        ← Back
      </button>

      {/* Referral info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <p className="text-sm font-medium text-gray-900">
          {referral.job?.title} at {referral.job?.company}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Student: {referral.student?.full_name}
        </p>
        <span
          className={`inline-block mt-2 text-xs px-2 py-0.5 rounded-full ${
            referral.chat_unlocked
              ? "bg-green-50 text-green-700"
              : "bg-amber-50 text-amber-700"
          }`}
        >
          {referral.chat_unlocked
            ? "Chat unlocked"
            : `${referral.message_count}/3 cold messages`}
        </span>
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

      {/* Application section */}
      {application ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900">Application</h3>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                application.status === "accepted"
                  ? "bg-green-50 text-green-700"
                  : application.status === "rejected"
                    ? "bg-red-50 text-red-600"
                    : application.status === "submitted"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-amber-50 text-amber-700"
              }`}
            >
              {application.status}
            </span>
          </div>

          {/* Zoom link */}
          {application.zoom_link && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-700 mb-1 font-medium">
                Interview scheduled
              </p>
              <p className="text-xs text-blue-600 mb-2">
                {application.zoom_scheduled_at
                  ? new Date(application.zoom_scheduled_at).toLocaleString()
                  : "Time TBD"}
              </p>
              <a
                href={application.zoom_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Join Zoom call
              </a>
            </div>
          )}

          {/* Submitted code */}
          {application.status === "submitted" && (
            <>
              <div className="bg-gray-950 rounded-lg p-4 mb-4">
                <p className="text-xs text-gray-400 mb-2 font-medium">
                  Submitted code ({application.assignment_language})
                </p>
                <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap overflow-x-auto">
                  {application.assignment_code}
                </pre>
              </div>

              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">
                  Feedback notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Add feedback for the candidate..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleDecide("accept")}
                  disabled={deciding}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {deciding ? "Processing..." : "Accept candidate"}
                </button>
                <button
                  onClick={() => handleDecide("reject")}
                  disabled={deciding}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                >
                  {deciding ? "Processing..." : "Reject candidate"}
                </button>
              </div>
            </>
          )}

          {/* Final decision shown */}
          {(application.status === "accepted" ||
            application.status === "rejected") && (
            <div
              className={`rounded-lg p-3 ${
                application.status === "accepted" ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <p
                className={`text-sm font-medium ${
                  application.status === "accepted"
                    ? "text-green-700"
                    : "text-red-600"
                }`}
              >
                Decision: {application.alumni_decision}
              </p>
              {application.alumni_notes && (
                <p className="text-xs text-gray-500 mt-1">
                  Notes: {application.alumni_notes}
                </p>
              )}
            </div>
          )}
        </div>
      ) : referral.chat_unlocked ? (
        /* Schedule interview — only show if chat unlocked and no application yet */
        <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            Ready to move forward?
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Schedule an interview and send a coding assignment.
          </p>
          <input
            type="url"
            placeholder="Paste your Zoom meeting link here"
            value={zoomLink}
            onChange={(e) => setZoomLink(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
          />
          {zoomLink.length > 0 && !zoomLink.startsWith("http") && (
            <p className="text-xs text-red-500 mb-2">
              Please enter a valid URL
            </p>
          )}
          <button
            onClick={handleScheduleInterview}
            disabled={!zoomLink.trim() || !zoomLink.startsWith("http")}
            className="bg-black text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Schedule interview + send assignment
          </button>
        </div>
      ) : null}

      {/* Messages */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3 min-h-48">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Messages
        </p>
        {messages.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No messages yet.
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id ?? `${msg.created_at}-${msg.sender_id}`}
              className={`flex ${
                msg.sender_id === referral.alumni_id
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs px-4 py-2.5 rounded-xl text-sm ${
                  msg.sender_id === referral.alumni_id
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Reply box */}
      <div className="flex gap-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your message..."
          rows={2}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-black resize-none"
        />
        <button
          onClick={handleReply}
          disabled={sending || !reply.trim()}
          className="bg-black text-white px-5 rounded-xl text-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {sending ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
