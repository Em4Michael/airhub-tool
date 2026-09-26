"use client";
import { useEffect, useState, useCallback } from "react";
import { adminApi } from "@/lib/api";
import { formatDate, getErrorMessage } from "@/lib/utils";
import {
  CheckCircle, XCircle, UserX, User, Search, ArrowLeft,
  Clock, DollarSign, Zap, TrendingUp, Calendar, ChevronRight,
  Activity, BarChart2, Shield, ShieldOff,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";

const TASK_COLORS: Record<string, string> = {
  page_quality: "#6366f1", needs_met: "#10b981",
  youtube: "#ef4444", image: "#f59e0b", side_by_side: "#3b82f6",
};
const TASK_LABELS: Record<string, string> = {
  page_quality: "Page Quality", needs_met: "Needs Met",
  youtube: "YouTube", image: "Image", side_by_side: "SxS",
};

type Period = "week" | "biweekly" | "month" | "allTime";
const PERIOD_LABELS: Record<Period, string> = {
  week: "This Week", biweekly: "Bi-Weekly", month: "Monthly", allTime: "All Time",
};
const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  paid: "bg-blue-100 text-blue-700",
  rejected: "bg-red-100 text-red-700",
};

function fmtN(n: number) { return `₦${(n || 0).toLocaleString()}`; }
function fmtDate(d: string) { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function StatCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-4 w-4 text-white" />
      </div>
      <div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function ChartTip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs space-y-1">
      <p className="font-semibold text-gray-700">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></p>
      ))}
    </div>
  );
}

// ─── User Detail Panel ────────────────────────────────────────────────────────
function UserDetail({ userId, onBack, onAction }: { userId: string; onBack: () => void; onAction: () => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [editForm, setEditForm] = useState({ hourlyRate: "", bankAccount: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showEdit, setShowEdit] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUserStats(userId);
      const d = res.data.data;
      setData(d);
      setEditForm({ hourlyRate: d.user.hourlyRate || 2000, bankAccount: d.user.bankAccount || "", phone: d.user.phone || "" });
    } catch {} finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async () => {
    try { await adminApi.approveUser(userId); await load(); onAction(); } catch {}
  };
  const handleRevoke = async () => {
    try { await adminApi.revokeUser(userId); await load(); onAction(); } catch {}
  };
  const handleToggle = async () => {
    try { await adminApi.toggleActive(userId); await load(); onAction(); } catch {}
  };
  const handleSave = async () => {
    setSaving(true); setMsg("");
    try {
      await adminApi.updateUserProfile(userId, {
        hourlyRate: parseFloat(editForm.hourlyRate),
        bankAccount: editForm.bankAccount,
        phone: editForm.phone,
      });
      setMsg("Saved!");
      await load();
    } catch (err) { setMsg(getErrorMessage(err)); }
    setSaving(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Activity className="h-6 w-6 text-primary animate-pulse" />
    </div>
  );
  if (!data) return null;

  const { user, byPeriod, dailyActivity, taskBreakdown, timesheets, recentRatings } = data;
  const p = byPeriod[period];
  const dailyChart = dailyActivity.map((d: any) => ({ date: fmtDate(d._id), ratings: d.count }));
  const tsChart = timesheets.slice(0, 8).reverse().map((t: any) => ({
    week: fmtDate(t.periodStart), hours: t.hoursWorked, earnings: t.grossAmount || 0,
  }));

  return (
    <div className="space-y-6">
      {/* Back + identity */}
      <div className="flex items-start gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 transition-all flex-shrink-0">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
              {user.name?.[0]}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
              <p className="text-xs text-gray-400">{user.email} · Joined {formatDate(user.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 ml-auto flex-wrap">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${user.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {user.isApproved ? "Approved" : "Pending"}
              </span>
              {!user.isActive && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-red-100 text-red-700">Deactivated</span>}
              <span className="text-xs text-gray-500">₦{user.hourlyRate}/hr</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {!user.isApproved ? (
          <button onClick={handleApprove} className="flex items-center gap-1.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
            <CheckCircle className="h-3.5 w-3.5" /> Approve Access
          </button>
        ) : (
          <button onClick={handleRevoke} className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
            <XCircle className="h-3.5 w-3.5" /> Revoke Access
          </button>
        )}
        <button onClick={handleToggle}
          className={`flex items-center gap-1.5 border px-3 py-2 rounded-lg text-xs font-medium transition-colors ${user.isActive ? "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"}`}>
          {user.isActive ? <><ShieldOff className="h-3.5 w-3.5" /> Deactivate</> : <><Shield className="h-3.5 w-3.5" /> Activate</>}
        </button>
        <button onClick={() => setShowEdit(v => !v)}
          className="flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-2 rounded-lg text-xs font-medium transition-colors">
          <BarChart2 className="h-3.5 w-3.5" /> {showEdit ? "Hide" : "Edit Profile"}
        </button>
      </div>

      {/* Edit profile inline */}
      {showEdit && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-gray-700">Edit Profile</p>
          {msg && <p className={`text-xs p-2 rounded-lg ${msg === "Saved!" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{msg}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { key: "hourlyRate", label: "Hourly Rate (₦)", type: "number" },
              { key: "bankAccount", label: "Bank Account", type: "text" },
              { key: "phone", label: "Phone", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type={type} value={editForm[key as keyof typeof editForm]}
                  onChange={e => setEditForm({ ...editForm, [key]: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary hover:bg-green-700 text-white text-xs font-medium px-4 py-2 rounded-lg disabled:opacity-60 transition-colors">
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}

      {/* Period selector */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {(Object.keys(PERIOD_LABELS) as Period[]).map(k => (
          <button key={k} onClick={() => setPeriod(k)}
            className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${period === k ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
            {PERIOD_LABELS[k]}
          </button>
        ))}
      </div>

      {/* Period stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Ratings" value={p.ratings} sub={PERIOD_LABELS[period]} icon={Zap} color="bg-indigo-500" />
        <StatCard label="Hours" value={p.hours > 0 ? `${p.hours}h` : "—"} sub={p.timesheets > 0 ? `${p.timesheets} timesheet(s)` : "no timesheets"} icon={Clock} color="bg-emerald-500" />
        <StatCard label="Earnings" value={p.earnings > 0 ? fmtN(p.earnings) : "—"} sub="approved + paid" icon={DollarSign} color="bg-amber-500" />
        <StatCard label="Rate/Day" value={p.ratings > 0 ? (p.ratings / (period === "week" ? 7 : period === "biweekly" ? 14 : period === "month" ? 30 : 365)).toFixed(1) : "—"} icon={TrendingUp} color="bg-blue-500" />
      </div>

      {/* Daily activity chart */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Rating Activity (Last 30 Days)</h2>
        {dailyChart.length > 0 ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyChart}>
              <defs>
                <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
              <Tooltip content={<ChartTip />} />
              <Area type="monotone" dataKey="ratings" name="Ratings" stroke="#6366f1" fill="url(#ag)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <p className="text-xs text-gray-400 text-center py-8">No rating activity in last 30 days</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Timesheet history chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Hours per Week</h2>
          {tsChart.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={tsChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="week" tick={{ fontSize: 9, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} />
                <Tooltip content={<ChartTip />} />
                <Bar dataKey="hours" name="Hours" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-gray-400 text-center py-10">No timesheets submitted</p>}
        </div>

        {/* Task breakdown */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Task Breakdown (All Time)</h2>
          <div className="space-y-2.5">
            {taskBreakdown.map((t: any) => (
              <div key={t._id} className="flex items-center gap-3">
                <span className="text-xs text-gray-600 w-24 flex-shrink-0">{TASK_LABELS[t._id] || t._id}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${(t.count / (taskBreakdown[0]?.count || 1)) * 100}%`, background: TASK_COLORS[t._id] || "#6b7280" }} />
                </div>
                <span className="text-xs font-semibold text-gray-700 w-8 text-right">{t.count}</span>
              </div>
            ))}
            {taskBreakdown.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Timesheet list */}
      {timesheets.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-700">Timesheet History</span>
          </div>
          <div className="divide-y divide-gray-50">
            {timesheets.map((t: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">Week of {fmtDate(t.periodStart)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(t.periodStart)} – {fmtDate(t.periodEnd)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{t.hoursWorked}h</p>
                  {t.grossAmount > 0 && <p className="text-xs text-emerald-600 font-medium">{fmtN(t.grossAmount)}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLE[t.status] || "bg-gray-100 text-gray-600"}`}>
                  {t.status}
                </span>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">Total all time</span>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-gray-900">{byPeriod.allTime.hours}h</span>
              {byPeriod.allTime.earnings > 0 && <span className="text-sm font-bold text-emerald-600">{fmtN(byPeriod.allTime.earnings)}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Recent ratings */}
      {recentRatings.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <span className="text-sm font-semibold text-gray-700">Recent Ratings</span>
          </div>
          <div className="divide-y divide-gray-50">
            {recentRatings.map((r: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center gap-3">
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${TASK_COLORS[r.taskType]}20`, color: TASK_COLORS[r.taskType] }}>
                  {TASK_LABELS[r.taskType] || r.taskType}
                </span>
                <span className="text-xs text-gray-600 flex-1 truncate font-mono">{r.query || r.inputUrl}</span>
                <span className="text-xs text-gray-300 flex-shrink-0">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Users List ────────────────────────────────────────────────────────────────
export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "pending") params.approved = false;
      if (filter === "approved") params.approved = true;
      const res = await adminApi.getUsers(params);
      setUsers(res.data.data);
    } catch {} finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  if (selectedUserId) {
    return (
      <UserDetail
        userId={selectedUserId}
        onBack={() => setSelectedUserId(null)}
        onAction={load}
      />
    );
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-0.5">Approve, configure, and view individual user analytics</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {["all", "pending", "approved"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${filter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex-1 relative max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400"><p>No users found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">User</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Rate</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Joined</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Actions</th>
                  <th className="text-left px-5 py-3 font-semibold uppercase tracking-wide">Details</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {u.name?.[0]}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${u.isApproved ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                          {u.isApproved ? "Approved" : "Pending"}
                        </span>
                        {!u.isActive && <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit bg-red-100 text-red-700">Deactivated</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600 font-medium">₦{u.hourlyRate}/hr</td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex gap-1.5 flex-wrap">
                        {!u.isApproved ? (
                          <button onClick={() => adminApi.approveUser(u._id).then(load)}
                            className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded text-xs font-medium">
                            <CheckCircle size={11} /> Approve
                          </button>
                        ) : (
                          <button onClick={() => adminApi.revokeUser(u._id).then(load)}
                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded text-xs font-medium">
                            <XCircle size={11} /> Revoke
                          </button>
                        )}
                        <button onClick={() => adminApi.toggleActive(u._id).then(load)}
                          className={`flex items-center gap-1 border px-2 py-1 rounded text-xs font-medium ${u.isActive ? "bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200" : "bg-green-50 hover:bg-green-100 text-green-700 border-green-200"}`}>
                          {u.isActive ? <><UserX size={11} /> Deactivate</> : <><User size={11} /> Activate</>}
                        </button>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setSelectedUserId(u._id)}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium">
                        View Details <ChevronRight className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}