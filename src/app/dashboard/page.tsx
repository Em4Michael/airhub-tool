"use client";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { ratingsApi, adminApi } from "@/lib/api";
import { formatDate, TASK_TYPE_LABELS, RATING_COLORS } from "@/lib/utils";
import Link from "next/link";
import {
  Star, Clock, TrendingUp, Users, AlertCircle, DollarSign,
  Activity, Award, BarChart2, ChevronRight, Zap,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const TASK_COLORS: Record<string, string> = {
  page_quality: "#6366f1", needs_met: "#10b981",
  youtube: "#ef4444", image: "#f59e0b", side_by_side: "#3b82f6",
};
const TASK_LABELS: Record<string, string> = {
  page_quality: "Page Quality", needs_met: "Needs Met",
  youtube: "YouTube", image: "Image", side_by_side: "SxS",
};
const PALETTE = ["#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6"];

type Period = "week" | "biweekly" | "month" | "allTime";
const PERIOD_LABELS: Record<Period, string> = {
  week: "This Week", biweekly: "Last 2 Weeks", month: "This Month", allTime: "All Time",
};

function fmt(n: number) { return n?.toLocaleString() ?? "0"; }
function fmtN(n: number) { return `₦${(n || 0).toLocaleString()}`; }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ label, value, sub, icon: Icon, color, href }: any) {
  const inner = (
    <div className={`bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4 ${href ? "hover:border-primary/40 hover:shadow-sm transition-all" : ""}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && <ChevronRight className="h-4 w-4 text-gray-300 mt-1 flex-shrink-0" />}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Tooltip2({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [recentRatings, setRecentRatings] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      adminApi.getAnalytics(),
      adminApi.getAllRatings({ limit: 8 }),
    ]).then(([a, r]) => {
      setData(a.data.data);
      setRecentRatings(r.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );
  if (!data) return null;

  const p = data.byPeriod[period];
  const dailyChart = data.dailyTrend.map((d: any) => ({ date: fmtDate(d._id), ratings: d.count, users: d.uniqueUsers }));
  const earningsChart = data.earningsTrend.map((d: any) => ({ week: fmtDate(d._id), earnings: d.earnings, hours: d.hours }));
  const pieData = data.taskBreakdown.map((t: any) => ({ name: TASK_LABELS[t._id] || t._id, value: t.count, color: TASK_COLORS[t._id] || "#6b7280" }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Platform-wide analytics and earnings overview</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(Object.keys(PERIOD_LABELS) as Period[]).map(k => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${period === k ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {PERIOD_LABELS[k]}
            </button>
          ))}
        </div>
      </div>

      {/* Alert strip */}
      {(data.totals.pendingApproval > 0 || data.totals.pendingTimesheets > 0 || data.totals.pendingPayments > 0) && (
        <div className="flex flex-wrap gap-2">
          {data.totals.pendingApproval > 0 && (
            <Link href="/dashboard/admin/users?filter=pending" className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors">
              <AlertCircle className="h-3.5 w-3.5" /> {data.totals.pendingApproval} user(s) awaiting approval
            </Link>
          )}
          {data.totals.pendingTimesheets > 0 && (
            <Link href="/dashboard/admin/timesheets" className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors">
              <Clock className="h-3.5 w-3.5" /> {data.totals.pendingTimesheets} timesheet(s) to review
            </Link>
          )}
          {data.totals.pendingPayments > 0 && (
            <Link href="/dashboard/admin/payments" className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-green-100 transition-colors">
              <DollarSign className="h-3.5 w-3.5" /> {data.totals.pendingPayments} payment(s) pending
            </Link>
          )}
        </div>
      )}

      {/* Period stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ratings" value={fmt(p.ratings)} sub={PERIOD_LABELS[period]} icon={Zap} color="bg-indigo-500" href="/dashboard/admin/ratings" />
        <StatCard label="Hours Worked" value={p.hours > 0 ? `${p.hours}h` : "—"} sub="from timesheets" icon={Clock} color="bg-emerald-500" href="/dashboard/admin/timesheets" />
        <StatCard label="Earnings Paid" value={p.earnings > 0 ? fmtN(p.earnings) : "—"} sub="approved + paid" icon={DollarSign} color="bg-amber-500" href="/dashboard/admin/payments" />
        <StatCard label="Active Users" value={fmt(p.activeUsers)} sub="submitted ratings" icon={Users} color="bg-blue-500" href="/dashboard/admin/users" />
      </div>

      {/* All-time summary row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Total Raters", value: data.totals.totalUsers, icon: Users, color: "bg-slate-400" },
          { label: "Total Ratings", value: fmt(data.totals.totalRatings), icon: Star, color: "bg-violet-400" },
          { label: "All-time Hours", value: data.byPeriod.allTime.hours > 0 ? `${data.byPeriod.allTime.hours}h` : "—", icon: Clock, color: "bg-teal-400" },
          { label: "All-time Earnings", value: data.byPeriod.allTime.earnings > 0 ? fmtN(data.byPeriod.allTime.earnings) : "—", icon: DollarSign, color: "bg-green-500" },
          { label: "Pending Approval", value: data.totals.pendingApproval, icon: AlertCircle, color: data.totals.pendingApproval > 0 ? "bg-amber-400" : "bg-gray-300" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Daily rating trend */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Ratings — Last 30 Days</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={Math.floor(dailyChart.length / 6) || 1} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<Tooltip2 />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="ratings" name="Ratings" stroke="#6366f1" fill="url(#rg)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Task distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Task Distribution</h2>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                {pieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-1">
            {pieData.map((d: any) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-gray-700">{fmt(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings trend */}
      {earningsChart.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Weekly Earnings Trend (₦)</h2>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={earningsChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<Tooltip2 />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="earnings" name="Earnings (₦)" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="hours" name="Hours" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top earners + top raters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Award className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-gray-700">Top Earners (All Time)</span>
            <Link href="/dashboard/admin/users" className="ml-auto text-xs text-primary">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topEarners.map((u: any, i: number) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs font-bold w-4" style={{ color: PALETTE[i] }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.totalHours}h worked</p>
                </div>
                <span className="text-xs font-bold text-emerald-600">{fmtN(u.totalEarnings)}</span>
              </div>
            ))}
            {data.topEarners.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No earnings recorded yet</p>}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Zap className="h-4 w-4 text-indigo-500" />
            <span className="text-xs font-semibold text-gray-700">Most Active Raters</span>
            <Link href="/dashboard/admin/usage" className="ml-auto text-xs text-primary">Analytics</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {data.topRaters.map((u: any, i: number) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <span className="text-xs font-bold w-4" style={{ color: PALETTE[i] }}>{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <span className="text-xs font-bold text-indigo-600">{fmt(u.count)} ratings</span>
              </div>
            ))}
            {data.topRaters.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No ratings yet</p>}
          </div>
        </div>
      </div>

      {/* Recent ratings */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Recent Ratings</span>
          <Link href="/dashboard/admin/ratings" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-5 py-2.5 font-medium">Rater</th>
                <th className="text-left px-5 py-2.5 font-medium">URL</th>
                <th className="text-left px-5 py-2.5 font-medium">Task</th>
                <th className="text-left px-5 py-2.5 font-medium">Rating</th>
                <th className="text-left px-5 py-2.5 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentRatings.map((r: any) => (
                <tr key={r._id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{r.user?.name}</td>
                  <td className="px-5 py-2.5 max-w-xs">
                    <p className="truncate text-gray-500 font-mono">{r.inputUrl}</p>
                    {r.query && <p className="text-gray-400 truncate">Q: {r.query}</p>}
                  </td>
                  <td className="px-5 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: `${TASK_COLORS[r.taskType]}20`, color: TASK_COLORS[r.taskType] }}>
                      {TASK_LABELS[r.taskType] || r.taskType}
                    </span>
                  </td>
                  <td className="px-5 py-2.5">
                    {r.evaluation?.finalRating && (
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[r.evaluation.finalRating]}`}>
                        {r.evaluation.finalRating}
                      </span>
                    )}
                    {r.evaluation?.needsMetRating && !r.evaluation?.finalRating && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">
                        {r.evaluation.needsMetRating}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-gray-400">{formatDate(r.createdAt)}</td>
                </tr>
              ))}
              {recentRatings.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No ratings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Rater Dashboard ──────────────────────────────────────────────────────────
function RaterDashboard() {
  const { user } = useAuthStore();
  const [recentRatings, setRecentRatings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ratingsApi.getMyRatings(1).then(r => setRecentRatings(r.data.data.slice(0, 5))).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
        <p className="text-gray-500 mt-1">Here&apos;s your rating overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Page Quality", href: "/dashboard/rate?type=page_quality", color: "bg-indigo-500" },
          { label: "Needs Met", href: "/dashboard/rate?type=needs_met", color: "bg-emerald-500" },
          { label: "YouTube", href: "/dashboard/rate?type=youtube", color: "bg-red-500" },
          { label: "Image Rating", href: "/dashboard/rate?type=image", color: "bg-amber-500" },
        ].map(({ label, href, color }) => (
          <Link key={label} href={href} className={`${color} hover:opacity-90 text-white rounded-xl p-5 transition-opacity`}>
            <Star size={20} className="mb-3" />
            <p className="font-semibold text-sm">{label}</p>
            <p className="text-xs opacity-80 mt-0.5">Start rating →</p>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Ratings</h2>
          <Link href="/dashboard/history" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {loading ? (
          <div className="p-6 space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : recentRatings.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <Star size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No ratings yet. Start rating to see results here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {recentRatings.map((r: any) => (
              <div key={r._id} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${TASK_COLORS[r.taskType]}20`, color: TASK_COLORS[r.taskType] }}>
                  {TASK_LABELS[r.taskType] || r.taskType}
                </span>
                <Link href={`/dashboard/history/${r._id}`} className="text-xs text-gray-600 hover:text-primary truncate flex-1">{r.inputUrl}</Link>
                {r.evaluation?.finalRating && (
                  <span className={`text-xs px-2 py-0.5 rounded border font-semibold flex-shrink-0 ${RATING_COLORS[r.evaluation.finalRating]}`}>{r.evaluation.finalRating}</span>
                )}
                <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  if (!user) return null;
  return user.role === "admin" ? <AdminDashboard /> : <RaterDashboard />;
}