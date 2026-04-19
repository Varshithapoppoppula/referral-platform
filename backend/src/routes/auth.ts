import { Router } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { supabaseAdmin } from "../services/supabase";

const router = Router();

router.get("/me", requireAuth, async (req: AuthRequest, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", req.user!.id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: "Profile not found" });
    }
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

router.post("/logout", requireAuth, async (req: AuthRequest, res) => {
  try {
    const token = req.headers.authorization!.replace("Bearer ", "");
    await supabaseAdmin.auth.admin.signOut(token);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: true });
  }
});

router.post("/refresh", requireAuth, async (req: AuthRequest, res) => {
  try {
    await supabaseAdmin
      .from("profiles")
      .update({
        last_active_at: new Date().toISOString(),
        days_since_active: 0,
      })
      .eq("id", req.user!.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to refresh" });
  }
});

export default router;
