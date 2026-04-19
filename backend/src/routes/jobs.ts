import { Router } from "express";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabase";

const router = Router();

router.get("/", requireAuth, async (req: AuthRequest, res) => {
  const { search, company, remote, posted_by, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = supabaseAdmin
    .from("job_postings")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + Number(limit) - 1);

  // When fetching a specific user's jobs don't restrict to active only —
  // alumni need to see their closed postings too.
  if (!posted_by) {
    query = query.eq("is_active", true);
  }

  if (search) query = query.ilike("title", `%${search}%`);
  if (company) query = query.ilike("company_normalised", `%${company}%`);
  if (remote === "true") query = query.eq("is_remote", true);
  if (posted_by) query = query.eq("posted_by", posted_by as string);

  const { data, count, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({ jobs: data, total: count, page: Number(page) });
});

router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("job_postings")
    .select("*")
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "Job not found" });
  res.json(data);
});

router.post(
  "/",
  requireAuth,
  requireRole("alumni"),
  async (req: AuthRequest, res) => {
    const {
      title,
      description,
      skills,
      location,
      is_remote,
      seniority_level,
      experience_min,
      experience_max,
      team,
    } = req.body;

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("company, company_normalised")
      .eq("id", req.user!.id)
      .single();

    const seniorityMap: Record<string, number> = {
      junior: 0,
      mid: 1,
      senior: 2,
      lead: 3,
      principal: 4,
    };

    const { data, error } = await supabaseAdmin
      .from("job_postings")
      .insert({
        posted_by: req.user!.id,
        title,
        description,
        skills,
        location,
        is_remote,
        team,
        seniority_level,
        experience_min,
        experience_max,
        company: profile?.company ?? "",
        company_normalised:
          profile?.company_normalised ?? profile?.company ?? "",
        seniority_level_num: seniorityMap[seniority_level] ?? 1,
        source: "internal",
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json(data);
  },
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("alumni"),
  async (req: AuthRequest, res) => {
    const { data, error } = await supabaseAdmin
      .from("job_postings")
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq("id", req.params.id)
      .eq("posted_by", req.user!.id)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  },
);

router.delete(
  "/:id",
  requireAuth,
  requireRole("alumni"),
  async (req: AuthRequest, res) => {
    const { error } = await supabaseAdmin
      .from("job_postings")
      .update({ is_active: false })
      .eq("id", req.params.id)
      .eq("posted_by", req.user!.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  },
);

export default router;
