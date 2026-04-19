"use client";
import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";

interface Message {
  role: "user" | "ai";
  text: string;
}

const SUGGESTIONS = [
  "What is the average salary for a frontend engineer at Flipkart?",
  "How do I get a referral at Google India?",
  "What does Amazon's interview process look like?",
  "How should I negotiate my salary offer?",
  "What DSA topics does Razorpay focus on?",
  "How competitive is Swiggy's hiring process?",
];

export default function CareerChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(query: string) {
    if (!query.trim() || loading) return;
    setError("");
    const userMsg: Message = { role: "user", text: query.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await apiPost("/api/rag/career-query", { query: query.trim() });
      setMessages((prev) => [...prev, { role: "ai", text: data.answer }]);
    } catch (err: any) {
      setError(err.message || "Could not get an answer. Try again.");
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-3xl">
      {/* Gradient header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-4 text-white">
        <h1 className="text-2xl font-bold mb-0.5">Career advisor</h1>
        <p className="text-indigo-200 text-sm">
          Ask anything about salaries, referrals, and interview prep at top Indian tech companies.
        </p>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
        {messages.length === 0 && !loading && (
          <div className="space-y-3 mt-1">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Suggested questions
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 bg-white border border-indigo-100 text-indigo-700 rounded-xl hover:bg-indigo-50 hover:border-indigo-300 transition-colors text-left font-medium shadow-sm"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5">
                <span className="text-white text-xs font-bold">AI</span>
              </div>
            )}
            <div
              className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-sm"
                  : "bg-indigo-50 border border-indigo-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-bl-sm px-4 py-3">
              <span className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-xs px-4 py-2 rounded-xl mb-2 border border-red-100">
          {error}
        </div>
      )}

      {/* Input area */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-end gap-2 shadow-sm">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about salaries, referrals, interviews..."
          rows={1}
          className="flex-1 resize-none text-sm focus:outline-none text-gray-800 placeholder-gray-400 max-h-32 overflow-y-auto"
          style={{ lineHeight: "1.5" }}
          disabled={loading}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          className="flex-shrink-0 bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors font-medium"
        >
          Send
        </button>
      </div>
      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Press Enter to send, Shift+Enter for new line
      </p>
    </div>
  );
}
