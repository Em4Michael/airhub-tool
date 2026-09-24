"use client";
import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/api";
import { formatDate, formatCurrency, getErrorMessage } from "@/lib/utils";
import { CreditCard, CheckCircle, XCircle } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [denyId, setDenyId] = useState<string | null>(null);
  const [denyReason, setDenyReason] = useState("");
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await paymentApi.getAll(filter || undefined);
      setPayments(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handlePay = async (id: string) => {
    try {
      await paymentApi.pay(id);
      setMsg("Payment marked as paid.");
      load();
    } catch (err) { setMsg(getErrorMessage(err)); }
  };

  const handleDeny = async (id: string) => {
    try {
      await paymentApi.deny(id, denyReason);
      setMsg("Payment denied.");
      setDenyId(null); setDenyReason("");
      load();
    } catch (err) { setMsg(getErrorMessage(err)); }
  };

  const totalPending = payments.filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 mt-0.5">Process bi-weekly rater payments</p>
        </div>
        {filter === "pending" && totalPending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-right">
            <p className="text-xs text-yellow-600 font-medium">Pending Payout</p>
            <p className="text-xl font-bold text-yellow-800">{formatCurrency(totalPending)}</p>
          </div>
        )}
      </div>

      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
          {msg}
        </div>
      )}

      <div className="flex bg-gray-100 rounded-lg p-1 gap-1 w-fit">
        {["pending", "paid", "denied", ""].map((f) => (
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
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
            <p>No payments found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((p) => (
              <div key={p._id} className="p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-semibold text-gray-900">{p.user?.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status]}`}>
                        {p.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{p.user?.email}</p>
                    <p className="text-sm text-gray-500">
                      Period: {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                    </p>
                    {p.user?.bankAccount && (
                      <p className="text-xs text-gray-500 mt-0.5">Bank: <strong>{p.user.bankAccount}</strong></p>
                    )}
                    {p.timesheet && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.timesheet.hoursWorked}h worked
                      </p>
                    )}
                    {p.paidAt && <p className="text-xs text-green-600 mt-0.5">Paid: {formatDate(p.paidAt)}</p>}
                    {p.denialReason && <p className="text-xs text-red-500 mt-0.5">Reason: {p.denialReason}</p>}
                  </div>

                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(p.amount)}</p>
                    {p.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handlePay(p._id)}
                          className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <CheckCircle size={12} /> Mark Paid
                        </button>
                        <button
                          onClick={() => setDenyId(p._id)}
                          className="flex items-center gap-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium"
                        >
                          <XCircle size={12} /> Deny
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {denyId === p._id && (
                  <div className="mt-3 flex gap-2">
                    <input
                      value={denyReason}
                      onChange={(e) => setDenyReason(e.target.value)}
                      placeholder="Reason for denial (optional)"
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleDeny(p._id)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                    >
                      Confirm Deny
                    </button>
                    <button
                      onClick={() => setDenyId(null)}
                      className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
