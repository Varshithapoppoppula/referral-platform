import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function verifyToken(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

export async function getProfile(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

export async function updateResponseRate(alumniId: string) {
  const { data } = await supabaseAdmin
    .from("referral_requests")
    .select("outcome")
    .eq("alumni_id", alumniId)
    .not("outcome", "is", null);

  if (!data || data.length === 0) return;

  const accepted = data.filter((r: any) => r.outcome === 1).length;
  const rate = parseFloat((accepted / data.length).toFixed(3));

  await supabaseAdmin
    .from("profiles")
    .update({ response_rate: rate })
    .eq("id", alumniId);
}
