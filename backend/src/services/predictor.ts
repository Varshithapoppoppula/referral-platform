export interface PredictorFeatures {
  skill_overlap_score: number;
  alumni_response_rate: number;
  seniority_gap: number;
  alumni_days_since_active: number;
  student_profile_completeness: number;
  message_length_chars: number;
  message_attempt_number: number;
  job_seniority_level: number;
  same_team_as_job: number;
}

export interface PredictorResult {
  probability: number;
  prediction: "likely" | "possible" | "unlikely";
  confidence: string;
  score_percent: number;
}

const WEIGHTS = {
  skill_overlap_score: 2.1,
  alumni_response_rate: 1.8,
  seniority_gap: -0.4,
  alumni_days_since_active: -0.02,
  student_profile_completeness: 0.015,
  message_length_chars: 0.003,
  message_attempt_number: -0.3,
  job_seniority_level: 0.1,
  same_team_as_job: 0.8,
  bias: -1.2,
};

export function predictAcceptance(
  features: PredictorFeatures,
): PredictorResult {
  const z =
    WEIGHTS.skill_overlap_score * features.skill_overlap_score +
    WEIGHTS.alumni_response_rate * features.alumni_response_rate +
    WEIGHTS.seniority_gap * features.seniority_gap +
    WEIGHTS.alumni_days_since_active * features.alumni_days_since_active +
    WEIGHTS.student_profile_completeness *
      features.student_profile_completeness +
    WEIGHTS.message_length_chars * features.message_length_chars +
    WEIGHTS.message_attempt_number * features.message_attempt_number +
    WEIGHTS.job_seniority_level * features.job_seniority_level +
    WEIGHTS.same_team_as_job * features.same_team_as_job +
    WEIGHTS.bias;

  const probability = 1 / (1 + Math.exp(-z));
  const score_percent = Math.round(probability * 100);

  let prediction: "likely" | "possible" | "unlikely";
  let confidence: string;

  if (probability >= 0.65) {
    prediction = "likely";
    confidence = "High confidence";
  } else if (probability >= 0.35) {
    prediction = "possible";
    confidence = "Moderate confidence";
  } else {
    prediction = "unlikely";
    confidence = "Low confidence";
  }

  return { probability, prediction, confidence, score_percent };
}
