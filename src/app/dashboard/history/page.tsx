"use client";
import { useEffect, useState } from "react";
import { ratingsApi } from "@/lib/api";
import { formatDate, RATING_COLORS, TASK_TYPE_LABELS } from "@/lib/utils";
import Link from "next/link";
import { Star, Filter } from "lucide-react";

const TASK_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "page_quality", label: "Page Quality" },
  { value: "needs_met", label: "Needs Met" },
  { value: "youtube", label: "YouTube" },
  { value: "image", label: "Image" },
  { value: "side_by_side", label: "Side by Side" },
];

export default function HistoryPage() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [taskType, setTaskType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await ratingsApi.getMyRatings(page, taskType || undefined);
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
          <h1 className="text-2xl font-bold text-gray-900">My Ratings</h1>
          <p className="text-gray-500 mt-0.5">Your complete rating history</p>
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={taskType}
            onChange={(e) => { setTaskType(e.target.value); setPage(1); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TASK_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : ratings.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Star size={36} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No ratings found</p>
            <p className="text-sm mt-1">Start rating tasks to see results here</p>
            <Link href="/dashboard/rate" className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded-lg text-sm">
              Start Rating
            </Link>
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">URL</th>
                  <th className="text-left px-5 py-3 font-medium">Task Type</th>
                  <th className="text-left px-5 py-3 font-medium">Rating</th>
                  <th className="text-left px-5 py-3 font-medium">Time</th>
                  <th className="text-left px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r) => (
                  <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <Link href={`/dashboard/history/${r._id}`} className="text-primary hover:underline max-w-xs truncate block">
                        {r.inputUrl}
                      </Link>
                      {r.query && <span className="text-xs text-gray-400">Query: {r.query}</span>}
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
                        <span className="text-gray-400 text-xs">{r.status}</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{r.timeTaken}s</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {pagination && pagination.pages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>Page {page} of {pagination.pages} ({pagination.total} total)</span>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-3 py-1 border rounded-lg disabled:opacity-40 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page === pagination.pages}
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
