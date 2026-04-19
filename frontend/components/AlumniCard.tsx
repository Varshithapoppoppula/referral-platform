interface Alumni {
  id: string;
  full_name: string;
  company: string;
  team?: string;
  seniority_level?: string;
  response_rate: number;
  avatar_url?: string;
  total_referrals_given: number;
}

interface Prediction {
  probability: number;
  prediction: string;
  confidence: string;
  score_percent: number;
}

interface AlumniCardProps {
  alumni: Alumni;
  selected: boolean;
  onSelect: () => void;
  prediction?: Prediction | null;
}

export default function AlumniCard({
  alumni,
  selected,
  onSelect,
  prediction,
}: AlumniCardProps) {
  const initials = alumni.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const responsePercent = Math.round(alumni.response_rate * 100);

  const responseLabel =
    responsePercent >= 70
      ? "Likely to respond"
      : responsePercent >= 40
        ? "Might respond"
        : "Less active";

  const responseColor =
    responsePercent >= 70
      ? "text-green-700 bg-green-100"
      : responsePercent >= 40
        ? "text-amber-600 bg-amber-50"
        : "text-gray-500 bg-gray-100";

  const barColor =
    responsePercent >= 70
      ? "bg-green-500"
      : responsePercent >= 40
        ? "bg-amber-400"
        : "bg-gray-300";

  const predictionBadge =
    prediction?.prediction === "likely"
      ? {
          style: "bg-green-100 text-green-700 border border-green-200",
          label: `AI: ${prediction.score_percent}% likely to refer`,
        }
      : prediction?.prediction === "possible"
        ? {
            style: "bg-amber-50 text-amber-700 border border-amber-200",
            label: `AI: ${prediction.score_percent}% may refer`,
          }
        : prediction?.prediction === "unlikely"
          ? {
              style: "bg-red-50 text-red-600 border border-red-200",
              label: `AI: ${prediction.score_percent}% unlikely to refer`,
            }
          : null;

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl shadow-sm hover:shadow-md p-4 cursor-pointer transition-all duration-200 ${
        selected ? "ring-2 ring-indigo-500 border-indigo-200" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-sm font-semibold shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {alumni.full_name}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {alumni.team ? `${alumni.team} · ` : ""}
            {alumni.company}
            {alumni.seniority_level ? ` · ${alumni.seniority_level}` : ""}
          </p>
        </div>

        <div className="text-right shrink-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${responseColor}`}
          >
            {responseLabel}
          </span>
          <p className="text-xs text-gray-400 mt-1">
            {alumni.total_referrals_given} referrals given
          </p>
        </div>
      </div>

      {/* Response rate progress bar */}
      <div className="mt-3">
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-300`}
            style={{ width: `${responsePercent}%` }}
          />
        </div>
      </div>

      {/* AI prediction badge */}
      {predictionBadge && (
        <div className="mt-2">
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${predictionBadge.style}`}
          >
            {predictionBadge.label}
          </span>
        </div>
      )}
    </div>
  );
}
