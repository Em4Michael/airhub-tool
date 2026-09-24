"use client";
import { useEffect, useState } from "react";
import { adminApi } from "@/lib/api";
import { formatDate, formatCurrency, getErrorMessage } from "@/lib/utils";
import { CheckCircle, XCircle, UserX, User, Search } from "lucide-react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | pending | approved
  const [search, setSearch] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [editForm, setEditForm] = useState({ hourlyRate: "", bankAccount: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filter === "pending") params.approved = false;
      if (filter === "approved") params.approved = true;
      const res = await adminApi.getUsers(params);
      setUsers(res.data.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id: string) => {
    try { await adminApi.approveUser(id); load(); } catch {}
  };
  const handleRevoke = async (id: string) => {
    try { await adminApi.revokeUser(id); load(); } catch {}
  };
  const handleToggle = async (id: string) => {
    try { await adminApi.toggleActive(id); load(); } catch {}
  };

  const openEdit = (user: any) => {
    setEditUser(user);
    setEditForm({ hourlyRate: user.hourlyRate || 2000, bankAccount: user.bankAccount || "", phone: user.phone || "" });
    setMsg("");
  };

  const handleSaveProfile = async () => {
    setSaving(true); setMsg("");
    try {
      await adminApi.updateUserProfile(editUser._id, {
        hourlyRate: parseFloat(editForm.hourlyRate),
        bankAccount: editForm.bankAccount,
        phone: editForm.phone,
      });
      setMsg("Profile saved!");
      load();
    } catch (err) {
      setMsg(getErrorMessage(err));
    }
    setSaving(false);
  };

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-500 mt-0.5">Approve, configure, and manage rater accounts</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
          {["all", "pending", "approved"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                filter === f ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex-1 relative max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400"><p>No users found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500">
                  <th className="text-left px-5 py-3 font-medium">User</th>
                  <th className="text-left px-5 py-3 font-medium">Status</th>
                  <th className="text-left px-5 py-3 font-medium">Rate</th>
                  <th className="text-left px-5 py-3 font-medium">Joined</th>
                  <th className="text-left px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u._id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 font-medium">
                          {u.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium w-fit ${u.isApproved ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                          {u.isApproved ? "Approved" : "Pending"}
                        </span>
                        {!u.isActive && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium w-fit bg-red-100 text-red-700">
                            Deactivated
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-600">₦{u.hourlyRate}/hr</td>
                    <td className="px-5 py-3 text-gray-500">{formatDate(u.createdAt)}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {!u.isApproved ? (
                          <button
                            onClick={() => handleApprove(u._id)}
                            className="flex items-center gap-1 bg-green-50 hover:bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-medium"
                          >
                            <CheckCircle size={12} /> Approve
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(u._id)}
                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-medium"
                          >
                            <XCircle size={12} /> Revoke
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(u)}
                          className="bg-blue-50 hover:bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => handleToggle(u._id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${u.isActive ? "bg-gray-100 hover:bg-gray-200 text-gray-700" : "bg-green-50 hover:bg-green-100 text-green-700"}`}
                        >
                          {u.isActive ? <UserX size={12} /> : <User size={12} />}
                          {u.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Edit Profile: {editUser.name}</h3>

            {msg && (
              <div className={`text-sm p-3 rounded-lg ${msg.includes("saved") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {msg}
              </div>
            )}

            {[
              { key: "hourlyRate", label: "Hourly Rate (₦)", type: "number" },
              { key: "bankAccount", label: "Bank Account Number", type: "text" },
              { key: "phone", label: "Phone Number", type: "text" },
            ].map(({ key, label, type }) => (
              <div key={key}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  type={type}
                  value={editForm[key as keyof typeof editForm]}
                  onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex-1 bg-primary hover:bg-green-700 text-white font-medium py-2 rounded-lg text-sm disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                onClick={() => setEditUser(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
