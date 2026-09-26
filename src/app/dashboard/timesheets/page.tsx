"use client";
import { useEffect, useState } from "react";
import { timesheetApi } from "@/lib/api";
import { formatCurrency, formatDate, getErrorMessage } from "@/lib/utils";
import { Clock, CheckCircle, XCircle, AlertCircle, Plus } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  rejected: "bg-red-100 text-red-800",
  paid: "bg-green-100 text-green-800",
};

export default function TimesheetsPage() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await timesheetApi.getMine();
      setTimesheets(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSuccess("");
    setSubmitting(true);
    try {
      await timesheetApi.submit({ hoursWorked: parseFloat(hours), userNotes: notes });
      setSuccess("Timesheet submitted successfully! Awaiting admin approval.");
      setShowForm(false); setHours(""); setNotes("");
      load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Timesheets</h1>
          <p className="text-gray-500 mt-0.5">Submit and track your work hours</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-primary hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Submit Hours
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm flex items-center gap-2">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">Submit This Week&apos;s Hours</h2>
          <p className="text-sm text-gray-500">Current period: Sunday to Saturday. Submit once per period.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
            <input
              type="number"
              required
              min="0.5"
              max="168"
              step="0.5"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              placeholder="e.g. 40"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
              placeholder="Any additional notes..."
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="bg-primary hover:bg-green-700 text-white font-medium px-5 py-2 rounded-lg text-sm disabled:opacity-60 transition-colors"
            >
              {submitting ? "Submitting..." : "Submit Timesheet"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-gray-300 text-gray-600 px-5 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Submission History</h2>
        </div>
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : timesheets.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <Clock size={32} className="mx-auto mb-2 opacity-30" />
            <p>No timesheets submitted yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {timesheets.map((ts) => (
              <div key={ts._id} className="p-5 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{ts.hoursWorked} hours</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[ts.status]}`}>
                      {ts.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(ts.periodStart)} – {formatDate(ts.periodEnd)}
                  </p>
                  {ts.adminNotes && (
                    <p className="text-xs text-gray-400 mt-1">Admin note: {ts.adminNotes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatCurrency(ts.grossAmount)}</p>
                  <p className="text-xs text-gray-400">@ ₦{ts.hourlyRate}/hr</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
