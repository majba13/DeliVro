"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";

interface Order {
  id: string;
  total: number;
  deliveryAddress: {
    street: string;
    city: string;
    zip: string;
  };
}

interface Payment {
  id: string;
  orderId: string;
  method: string;
  amount: number;
  status: string;
  transactionId?: string;
}

const MERCHANT_NUMBERS = {
  bKash: "01752962104",
  Nagad: "01752962104",
  Rocket: "01752962104",
};

const PAYMENT_INSTRUCTIONS = {
  bKash: [
    "Open your bKash app",
    'Tap on "Send Money"',
    "Enter merchant number: 01752962104",
    "Enter the exact amount shown below",
    "Enter your bKash PIN and confirm",
    'You will receive a confirmation message with Transaction ID (e.g., "8N6A3B7K2P")',
    "Copy the Transaction ID and paste it in the form below",
  ],
  Nagad: [
    "Open your Nagad app",
    'Tap on "Send Money"',
    "Enter merchant number: 01752962104",
    "Enter the exact amount shown below",
    "Enter your Nagad PIN and confirm",
    "You will receive a confirmation SMS with Transaction ID",
    "Copy the Transaction ID and paste it in the form below",
  ],
  Rocket: [
    "Dial *322# from your mobile",
    "Select Send Money",
    "Enter merchant number: 01752962104",
    "Enter the exact amount shown below",
    "Enter your Rocket PIN and confirm",
    "You will receive a confirmation SMS with Transaction ID",
    "Copy the Transaction ID and paste it in the form below",
  ],
};

export default function PaymentPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const method = searchParams.get("method") || "bKash";

  const [order, setOrder] = useState<Order | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchOrderAndPayment();
  }, [orderId]);

  const fetchOrderAndPayment = async () => {
    try {
      const [orderRes, paymentsRes] = await Promise.all([
        api.get<Order>(`/api/orders/${orderId}`),
        api.get<{ payments: Payment[] }>(`/api/payments?orderId=${orderId}`),
      ]);

      setOrder(orderRes);
      const latestPayment = paymentsRes.payments[0];
      setPayment(latestPayment);
      
      if (latestPayment?.transactionId) {
        setTransactionId(latestPayment.transactionId);
      }
    } catch (err) {
      setError("Failed to load order details. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be less than 5MB");
      return;
    }

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Screenshot must be JPG, PNG, or WEBP");
      return;
    }

    setScreenshot(file);
    setScreenshotPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transactionId.trim()) {
      setError("Please enter the Transaction ID");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      let screenshotUrl = "";

      // Upload screenshot if provided
      if (screenshot) {
        const formData = new FormData();
        formData.append("file", screenshot);
        formData.append("folder", "payment-proofs");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error("Failed to upload screenshot");
        }

        const uploadData = await uploadRes.json();
        screenshotUrl = uploadData.url;
      }

      // Submit payment confirmation
      const response = await api.post(`/api/payments/${payment?.id}/submit`, {
        transactionId: transactionId.trim(),
        screenshotUrl: screenshotUrl || undefined,
      });

      setSuccess(true);

      // Check if payment was auto-verified
      if (response.matched) {
        setTimeout(() => {
          router.push(`/orders/${orderId}?verified=true`);
        }, 2000);
      } else {
        setTimeout(() => {
          router.push(`/orders/${orderId}?pending=true`);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit payment confirmation. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!order || !payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Order not found</h2>
          <button
            onClick={() => router.push("/orders")}
            className="text-orange-600 hover:underline"
          >
            View your orders
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <div className="mb-4">
            <svg
              className="mx-auto h-16 w-16 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Confirmation Submitted!</h2>
          <p className="text-gray-600 mb-6">
            We are verifying your payment. You will be notified once it's confirmed.
          </p>
          <div className="animate-pulse text-sm text-gray-500">
            Redirecting to order details...
          </div>
        </div>
      </div>
    );
  }

  const merchantNumber = MERCHANT_NUMBERS[method as keyof typeof MERCHANT_NUMBERS];
  const instructions = PAYMENT_INSTRUCTIONS[method as keyof typeof PAYMENT_INSTRUCTIONS];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Complete Your Payment</h1>
            <div className="text-right">
              <div className="text-sm text-gray-600">Order ID</div>
              <div className="font-mono text-sm">{orderId.slice(0, 8)}...</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg">
            <div>
              <div className="text-sm text-gray-600 mb-1">Amount to Pay</div>
              <div className="text-3xl font-bold text-orange-600">৳{order.total}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600 mb-1">Payment Method</div>
              <div className="text-lg font-semibold text-gray-800">{method}</div>
            </div>
          </div>
        </div>

        {/* Payment Instructions */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Payment Instructions</h2>
          
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center mb-2">
              <svg
                className="h-5 w-5 text-blue-600 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="font-semibold text-blue-800">Merchant Number (Personal Account)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-blue-900">{merchantNumber}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(merchantNumber);
                  alert("Merchant number copied!");
                }}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Copy
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {instructions.map((instruction, index) => (
              <div key={index} className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-semibold mr-3">
                  {index + 1}
                </div>
                <p className="text-gray-700 pt-1">{instruction}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction Submission Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Submit Payment Confirmation</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="transactionId" className="block text-sm font-medium text-gray-700 mb-2">
                Transaction ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g., 8N6A3B7K2P"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter the Transaction ID from your {method} confirmation message
              </p>
            </div>

            <div>
              <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
                Payment Screenshot <span className="text-gray-400">(Optional)</span>
              </label>
              <input
                type="file"
                id="screenshot"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleScreenshotChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              <p className="mt-1 text-sm text-gray-500">
                Upload a screenshot of your payment confirmation (JPG, PNG, or WEBP, max 5MB)
              </p>
            </div>

            {screenshotPreview && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                <div className="relative w-full max-w-sm">
                  <Image
                    src={screenshotPreview}
                    alt="Screenshot preview"
                    width={300}
                    height={300}
                    className="rounded-lg border border-gray-300"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setScreenshot(null);
                      setScreenshotPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.push(`/orders/${orderId}`)}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !transactionId.trim()}
                className="flex-1 px-6 py-3 bg-orange-600 text-white font-semibold rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : "Submit Payment Confirmation"}
              </button>
            </div>
          </form>
        </div>

        {/* Help Section */}
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Need Help?</h3>
          <p className="text-sm text-gray-600 mb-2">
            If you're having trouble completing the payment, please contact our support team.
          </p>
          <p className="text-sm text-gray-600">
            Order Details: <span className="font-mono">{orderId}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
