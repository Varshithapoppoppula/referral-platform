"use client";
import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

export default function StudentReferralPage() {
  const { id } = useParams();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [referral, setReferral] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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

      socket.emit("join_conversation", id as string);

      socket.on("new_message", (msg: any) => {
        setMessages((prev) => [...prev, msg]);
      });
    }

    setup();
    loadData();

    return () => {
      socket?.disconnect();
    };
  }, [id]);

  async function loadData() {
    try {
      const [refs, msgs] = await Promise.all([
        apiGet("/api/referral/my"),
        apiGet(`/api/referral/${id}/messages`),
      ]);
      const found = refs.find((r: any) => r.id === id);
      setReferral(found);
      setMessages(msgs ?? []);
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
      await apiPost(`/api/referral/${id}/message`, { content });
      setReply("");
      socketRef.current?.emit("send_message", {
        referralRequestId: id as string,
        content,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
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
          Alumni: {referral.alumni?.full_name}
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

      {/* Messages */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3 min-h-48">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
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
