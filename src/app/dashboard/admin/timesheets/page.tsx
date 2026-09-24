"use client";
import { useEffect, useState } from "react";
import { timesheetApi } from "@/lib/api";
import { formatDate, formatCurrency, getErrorMessage } from "@/lib/utils";
import { CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
};

export default function AdminTimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await timesheetApi.getAll(filter || undefined);
      setTimesheets(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id: string) => {
    try {
      await timesheetApi.approve(id, notes);
      setMsg("Approved successfully.");
      setActionId(null); setNotes("");
      load();
    } catch (err) { setMsg(getErrorMessage(err)); }
  };

  const handleReject = async (id: string) => {
    try {
      await timesheetApi.reject(id, notes);
      setMsg("Rejected.");
      setActionId(null); setNotes("");
      load();
    } catch (err) { setMsg(getErrorMessage(err)); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timesheet Approvals</h1>
        <p className="text-gray-500 mt-0.5">Review and approve rater time submissions</p>
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {msg}
        </div>
      )}

      <div className="flex bg-gray-100 rounded-lg p-1 gap-1 w-fit">
        {["pending", "approved", "rejected", "paid", ""].map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setMsg(""); }}
            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
              filter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f || "All"}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : timesheets.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>No timesheets found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {timesheets.map((ts) => (
              <div key={ts._id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{ts.user?.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[ts.status]}`}>
                        {ts.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{ts.user?.email}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Period: {formatDate(ts.periodStart)} – {formatDate(ts.periodEnd)}
                    </p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-gray-700"><strong>{ts.hoursWorked}h</strong> worked</span>
                      <span className="text-gray-700">@ ₦{ts.hourlyRate}/hr</span>
                      <span className="font-semibold text-green-700">{formatCurrency(ts.grossAmount)}</span>
                    </div>
                    {ts.userNotes && (
                      <p className="text-xs text-gray-400 mt-1">Note: {ts.userNotes}</p>
                    )}
                    {ts.user?.bankAccount && (
                      <p className="text-xs text-gray-500 mt-1">Bank: {ts.user.bankAccount}</p>
                    )}
                  </div>

                  {ts.status === "pending" && (
                    <div className="flex flex-col gap-2">
                      {actionId === ts._id ? (
                        <div className="space-y-2">
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Admin notes (optional)"
                            rows={2}
                            className="w-48 border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleApprove(ts._id)}
                              className="flex-1 flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(ts._id)}
                              className="flex-1 flex items-center justify-center gap-1 bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                            >
                              <XCircle size={12} /> Reject
                            </button>
                          </div>
                          <button
                            onClick={() => setActionId(null)}
                            className="text-xs text-gray-400 hover:text-gray-600 text-center w-full"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setActionId(ts._id); setNotes(""); }}
                          className="bg-primary hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
