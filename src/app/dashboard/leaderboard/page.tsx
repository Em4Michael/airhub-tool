"use client";
import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Trophy, Medal } from "lucide-react";

export default function LeaderboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi.leaderboard().then((res) => {
      setData(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const medalColors = ["text-yellow-400", "text-gray-400", "text-amber-600"];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="text-center py-6">
        <Trophy size={40} className="mx-auto text-yellow-400 mb-3" />
        <h1 className="text-2xl font-bold text-gray-900">Top Earners</h1>
        <p className="text-gray-500 mt-1">All-time earnings leaderboard</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : data.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No data yet. Complete timesheets to appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {data.map((rater, i) => (
              <div key={rater._id} className={`p-5 flex items-center gap-4 ${i < 3 ? "bg-gradient-to-r from-yellow-50/50 to-transparent" : ""}`}>
                <div className={`w-8 h-8 flex items-center justify-center font-bold ${i < 3 ? medalColors[i] : "text-gray-400 text-sm"}`}>
                  {i < 3 ? <Medal size={24} /> : i + 1}
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="font-semibold text-gray-600">{rater.name?.[0]}</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{rater.name}</p>
                  <p className="text-xs text-gray-500">{rater.paymentCount} payment(s) received</p>
                </div>
                <p className="font-bold text-green-600 text-lg">{formatCurrency(rater.totalEarnings)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
