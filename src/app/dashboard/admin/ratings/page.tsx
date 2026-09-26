"use client";
import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import { formatDate, RATING_COLORS, TASK_TYPE_LABELS } from "@/lib/utils";
import { Star, Search, ChevronLeft, ChevronRight, ExternalLink, Filter } from "lucide-react";

const TASK_COLORS: Record<string, string> = {
  page_quality: "bg-violet-100 text-violet-700",
  needs_met: "bg-emerald-100 text-emerald-700",
  youtube: "bg-red-100 text-red-700",
  image: "bg-amber-100 text-amber-700",
  side_by_side: "bg-blue-100 text-blue-700",
};

function fmtTime(sec: number) {
  if (!sec || sec === 0) return null; // null = no time recorded
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export default function AdminRatingsPage() {
  const [ratings, setRatings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [taskType, setTaskType] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const LIMIT = 30;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (taskType) params.taskType = taskType;
      if (selectedUser) params.userId = selectedUser;
      const res = await adminApi.getAllRatings(params);
      setRatings(res.data.data);
      setPagination(res.data.pagination);
    } catch {}
    setLoading(false);
  }, [page, taskType, selectedUser]);

  useEffect(() => { load(); }, [load]);

  // Load users for filter dropdown
  useEffect(() => {
    adminApi.getUsers({ limit: 100 }).then(res => setUsers(res.data.data)).catch(() => {});
  }, []);

  const filtered = search
    ? ratings.filter(r =>
        r.inputUrl?.toLowerCase().includes(search.toLowerCase()) ||
        r.query?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : ratings;

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 1;

  function getRatingDisplay(r: any) {
    const ev = r.evaluation;
    if (!ev) return null;
    if (ev.finalRating && ev.finalRating !== "N/A") return { label: ev.finalRating, style: RATING_COLORS[ev.finalRating] || "bg-gray-100 text-gray-700 border-gray-200" };
    if (ev.needsMetRating) return { label: ev.needsMetRating, style: "bg-blue-100 text-blue-800 border-blue-200" };
    if (ev.youtubePQRating) return { label: ev.youtubePQRating, style: RATING_COLORS[ev.youtubePQRating] || "bg-gray-100 text-gray-700 border-gray-200" };
    if (ev.imageSatisfaction) return { label: ev.imageSatisfaction, style: "bg-amber-100 text-amber-800 border-amber-200" };
    if (ev.sxsPreference) return { label: ev.sxsPreference.replace("Much Better", ">>").replace("Slightly Better", ">").replace("Better", ">"), style: "bg-purple-100 text-purple-800 border-purple-200" };
    return null;
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Ratings History</h1>
          <p className="text-gray-500 mt-0.5">
            {pagination?.total ? `${pagination.total.toLocaleString()} total ratings` : "Platform-wide rating activity"}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />

        {/* User filter */}
        <select
          value={selectedUser}
          onChange={e => { setSelectedUser(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-w-[160px]"
        >
          <option value="">All Users</option>
          {users.map(u => (
            <option key={u._id} value={u._id}>{u.name}</option>
          ))}
        </select>

        {/* Task type filter */}
        <select
          value={taskType}
          onChange={e => { setTaskType(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Task Types</option>
          {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v as string}</option>
          ))}
        </select>

        {/* Search */}
        <div className="flex-1 relative min-w-[200px]">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") setSearch(searchInput); }}
            placeholder="Search URL, query, or user… (Enter)"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {(selectedUser || taskType || search) && (
          <button
            onClick={() => { setSelectedUser(""); setTaskType(""); setSearch(""); setSearchInput(""); setPage(1); }}
            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-2">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Star size={32} className="mx-auto mb-2 opacity-30" />
            <p className="font-medium">No ratings found</p>
            <p className="text-sm mt-1">Try adjusting the filters</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Rater</th>
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">URL / Query</th>
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Task</th>
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Rating</th>
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Time Spent</th>
                    <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const ratingDisplay = getRatingDisplay(r);
                    const timeDisplay = fmtTime(r.timeTaken);
                    return (
                      <tr key={r._id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>

                        {/* Rater */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                              {r.user?.name?.[0] || "?"}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 text-xs">{r.user?.name || "Unknown"}</p>
                              <p className="text-xs text-gray-400">{r.user?.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* URL / Query */}
                        <td className="px-5 py-3.5 max-w-xs">
                          <div className="flex items-start gap-1.5">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-700 truncate font-mono">{r.inputUrl}</p>
                              {r.query && (
                                <p className="text-xs text-gray-400 truncate mt-0.5">
                                  <span className="font-medium">Q:</span> {r.query}
                                </p>
                              )}
                            </div>
                            {r.inputUrl && (
                              <a href={r.inputUrl} target="_blank" rel="noopener noreferrer"
                                className="text-gray-300 hover:text-primary flex-shrink-0 mt-0.5">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </td>

                        {/* Task type */}
                        <td className="px-5 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TASK_COLORS[r.taskType] || "bg-gray-100 text-gray-600"}`}>
                            {TASK_TYPE_LABELS[r.taskType] || r.taskType}
                          </span>
                        </td>

                        {/* Rating */}
                        <td className="px-5 py-3.5">
                          {ratingDisplay ? (
                            <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${ratingDisplay.style}`}>
                              {ratingDisplay.label}
                            </span>
                          ) : (
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              r.status === "error" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"
                            }`}>
                              {r.status}
                            </span>
                          )}
                        </td>

                        {/* Time spent — only show if user actually recorded time */}
                        <td className="px-5 py-3.5">
                          {timeDisplay ? (
                            <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                              {timeDisplay}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="px-5 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {formatDate(r.createdAt)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.total > LIMIT && (
              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, pagination.total)} of {pagination.total.toLocaleString()} ratings
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                    className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-xs text-gray-500 px-2">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                    className="p-1.5 border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
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