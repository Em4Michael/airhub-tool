"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { ratingsApi, adminApi, timesheetApi } from "@/lib/api";
import { formatCurrency, formatDate, TASK_TYPE_LABELS, RATING_COLORS } from "@/lib/utils";
import Link from "next/link";
import { Star, Clock, TrendingUp, Users, AlertCircle, CheckCircle } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [recentRatings, setRecentRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (user?.role === "admin") {
          const [statsRes, ratingsRes] = await Promise.all([
            adminApi.stats(),
            adminApi.getAllRatings({ limit: 5 }),
          ]);
          setData(statsRes.data.data);
          setRecentRatings(ratingsRes.data.data);
        } else {
          const ratingsRes = await ratingsApi.getMyRatings(1);
          setRecentRatings(ratingsRes.data.data.slice(0, 5));
        }
      } catch {}
      setLoading(false);
    };
    if (user) fetchData();
  }, [user]);

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-24 bg-gray-200 rounded-xl" />
      ))}
    </div>;
  }

  const adminCards = data ? [
    { label: "Total Raters", value: data.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Pending Approval", value: data.pendingApproval, icon: AlertCircle, color: "text-yellow-600 bg-yellow-50" },
    { label: "Total Ratings", value: data.totalRatings, icon: Star, color: "text-green-600 bg-green-50" },
    { label: "Pending Timesheets", value: data.pendingTimesheets, icon: Clock, color: "text-purple-600 bg-purple-50" },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {user?.role === "admin" ? "Admin Dashboard" : "Here's your rating overview"}
        </p>
      </div>

      {/* Admin stats */}
      {user?.role === "admin" && data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {adminCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Rater quick actions */}
      {user?.role === "rater" && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Page Quality", href: "/dashboard/rate?type=page_quality", color: "bg-blue-500" },
            { label: "Needs Met", href: "/dashboard/rate?type=needs_met", color: "bg-green-500" },
            { label: "YouTube", href: "/dashboard/rate?type=youtube", color: "bg-red-500" },
            { label: "Image Rating", href: "/dashboard/rate?type=image", color: "bg-purple-500" },
          ].map(({ label, href, color }) => (
            <Link
              key={label}
              href={href}
              className={`${color} hover:opacity-90 text-white rounded-xl p-5 transition-opacity`}
            >
              <Star size={22} className="mb-3" />
              <p className="font-semibold">{label}</p>
              <p className="text-sm opacity-80 mt-0.5">Start rating →</p>
            </Link>
          ))}
        </div>
      )}

      {/* Recent ratings table */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Ratings</h2>
          <Link href="/dashboard/history" className="text-sm text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentRatings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Star size={32} className="mx-auto mb-2 opacity-40" />
            <p>No ratings yet. Start rating to see results here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-5 py-3 font-medium">URL</th>
                  <th className="px-5 py-3 font-medium">Task</th>
                  <th className="px-5 py-3 font-medium">Rating</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {recentRatings.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 max-w-xs truncate">
                      <Link href={`/dashboard/history/${r._id}`} className="text-primary hover:underline">
                        {r.inputUrl}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-medium">
                        {TASK_TYPE_LABELS[r.taskType]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {r.evaluation?.finalRating && (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[r.evaluation.finalRating]}`}>
                          {r.evaluation.finalRating}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top earners (admin) */}
      {user?.role === "admin" && data?.topEarners?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Top Earners</h2>
          </div>
          <div className="p-5 space-y-3">
            {data.topEarners.slice(0, 5).map((e: any, i: number) => (
              <div key={e._id} className="flex items-center gap-4">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? "bg-yellow-400" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-amber-600" : "bg-gray-300"}`}>
                  {i + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">{e.name}</p>
                  <p className="text-xs text-gray-500">{e.totalHours}h worked</p>
                </div>
                <p className="font-semibold text-green-600">{formatCurrency(e.totalEarnings)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
