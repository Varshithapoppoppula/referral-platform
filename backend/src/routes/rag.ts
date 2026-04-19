import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  queryCareerKnowledge,
  queryInterviewQuestions,
} from "../services/rag";

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

// POST /api/rag/career-query
router.post("/career-query", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      res.status(400).json({ error: "query is required" });
      return;
    }
    const answer = await withTimeout(
      queryCareerKnowledge(query.trim()),
      "career-query",
    );
    res.json({ answer, query: query.trim() });
  } catch (err: any) {
    console.error("[/api/rag/career-query]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rag/interview-questions
router.post(
  "/interview-questions",
  requireAuth,
  async (req: AuthRequest, res) => {
    try {
      const { company, level, topic } = req.body;
      const questions = await withTimeout(
        queryInterviewQuestions(company, level, topic),
        "interview-questions",
      );
      res.json({ questions, total: questions.length });
    } catch (err: any) {
      console.error("[/api/rag/interview-questions]", err.message);
      res.status(500).json({ error: err.message });
    }
  },
);

export default router;
