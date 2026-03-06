"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";

interface Payment {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  mobileReference: string | null;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    status: string;
    customer: {
      name: string | null;
      email: string | null;
      phone: string | null;
    };
  };
  user: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
}

export default function PaymentVerification() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "failed">("pending");

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN")) {
      fetchPayments();
    }
  }, [user, filter]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // For now, we'll just fetch payments - you may want to add a dedicated admin endpoint
      const data = await api.get<{ payments: Payment[] }>("/api/payments");
      
      let filtered = data.payments || [];
      
      // Filter by status
      if (filter === "pending") {
        filtered = filtered.filter((p: Payment) => p.status === "PENDING_VERIFICATION");
      } else if (filter === "verified") {
        filtered = filtered.filter((p: Payment) => p.status === "VERIFIED");
      } else if (filter === "failed") {
        filtered = filtered.filter((p: Payment) => p.status === "FAILED");
      }

      setPayments(filtered);
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (paymentId: string, approve: boolean) => {
    try {
      setVerifying(paymentId);
      
      await api.patch(`/api/payments/${paymentId}`, {
        status: approve ? "VERIFIED" : "FAILED",
        verificationNote: approve ? "Manually verified by admin" : "Rejected by admin",
      });
      await fetchPayments();
      alert(`Payment ${approve ? "approved" : "rejected"} successfully`);
    } catch (error: any) {
      console.error("Failed to verify payment:", error);
      alert(error.message || "Failed to process payment verification");
    } finally {
      setVerifying(null);
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
        <div className="mb-6">
          <Link href="/admin" className="text-sm text-brand-600 hover:text-brand-700">
            ← Back to Admin Dashboard
          </Link>
          <h1 className="mt-2 text-3xl font-bold text-slate-900">Payment Verification</h1>
          <p className="mt-2 text-slate-600">Review and approve manual MFS payment uploads</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          {[
            { key: "pending", label: "Pending", count: payments.filter(p => p.status === "PENDING_VERIFICATION").length },
            { key: "verified", label: "Verified", count: payments.filter(p => p.status === "VERIFIED").length },
            { key: "failed", label: "Failed", count: payments.filter(p => p.status === "FAILED").length },
            { key: "all", label: "All", count: payments.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === tab.key
                  ? "bg-brand-600 text-white"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Payments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
            </div>
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <div className="text-4xl">📭</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">No payments found</h3>
              <p className="mt-2 text-slate-600">
                {filter === "pending"
                  ? "No pending verifications at the moment"
                  : `No ${filter} payments to display`}
              </p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(
                          payment.status
                        )}`}
                      >
                        {payment.status.replace("_", " ")}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {payment.method}
                      </span>
                    </div>
                    
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <p className="text-xs text-slate-500">Amount</p>
                        <p className="font-semibold text-slate-900">৳{payment.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Order ID</p>
                        <p className="font-medium text-slate-700">{payment.orderId.slice(0, 12)}...</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Customer</p>
                        <p className="font-medium text-slate-700">
                          {payment.user?.name || payment.user?.email || payment.user?.phone || "N/A"}
                        </p>
                      </div>
                      {payment.mobileReference && (
                        <div>
                          <p className="text-xs text-slate-500">Reference</p>
                          <p className="font-mono text-sm font-medium text-slate-900">
                            {payment.mobileReference}
                          </p>
                        </div>
                      )}
                      {payment.transactionId && (
                        <div>
                          <p className="text-xs text-slate-500">Transaction ID</p>
                          <p className="font-mono text-sm font-medium text-slate-900">
                            {payment.transactionId}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-slate-500">Created</p>
                        <p className="text-sm text-slate-700">
                          {new Date(payment.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {payment.status === "PENDING_VERIFICATION" && (
                    <div className="flex gap-2 lg:flex-col">
                      <button
                        onClick={() => handleVerify(payment.id, true)}
                        disabled={verifying === payment.id}
                        className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 lg:flex-none"
                      >
                        {verifying === payment.id ? "..." : "✓ Approve"}
                      </button>
                      <button
                        onClick={() => handleVerify(payment.id, false)}
                        disabled={verifying === payment.id}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 lg:flex-none"
                      >
                        {verifying === payment.id ? "..." : "✗ Reject"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Auto-refresh info */}
        {filter === "pending" && payments.length > 0 && (
          <div className="mt-8 text-center text-sm text-slate-500">
            <button
              onClick={fetchPayments}
              className="text-brand-600 hover:text-brand-700"
            >
              ↻ Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case "VERIFIED":
      return "bg-emerald-100 text-emerald-700";
    case "PENDING_VERIFICATION":
      return "bg-amber-100 text-amber-700";
    case "FAILED":
      return "bg-red-100 text-red-700";
    case "INITIATED":
      return "bg-blue-100 text-blue-700";
    case "REFUNDED":
      return "bg-slate-100 text-slate-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
