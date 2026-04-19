"use client";
import { useRouter } from "next/navigation";

interface ReferralStatusProps {
  referral: any;
  role: "student" | "alumni";
}

export default function ReferralStatus({
  referral,
  role,
}: ReferralStatusProps) {
  const router = useRouter();

  const statusStyle =
    referral.status === "accepted"
      ? "bg-green-100 text-green-700 border border-green-200"
      : referral.status === "rejected"
        ? "bg-red-50 text-red-600 border border-red-200"
        : referral.status === "expired"
          ? "bg-gray-100 text-gray-500 border border-gray-200"
          : "bg-amber-50 text-amber-700 border border-amber-200";

  const messageInfo = !referral.chat_unlocked
    ? `${referral.message_count}/3 messages sent`
    : "Chat unlocked";

  function handleOpenChat() {
    if (role === "alumni") {
      router.push(`/alumni/referrals/${referral.id}`);
    } else {
      router.push(`/student/referrals/${referral.id}`);
    }
  }

  // Timeline dot colors for message count
  const dots = [0, 1, 2];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 flex gap-4">
      {/* Timeline dots */}
      <div className="flex flex-col items-center pt-1 gap-1.5">
        {dots.map((i) => (
          <div
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i < referral.message_count
                ? "bg-indigo-500"
                : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {referral.job?.title ?? "Job"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {referral.job?.company ?? ""}
            </p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ml-2 shrink-0 ${statusStyle}`}
          >
            {referral.status}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-3">
          <span>
            {role === "student"
              ? `Alumni: ${referral.alumni?.full_name ?? "Unknown"}`
              : `Student: ${referral.student?.full_name ?? "Unknown"}`}
          </span>
          <span>{messageInfo}</span>
        </div>

        {/* Alumni actions */}
        {role === "alumni" &&
          referral.status !== "rejected" &&
          referral.status !== "expired" && (
            <button
              onClick={handleOpenChat}
              className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              {referral.chat_unlocked ? "Open chat" : "Reply to request"}
            </button>
          )}
        {role === "alumni" && referral.status === "rejected" && (
          <p className="text-xs text-red-500">This request was declined.</p>
        )}
        {role === "alumni" && referral.status === "expired" && (
          <p className="text-xs text-gray-400">This request has expired.</p>
        )}

        {/* Student actions */}
        {role === "student" &&
          referral.chat_unlocked &&
          referral.status !== "rejected" &&
          referral.status !== "expired" && (
            <button
              onClick={handleOpenChat}
              className="text-xs bg-indigo-600 text-white px-4 py-1.5 rounded-xl hover:bg-indigo-700 transition-colors font-medium"
            >
              Open chat
            </button>
          )}

        {role === "student" &&
          !referral.chat_unlocked &&
          referral.message_count < 3 && (
            <p className="text-xs text-amber-600">
              Waiting for alumni to reply. You have {3 - referral.message_count}{" "}
              message(s) remaining.
            </p>
          )}

        {role === "student" && referral.application_id && (
          <a
            href={`/interview/${referral.application_id}`}
            className="inline-block mt-2 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100 transition-colors font-medium"
          >
            View interview + assignment
          </a>
        )}

        {role === "student" &&
          !referral.chat_unlocked &&
          referral.message_count >= 3 && (
            <p className="text-xs text-red-500">
              Message limit reached. Waiting for alumni to reply.
            </p>
          )}
      </div>
    </div>
  );
}
