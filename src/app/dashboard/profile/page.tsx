"use client";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { getErrorMessage, formatCurrency } from "@/lib/utils";
import { User, Phone, CreditCard, Save } from "lucide-react";

export default function ProfilePage() {
  const { user, setAuth, token } = useAuthStore();
  const [form, setForm] = useState({
    phone: user?.phone || "",
    bankAccount: user?.bankAccount || "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg(""); setError("");
    try {
      const res = await api.patch("/users/profile", form);
      if (user && token) {
        setAuth({ ...user, ...res.data.data }, token);
      }
      setMsg("Profile updated successfully!");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-0.5">Manage your account information</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-primary text-2xl font-bold">{user.name[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">{user.email}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${
              user.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
            }`}>
              {user.role}
            </span>
          </div>
        </div>

        {/* Stats */}
        {user.role === "rater" && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Hourly Rate</p>
              <p className="text-lg font-bold text-gray-900">₦{(user as any).hourlyRate || 2000}/hr</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-1">Lifetime Earnings</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency((user as any).totalEarnings || 0)}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {msg && (
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-3 text-sm">
              {msg}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={14} className="inline mr-1" /> Phone Number
            </label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+234 XXX XXX XXXX"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <CreditCard size={14} className="inline mr-1" /> Bank Account Number
            </label>
            <input
              type="text"
              value={form.bankAccount}
              onChange={(e) => setForm({ ...form, bankAccount: e.target.value })}
              placeholder="10-digit account number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-gray-400 mt-1">
              Required for receiving payments. Contact admin if you need to update your bank.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-green-700 text-white font-medium px-5 py-2.5 rounded-lg text-sm disabled:opacity-60 transition-colors"
          >
            <Save size={15} />
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Account Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Email</span>
            <span className="text-gray-900 font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">Account Status</span>
            <span className={`font-medium ${(user as any).isApproved ? "text-green-600" : "text-yellow-600"}`}>
              {(user as any).isApproved ? "Approved" : "Pending Approval"}
            </span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Role</span>
            <span className="text-gray-900 font-medium capitalize">{user.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
