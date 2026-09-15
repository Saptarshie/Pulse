"use client";
import { useState, useEffect } from "react";
import BlogCard from "../blog-feed/blog-card";
import { fetchHistory } from "@/action/blogAction";
import Link from "next/link";
import { ClockIcon, SparklesIcon } from "@heroicons/react/24/outline";

export default function HistoryList() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        const response = await fetchHistory();
        if (response?.success) {
          setHistory(Array.isArray(response.visitedBlogs) ? response.visitedBlogs : []);
        } else {
          setError(response?.message || "Failed to load history");
        }
      } catch (error) {
        setError("An error occurred while fetching history");
        console.error("Error fetching history:", error);
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="glass-card rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
            <div className="h-44 bg-slate-200 rounded-xl" />
            <div className="h-4 bg-slate-200 rounded w-3/4" />
            <div className="h-3 bg-slate-200 rounded w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 glass-card rounded-2xl border border-slate-200 p-6">
        <p className="text-rose-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

  const safeHistory = Array.isArray(history) ? history : [];
  
  if (safeHistory.length === 0) {
    return (
      <div className="text-center py-16 glass-card rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 mb-1">
          No reading history yet
        </h3>
        <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
          Stories you read on Pulse will automatically be remembered here for easy reference.
        </p>
        <Link
          href="/"
          className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
        >
          <SparklesIcon className="h-4 w-4" />
          <span>Explore Social Feed</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {safeHistory.map((blog, index) => (
        <BlogCard key={`${blog._id}-${index}`} blog={blog} />
      ))}
    </div>
  );
}
