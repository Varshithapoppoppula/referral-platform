"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function InterviewPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const router = useRouter();
  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("// Write your solution here\n");
  const [language, setLanguage] = useState("javascript");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"assignment" | "mock_interview">(
    "assignment",
  );

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [interviewJobId, setInterviewJobId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [reviewing, setReviewing] = useState(false);
  const [review, setReview] = useState<any>(null);

  useEffect(() => {
    loadApplication();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  async function loadApplication() {
    try {
      const data = await apiGet("/api/applications/my");
      const found = data.find((a: any) => a.id === id);
      setApplication(found);
      if (found?.job_id) setInterviewJobId(found.job_id);
      if (found?.assignment_code && found.status === "submitted") {
        setCode(found.assignment_code);
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!code.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      await apiPost(`/api/applications/${id}/submit`, { code, language });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCodeReview() {
    if (!code.trim()) return;
    setReviewing(true);
    setReview(null);
    try {
      const data = await apiPost("/api/ai/review-code", {
        code,
        language,
        problem: "Coding assignment",
      });
      setReview(data);
    } catch (err: any) {
      setError(err.message || "Could not review code. Try again.");
    } finally {
      setReviewing(false);
    }
  }

  async function startInterview() {
    if (!interviewJobId) return;
    setInterviewLoading(true);
    setMessages([]);
    setStreamingText("");

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
      const response = await fetch(`${base}/api/ai/interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: interviewJobId, messages: [] }),
      });

      await readStream(response, []);
    } catch (err: any) {
      setError(err.message || "Could not start interview. Try again.");
    } finally {
      setInterviewLoading(false);
    }
  }

  async function sendInterviewMessage() {
    if (!userInput.trim() || !interviewJobId) return;

    const newMessage: Message = { role: "user", content: userInput.trim() };
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    setUserInput("");
    setInterviewLoading(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";
      const response = await fetch(`${base}/api/ai/interview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ job_id: interviewJobId, messages: updatedMessages }),
      });

      await readStream(response, updatedMessages);
    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    } finally {
      setInterviewLoading(false);
    }
  }

  async function readStream(response: Response, currentMessages: Message[]) {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    if (!reader) return;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: fullText },
            ]);
            setStreamingText("");
            fullText = "";
          } else {
            try {
              const parsed = JSON.parse(data);
              if (parsed.error) {
                setError(parsed.error);
              } else if (parsed.text) {
                fullText += parsed.text;
                setStreamingText(fullText);
              }
            } catch {}
          }
        }
      }
    }
  }

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white rounded-2xl shadow-sm w-1/3" />
        <div className="h-64 bg-white rounded-2xl shadow-sm" />
      </div>
    );

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-indigo-600 mb-6 flex items-center gap-1 transition-colors"
      >
        ← Back
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Interview prep</h1>
        {application && (
          <p className="text-sm text-gray-500 mt-1">
            {application.job?.title} at{" "}
            <span className="text-indigo-600 font-medium">
              {application.job?.company}
            </span>
          </p>
        )}
      </div>

      {/* Zoom link card */}
      {application?.zoom_link && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6">
          <p className="text-sm font-semibold text-indigo-900 mb-1">
            Interview scheduled
          </p>
          <p className="text-xs text-indigo-600 mb-3">
            {application.zoom_scheduled_at
              ? new Date(application.zoom_scheduled_at).toLocaleString()
              : "Time TBD"}
          </p>
          <a
            href={application.zoom_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
          >
            Join Zoom call
          </a>
        </div>
      )}

      {/* Pill tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("assignment")}
          className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-colors ${
            activeTab === "assignment"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-500 hover:text-indigo-600 shadow-sm"
          }`}
        >
          Coding assignment
        </button>
        <button
          onClick={() => setActiveTab("mock_interview")}
          className={`flex-1 text-sm py-2.5 rounded-xl font-medium transition-colors ${
            activeTab === "mock_interview"
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white text-gray-500 hover:text-indigo-600 shadow-sm"
          }`}
        >
          AI mock interview
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {/* Assignment tab */}
      {activeTab === "assignment" && (
        <div>
          {submitted && (
            <div className="bg-green-50 text-green-700 px-5 py-4 rounded-2xl text-sm mb-4 border border-green-100">
              Assignment submitted successfully.
            </div>
          )}

          {/* Code editor — dark with indigo top border */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500" />
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                disabled={submitted}
              >
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
              </select>
              <div className="flex gap-2">
                {!submitted && (
                  <>
                    <button
                      onClick={handleCodeReview}
                      disabled={reviewing || !code.trim()}
                      className="text-xs border border-indigo-200 text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl hover:bg-indigo-100 disabled:opacity-50 transition-colors font-medium"
                    >
                      {reviewing ? "Reviewing..." : "AI Review"}
                    </button>
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="bg-indigo-600 text-white px-4 py-1.5 rounded-xl text-xs hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                    >
                      {submitting ? "Submitting..." : "Submit"}
                    </button>
                  </>
                )}
              </div>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              rows={16}
              disabled={submitted}
              className="w-full px-4 py-3 font-mono text-sm bg-gray-950 text-green-400 focus:outline-none resize-none disabled:opacity-70"
              spellCheck={false}
            />
          </div>

          {/* AI Code review results */}
          {review && (
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">AI Code Review</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      review.score >= 80
                        ? "bg-green-100 text-green-700"
                        : review.score >= 60
                          ? "bg-amber-50 text-amber-700"
                          : "bg-red-50 text-red-600"
                    }`}
                  >
                    Score: {review.score}/100
                  </span>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      review.ready_to_submit
                        ? "bg-green-100 text-green-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {review.ready_to_submit ? "Ready to submit" : "Needs work"}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{review.summary}</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-indigo-400 mb-1 font-medium">Time complexity</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {review.time_complexity}
                  </p>
                </div>
                <div className="bg-indigo-50 rounded-xl p-3">
                  <p className="text-xs text-indigo-400 mb-1 font-medium">Space complexity</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {review.space_complexity}
                  </p>
                </div>
              </div>

              {review.comments?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-500 mb-2">Inline comments</p>
                  <div className="space-y-2">
                    {review.comments.map((comment: any, i: number) => (
                      <div
                        key={i}
                        className={`flex gap-2 text-xs p-2.5 rounded-xl ${
                          comment.type === "issue"
                            ? "bg-red-50 text-red-700"
                            : comment.type === "positive"
                              ? "bg-green-50 text-green-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        <span className="font-semibold shrink-0">
                          Line {comment.line}
                        </span>
                        <span>{comment.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {review.improvements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">
                    Suggested improvements
                  </p>
                  <ul className="space-y-1">
                    {review.improvements.map((imp: string, i: number) => (
                      <li key={i} className="text-xs text-indigo-700 flex gap-2">
                        <span className="text-indigo-400 shrink-0">→</span>
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mock interview tab */}
      {activeTab === "mock_interview" && (
        <div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">AI mock interview</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  AI plays the interviewer — 5 questions, real-time feedback
                </p>
              </div>
              {messages.length === 0 && (
                <button
                  onClick={startInterview}
                  disabled={interviewLoading || !interviewJobId}
                  className="text-sm bg-indigo-600 text-white px-4 py-2 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {interviewLoading ? "Starting..." : "Start interview"}
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={() => { setMessages([]); setStreamingText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  Restart
                </button>
              )}
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.length === 0 && !streamingText && !interviewLoading && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400 text-sm text-center">
                    Click Start interview to begin your AI mock interview
                  </p>
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white"
                        : "bg-white text-gray-900 border border-gray-200 shadow-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="flex justify-start">
                  <div className="max-w-sm px-4 py-3 rounded-2xl text-sm bg-white text-gray-900 border border-gray-200 shadow-sm leading-relaxed">
                    {streamingText}
                    <span className="inline-block w-1 h-4 bg-indigo-400 ml-1 animate-pulse" />
                  </div>
                </div>
              )}

              {interviewLoading && !streamingText && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-indigo-300 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {messages.length > 0 && (
              <div className="p-3 border-t border-gray-100 flex gap-2">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendInterviewMessage();
                    }
                  }}
                  placeholder="Type your answer... (Enter to send)"
                  rows={2}
                  disabled={interviewLoading}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none disabled:opacity-50"
                />
                <button
                  onClick={sendInterviewMessage}
                  disabled={interviewLoading || !userInput.trim()}
                  className="bg-indigo-600 text-white px-4 rounded-xl text-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors font-medium"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
