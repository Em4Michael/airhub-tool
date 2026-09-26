"use client";
import { useEffect, useState, useMemo } from "react";
import { adminApi } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  AreaChart, Area, Line,
} from "recharts";
import {
  Users, Clock, Zap, TrendingUp, Award, ChevronRight,
  ArrowLeft, Activity, Target, Filter, Calendar,
} from "lucide-react";

const TASK_LABELS: Record<string, string> = {
  page_quality: "Page Quality",
  needs_met: "Needs Met",
  youtube: "YouTube",
  image: "Image",
  side_by_side: "SxS",
};

const TASK_COLORS: Record<string, string> = {
  page_quality: "#6366f1",
  needs_met: "#10b981",
  youtube: "#ef4444",
  image: "#f59e0b",
  side_by_side: "#3b82f6",
};

const USER_PALETTE = [
  "#6366f1","#10b981","#f59e0b","#ef4444","#3b82f6",
  "#8b5cf6","#06b6d4","#84cc16","#f97316","#ec4899",
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtWeek(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function UsageBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" && p.value % 1 !== 0 ? p.value.toFixed(1) : p.value}</strong>
        </p>
      ))}
    </div>
  );
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminUsagePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userDetail, setUserDetail] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [sortBy, setSortBy] = useState<"totalRatings"|"totalHours"|"ratingsPerDay">("totalRatings");
  const [compareUsers, setCompareUsers] = useState<string[]>([]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.getUsage({ days });
      setData(res.data.data);
    } catch {}
    setLoading(false);
  }

  async function loadUserDetail(userId: string) {
    setLoadingDetail(true);
    try {
      const res = await adminApi.getUserUsage(userId, { days });
      setUserDetail(res.data.data);
    } catch {}
    setLoadingDetail(false);
  }

  useEffect(() => { load(); }, [days]);

  function openUser(user: any) {
    setSelectedUser(user);
    loadUserDetail(user.userId);
  }

  function toggleCompare(userId: string) {
    setCompareUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId].slice(0, 5)
    );
  }

  const comparisonData = useMemo(() => {
    if (!data?.users || compareUsers.length < 2) return [];
    const users = data.users.filter((u: any) => compareUsers.includes(u.userId.toString()));
    return [
      { metric: "Ratings", ...Object.fromEntries(users.map((u: any) => [u.name.split(" ")[0], u.totalRatings])) },
      { metric: "Hours", ...Object.fromEntries(users.map((u: any) => [u.name.split(" ")[0], u.totalHours ?? 0])) },
      { metric: "Rate/day", ...Object.fromEntries(users.map((u: any) => [u.name.split(" ")[0], u.ratingsPerDay])) },
    ];
  }, [data, compareUsers]);

  const sortedUsers = useMemo(() => {
    if (!data?.users) return [];
    return [...data.users].sort((a: any, b: any) => {
      if (sortBy === "totalHours") return (b.totalHours ?? -1) - (a.totalHours ?? -1);
      return b[sortBy] - a[sortBy];
    });
  }, [data, sortBy]);

  const maxRatings = sortedUsers[0]?.totalRatings || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <Activity className="h-8 w-8 text-primary animate-pulse mx-auto" />
          <p className="text-sm text-gray-500">Loading analytics…</p>
        </div>
      </div>
    );
  }

  // ── User Detail View ──────────────────────────────────────────────────────
  if (selectedUser && userDetail) {
    const dailyChart = userDetail.daily.map((d: any) => ({
      date: fmtDate(d._id),
      ratings: d.count,
    }));

    const hourlyChart = Array.from({ length: 24 }, (_, h) => {
      const found = userDetail.hourly.find((x: any) => x._id === h);
      return { hour: `${h}:00`, count: found?.count || 0 };
    });

    const typeChart = userDetail.typeBreakdown.map((t: any) => ({
      name: TASK_LABELS[t._id] || t._id,
      count: t.count,
      color: TASK_COLORS[t._id] || "#6b7280",
    }));

    return (
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setSelectedUser(null); setUserDetail(null); }}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{selectedUser.name}</h1>
            <p className="text-xs text-gray-400">{selectedUser.email} · last {days} days</p>
          </div>
        </div>

        {loadingDetail ? (
          <div className="flex items-center justify-center h-40">
            <Activity className="h-6 w-6 text-primary animate-pulse" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <StatCard label="Total Ratings" value={selectedUser.totalRatings} icon={Zap} color="bg-indigo-500" />
              <StatCard
                label="Hours Submitted"
                value={userDetail.hasTimeData ? `${userDetail.totalHours}h` : "—"}
                sub={userDetail.hasTimeData ? `across ${userDetail.timesheets?.length || 0} timesheet(s)` : "no timesheets submitted"}
                icon={Clock}
                color="bg-emerald-500"
              />
              <StatCard label="Ratings / Day" value={selectedUser.ratingsPerDay} icon={TrendingUp} color="bg-amber-500" />
            </div>

            {/* Weekly timesheet breakdown */}
            {userDetail.timesheets?.length > 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">Weekly Timesheets</span>
                  <span className="text-xs text-gray-400 ml-auto">Hours submitted by user</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {userDetail.timesheets.map((t: any, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-4">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          Week of {fmtWeek(t.periodStart)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {fmtWeek(t.periodStart)} – {fmtWeek(t.periodEnd)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-bold text-gray-900">{t.hoursWorked}h</p>
                        {t.grossAmount && <p className="text-xs text-gray-400">₦{t.grossAmount.toLocaleString()}</p>}
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[t.status] || "bg-gray-100 text-gray-600"}`}>
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Total row */}
                <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Total this period</span>
                  <span className="text-base font-bold text-primary">{userDetail.totalHours}h</span>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 text-center">
                <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No timesheets submitted in this period</p>
                <p className="text-xs text-gray-400 mt-1">Hours appear here once the user submits a weekly timesheet</p>
              </div>
            )}

            {/* Weekly hours chart */}
            {userDetail.timesheets?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Hours by Week</h2>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={userDetail.timesheets.map((t: any) => ({ week: fmtWeek(t.periodStart), hours: t.hoursWorked }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="hours" name="Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Daily rating activity */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Rating Activity</h2>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={dailyChart}>
                  <defs>
                    <linearGradient id="ratGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="ratings" name="Ratings" stroke="#6366f1" fill="url(#ratGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Hourly pattern */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity by Hour of Day</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={hourlyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={3} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="count" name="Ratings" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Task breakdown */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Task Breakdown</h2>
                <div className="space-y-2.5">
                  {typeChart.map((t: any) => (
                    <div key={t.name} className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 w-24 flex-shrink-0">{t.name}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(t.count / (typeChart[0]?.count || 1)) * 100}%`, background: t.color }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.count}</span>
                    </div>
                  ))}
                  {typeChart.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No data</p>}
                </div>
              </div>
            </div>

            {/* Recent ratings */}
            {userDetail.recent?.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
                  <span className="text-sm font-semibold text-gray-700">Recent Ratings</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {userDetail.recent.slice(0, 10).map((r: any, i: number) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: `${TASK_COLORS[r.taskType]}20`, color: TASK_COLORS[r.taskType] }}
                      >
                        {TASK_LABELS[r.taskType] || r.taskType}
                      </span>
                      <span className="text-xs text-gray-600 flex-1 truncate">{r.query || r.inputUrl}</span>
                      <span className="text-xs text-gray-300 flex-shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    );
  }

  if (!data) {
    return <div className="text-sm text-gray-500 p-8 text-center">No data available.</div>;
  }

  const dailyTrendChart = data.dailyTrend.map((d: any) => ({
    date: fmtDate(d._id),
    ratings: d.totalRatings,
    users: d.uniqueUsers,
  }));

  const weeklyHoursChart = (data.weeklyHoursTrend || []).map((w: any) => ({
    week: fmtWeek(w._id),
    hours: w.totalHours,
    users: w.usersCount,
  }));

  const pieData = data.globalTypeBreakdown.map((t: any) => ({
    name: TASK_LABELS[t._id] || t._id,
    value: t.count,
    color: TASK_COLORS[t._id] || "#6b7280",
  }));

  const hourlyChart = Array.from({ length: 24 }, (_, h) => {
    const found = data.hourlyDist.find((x: any) => x._id === h);
    return { hour: `${h}:00`, count: found?.count || 0 };
  });

  const compareUsersData = data.users.filter((u: any) => compareUsers.includes(u.userId.toString()));
  const radarData = ["totalRatings", "totalHours", "ratingsPerDay"].map(key => {
    const metricLabel: Record<string, string> = { totalRatings: "Ratings", totalHours: "Hours", ratingsPerDay: "Rate/day" };
    const vals = compareUsersData.map((u: any) => u[key] ?? 0);
    const maxVal = Math.max(...vals, 1);
    return {
      metric: metricLabel[key],
      ...Object.fromEntries(
        compareUsersData.map((u: any) => [u.name.split(" ")[0], parseFloat((((u[key] ?? 0) / maxVal) * 100).toFixed(1))])
      ),
    };
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usage Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rating counts · weekly submitted hours · performance comparison
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500">Period:</span>
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                days === d ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Ratings"
          value={data.totals.totalRatings.toLocaleString()}
          sub={`last ${days} days`}
          icon={Zap}
          color="bg-indigo-500"
        />
        <StatCard
          label="Total Hours"
          value={data.totals.hasTimeData ? `${data.totals.totalHours}h` : "—"}
          sub={data.totals.hasTimeData ? "from submitted timesheets" : "no timesheets submitted yet"}
          icon={Clock}
          color="bg-emerald-500"
        />
        <StatCard
          label="Active Users"
          value={data.totals.activeUsers}
          sub="with completed ratings"
          icon={Users}
          color="bg-amber-500"
        />
        <StatCard
          label="Avg Ratings/User"
          value={data.totals.avgRatingsPerUser}
          sub="this period"
          icon={TrendingUp}
          color="bg-blue-500"
        />
      </div>

      {/* Daily trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Rating Trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={dailyTrendChart}>
              <defs>
                <linearGradient id="totalGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} interval={Math.floor(dailyTrendChart.length / 7) || 1} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="ratings" name="Total Ratings" stroke="#6366f1" fill="url(#totalGrad)" strokeWidth={2} />
              <Line type="monotone" dataKey="users" name="Active Users" stroke="#10b981" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Task Distribution</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {pieData.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d: any) => (
              <div key={d.name} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                <span className="text-xs font-semibold text-gray-700">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly submitted hours */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-700">Weekly Submitted Hours (all users)</h2>
          <span className="text-xs text-gray-400 ml-auto">From submitted timesheets only</span>
        </div>
        {weeklyHoursChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyHoursChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="hours" name="Total Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-32 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Clock className="h-6 w-6 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No timesheets submitted in this period</p>
            </div>
          </div>
        )}
      </div>

      {/* Hourly heatmap */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity by Hour of Day (all users)</h2>
        <ResponsiveContainer width="100%" height={130}>
          <BarChart data={hourlyChart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="hour" tick={{ fontSize: 9, fill: "#94a3b8" }} interval={1} />
            <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <Tooltip content={<ChartTooltip />} />
            <Bar dataKey="count" name="Ratings" radius={[3, 3, 0, 0]}>
              {hourlyChart.map((_: any, i: number) => {
                const maxCount = Math.max(...hourlyChart.map((h: any) => h.count), 1);
                const intensity = hourlyChart[i].count / maxCount;
                return <Cell key={i} fill={`rgba(99,102,241,${0.15 + intensity * 0.85})`} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Compare */}
      {compareUsers.length >= 2 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">
              Comparing {compareUsers.length} users
              <span className="text-gray-400 font-normal ml-1">(normalised 0–100)</span>
            </h2>
            <button onClick={() => setCompareUsers([])} className="text-xs text-gray-400 hover:text-red-500">Clear</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                {compareUsersData.map((u: any, i: number) => (
                  <Radar key={u.userId} name={u.name.split(" ")[0]} dataKey={u.name.split(" ")[0]}
                    stroke={USER_PALETTE[i]} fill={USER_PALETTE[i]} fillOpacity={0.12} strokeWidth={2} />
                ))}
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={comparisonData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <YAxis type="category" dataKey="metric" tick={{ fontSize: 11, fill: "#64748b" }} width={70} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {compareUsersData.map((u: any, i: number) => (
                  <Bar key={u.userId} dataKey={u.name.split(" ")[0]} fill={USER_PALETTE[i]} radius={[0, 3, 3, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {compareUsers.length === 1 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700">
          Select one more user to compare. You can compare up to 5 users at once.
        </div>
      )}

      {/* Per-user table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-700">User Breakdown</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Sort by:</span>
            {[
              { key: "totalRatings", label: "Ratings" },
              { key: "totalHours", label: "Hours" },
              { key: "ratingsPerDay", label: "Rate/day" },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key as any)}
                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                  sortBy === opt.key ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-gray-50">
          {sortedUsers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">No usage data for this period.</p>
          )}
          {sortedUsers.map((user: any, i: number) => {
            const isCompared = compareUsers.includes(user.userId.toString());
            const taskTypes = Object.entries(user.taskBreakdown || {}) as [string, number][];
            return (
              <div
                key={user.userId}
                className={`px-5 py-4 hover:bg-gray-50 transition-colors ${isCompared ? "bg-indigo-50/40" : ""}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: `${USER_PALETTE[i % USER_PALETTE.length]}20`, color: USER_PALETTE[i % USER_PALETTE.length] }}
                  >
                    {i + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>

                  <div className="hidden sm:grid grid-cols-4 gap-6 text-center">
                    <div>
                      <p className="text-base font-bold text-gray-900">{user.totalRatings}</p>
                      <p className="text-xs text-gray-400">ratings</p>
                      <UsageBar value={user.totalRatings} max={maxRatings} color={USER_PALETTE[i % USER_PALETTE.length]} />
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {user.hasTimeData ? `${user.totalHours}h` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.hasTimeData ? `${user.timesheetCount} week(s)` : "no timesheets"}
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">{user.ratingsPerDay}</p>
                      <p className="text-xs text-gray-400">per day</p>
                    </div>
                    <div>
                      <p className="text-base font-bold text-gray-900">
                        {user.estimatedEarnings != null ? `₦${user.estimatedEarnings.toLocaleString()}` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">est. earnings</p>
                    </div>
                  </div>

                  <div className="hidden lg:flex gap-1 flex-wrap max-w-[180px]">
                    {taskTypes.slice(0, 4).map(([type, count]: [string, number]) => (
                      <span
                        key={type}
                        className="text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{ background: `${TASK_COLORS[type]}20`, color: TASK_COLORS[type] }}
                      >
                        {TASK_LABELS[type]?.replace(" ", "\u00A0")}: {count}
                      </span>
                    ))}
                  </div>

                  <div className="hidden lg:block text-right flex-shrink-0 w-20">
                    <p className="text-xs text-gray-400">
                      {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : "—"}
                    </p>
                    <p className="text-xs text-gray-300">last active</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleCompare(user.userId.toString())}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        isCompared
                          ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                          : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                      }`}
                    >
                      {isCompared ? "✓ Comparing" : "Compare"}
                    </button>
                    <button
                      onClick={() => openUser(user)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium"
                    >
                      Details <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Mobile */}
                <div className="sm:hidden mt-3 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.totalRatings}</p>
                    <p className="text-xs text-gray-400">ratings</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.hasTimeData ? `${user.totalHours}h` : "—"}</p>
                    <p className="text-xs text-gray-400">hours</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{user.ratingsPerDay}</p>
                    <p className="text-xs text-gray-400">per day</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top performers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "Top by Ratings", key: "byRatings", field: "totalRatings", suffix: " ratings", icon: Award, color: "text-indigo-500" },
          { title: "Top by Hours", key: "byHours", field: "totalHours", suffix: "h", icon: Clock, color: "text-emerald-500" },
          { title: "Top by Rate", key: "byRate", field: "ratingsPerDay", suffix: "/day", icon: TrendingUp, color: "text-amber-500" },
        ].map(({ title, key, field, suffix, icon: Icon, color }) => (
          <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-xs font-semibold text-gray-700">{title}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {(data.topPerformers[key] || []).map((u: any, i: number) => (
                <div key={u.userId || i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <span className="text-xs text-gray-700 flex-1 truncate font-medium">{u.name}</span>
                  <span className="text-xs font-bold" style={{ color: USER_PALETTE[i] }}>
                    {u[field] != null ? `${u[field]}${suffix}` : "—"}
                  </span>
                </div>
              ))}
              {!(data.topPerformers[key]?.length) && (
                <p className="text-xs text-gray-400 text-center py-4">No data</p>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}