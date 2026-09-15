'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { fetchBlogs } from '@/action/blogAction';
import CreatorBlogCard from '@/components/cards/CreatorBlogCard';
import Loading from '../loading';
import { 
  BookOpenIcon, 
  PlusCircleIcon, 
  CurrencyDollarIcon,
  ChartBarIcon,
  UserCircleIcon,
  CogIcon,
  Bars3Icon as MenuIcon,
  XMarkIcon as XIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  CheckBadgeIcon
} from "@heroicons/react/24/outline";
import CreatorSidebar from "@/components/creator-sidebar";

export default function CreatorDashboard({ initialData }) {
  const [user, setUser] = useState(initialData?.user || {});
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const router = useRouter();
  const [BlogDetails, setBlogDetails] = useState([]);
  const [BlogsLoading, setBlogsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user data
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!initialData) {
          const module = await import('@/action');
          const { fetchUserAction } = module;
          const res = await fetchUserAction();
          if (res?.success) {
            setUser(res.user);
            setBlogsLoading(true);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    };
    
    fetchData();
  }, [initialData]);

  // Fetch creator's stories
  const loadCreatorBlogs = useCallback(async () => {
    if (user?.blogs && user.blogs.length > 0) {
      try {
        setBlogsLoading(true);
        const result = await fetchBlogs(1, 6, { ids: user.blogs.slice(-6) });
        if (result?.success) {
          setBlogDetails(result.blogs);
          setError(null);
        } else {
          setError(result?.message || 'Could not load stories.');
        }
      } catch (err) {
        setError('An unexpected error occurred.');
        console.error("Error fetching creator stories: ", err);
      } finally {
        setBlogsLoading(false);
      }
    } else {
      setBlogsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadCreatorBlogs();
  }, [loadCreatorBlogs]);

  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : "CR";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      
      {/* Reusable Petrichor & Mist Sticky Sidebar */}
      <CreatorSidebar
        user={user}
        activeTab="dashboard"
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />
      
      {/* Main Studio View */}
      <div className="flex-1 w-full min-w-0">
        
        {/* Top bar for mobile toggle */}
        <div className="lg:hidden glass-nav px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-xl text-slate-700 hover:bg-white/80 transition-colors"
          >
            <MenuIcon className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-sm text-slate-900">Creator Studio</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Live
            </span>
          </div>
          <Link
            href="/creator-dashboard/create"
            className="p-1.5 rounded-xl text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <PlusCircleIcon className="h-5 w-5" />
          </Link>
        </div>

        {/* Studio Content Body */}
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          
          {/* Welcome Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Welcome back, {user.username || "Creator"}!
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100/80 text-purple-800 border border-purple-200/60">
                  <SparklesIcon className="h-3.5 w-3.5 text-purple-600 mr-1" />
                  Creator
                </span>
              </div>
              <p className="text-slate-600 text-sm mt-1">
                Monitor your network metrics, subscriber community, and content reach in calm focus.
              </p>
            </div>

            <Link
              href="/creator-dashboard/create"
              className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md self-start sm:self-auto"
            >
              <PlusCircleIcon className="h-4 w-4" />
              <span>Write New Story</span>
            </Link>
          </div>

          {/* Metric Cards Grid - Petrichor & Mist Theme */}
          <div className="grid gap-5 mb-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            
            {/* Metric 1: Stories - Dewy Lavender */}
            <div className="glass-card rounded-2xl p-5 border border-purple-200/40 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-700 border border-purple-100/80">
                <BookOpenIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Published Stories</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  {user.blogs?.length || 0}
                </p>
              </div>
            </div>
            
            {/* Metric 2: Subscribers - Dewy Sage */}
            <div className="glass-card rounded-2xl p-5 border border-emerald-200/40 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100/80">
                <UserCircleIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Active Subscribers</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  {user?.subscriberCount >= 0 ? user.subscriberCount : 0}
                </p>
              </div>
            </div>
            
            {/* Metric 3: Earnings - Rainy Iris */}
            <div className="glass-card rounded-2xl p-5 border border-indigo-200/40 shadow-sm flex items-center space-x-4">
              <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100/80">
                <CurrencyDollarIcon className="h-7 w-7" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">Sepolia ETH Revenue</p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-0.5">
                  {user?.amount || 0} <span className="text-sm font-semibold text-emerald-700">ETH</span>
                </p>
              </div>
            </div>
          </div>
          
          {/* Recent Stories Stream */}
          <div className="glass-card rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Recent Stories & Posts
                </h2>
                <p className="text-xs text-slate-500">
                  Manage your recent publications on Pulse
                </p>
              </div>
              <Link 
                href="/creator-dashboard/blogs" 
                className="text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-colors"
              >
                View all stories →
              </Link>
            </div>

            <div className="p-6">
              {BlogsLoading ? (
                <div className="py-12">
                  <Loading />
                </div>
              ) : BlogDetails && BlogDetails.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {BlogDetails.map((blog) => (
                    <CreatorBlogCard 
                      key={blog._id} 
                      blog={blog} 
                      refreshBlogs={loadCreatorBlogs} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                    <SparklesIcon className="h-8 w-8" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-1">
                    No stories published yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                    Ready to broadcast your thoughts to the network? Create your first piece and engage your followers.
                  </p>
                  <button 
                    onClick={() => router.push('/creator-dashboard/create')}
                    className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
                  >
                    <PlusCircleIcon className="h-4 w-4" />
                    <span>Create Your First Story</span>
                  </button>
                </div>
              )}
            </div>
          </div>

        </main>
      </div>

    </div>
  );
}
