"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDate, RATING_COLORS, TASK_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Star } from "lucide-react";

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [taskType, setTaskType] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await adminApi.getAllRatings({ page, taskType: taskType || undefined, limit: 25 });
        setRatings(res.data.data);
        setPagination(res.data.pagination);
      } catch {}
      setLoading(false);
    };
    load();
  }, [page, taskType]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Ratings</h1>
          <p className="text-gray-500 mt-0.5">Platform-wide rating activity</p>
        </div>
        <select
          value={taskType}
          onChange={(e) => { setTaskType(e.target.value); setPage(1); }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Types</option>
          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : ratings.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Star size={32} className="mx-auto mb-2 opacity-30" />
            <p>No ratings found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500">
                    <th className="text-left px-5 py-3 font-medium">Rater</th>
                    <th className="text-left px-5 py-3 font-medium">URL</th>
                    <th className="text-left px-5 py-3 font-medium">Task</th>
                    <th className="text-left px-5 py-3 font-medium">Rating</th>
                    <th className="text-left px-5 py-3 font-medium">Time</th>
                    <th className="text-left px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map((r) => (
                    <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 text-sm">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{r.user?.name}</p>
                        <p className="text-xs text-gray-400">{r.user?.email}</p>
                      </td>
                      <td className="px-5 py-3 max-w-xs">
                        <p className="truncate text-gray-600">{r.inputUrl}</p>
                        {r.query && <p className="text-xs text-gray-400 truncate">Q: {r.query}</p>}
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">
                          {TASK_TYPE_LABELS[r.taskType]}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        {r.evaluation?.finalRating ? (
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[r.evaluation.finalRating]}`}>
                            {r.evaluation.finalRating}
                          </span>
                        ) : r.evaluation?.needsMetRating ? (
                          <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-semibold">
                            {r.evaluation.needsMetRating}
                          </span>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded ${r.status === "error" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                            {r.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{r.timeTaken}s</td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pagination && pagination.total > 25 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>{pagination.total} total ratings</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={ratings.length < 25}
                    onClick={() => setPage(page + 1)}
                    className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
