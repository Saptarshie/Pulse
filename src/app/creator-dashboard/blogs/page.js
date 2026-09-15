'use client';
import { useState, useEffect } from "react";
import { fetchBlogs } from "@/action/blogAction";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CreatorBlogCard from "@/components/cards/CreatorBlogCard";
import CreatorSidebar from "@/components/creator-sidebar";
import { PlusCircleIcon, ArrowLeftIcon, SparklesIcon, Bars3Icon as MenuIcon } from "@heroicons/react/24/outline";

export default function Blogs() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const user = useSelector((state) => state.userslice);
  const router = useRouter();

  const loadBlogs = async () => {
    try {
      const res = await fetchBlogs(page, limit, { author: user.username });
      if (res?.success) {
        setBlogs(res.blogs || []);
      }
    } catch (error) {
      console.error("Error fetching stories:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user.username) {
      loadBlogs();
    }
  }, [user.username, page, limit]);

  const handleCreateBlog = () => {
    router.push('/creator-dashboard/create');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <CreatorSidebar
        user={user}
        activeTab="blogs"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 w-full min-w-0">
        {/* Top bar for mobile toggle */}
        <div className="lg:hidden glass-nav px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 hover:bg-white/80 transition-colors"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <span className="font-extrabold text-sm text-slate-900">Your Stories</span>
          <button
            onClick={handleCreateBlog}
            className="p-1.5 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5" />
          </button>
        </div>

        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header & Title */}
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Your Stories & Articles
                </h1>
                <p className="text-slate-600 text-xs sm:text-sm mt-1">
                  All stories published by @{user.username || "creator"}
                </p>
              </div>

              <button
                onClick={handleCreateBlog}
                className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md self-start sm:self-auto"
              >
                <PlusCircleIcon className="h-4 w-4" />
                <span>Write New Story</span>
              </button>
            </div>
          </div>

          {/* Stories Grid */}
          {blogs && blogs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {blogs.map((blog) => (
                <CreatorBlogCard
                  key={blog._id}
                  blog={blog}
                  refreshBlogs={() => {
                    setLoading(true);
                    loadBlogs();
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 glass-card rounded-3xl border border-purple-200/30 p-8 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-4 border border-purple-100">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No stories yet</h3>
              <p className="text-slate-600 text-xs sm:text-sm mb-6 leading-relaxed">
                Publish your perspectives, tutorials, and thoughts to build your creator community.
              </p>
              <button
                onClick={handleCreateBlog}
                className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
              >
                <PlusCircleIcon className="h-4 w-4" />
                <span>Create Your First Story</span>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
