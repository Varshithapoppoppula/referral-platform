"use client";
import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import ReferralStatus from "@/components/ReferralStatus";

export default function MyReferralsPage() {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadReferrals();
  }, []);

  async function loadReferrals() {
    try {
      const data = await apiGet("/api/referral/my");
      setReferrals(data ?? []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const total = referrals.length;
  const pending = referrals.filter((r) => r.status === "pending").length;
  const accepted = referrals.filter((r) => r.status === "accepted").length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My referrals</h1>
        <p className="text-sm text-gray-500 mt-1">Track all your referral requests</p>
      </div>

      {/* Stats row */}
      {!loading && referrals.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Total requests</p>
            <p className="text-3xl font-bold text-gray-900">{total}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Pending</p>
            <p className="text-3xl font-bold text-amber-500">{pending}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-gray-400 mb-1">Accepted</p>
            <p className="text-3xl font-bold text-green-600">{accepted}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 border border-red-100">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 bg-white rounded-2xl shadow-sm animate-pulse"
            />
          ))}
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-2xl shadow-sm">
          No referral requests yet. Browse jobs and send your first request.
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map((r) => (
            <ReferralStatus key={r.id} referral={r} role="student" />
          ))}
        </div>
      )}
    </div>
  );
}
