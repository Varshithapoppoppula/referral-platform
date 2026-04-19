import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabase";
import nodemailer from "nodemailer";

const router = Router();

const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const {
    referral_request_id,
    zoom_link,
    zoom_scheduled_at,
    assignment_prompt,
  } = req.body;

  const { data: referral } = await supabaseAdmin
    .from("referral_requests")
    .select("*")
    .eq("id", referral_request_id)
    .single();

  if (!referral) return res.status(404).json({ error: "Referral not found" });
  if (referral.alumni_id !== req.user!.id)
    return res.status(403).json({ error: "Forbidden" });

  const { data, error } = await supabaseAdmin
    .from("applications")
    .insert({
      referral_request_id,
      student_id: referral.student_id,
      alumni_id: referral.alumni_id,
      job_id: referral.job_id,
      zoom_link,
      zoom_scheduled_at,
      assignment_code: assignment_prompt,
      status: "interview_scheduled",
    })
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", referral.student_id)
    .single();

  if (student?.email) {
    await mailer
      .sendMail({
        to: student.email,
        subject: "Interview scheduled!",
        text: `Hi ${student.full_name},\n\nYour interview has been scheduled.\n\nZoom link: ${zoom_link}\nTime: ${new Date(zoom_scheduled_at).toLocaleString()}\n\nGood luck!`,
      })
      .catch((err) => console.error("Email error:", err));
  }

  res.status(201).json(data);
});

router.post("/:id/submit", requireAuth, async (req: AuthRequest, res) => {
  const { code, language } = req.body;

  const { data, error } = await supabaseAdmin
    .from("applications")
    .update({
      assignment_code: code,
      assignment_language: language ?? "javascript",
      assignment_submitted_at: new Date().toISOString(),
      status: "submitted",
    })
    .eq("id", req.params.id)
    .eq("student_id", req.user!.id)
    .select()
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.post("/:id/decide", requireAuth, async (req: AuthRequest, res) => {
  const { decision, notes } = req.body;

  const { data: app } = await supabaseAdmin
    .from("applications")
    .select("*")
    .eq("id", req.params.id)
    .single();

  if (!app) return res.status(404).json({ error: "Not found" });
  if (app.alumni_id !== req.user!.id)
    return res.status(403).json({ error: "Forbidden" });

  await supabaseAdmin
    .from("applications")
    .update({
      alumni_decision: decision,
      alumni_notes: notes,
      status: decision === "accept" ? "accepted" : "rejected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", req.params.id);

  await supabaseAdmin
    .from("referral_requests")
    .update({
      outcome: decision === "accept" ? 1 : 0,
      outcome_set_at: new Date().toISOString(),
    })
    .eq("id", app.referral_request_id);

  const { data: student } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", app.student_id)
    .single();

  if (student?.email) {
    await mailer
      .sendMail({
        to: student.email,
        subject:
          decision === "accept"
            ? "Congratulations — you have been accepted!"
            : "Application update",
        text:
          decision === "accept"
            ? `Hi ${student.full_name},\n\nGreat news — you have been accepted!\n\n${notes ? "Note: " + notes : ""}`
            : `Hi ${student.full_name},\n\nUnfortunately this application was not successful this time.\n\n${notes ? "Feedback: " + notes : ""}`,
      })
      .catch((err) => console.error("Email error:", err));
  }

  res.json({ success: true, decision });
});

router.get("/my", requireAuth, async (req: AuthRequest, res) => {
  const role = req.user!.role;
  const field = role === "student" ? "student_id" : "alumni_id";

  const { data, error } = await supabaseAdmin
    .from("applications")
    .select(`*, job:job_postings(title, company)`)
    .eq(field, req.user!.id)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

export default router;
