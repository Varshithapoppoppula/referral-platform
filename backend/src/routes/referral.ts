import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { supabaseAdmin, updateResponseRate } from "../services/supabase";

const router = Router();

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const { alumni_id, job_id, message } = req.body;
  const student_id = req.user!.id;

  const { data: existing } = await supabaseAdmin
    .from("referral_requests")
    .select("id")
    .eq("student_id", student_id)
    .eq("alumni_id", alumni_id)
    .eq("job_id", job_id)
    .single();

  if (existing) {
    return res.status(400).json({ error: "Referral request already exists" });
  }

  const [{ data: studentProfile }, { data: job }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("skills, seniority_score, profile_completeness")
      .eq("id", student_id)
      .single(),
    supabaseAdmin
      .from("job_postings")
      .select("skills, seniority_level_num, team")
      .eq("id", job_id)
      .single(),
  ]);

  const { data: alumniProfile } = await supabaseAdmin
    .from("profiles")
    .select(
      "seniority_score, response_rate, days_since_active, team, total_referrals_given",
    )
    .eq("id", alumni_id)
    .single();

  const studentSkills: string[] = studentProfile?.skills ?? [];
  const jobSkills: string[] = job?.skills ?? [];
  const overlap = jobSkills.length
    ? studentSkills.filter((s) => jobSkills.includes(s)).length /
      jobSkills.length
    : 0;

  const { data: referral, error } = await supabaseAdmin
    .from("referral_requests")
    .insert({
      student_id,
      alumni_id,
      job_id,
      message_count: 1,
      skill_overlap_score: parseFloat(overlap.toFixed(3)),
      seniority_gap:
        (alumniProfile?.seniority_score ?? 2) -
        (studentProfile?.seniority_score ?? 0),
      alumni_response_rate: alumniProfile?.response_rate ?? 0,
      alumni_days_since_active: alumniProfile?.days_since_active ?? 30,
      student_profile_completeness: studentProfile?.profile_completeness ?? 0,
      message_length_chars: message.length,
      message_attempt_number: 1,
      job_seniority_level: job?.seniority_level_num ?? 1,
      same_team_as_job: alumniProfile?.team === job?.team,
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  await supabaseAdmin.from("messages").insert({
    referral_request_id: referral.id,
    sender_id: student_id,
    content: message,
  });

  res.status(201).json(referral);
});

router.post("/:id/message", requireAuth, async (req: AuthRequest, res) => {
  const { content } = req.body;
  const userId = req.user!.id;

  const { data: referral } = await supabaseAdmin
    .from("referral_requests")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (!referral) return res.status(404).json({ error: "Not found" });

  const isStudent = referral.student_id === userId;
  const isAlumni = referral.alumni_id === userId;

  if (!isStudent && !isAlumni) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (isStudent && !referral.chat_unlocked) {
    if (referral.message_count >= 3) {
      return res.status(403).json({
        error: "Message limit reached. Wait for alumni to reply.",
        code: "COLD_LIMIT_REACHED",
      });
    }
  }

  if (isAlumni && !referral.chat_unlocked) {
    await supabaseAdmin
      .from("referral_requests")
      .update({
        chat_unlocked: true,
        status: "accepted",
        outcome: 1,
        outcome_set_at: new Date().toISOString(),
      })
      .eq("id", req.params.id);

    await updateResponseRate(referral.alumni_id);
  }

  await supabaseAdmin.from("messages").insert({
    referral_request_id: req.params.id,
    sender_id: userId,
    content,
  });

  if (isStudent) {
    await supabaseAdmin
      .from("referral_requests")
      .update({ message_count: referral.message_count + 1 })
      .eq("id", req.params.id);
  }

  res.json({
    success: true,
    chat_unlocked: isAlumni ? true : referral.chat_unlocked,
  });
});

router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const role = req.user!.role;
  const field = role === "student" ? "student_id" : "alumni_id";

  const { data, error } = await supabaseAdmin
    .from("referral_requests")
    .select(
      `
      *,
      job:job_postings(title, company),
      student:profiles!referral_requests_student_id_fkey(full_name, avatar_url),
      alumni:profiles!referral_requests_alumni_id_fkey(full_name, avatar_url, company)
    `,
    )
    .eq(field, userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.get("/:id/messages", requireAuth, async (req: AuthRequest, res) => {
  const { data: referral } = await supabaseAdmin
    .from("referral_requests")
    .select("student_id, alumni_id")
    .eq("id", req.params.id)
    .single();

  if (!referral) return res.status(404).json({ error: "Not found" });

  const userId = req.user!.id;
  if (referral.student_id !== userId && referral.alumni_id !== userId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .select("*")
    .eq("referral_request_id", req.params.id)
    .order("created_at", { ascending: true });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
