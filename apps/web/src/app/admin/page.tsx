"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  adminPermissions?: {
    id: string;
    key: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete: boolean;
  }[];
}

interface Stats {
  totalUsers: number;
  activeShops: number;
  pendingPayments: number;
  activeDeliveries: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeShops: 0,
    pendingPayments: 0,
    activeDeliveries: 0,
  });
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showCreateAdminModal, setShowCreateAdminModal] = useState(false);
  const [createAdminForm, setCreateAdminForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "ADMIN",
  });
  const [createAdminLoading, setCreateAdminLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN")) {
      fetchUsers();
      fetchStats();
    }
  }, [user, roleFilter]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const params = new URLSearchParams();
      if (roleFilter) params.append("role", roleFilter);
      if (searchTerm) params.append("search", searchTerm);

      const data = await api.get<{ users: User[] }>(`/api/admin/users?${params.toString()}`);
      setUsers(data.users || []);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch basic stats
      const usersData = await api.get<{ users: User[] }>("/api/admin/users");
      const allUsers = usersData.users || [];

      setStats({
        totalUsers: allUsers.length,
        activeShops: allUsers.filter((u: User) => u.role === "SHOP_OWNER" && u.isActive).length,
        pendingPayments: 0, // Will be populated by payment API
        activeDeliveries: 0, // Will be populated by delivery API
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch<{ user: User }>(`/api/admin/users/${userId}`, {
        role: newRole,
      });
      fetchUsers();
      setEditingUser(null);
    } catch (error: any) {
      console.error("Failed to update role:", error);
      alert(error.message || "Failed to update user role");
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await api.patch<{ user: User }>(`/api/admin/users/${userId}`, {
        isActive: !currentStatus,
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to toggle active status:", error);
      alert(error.message || "Failed to update user status");
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateAdminLoading(true);
    try {
      await api.post("/api/admin/create-admin", createAdminForm);
      setShowCreateAdminModal(false);
      setCreateAdminForm({ name: "", email: "", password: "", role: "ADMIN" });
      fetchUsers();
    } catch (error: any) {
      alert(error.message || "Failed to create admin account");
    } finally {
      setCreateAdminLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {user.role === "SUPER_ADMIN" ? "SuperAdmin" : "Admin"} Dashboard
          </h1>
          <p className="mt-2 text-slate-600">Manage users, permissions, payments, and operations</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Users" value={stats.totalUsers} color="text-brand-700" icon="👥" />
          <StatCard label="Active Shops" value={stats.activeShops} color="text-emerald-700" icon="🏪" />
          <Link href="/admin/payments">
            <StatCard label="Pending Payments" value={stats.pendingPayments} color="text-amber-700" icon="💳" />
          </Link>
          <StatCard label="Active Deliveries" value={stats.activeDeliveries} color="text-indigo-700" icon="🚚" />
        </div>

        {/* Quick Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Link href="/admin/payments">
            <ActionCard
              title="Payment Verification"
              description="Review and approve manual MFS payment uploads"
              icon="✅"
            />
          </Link>
          <Link href="/admin/deliveries">
            <ActionCard
              title="Live Tracking"
              description="Monitor real-time delivery locations and status"
              icon="📍"
            />
          </Link>
          <ActionCard
            title="User Management"
            description="Manage user roles and permissions below"
            icon="🔑"
            onClick={() => document.getElementById("user-table")?.scrollIntoView({ behavior: "smooth" })}
          />
        </div>

        {/* User Management Section */}
        <div id="user-table" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">User Management</h2>
            <div className="flex gap-2">
              {user.role === "SUPER_ADMIN" && (
                <button
                  onClick={() => setShowCreateAdminModal(true)}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  + Create Admin
                </button>
              )}
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
                >
                  Search
                </button>
              </form>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">SuperAdmin</option>
                <option value="ADMIN">Admin</option>
                <option value="SHOP_OWNER">Shop Owner</option>
                <option value="DELIVERY_MAN">Delivery Man</option>
                <option value="CUSTOMER">Customer</option>
              </select>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Role</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Permissions</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-900">{u.name || "N/A"}</div>
                          <div className="text-xs text-slate-500">ID: {u.id.slice(0, 8)}...</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="text-slate-700">{u.email || "N/A"}</div>
                        <div className="text-slate-500">{u.phone || "N/A"}</div>
                      </td>
                      <td className="px-4 py-3">
                        {editingUser?.id === u.id && user.role === "SUPER_ADMIN" ? (
                          <select
                            value={editingUser.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            className="rounded border border-slate-300 px-2 py-1 text-sm"
                            onBlur={() => setEditingUser(null)}
                          >
                            <option value="CUSTOMER">Customer</option>
                            <option value="DELIVERY_MAN">Delivery Man</option>
                            <option value="SHOP_OWNER">Shop Owner</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">SuperAdmin</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                              u.role
                            )} ${user.role === "SUPER_ADMIN" ? "cursor-pointer" : ""}`}
                            onClick={() => user.role === "SUPER_ADMIN" && setEditingUser(u)}
                          >
                            {u.role.replace("_", " ")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(u.id, u.isActive)}
                          disabled={u.id === user.id}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            u.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-red-100 text-red-700"
                          } ${u.id === user.id ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:opacity-80"}`}
                        >
                          {u.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {u.adminPermissions && u.adminPermissions.length > 0 ? (
                          <Link
                            href={`/admin/permissions/${u.id}`}
                            className="text-brand-600 hover:text-brand-700"
                          >
                            {u.adminPermissions.length} permission{u.adminPermissions.length !== 1 ? "s" : ""}
                          </Link>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/permissions/${u.id}`}
                            className="text-xs text-brand-600 hover:text-brand-700"
                          >
                            Permissions
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Admin Modal */}
      {showCreateAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Create Staff Account</h3>
              <button
                onClick={() => setShowCreateAdminModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Full Name</label>
                <input
                  type="text"
                  required
                  value={createAdminForm.name}
                  onChange={(e) => setCreateAdminForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Email Address</label>
                <input
                  type="email"
                  required
                  value={createAdminForm.email}
                  onChange={(e) => setCreateAdminForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="admin@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={createAdminForm.password}
                  onChange={(e) => setCreateAdminForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
                <select
                  value={createAdminForm.role}
                  onChange={(e) => setCreateAdminForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                >
                  <option value="ADMIN">Admin</option>
                  <option value="SHOP_OWNER">Shop Owner</option>
                  <option value="DELIVERY_MAN">Delivery Man</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateAdminModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 py-2.5 text-sm font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdminLoading}
                  className="flex-1 rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {createAdminLoading ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 text-2xl">{icon}</div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </motion.div>
  );
}

function ActionCard({
  title,
  description,
  icon,
  onClick,
}: {
  title: string;
  description: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-2 text-2xl">{icon}</div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}

function getRoleBadgeColor(role: string): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "bg-purple-100 text-purple-700";
    case "ADMIN":
      return "bg-indigo-100 text-indigo-700";
    case "SHOP_OWNER":
      return "bg-blue-100 text-blue-700";
    case "DELIVERY_MAN":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
