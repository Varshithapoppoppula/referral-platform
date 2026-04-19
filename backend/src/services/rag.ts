import { ChromaClient, Collection, Where } from "chromadb";
import { askClaude } from "./claude";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InterviewQuestion {
  id: string;
  company: string;
  role: string;
  level: "junior" | "mid" | "senior";
  topic: string;
  question: string;
  answer: string;
  tags: string[];
}

// ─── Module state ─────────────────────────────────────────────────────────────

let client: ChromaClient | null = null;
let careerCollection: Collection | null = null;
let questionsCollection: Collection | null = null;
let chromaAvailable = false;

// In-memory fallback — populated by seedInterviewQuestions
let questionsCache: InterviewQuestion[] = [];

// ─── Career knowledge documents (15) ─────────────────────────────────────────

const CAREER_DOCS = [
  {
    id: "ck1",
    text: "Google India SDE salaries 2024: L3 (SDE I) CTC ranges ₹25–45 LPA with base ₹18–28 LPA. L4 (SDE II) ranges ₹45–80 LPA. L5 (Senior SDE) ₹80–1.5 Cr. L6 (Staff SDE) ₹1.5–2.5 Cr. L7 (Principal) ₹2.5 Cr+. Bangalore is the primary hiring location. Stock vesting over 4 years is a major component. Signing bonus typically ₹10–30 LPA. Total comp at senior levels can be 60–70% stock.",
    metadata: { topic: "salary", companies: "Google", type: "salary-guide" },
  },
  {
    id: "ck2",
    text: "Amazon India SDE interview process: Stage 1 — Online Assessment (2 DSA problems, 70 minutes on HackerRank, often medium-hard LeetCode level). Stage 2 — Technical Phone Screen (1 DSA problem + 1–2 Leadership Principle questions, 45 min). Stage 3 — Loop (5–6 rounds on same day): 2–3 rounds on DSA/algorithms, 1 System Design (mandatory for SDE-II+), 1 Bar Raiser round, 1–2 behavioral rounds covering 5–6 LPs. Amazon heavily weights Leadership Principles — prepare STAR stories for all 16 LPs. SDE I salary: ₹22–35 LPA, SDE II: ₹35–60 LPA.",
    metadata: { topic: "interview-process", companies: "Amazon", type: "interview-guide" },
  },
  {
    id: "ck3",
    text: "Flipkart SDE hiring process 2024: 1 Online Assessment (2 coding problems, 90 min), followed by 3–4 interview rounds: 2 technical DSA rounds (focus on arrays, trees, DP, graphs — medium to hard), 1 HM (Hiring Manager) round covering past experience and culture fit, 1 System Design for SDE-II and above. Flipkart values strong fundamentals and practical experience. SDE I salary: ₹20–35 LPA, SDE II: ₹35–55 LPA. Bangalore is primary location. Work culture is fast-paced with strong ownership values.",
    metadata: { topic: "interview-process", companies: "Flipkart", type: "interview-guide" },
  },
  {
    id: "ck4",
    text: "Getting referrals at top Indian tech companies: A referral increases your ATS pass rate by 40–60%. Best strategies: (1) LinkedIn alumni search — filter by current company + college + graduation year. (2) Message format: mention mutual connection first, keep it under 150 words, attach resume, be specific about the role. (3) Tech communities: Blind, Discord servers for FAANG India, college alumni WhatsApp groups. (4) Internal employee referral portals: most companies pay ₹50K–2 LPA referral bonus, so employees are incentivized. (5) Timing: reach out when a job is freshly posted (within 48 hours). (6) Follow-up: one polite follow-up after 1 week is acceptable.",
    metadata: { topic: "referral", type: "career-advice" },
  },
  {
    id: "ck5",
    text: "Razorpay engineering culture and interview: Stack is primarily Go, Python, and Node.js. Payment-domain knowledge is a strong differentiator. Interview process: 1 online test (DSA), 3–4 rounds including 1 deep system design on payment systems (expect questions on idempotency, distributed transactions, reconciliation). Behavioural questions focus on 'builder' mindset and ownership. SDE I: ₹20–35 LPA, SDE II: ₹35–55 LPA, Senior SDE: ₹55–90 LPA. Razorpay is pre-IPO; ESOPs are a significant part of compensation for senior roles.",
    metadata: { topic: "interview-process", companies: "Razorpay", type: "interview-guide" },
  },
  {
    id: "ck6",
    text: "Swiggy engineering culture and hiring: 10–15 rounds in total including online assessments. Strong focus on distributed systems, real-time data processing, and geo-spatial problems. Stack: Go, Java, Python, React. SDE I: ₹18–30 LPA, SDE II: ₹30–55 LPA, Senior: ₹55–1 Cr. Key engineering areas: order management, real-time tracking, ML for ETA and recommendations, supply-demand optimization. Swiggy values engineers who think about scale from day one. The system design round often involves food-delivery-specific scenarios.",
    metadata: { topic: "interview-process", companies: "Swiggy", type: "interview-guide" },
  },
  {
    id: "ck7",
    text: "Resume tips for Indian SDE job applications: (1) ATS optimization — use keywords from the job description, avoid tables/graphics. (2) Quantify everything — 'Reduced latency by 40%' beats 'Improved performance'. (3) Project section — 3–4 lines per project: tech stack, what problem it solves, scale/impact. (4) Skills section — list languages and frameworks with proficiency levels. (5) Links — GitHub with real contributions, LinkedIn. (6) Length — 1 page for 0–5 years, 2 pages for 5+ years. (7) GPA — include only if 8.5+ (Indian university scale). (8) Avoid: photos, home address, references.",
    metadata: { topic: "resume", type: "career-advice" },
  },
  {
    id: "ck8",
    text: "DSA preparation roadmap for FAANG India (3-month plan): Month 1 — Arrays, Strings, Linked Lists, Stacks, Queues, Hash Maps. Core patterns: sliding window, two pointers, prefix sums, frequency maps. Solve 50 easy + 30 medium LeetCode. Month 2 — Trees (BST, traversals, LCA), Graphs (BFS, DFS, topological sort, Dijkstra), Heaps. Solve 50 medium + 20 hard LeetCode. Month 3 — Dynamic Programming (1D, 2D, interval DP), Bit Manipulation, Backtracking. Mock interviews on Pramp/Interviewing.io. Target: 200+ LeetCode problems, 5+ mock interviews. Resources: NeetCode roadmap, Striver SDE Sheet.",
    metadata: { topic: "preparation", type: "career-advice" },
  },
  {
    id: "ck9",
    text: "System design interviews at senior Indian tech companies: For SDE-II and Senior SDE roles, a 45–60 minute system design round is standard. Evaluation criteria: requirements gathering, capacity estimation, high-level architecture, component deep dives, trade-offs, failure modes. Study topics: CAP theorem, consistent hashing, SQL vs NoSQL trade-offs, caching strategies (write-through, write-back, cache aside), message queues (Kafka vs RabbitMQ), microservices patterns, API design, CDN, load balancing. Resources: Grokking System Design, System Design Primer (GitHub), DDIA (Designing Data-Intensive Applications) by Martin Kleppmann.",
    metadata: { topic: "system-design", type: "career-advice" },
  },
  {
    id: "ck10",
    text: "Behavioral interviews in Indian tech companies — STAR method guide: Situation (20%): set the scene concisely. Task (10%): your specific role/responsibility. Action (60%): this is where you spend most time — what exactly you did, your thought process, how you collaborated, what obstacles you overcame. Result (10%): quantified outcome. Tips: (1) Prepare 8–10 STAR stories covering: conflict, failure, leadership, innovation, going above-and-beyond, cross-team collaboration. (2) Each story should work for 3–4 different questions. (3) Amazon requires stories for all 16 LPs — prepare them. (4) Practice out loud — timing matters (3–4 min per story).",
    metadata: { topic: "behavioural", type: "career-advice" },
  },
  {
    id: "ck11",
    text: "Microsoft India SSDE (Senior SDE) and SDE hiring 2024: Hyderabad and Bangalore offices. Interview process: 4–5 rounds — 1–2 coding rounds (medium-hard, MS favors graph and DP problems), 1 design round, 1 behavioral + As Appropriate (AA) round. Microsoft values growth mindset, cross-team collaboration, and inclusive culture. Products hiring in India: Azure, Teams, Office 365, Bing. SSDE salary: ₹50–1.2 Cr. Microsoft's work-life balance is generally better than Amazon/Google by reputation. Stock (RSU) vesting over 4 years.",
    metadata: { topic: "interview-process", companies: "Microsoft", type: "interview-guide" },
  },
  {
    id: "ck12",
    text: "Zomato engineering interview and culture: Hyderabad and Gurugram offices. Stack: Java, Go, Python, React, React Native. Key domains: restaurant discovery, ordering, delivery logistics, payments, ads platform. Interview rounds: 1 online assessment, 2–3 DSA rounds, 1 system design, 1 HM round. SQL and databases knowledge is tested more heavily than most companies — expect query optimization and schema design questions. SDE I: ₹18–28 LPA, SDE II: ₹28–50 LPA, Senior: ₹50–90 LPA. Growth-stage company with ESOP appreciation potential.",
    metadata: { topic: "interview-process", companies: "Zomato", type: "interview-guide" },
  },
  {
    id: "ck13",
    text: "PhonePe technical hiring and engineering culture: Bangalore headquarters. Stack: Java, Kotlin, Python, React. The payments domain is the core — deep knowledge of UPI, NPCI, transaction processing, and financial reconciliation is a strong differentiator. Interview process: 1–2 OAs, 3–4 technical rounds (algorithms, system design, payments-specific scenarios), 1 leadership round. PhonePe processes 40%+ of India's UPI transactions — scale is a first-class concern. SDE I: ₹20–35 LPA, SDE II: ₹35–60 LPA, Senior: ₹60–1.1 Cr. Pre-IPO; ESOPs valuable.",
    metadata: { topic: "interview-process", companies: "PhonePe", type: "interview-guide" },
  },
  {
    id: "ck14",
    text: "Meesho engineering culture and hiring: Bangalore HQ. Social commerce startup enabling small resellers. Stack: Java, Python, Go, React. Interview process: 1 online test, 2–3 technical rounds, 1 system design, 1 culture-fit round. Meesho values ownership, first-principles thinking, and impact over process. Growth-stage company — engineers get broad responsibilities early. SDE I: ₹18–30 LPA, SDE II: ₹30–50 LPA. Funded by SoftBank and others at multi-billion dollar valuation. Good choice for engineers wanting startup pace with reasonable scale.",
    metadata: { topic: "interview-process", companies: "Meesho", type: "interview-guide" },
  },
  {
    id: "ck15",
    text: "Salary negotiation tips for Indian tech companies: (1) Never accept the first offer — there's almost always a 10–20% buffer. (2) Get competing offers — nothing negotiates better than a competing offer from Amazon/Google. (3) Negotiate total comp, not just base — stock, signing bonus, ESOPs are all negotiable. (4) Use market data — Levels.fyi India, Glassdoor, Blind, and trusted recruiter networks. (5) For senior roles, negotiate stock cliff and acceleration clauses. (6) Be specific: 'My current CTC is X, I'm targeting Y based on competing offers and market data' outperforms vague requests. (7) Let the recruiter make the first number.",
    metadata: { topic: "negotiation", type: "career-advice" },
  },
];

// ─── Init ──────────────────────────────────────────────────────────────────────

export async function initRAG(): Promise<void> {
  try {
    client = new ChromaClient({ host: "localhost", port: 8000 });
    await client.heartbeat();
    chromaAvailable = true;
    console.log("[RAG] ChromaDB connected");

    careerCollection = await client.getOrCreateCollection({
      name: "career_knowledge",
    });

    questionsCollection = await client.getOrCreateCollection({
      name: "interview_questions",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[RAG] ChromaDB unavailable — running in fallback mode. (${msg})`);
    chromaAvailable = false;
  }
}

// ─── Seeding ───────────────────────────────────────────────────────────────────

export async function seedCareerKnowledge(): Promise<void> {
  if (!chromaAvailable || !careerCollection) return;

  try {
    const count = await careerCollection.count();
    if (count >= CAREER_DOCS.length) {
      console.log("[RAG] Career knowledge already seeded, skipping.");
      return;
    }

    await careerCollection.upsert({
      ids: CAREER_DOCS.map((d) => d.id),
      documents: CAREER_DOCS.map((d) => d.text),
      metadatas: CAREER_DOCS.map((d) => ({ ...d.metadata })) as any,
    });
    console.log(`[RAG] Seeded ${CAREER_DOCS.length} career knowledge documents.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RAG] Failed to seed career knowledge:", msg);
  }
}

export async function seedInterviewQuestions(
  questions: InterviewQuestion[],
): Promise<void> {
  // Always populate in-memory cache for fallback
  questionsCache = questions;

  if (!chromaAvailable || !questionsCollection) return;

  try {
    const count = await questionsCollection.count();
    if (count >= questions.length) {
      console.log("[RAG] Interview questions already seeded, skipping.");
      return;
    }

    await questionsCollection.upsert({
      ids: questions.map((q) => q.id),
      documents: questions.map((q) => `${q.question} ${q.answer}`),
      metadatas: questions.map((q) => ({
        company: q.company,
        role: q.role,
        level: q.level,
        topic: q.topic,
        tags: q.tags.join(","),
        question: q.question,
        answer: q.answer,
      })),
    });
    console.log(`[RAG] Seeded ${questions.length} interview questions.`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RAG] Failed to seed interview questions:", msg);
  }
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export async function queryCareerKnowledge(query: string): Promise<string> {
  const systemPrompt =
    "You are an expert career advisor for Indian software engineers. " +
    "Give specific, practical, and honest advice. " +
    "Include salary numbers, company names, and actionable steps where relevant.";

  if (!chromaAvailable || !careerCollection) {
    return askClaude(systemPrompt, query);
  }

  try {
    const results = await careerCollection.query({
      queryTexts: [query],
      nResults: 4,
    });

    const docs = (results.documents[0] ?? [])
      .filter((d): d is string => d !== null)
      .join("\n\n");

    const augmentedPrompt =
      "Use the following context to answer the question. " +
      "If the context does not cover the question, use your own knowledge.\n\n" +
      `CONTEXT:\n${docs}\n\nQUESTION: ${query}`;

    return askClaude(systemPrompt, augmentedPrompt);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RAG] Career query failed, falling back:", msg);
    return askClaude(systemPrompt, query);
  }
}

export async function queryInterviewQuestions(
  company?: string,
  level?: string,
  topic?: string,
): Promise<InterviewQuestion[]> {
  if (!chromaAvailable || !questionsCollection) {
    return filterQuestionsInMemory(company, level, topic);
  }

  try {
    const where = buildWhereClause(company, level, topic);

    const results = await questionsCollection.get({
      where: where ?? undefined,
      limit: 8,
    });

    if (!results.metadatas || results.metadatas.length === 0) {
      return filterQuestionsInMemory(company, level, topic);
    }

    return results.ids.map((id, i) => {
      const meta = results.metadatas[i] as Record<string, string>;
      return {
        id,
        company: meta.company ?? "",
        role: meta.role ?? "",
        level: (meta.level ?? "junior") as "junior" | "mid" | "senior",
        topic: meta.topic ?? "",
        question: meta.question ?? "",
        answer: meta.answer ?? "",
        tags: meta.tags ? meta.tags.split(",") : [],
      };
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[RAG] Interview query failed, falling back:", msg);
    return filterQuestionsInMemory(company, level, topic);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function buildWhereClause(
  company?: string,
  level?: string,
  topic?: string,
): Where | null {
  const conditions: Where[] = [];

  if (company && company !== "Any") {
    conditions.push({ company });
  }
  if (level && level !== "Any") {
    conditions.push({ level });
  }
  if (topic && topic !== "Any") {
    conditions.push({ topic });
  }

  if (conditions.length === 0) return null;
  if (conditions.length === 1) return conditions[0];
  return { $and: conditions };
}

function filterQuestionsInMemory(
  company?: string,
  level?: string,
  topic?: string,
): InterviewQuestion[] {
  return questionsCache
    .filter((q) => {
      if (company && company !== "Any" && q.company !== company) return false;
      if (level && level !== "Any" && q.level !== level) return false;
      if (topic && topic !== "Any" && q.topic !== topic) return false;
      return true;
    })
    .slice(0, 8);
}
