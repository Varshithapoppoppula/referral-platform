import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  askClaude,
  askClaudeJSON,
  askClaudeChatStream,
} from "../services/claude";
import { supabaseAdmin } from "../services/supabase";
import {
  predictAcceptance,
  PredictorFeatures,
} from "../services/predictor";

const router = Router();

const TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after 30s`)),
        TIMEOUT_MS,
      ),
    ),
  ]);
}

// Test route
router.get("/test", requireAuth, async (req: AuthRequest, res) => {
  try {
    const response = await withTimeout(
      askClaude("You are a helpful assistant.", "Say hello in one sentence."),
      "test",
    );
    res.json({ success: true, message: response });
  } catch (err: any) {
    console.error("[/test]", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Feature 2: Draft referral message
router.post("/draft-message", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { job_id, alumni_id } = req.body;
    const student_id = req.user!.id;

    const [{ data: student }, { data: job }, { data: alumni }] =
      await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("full_name, skills, experience_years")
          .eq("id", student_id)
          .single(),
        supabaseAdmin
          .from("job_postings")
          .select("title, company, skills")
          .eq("id", job_id)
          .single(),
        supabaseAdmin
          .from("profiles")
          .select("full_name")
          .eq("id", alumni_id)
          .single(),
      ]);

    if (!student || !job || !alumni) {
      return res.status(404).json({ error: "Could not fetch data" });
    }

    const systemPrompt = `You are a career coach. Write professional referral request messages. Return only valid JSON. No markdown, no code blocks.`;

    const userMessage = `Write 3 short referral messages from ${student.full_name} to ${alumni.full_name} for the ${job.title} role at ${job.company}.
Student skills: ${student.skills?.join(", ") || "software development"}.

Return this JSON:
{"messages":[{"attempt":1,"label":"Introduction","text":"..."},{"attempt":2,"label":"Follow-up","text":"..."},{"attempt":3,"label":"Final follow-up","text":"..."}]}`;

    const result = await withTimeout(
      askClaudeJSON<{
        messages: Array<{ attempt: number; label: string; text: string }>;
      }>(systemPrompt, userMessage, 800),
      "draft-message",
    );

    if (!result)
      return res.status(500).json({ error: "Failed to generate messages" });
    res.json(result);
  } catch (err: any) {
    console.error("[/draft-message]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 3: Resume analyser
router.post("/analyse-resume", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { pdf_base64 } = req.body;
    if (!pdf_base64) return res.status(400).json({ error: "No PDF provided" });

    const pdfParse = require("pdf-parse");
    const buffer = Buffer.from(pdf_base64, "base64");
    const pdfData = await pdfParse(buffer);
    const resumeText = pdfData.text.slice(0, 3000);

    const systemPrompt = `You are a resume parser. Extract structured data and return ONLY valid JSON. No markdown, no explanation, just the JSON object.`;

    const userMessage = `Parse this resume and return JSON:

${resumeText}

Return ONLY this JSON with no other text:
{"full_name":"name here","bio":"2-3 sentence summary","skills":["skill1","skill2"],"experience_years":1,"location":"city, country","linkedin_url":"","github_url":"","seniority_level":"junior"}`;

    const result = await withTimeout(
      askClaudeJSON<{
        full_name: string;
        bio: string;
        skills: string[];
        experience_years: number;
        location: string;
        linkedin_url: string;
        github_url: string;
        seniority_level: string;
      }>(systemPrompt, userMessage, 1024),
      "analyse-resume",
    );

    if (!result)
      return res.status(500).json({ error: "Failed to analyse resume" });
    res.json(result);
  } catch (err: any) {
    console.error("[/analyse-resume]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 4: Natural language job search
router.post("/search-jobs", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    if (!query?.trim()) return res.status(400).json({ error: "No query" });

    const systemPrompt = `You extract job search filters. Return only valid JSON. No markdown, no code blocks.`;

    const userMessage = `Extract filters from: "${query}"
Return: {"title_keywords":"","company":"","is_remote":null,"seniority_level":null,"skills":[],"location":""}`;

    const filters = await withTimeout(
      askClaudeJSON<{
        title_keywords: string;
        company: string;
        is_remote: boolean | null;
        seniority_level: string | null;
        skills: string[];
        location: string;
      }>(systemPrompt, userMessage, 200),
      "search-jobs",
    );

    if (!filters)
      return res.status(500).json({ error: "Failed to parse query" });

    let dbQuery = supabaseAdmin
      .from("job_postings")
      .select("*")
      .eq("is_active", true);

    if (filters.title_keywords)
      dbQuery = dbQuery.ilike("title", `%${filters.title_keywords}%`);
    if (filters.company)
      dbQuery = dbQuery.ilike(
        "company_normalised",
        `%${filters.company.toLowerCase()}%`,
      );
    if (filters.is_remote === true) dbQuery = dbQuery.eq("is_remote", true);
    if (filters.seniority_level)
      dbQuery = dbQuery.eq("seniority_level", filters.seniority_level);
    if (filters.location)
      dbQuery = dbQuery.ilike("location", `%${filters.location}%`);

    const { data: jobs, error } = await dbQuery
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) return res.status(400).json({ error: error.message });

    let filtered = jobs ?? [];
    if (filters.skills?.length > 0) {
      filtered = filtered.filter((job) =>
        filters.skills.some((skill) =>
          job.skills?.some((s: string) =>
            s.toLowerCase().includes(skill.toLowerCase()),
          ),
        ),
      );
    }

    res.json({ jobs: filtered, total: filtered.length, filters_used: filters });
  } catch (err: any) {
    console.error("[/search-jobs]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 5: Job match score
router.post("/match-score", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { job_id } = req.body;
    const student_id = req.user!.id;

    const [{ data: student }, { data: job }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("skills, experience_years, seniority_level")
        .eq("id", student_id)
        .single(),
      supabaseAdmin
        .from("job_postings")
        .select(
          "title, company, skills, seniority_level, experience_min, experience_max",
        )
        .eq("id", job_id)
        .single(),
    ]);

    if (!student || !job) return res.status(404).json({ error: "Not found" });

    const systemPrompt = `You are a recruiter. Rate candidate-job fit. Return only valid JSON. No markdown, no code blocks.`;

    const userMessage = `Rate fit for ${job.title} at ${job.company}.
Candidate skills: ${student.skills?.join(", ") || "none"}. Experience: ${student.experience_years} years.
Job needs: ${job.skills?.join(", ") || "none"}. ${job.experience_min}-${job.experience_max} years.

Return: {"score":75,"label":"Strong match","strengths":["skill match"],"gaps":["missing skill"],"summary":"one sentence"}`;

    const result = await withTimeout(
      askClaudeJSON<{
        score: number;
        label: string;
        strengths: string[];
        gaps: string[];
        summary: string;
      }>(systemPrompt, userMessage, 300),
      "match-score",
    );

    if (!result)
      return res.status(500).json({ error: "Failed to calculate score" });
    res.json(result);
  } catch (err: any) {
    console.error("[/match-score]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 6: Mock interview (streaming)
router.post("/interview", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { job_id, messages: conversationHistory } = req.body;
    const student_id = req.user!.id;

    const { data: job } = await supabaseAdmin
      .from("job_postings")
      .select("title, company, skills")
      .eq("id", job_id)
      .single();

    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("full_name, skills")
      .eq("id", student_id)
      .single();

    const systemPrompt = `You are interviewing ${student?.full_name} for ${job?.title} at ${job?.company}. Ask one question at a time. Give brief feedback after each answer. Ask 5 questions total then give a score.`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const history = (conversationHistory ?? []).slice(0, -1).map((m: any) => ({
      role: m.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: m.content,
    }));

    const lastMessages = conversationHistory ?? [];
    const newMessage =
      lastMessages.length > 0
        ? lastMessages[lastMessages.length - 1].content
        : "Start the interview. Introduce yourself and ask the first question.";

    await withTimeout(
      askClaudeChatStream(
        systemPrompt,
        history,
        newMessage,
        (text: string) => {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        },
        400,
      ),
      "interview",
    );

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    console.error("[/interview]", err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// Feature 7: Code reviewer
router.post("/review-code", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code, language, problem } = req.body;
    if (!code?.trim())
      return res.status(400).json({ error: "No code provided" });

    const systemPrompt = `You are a code reviewer. Return only valid JSON. No markdown, no code blocks.`;

    const userMessage = `Review this ${language ?? "JavaScript"} code:
${code.slice(0, 1000)}

Return: {"score":75,"summary":"assessment","time_complexity":"O(n)","space_complexity":"O(1)","comments":[{"line":1,"type":"suggestion","message":"tip"}],"improvements":["improvement"],"ready_to_submit":true}`;

    const result = await withTimeout(
      askClaudeJSON<{
        score: number;
        summary: string;
        time_complexity: string;
        space_complexity: string;
        comments: Array<{ line: number; type: string; message: string }>;
        improvements: string[];
        ready_to_submit: boolean;
      }>(systemPrompt, userMessage, 500),
      "review-code",
    );

    if (!result)
      return res.status(500).json({ error: "Failed to review code" });
    res.json(result);
  } catch (err: any) {
    console.error("[/review-code]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 8: Career roadmap
router.post("/career-roadmap", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { goal, timeline_months } = req.body;
    const student_id = req.user!.id;

    const { data: student } = await supabaseAdmin
      .from("profiles")
      .select("skills, experience_years, seniority_level")
      .eq("id", student_id)
      .single();

    if (!student) return res.status(404).json({ error: "Profile not found" });

    const systemPrompt = `You are a career coach. Create learning roadmaps. Return only valid JSON. No markdown, no code blocks.`;

    const userMessage = `Create a ${timeline_months ?? 6} month roadmap for: ${goal}
Current skills: ${student.skills?.join(", ") || "beginner"}. Experience: ${student.experience_years} years.

Return: {"goal_summary":"goal","current_level":"level","gap_analysis":"gaps","phases":[{"phase":1,"title":"Phase 1","duration_weeks":4,"focus":"focus","tasks":["task1","task2"],"milestone":"milestone"}],"key_resources":["resource1"],"success_metrics":["metric1"]}`;

    const result = await withTimeout(
      askClaudeJSON<{
        goal_summary: string;
        current_level: string;
        gap_analysis: string;
        phases: Array<{
          phase: number;
          title: string;
          duration_weeks: number;
          focus: string;
          tasks: string[];
          milestone: string;
        }>;
        key_resources: string[];
        success_metrics: string[];
      }>(systemPrompt, userMessage, 1500),
      "career-roadmap",
    );

    if (!result)
      return res.status(500).json({ error: "Failed to generate roadmap" });
    res.json(result);
  } catch (err: any) {
    console.error("[/career-roadmap]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Feature 9: AI candidate shortlisting
router.post(
  "/shortlist-candidate",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { referral_request_id } = req.body;
      if (!referral_request_id) {
        res.status(400).json({ error: "referral_request_id is required" });
        return;
      }

      // Fetch referral request
      const { data: referral, error: referralError } = await supabaseAdmin
        .from("referral_requests")
        .select("student_id, job_id")
        .eq("id", referral_request_id)
        .single();

      if (referralError || !referral) {
        res.status(404).json({ error: "Referral request not found" });
        return;
      }

      // Fetch student profile, job details, and first message in parallel
      const [
        { data: student },
        { data: job },
        { data: messages },
      ] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select(
            "full_name, skills, experience_years, bio, profile_completeness, seniority_level",
          )
          .eq("id", referral.student_id)
          .single(),
        supabaseAdmin
          .from("job_postings")
          .select(
            "title, company, skills, seniority_level, experience_min, experience_max",
          )
          .eq("id", referral.job_id)
          .single(),
        supabaseAdmin
          .from("messages")
          .select("content")
          .eq("referral_request_id", referral_request_id)
          .order("created_at", { ascending: true })
          .limit(1),
      ]);

      if (!student || !job) {
        res.status(404).json({ error: "Student or job not found" });
        return;
      }

      const firstMessage =
        messages && messages.length > 0
          ? messages[0].content
          : "No message yet";

      const systemPrompt =
        "You are a senior hiring manager evaluating referral candidates. Return only valid JSON. No markdown, no code blocks.";

      const userMessage = `Score this candidate for the role.

CANDIDATE: ${student.full_name}, ${student.experience_years ?? 0} years experience, Level: ${student.seniority_level ?? "unspecified"}
Skills: ${student.skills?.join(", ") || "none listed"}
Profile completeness: ${student.profile_completeness ?? 0}%
Bio: ${student.bio || "No bio provided"}
Their message: ${firstMessage}

ROLE: ${job.title} at ${job.company}
Required skills: ${job.skills?.join(", ") || "none listed"}
Required level: ${job.seniority_level ?? "unspecified"}, Experience: ${job.experience_min ?? 0}-${job.experience_max ?? 10} years

Return this exact JSON:
{"score":78,"verdict":"Strong candidate with good skill alignment","strengths":["Has React experience","Clear professional message"],"weaknesses":["Missing Docker","Below experience requirement"],"recommendation":"accept","message_quality":"high"}

Score guide: 80-100=Excellent, 60-79=Strong, 40-59=Moderate, below 40=Weak
recommendation: "accept" if score>=75, "review" if score>=50, "decline" if below 50
message_quality: "high", "medium", or "low"`;

      const result = await withTimeout(
        askClaudeJSON<{
          score: number;
          verdict: string;
          strengths: string[];
          weaknesses: string[];
          recommendation: "accept" | "review" | "decline";
          message_quality: "high" | "medium" | "low";
        }>(systemPrompt, userMessage, 600),
        "shortlist-candidate",
      );

      if (!result) {
        res.status(500).json({ error: "Failed to score candidate" });
        return;
      }

      res.json({
        ...result,
        student_name: student.full_name,
        job_title: job.title,
      });
    } catch (err: any) {
      console.error("[/shortlist-candidate]", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

// Feature 11: Referral acceptance predictor
router.post(
  "/predict-acceptance",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { alumni_id, job_id } = req.body;
      if (!alumni_id || !job_id) {
        return res
          .status(400)
          .json({ error: "alumni_id and job_id are required" });
      }

      const student_id = req.user!.id;

      const [
        { data: alumni },
        { data: job },
        { data: student },
      ] = await Promise.all([
        supabaseAdmin
          .from("profiles")
          .select("response_rate, days_since_active, company, seniority_level")
          .eq("id", alumni_id)
          .single(),
        supabaseAdmin
          .from("job_postings")
          .select("seniority_level_num, company, skills")
          .eq("id", job_id)
          .single(),
        supabaseAdmin
          .from("profiles")
          .select("skills, experience_years, profile_completeness, seniority_level")
          .eq("id", student_id)
          .single(),
      ]);

      if (!alumni || !job || !student) {
        return res.status(404).json({ error: "Could not fetch required data" });
      }

      const seniorityMap: Record<string, number> = {
        junior: 0,
        mid: 1,
        senior: 2,
        lead: 3,
        principal: 4,
      };

      const studentSkills: string[] = student.skills ?? [];
      const jobSkills: string[] = job.skills ?? [];
      const skill_overlap_score =
        jobSkills.length > 0
          ? studentSkills.filter((s) =>
              jobSkills.some(
                (js) => js.toLowerCase() === s.toLowerCase(),
              ),
            ).length / jobSkills.length
          : 0.5;

      const studentSeniorityNum =
        seniorityMap[student.seniority_level ?? "junior"] ?? 0;

      const features: PredictorFeatures = {
        skill_overlap_score,
        alumni_response_rate: alumni.response_rate ?? 0.5,
        seniority_gap: Math.abs(
          studentSeniorityNum - (job.seniority_level_num ?? 1),
        ),
        alumni_days_since_active: alumni.days_since_active ?? 7,
        student_profile_completeness: student.profile_completeness ?? 50,
        message_length_chars: 150,
        message_attempt_number: 1,
        job_seniority_level: job.seniority_level_num ?? 1,
        same_team_as_job:
          alumni.company?.toLowerCase() === job.company?.toLowerCase() ? 1 : 0,
      };

      const result = predictAcceptance(features);
      res.json({ ...result, features_used: features });
    } catch (err: any) {
      console.error("[/predict-acceptance]", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

// Feature 10: Message quality checker
router.post(
  "/message-quality",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { message, job_title, company, alumni_name } = req.body;
      if (!message?.trim())
        return res.status(400).json({ error: "No message provided" });

      const systemPrompt = `You are a career coach evaluating referral messages. Return only valid JSON with no markdown.`;

      const userMessage = `Score this referral message on 5 dimensions from 0 to 10 each.

Message: ${message}
Target role: ${job_title ?? "unknown role"} at ${company ?? "unknown company"}
Alumni name: ${alumni_name ?? "the alumni"}

Return exactly this JSON:
{"overall_score":72,"dimensions":{"specificity":8,"personalisation":6,"conciseness":7,"clear_ask":9,"skill_alignment":5},"tips":["Mention a specific project","Reference the alumni team directly"],"verdict":"Good message with room for improvement","ready_to_send":true}
overall_score = average of all 5 dimension scores multiplied by 10.
ready_to_send = true if overall_score >= 60.`;

      const result = await withTimeout(
        askClaudeJSON<{
          overall_score: number;
          dimensions: {
            specificity: number;
            personalisation: number;
            conciseness: number;
            clear_ask: number;
            skill_alignment: number;
          };
          tips: string[];
          verdict: string;
          ready_to_send: boolean;
        }>(systemPrompt, userMessage, 400),
        "message-quality",
      );

      if (!result)
        return res.status(500).json({ error: "Failed to evaluate message" });
      res.json(result);
    } catch (err: any) {
      console.error("[/message-quality]", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
