import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabase";

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user!.id)
    .single();
  if (error) return res.status(404).json({ error: "Profile not found" });
  res.json(data);
});

router.patch("/me", requireAuth, async (req: AuthRequest, res) => {
  const allowed = [
    "full_name",
    "bio",
    "skills",
    "experience_years",
    "company",
    "company_normalised",
    "team",
    "seniority_level",
    "linkedin_url",
    "github_url",
    "location",
    "avatar_url",
  ];
  const updates: Record<string, any> = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", req.user!.id)
    .single();

  const merged = { ...profile, ...updates };
  const fields = [
    "full_name",
    "bio",
    "skills",
    "company",
    "linkedin_url",
    "location",
  ];
  const filled = fields.filter((f) => merged[f] && merged[f].length > 0).length;
  updates.profile_completeness = Math.round((filled / fields.length) * 100);
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("id", req.user!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/alumni", requireAuth, async (req: AuthRequest, res) => {
  const { company } = req.query;

  let query = supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, company, company_normalised, team, seniority_level, response_rate, avatar_url, total_referrals_given",
    )
    .eq("role", "alumni");

  if (company) {
    query = query.ilike("company_normalised", `%${company}%`);
  }

  const { data, error } = await query.order("response_rate", {
    ascending: false,
  });
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/:id", requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, company, team, seniority_level, response_rate, avatar_url, bio, skills, linkedin_url, github_url, role",
    )
    .eq("id", req.params.id)
    .single();
  if (error) return res.status(404).json({ error: "User not found" });
  res.json(data);
});

export default router;
