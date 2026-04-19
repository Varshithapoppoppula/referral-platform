import cron from "node-cron";
import axios from "axios";
import { supabaseAdmin } from "./supabase";

const JSEARCH_KEY = process.env.JSEARCH_API_KEY;

function extractSkills(text: string): string[] {
  const known = [
    "React",
    "Node.js",
    "TypeScript",
    "JavaScript",
    "Python",
    "AWS",
    "Docker",
    "MongoDB",
    "PostgreSQL",
    "Express",
    "Next.js",
    "Redis",
    "GraphQL",
    "Git",
    "Kubernetes",
    "Java",
    "Go",
    "Rust",
    "Vue.js",
    "Angular",
  ];
  return known.filter((s) => text.toLowerCase().includes(s.toLowerCase()));
}

function detectSeniority(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("senior") || t.includes("sr.")) return "senior";
  if (t.includes("lead") || t.includes("principal")) return "lead";
  if (t.includes("junior") || t.includes("jr.")) return "junior";
  return "mid";
}

function detectSeniorityNum(title: string): number {
  const map: Record<string, number> = {
    junior: 0,
    mid: 1,
    senior: 2,
    lead: 3,
    principal: 4,
  };
  return map[detectSeniority(title)] ?? 1;
}

async function fetchAndStoreJobs() {
  if (!JSEARCH_KEY) {
    console.log("[CRON] No JSEARCH_API_KEY set — skipping job fetch");
    return;
  }

  console.log("[CRON] Fetching jobs from JSearch...");

  const queries = [
    "software engineer India",
    "frontend developer India",
    "backend developer India",
    "full stack developer India",
  ];

  for (const query of queries) {
    try {
      const { data } = await axios.get(
        "https://jsearch.p.rapidapi.com/search",
        {
          params: { query, page: "1", num_pages: "1", date_posted: "today" },
          headers: {
            "X-RapidAPI-Key": JSEARCH_KEY,
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
          },
        },
      );

      const jobs = (data.data ?? []).map((j: any) => ({
        title: j.job_title,
        company: j.employer_name,
        company_normalised: j.employer_name?.toLowerCase().trim(),
        description: j.job_description?.slice(0, 2000),
        skills: extractSkills(j.job_description ?? ""),
        location: j.job_city ?? j.job_country ?? "India",
        is_remote: j.job_is_remote ?? false,
        source: "jsearch",
        source_url: j.job_apply_link,
        seniority_level: detectSeniority(j.job_title),
        seniority_level_num: detectSeniorityNum(j.job_title),
        is_active: true,
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }));

      if (jobs.length > 0) {
        const { error } = await supabaseAdmin
          .from("job_postings")
          .upsert(jobs, { onConflict: "source_url", ignoreDuplicates: true });
        if (error) console.error("[CRON] Insert error:", error.message);
        else console.log(`[CRON] Saved ${jobs.length} jobs for: "${query}"`);
      }

      await new Promise((r) => setTimeout(r, 2000));
    } catch (e: any) {
      console.error("[CRON] Fetch error for query:", query, e.message);
    }
  }

  console.log("[CRON] Job fetch complete");
}

export function startJobCron() {
  cron.schedule("0 2 * * *", fetchAndStoreJobs);
  console.log("[CRON] Scheduled daily job fetch at 2:00 AM");
}
