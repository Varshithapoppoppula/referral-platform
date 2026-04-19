export type UserRole = "student" | "alumni" | "admin";

export type ReferralStatus = "pending" | "accepted" | "rejected" | "expired";

export type ApplicationStatus =
  | "interview_scheduled"
  | "assignment_sent"
  | "submitted"
  | "accepted"
  | "rejected";

export type JobSource = "internal" | "jsearch" | "adzuna" | "url_paste";

export type SeniorityLevel = "junior" | "mid" | "senior" | "lead" | "principal";

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string;
  avatar_url?: string;
  bio?: string;
  skills: string[];
  experience_years: number;
  seniority_score: number;
  profile_completeness: number;
  company?: string;
  company_normalised?: string;
  team?: string;
  seniority_level?: SeniorityLevel;
  response_rate: number;
  total_referrals_given: number;
  days_since_active: number;
  last_active_at: string;
  linkedin_url?: string;
  github_url?: string;
  location?: string;
  created_at: string;
  updated_at: string;
}

export interface JobPosting {
  id: string;
  posted_by?: string;
  title: string;
  company: string;
  company_normalised: string;
  team?: string;
  description?: string;
  skills: string[];
  experience_min: number;
  experience_max: number;
  location?: string;
  is_remote: boolean;
  seniority_level?: SeniorityLevel;
  seniority_level_num: number;
  source: JobSource;
  source_url?: string;
  is_active: boolean;
  expires_at: string;
  alumni_count: number;
  created_at: string;
}

export interface ReferralRequest {
  id: string;
  student_id: string;
  alumni_id: string;
  job_id: string;
  status: ReferralStatus;
  message_count: number;
  chat_unlocked: boolean;
  skill_overlap_score: number;
  seniority_gap: number;
  alumni_response_rate: number;
  alumni_days_since_active: number;
  student_profile_completeness: number;
  message_length_chars: number;
  message_attempt_number: number;
  job_seniority_level: number;
  same_team_as_job: boolean;
  outcome?: number;
  outcome_set_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  referral_request_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Application {
  id: string;
  referral_request_id: string;
  student_id: string;
  alumni_id: string;
  job_id: string;
  status: ApplicationStatus;
  zoom_link?: string;
  zoom_scheduled_at?: string;
  assignment_code?: string;
  assignment_language: string;
  assignment_submitted_at?: string;
  alumni_decision?: "accept" | "reject";
  alumni_notes?: string;
  created_at: string;
  updated_at: string;
}

// Environment variable types — helps TypeScript know what's available
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      SUPABASE_ANON_KEY: string;
      PORT: string;
      FRONTEND_URL: string;
      GROQ_API_KEY: string;
      JSEARCH_API_KEY?: string;
      EMAIL_USER?: string;
      EMAIL_PASS?: string;
    }
  }
}
