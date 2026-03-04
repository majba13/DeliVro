"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    /* Log to error monitoring service in production */
    console.error("[DeliVro Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-slate-50 to-red-50 px-4 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white shadow-lg text-5xl">
        ⚠️
      </div>
      <div>
        <h1 className="text-2xl font-bold text-red-700">Something went wrong</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          An unexpected error occurred. Our team has been notified.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-slate-400">Error ID: {error.digest}</p>
        )}
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Try again
        </button>
        <Link href="/" className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold hover:bg-slate-50">
          Go Home
        </Link>
      </div>
    </div>
  );
}
