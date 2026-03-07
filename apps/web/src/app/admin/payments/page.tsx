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

interface AdminTransaction {
  id: string;
  method: string;
  transactionId: string;
  amount: number;
  senderNumber: string | null;
  receivedAt: string;
  rawMessage: string | null;
  isMatched: boolean;
  matchedPaymentId: string | null;
  notes: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string | null;
    email: string | null;
  };
  matchedPayment?: {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    order: {
      id: string;
      customer: {
        id: string;
        name: string | null;
        phone: string | null;
      };
    };
  };
}

export default function PaymentVerification() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [adminTransactions, setAdminTransactions] = useState<AdminTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "verified" | "failed">("pending");
  const [view, setView] = useState<"payments" | "transactions">("payments");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addingTransaction, setAddingTransaction] = useState(false);
  
  // Form state for adding admin transaction
  const [formData, setFormData] = useState({
    method: "bKash",
    transactionId: "",
    amount: "",
    senderNumber: "",
    receivedAt: new Date().toISOString().slice(0, 16),
    rawMessage: "",
  });

  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN"))) {
      router.push("/dashboard");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user && (user.role === "SUPER_ADMIN" || user.role === "ADMIN")) {
      if (view === "payments") {
        fetchPayments();
      } else {
        fetchAdminTransactions();
      }
    }
  }, [user, filter, view]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
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

  const fetchAdminTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.get<{ transactions: AdminTransaction[] }>("/api/admin/transactions");
      setAdminTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch admin transactions:", error);
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

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.transactionId.trim() || !formData.amount) {
      alert("Transaction ID and amount are required");
      return;
    }

    try {
      setAddingTransaction(true);
      
      const response = await api.post("/api/admin/transactions", {
        method: formData.method,
        transactionId: formData.transactionId.trim(),
        amount: parseFloat(formData.amount),
        senderNumber: formData.senderNumber.trim() || null,
        receivedAt: new Date(formData.receivedAt).toISOString(),
        rawMessage: formData.rawMessage.trim() || null,
      });

      // Show success message with auto-match status
      if (response.autoVerified) {
        alert("✅ Transaction added and payment auto-verified! Order confirmed.");
      } else if (response.matched) {
        alert("⚠️ Transaction added. Matched payment found but amounts differ. Please review manually.");
      } else {
        alert("✅ Transaction added successfully. No matching payment found yet.");
      }

      // Reset form and close modal
      setFormData({
        method: "bKash",
        transactionId: "",
        amount: "",
        senderNumber: "",
        receivedAt: new Date().toISOString().slice(0, 16),
        rawMessage: "",
      });
      setShowAddModal(false);
      
      // Refresh transactions list
      await fetchAdminTransactions();
      
    } catch (error: any) {
      console.error("Failed to add transaction:", error);
      alert(error.message || "Failed to add transaction");
    } finally {
      setAddingTransaction(false);
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

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setView("payments")}
            className={`rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
              view === "payments"
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Customer Payments
          </button>
          <button
            onClick={() => setView("transactions")}
            className={`rounded-lg px-6 py-3 text-sm font-medium transition-colors ${
              view === "transactions"
                ? "bg-brand-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            Admin Transactions
          </button>
        </div>

        {view === "payments" ? (
          <>
            {/* Filter Tabs */}
            <div className="mb-6 flex gap-2">
              {[
                { key: "pending", label: "Pending", count: payments.filter(p => p.status === "PENDING_VERIFICATION").length || 0 },
                { key: "verified", label: "Verified", count: payments.filter(p => p.status === "VERIFIED").length || 0 },
                { key: "failed", label: "Failed", count: payments.filter(p => p.status === "FAILED").length || 0 },
                { key: "all", label: "All", count: payments.length || 0 },
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
          </>
        ) : (
          <>
            {/* Admin Transactions View */}
            <div className="mb-6 flex justify-between items-center">
              <p className="text-sm text-slate-600">
                Record payments received on your mobile device to auto-verify customer orders
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                + Add Transaction
              </button>
            </div>

            {/* Transactions List */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
                </div>
              ) : adminTransactions.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
                  <div className="text-4xl">💳</div>
                  <h3 className="mt-4 text-lg font-semibold text-slate-900">No transactions recorded</h3>
                  <p className="mt-2 text-slate-600">
                    Start recording payments received on your mobile device to enable auto-verification
                  </p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-4 rounded-lg bg-brand-600 px-6 py-2 text-sm font-medium text-white hover:bg-brand-700"
                  >
                    Add First Transaction
                  </button>
                </div>
              ) : (
                adminTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {txn.method}
                          </span>
                          {txn.isMatched ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                              ✓ Matched
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                              ⊗ Unmatched
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-900">৳{txn.amount.toFixed(2)}</p>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                          <p className="text-xs text-slate-500">Transaction ID</p>
                          <p className="font-mono text-sm font-medium text-slate-900">
                            {txn.transactionId}
                          </p>
                        </div>
                        {txn.senderNumber && (
                          <div>
                            <p className="text-xs text-slate-500">Sender Number</p>
                            <p className="font-mono text-sm font-medium text-slate-900">
                              {txn.senderNumber}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-slate-500">Received At</p>
                          <p className="text-sm text-slate-700">
                            {new Date(txn.receivedAt).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Recorded By</p>
                          <p className="text-sm text-slate-700">
                            {txn.admin.name || txn.admin.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Recorded At</p>
                          <p className="text-sm text-slate-700">
                            {new Date(txn.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {txn.rawMessage && (
                        <div>
                          <p className="text-xs text-slate-500">Message</p>
                          <p className="text-sm text-slate-700 font-mono bg-slate-50 p-2 rounded">
                            {txn.rawMessage}
                          </p>
                        </div>
                      )}

                      {txn.notes && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700 font-semibold mb-1">Note:</p>
                          <p className="text-sm text-amber-800">{txn.notes}</p>
                        </div>
                      )}

                      {txn.matchedPayment && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                          <p className="text-xs text-emerald-700 font-semibold mb-2">✓ Matched Payment</p>
                          <div className="grid gap-2 sm:grid-cols-3 text-sm">
                            <div>
                              <p className="text-xs text-emerald-600">Order ID</p>
                              <p className="font-mono text-emerald-900">
                                {txn.matchedPayment.orderId.slice(0, 12)}...
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600">Customer</p>
                              <p className="text-emerald-900">
                                {txn.matchedPayment.order.customer.name || txn.matchedPayment.order.customer.phone}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-emerald-600">Status</p>
                              <p className="text-emerald-900">{txn.matchedPayment.status}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {adminTransactions.length > 0 && (
              <div className="mt-8 text-center text-sm text-slate-500">
                <button
                  onClick={fetchAdminTransactions}
                  className="text-brand-600 hover:text-brand-700"
                >
                  ↻ Refresh
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900">Add Received Payment</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Method <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  required
                >
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Rocket">Rocket</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Transaction ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.transactionId}
                    onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                    placeholder="e.g., 8N6A3B7K2P"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Amount (৳) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Sender Number
                  </label>
                  <input
                    type="text"
                    value={formData.senderNumber}
                    onChange={(e) => setFormData({ ...formData, senderNumber: e.target.value })}
                    placeholder="01XXXXXXXXX"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Received At
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.receivedAt}
                    onChange={(e) => setFormData({ ...formData, receivedAt: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Raw Message (Optional)
                </label>
                <textarea
                  value={formData.rawMessage}
                  onChange={(e) => setFormData({ ...formData, rawMessage: e.target.value })}
                  placeholder="Paste the full SMS/notification message here..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-brand-500 focus:ring-2 focus:ring-brand-200"
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTransaction}
                  className="flex-1 rounded-lg bg-brand-600 px-6 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingTransaction ? "Adding..." : "Add Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
