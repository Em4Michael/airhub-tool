"use client";
import { useEffect, useState } from "react";
import { paymentApi } from "@/lib/api";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CreditCard } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-800",
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paymentApi.getMine().then((res) => {
      setPayments(res.data.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Payments</h1>
        <p className="text-gray-500 mt-0.5">Your bi-weekly payment history</p>
      </div>

      {totalPaid > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm text-green-600 font-medium">Lifetime Earnings</p>
          <p className="text-3xl font-bold text-green-700 mt-1">{formatCurrency(totalPaid)}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
            <p>No payments yet</p>
            <p className="text-sm mt-1">Submit a timesheet to receive payment</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map((p) => (
              <div key={p._id} className="p-5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">{formatCurrency(p.amount)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[p.status]}`}>
                      {p.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                  </p>
                  {p.timesheet && (
                    <p className="text-xs text-gray-400 mt-0.5">{p.timesheet.hoursWorked}h worked</p>
                  )}
                  {p.paidAt && (
                    <p className="text-xs text-green-600 mt-0.5">Paid on {formatDate(p.paidAt)}</p>
                  )}
                  {p.denialReason && (
                    <p className="text-xs text-red-500 mt-0.5">Denied: {p.denialReason}</p>
                  )}
                </div>
                <div className="text-right text-xs text-gray-400">
                  {formatDate(p.createdAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
