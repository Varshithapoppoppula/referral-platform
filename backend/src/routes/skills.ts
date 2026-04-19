import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { askClaudeJSON } from "../services/claude";
import { supabaseAdmin } from "../services/supabase";

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

interface MatchedSkill {
  student_skill: string;
  job_skill: string;
  similarity: number;
}

interface MissingSkill {
  skill: string;
  importance: "high" | "medium" | "low";
  learn_in: string;
}

interface ExtraSkill {
  skill: string;
  relevance: "high" | "moderate" | "low";
}

interface GapAnalysisResult {
  overall_score: number;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  extra_skills: ExtraSkill[];
  summary: string;
  ready_to_apply: boolean;
}

// POST /api/skills/gap-analysis
router.post("/gap-analysis", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { job_id } = req.body;
    if (!job_id) {
      res.status(400).json({ error: "job_id is required" });
      return;
    }

    // Fetch student profile
    const { data: student, error: studentError } = await supabaseAdmin
      .from("profiles")
      .select("skills")
      .eq("id", req.user!.id)
      .single();

    if (studentError || !student) {
      res.status(404).json({ error: "Student profile not found" });
      return;
    }

    // Fetch job
    const { data: job, error: jobError } = await supabaseAdmin
      .from("job_postings")
      .select("title, company, skills")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const studentSkills: string[] = student.skills ?? [];
    const jobSkills: string[] = job.skills ?? [];

    if (studentSkills.length === 0) {
      res.status(400).json({
        error:
          "Your profile has no skills listed. Add skills to your profile first.",
      });
      return;
    }

    if (jobSkills.length === 0) {
      res.status(400).json({ error: "This job has no required skills listed." });
      return;
    }

    const result = await withTimeout(
      askClaudeJSON<GapAnalysisResult>(
        "You are a technical recruiter analysing skill compatibility. Return only valid JSON. No markdown, no code blocks.",
        `Compare these skills semantically (not just exact matches). Consider synonyms and related technologies.

Student skills: ${studentSkills.join(", ")}
Job required skills: ${jobSkills.join(", ")}

Return this exact JSON:
{
  "overall_score": 75,
  "matched_skills": [{"student_skill": "React", "job_skill": "React.js", "similarity": 0.95}],
  "missing_skills": [{"skill": "Docker", "importance": "high", "learn_in": "2 weeks"}],
  "extra_skills": [{"skill": "MongoDB", "relevance": "moderate"}],
  "summary": "one sentence summary",
  "ready_to_apply": true
}`,
        1200,
      ),
      "gap-analysis",
    );

    if (!result) {
      res.status(500).json({ error: "Could not analyse skill gap. Try again." });
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error("[/api/skills/gap-analysis]", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
