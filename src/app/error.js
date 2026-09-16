"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeftIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error("Global Error Boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-lg glass-card rounded-3xl p-8 sm:p-10 border border-rose-200 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto text-2xl font-bold shadow-sm">
          ⚠️
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error?.message ||
              "An unexpected error occurred. Please try refreshing the page or head back to the feed."}
          </p>
          {error?.digest && (
            <p className="text-[11px] text-slate-400 font-mono">
              Error Digest: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn-gradient w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full text-xs font-bold text-white shadow-md"
          >
            <ArrowPathIcon className="h-4 w-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Back to Feed</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
