"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";

interface Question {
  id: string;
  company: string;
  role: string;
  level: "junior" | "mid" | "senior";
  topic: string;
  question: string;
  answer: string;
  tags: string[];
}

const COMPANIES = [
  "Any",
  "Google",
  "Microsoft",
  "Amazon",
  "Flipkart",
  "Swiggy",
  "Razorpay",
  "Zomato",
  "PhonePe",
  "Meesho",
];

const LEVELS = ["Any", "junior", "mid", "senior"];

const TOPICS = [
  "Any",
  "arrays",
  "strings",
  "trees",
  "graphs",
  "dynamic-programming",
  "system-design",
  "databases",
  "behavioural",
];

const LEVEL_BADGE: Record<string, string> = {
  junior: "bg-green-100 text-green-700 border-green-200",
  mid: "bg-blue-100 text-blue-700 border-blue-200",
  senior: "bg-purple-100 text-purple-700 border-purple-200",
};

export default function InterviewPrepPage() {
  const [company, setCompany] = useState("Any");
  const [level, setLevel] = useState("Any");
  const [topic, setTopic] = useState("Any");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function handleSearch() {
    setLoading(true);
    setError("");
    setSearched(false);
    setExpanded(new Set());

    try {
      const data = await apiPost("/api/rag/interview-questions", {
        company: company === "Any" ? undefined : company,
        level: level === "Any" ? undefined : level,
        topic: topic === "Any" ? undefined : topic,
      });
      setQuestions(data.questions);
      setSearched(true);
    } catch (err: any) {
      setError(err.message || "Could not fetch questions. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Interview prep</h1>
        <p className="text-sm text-gray-500 mt-1">
          Browse real interview questions from top Indian tech companies, with detailed answers.
        </p>
      </div>

      {/* Filters — white card with indigo top border */}
      <div className="bg-white rounded-2xl shadow-sm mb-5 overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Company</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {COMPANIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Level</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l} className="capitalize">
                    {l === "Any" ? "Any" : l.charAt(0).toUpperCase() + l.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              >
                {TOPICS.map((t) => (
                  <option key={t} value={t}>
                    {t === "Any"
                      ? "Any"
                      : t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Searching..." : "Find questions"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && (
        <div>
          <p className="text-xs text-gray-400 mb-3 font-medium">
            {questions.length === 0
              ? "No questions match your filters. Try broadening your search."
              : `${questions.length} question${questions.length !== 1 ? "s" : ""} found`}
          </p>

          <div className="space-y-3">
            {questions.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Question header */}
                <button
                  onClick={() => toggleExpand(q.id)}
                  className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="text-xs font-semibold bg-gray-900 text-white px-2.5 py-0.5 rounded-full">
                        {q.company}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full border capitalize ${
                          LEVEL_BADGE[q.level] ?? "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {q.level}
                      </span>
                      <span className="text-xs text-gray-400 capitalize">
                        {q.topic.replace(/-/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-800 font-semibold leading-snug">
                      {q.question}
                    </p>
                  </div>
                  <span className="text-indigo-400 flex-shrink-0 mt-0.5">
                    {expanded.has(q.id) ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </span>
                </button>

                {/* Expanded answer — gradient background */}
                {expanded.has(q.id) && (
                  <div className="bg-gradient-to-br from-indigo-50 to-violet-50 px-5 pb-5 border-t border-indigo-100">
                    <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mt-4 mb-2">
                      Answer
                    </p>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {q.answer}
                    </p>
                    {q.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {q.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-xs bg-white text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
