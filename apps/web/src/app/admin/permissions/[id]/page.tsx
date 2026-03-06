"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Permission {
  id: string;
  key: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
}

const COMMON_PERMISSION_KEYS = [
  "users",
  "products",
  "orders",
  "payments",
  "deliveries",
  "notifications",
  "analytics",
  "settings",
];

export default function PermissionManagement() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id as string;
  const { user: currentUser, isLoading } = useAuth();
  
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPermission, setNewPermission] = useState({
    key: "",
    canRead: false,
    canWrite: false,
    canDelete: false,
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!isLoading && (!currentUser || currentUser.role !== "SUPER_ADMIN")) {
      router.push("/dashboard");
    }
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (currentUser?.role === "SUPER_ADMIN" && userId) {
      fetchUserAndPermissions();
    }
  }, [currentUser, userId]);

  const fetchUserAndPermissions = async () => {
    try {
      setLoading(true);
      
      // Fetch user details
      const userData = await api.get<{ user: User }>(`/api/admin/users/${userId}`);
      setUser(userData.user);

      // Fetch permissions
      const permData = await api.get<{ permissions: Permission[] }>(`/api/admin/permissions?userId=${userId}`);
      setPermissions(permData.permissions || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPermission = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPermission.key) {
      alert("Please enter a permission key");
      return;
    }

    try {
      await api.post("/api/admin/permissions", {
        userId,
        ...newPermission,
      });
      await fetchUserAndPermissions();
      setNewPermission({ key: "", canRead: false, canWrite: false, canDelete: false });
      setShowAddForm(false);
    } catch (error: any) {
      console.error("Failed to add permission:", error);
      alert(error.message || "Failed to create permission");
    }
  };

  const handleUpdatePermission = async (
    permissionId: string,
    field: "canRead" | "canWrite" | "canDelete",
    value: boolean
  ) => {
    try {
      await api.patch(`/api/admin/permissions/${permissionId}`, {
        [field]: value,
      });
      await fetchUserAndPermissions();
    } catch (error: any) {
      console.error("Failed to update permission:", error);
      alert(error.message || "Failed to update permission");
    }
  };

  const handleDeletePermission = async (permissionId: string) => {
    if (!confirm("Are you sure you want to delete this permission?")) {
      return;
    }

    try {
      await api.delete(`/api/admin/permissions/${permissionId}`);
      await fetchUserAndPermissions();
    } catch (error: any) {
      console.error("Failed to delete permission:", error);
      alert(error.message || "Failed to delete permission");
    }
  };

  if (isLoading || loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Manage Permissions</h1>
          {user && (
            <div className="mt-2 text-slate-600">
              <p>
                User: <span className="font-medium">{user.name || user.email}</span>
              </p>
              <p>
                Role: <span className="font-medium">{user.role.replace("_", " ")}</span>
              </p>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Permissions</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              {showAddForm ? "Cancel" : "+ Add Permission"}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddPermission} className="mb-6 rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-4 font-semibold text-slate-900">New Permission</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Permission Key</label>
                  <input
                    type="text"
                    list="common-keys"
                    value={newPermission.key}
                    onChange={(e) => setNewPermission({ ...newPermission, key: e.target.value })}
                    placeholder="e.g., users, orders, products"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    required
                  />
                  <datalist id="common-keys">
                    {COMMON_PERMISSION_KEYS.map((key) => (
                      <option key={key} value={key} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Access Rights</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPermission.canRead}
                        onChange={(e) => setNewPermission({ ...newPermission, canRead: e.target.checked })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">Read</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPermission.canWrite}
                        onChange={(e) => setNewPermission({ ...newPermission, canWrite: e.target.checked })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">Write</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newPermission.canDelete}
                        onChange={(e) => setNewPermission({ ...newPermission, canDelete: e.target.checked })}
                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-slate-700">Delete</span>
                    </label>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                className="mt-4 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Create Permission
              </button>
            </form>
          )}

          {permissions.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              No permissions configured. Click "Add Permission" to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">Key</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Read</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Write</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Delete</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Created</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {permissions.map((perm) => (
                    <tr key={perm.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{perm.key}</td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canRead}
                          onChange={(e) => handleUpdatePermission(perm.id, "canRead", e.target.checked)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canWrite}
                          onChange={(e) => handleUpdatePermission(perm.id, "canWrite", e.target.checked)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={perm.canDelete}
                          onChange={(e) => handleUpdatePermission(perm.id, "canDelete", e.target.checked)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-slate-500">
                        {new Date(perm.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleDeletePermission(perm.id)}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Delete
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
    </div>
  );
}
