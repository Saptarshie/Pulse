"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChartBarIcon,
  BookOpenIcon,
  PlusCircleIcon,
  CurrencyDollarIcon,
  CogIcon,
  ArrowLeftIcon,
  SparklesIcon,
  CheckBadgeIcon,
  XMarkIcon
} from "@heroicons/react/24/outline";

export default function CreatorSidebar({
  user = {},
  activeTab = "dashboard",
  sidebarOpen = false,
  setSidebarOpen = () => {}
}) {
  const pathname = usePathname();

  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : "CR";

  const navItems = [
    {
      id: "dashboard",
      name: "Studio Overview",
      href: "/creator-dashboard",
      icon: ChartBarIcon,
      activeColor: "text-purple-600",
      exact: true
    },
    {
      id: "blogs",
      name: "Stories & Articles",
      href: "/creator-dashboard/blogs",
      icon: BookOpenIcon,
      activeColor: "text-indigo-600"
    },
    {
      id: "create",
      name: "Write New Story",
      href: "/creator-dashboard/create",
      icon: PlusCircleIcon,
      activeColor: "text-emerald-600"
    },
    {
      id: "earnings",
      name: "ETH Revenue",
      href: "/creator-dashboard/earnings",
      icon: CurrencyDollarIcon,
      activeColor: "text-emerald-600"
    },
    {
      id: "settings",
      name: "Settings",
      href: "/settings",
      icon: CogIcon,
      activeColor: "text-slate-600"
    }
  ];

  const isCurrentActive = (item) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href) || activeTab === item.id;
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Modern Petrichor & Mist Sidebar */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 glass-sidebar flex flex-col justify-between
                   transition-transform duration-300 ease-in-out lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 lg:shrink-0
                   ${sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}
      >
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
          {/* Mobile Close Button & Header */}
          <div className="flex items-center justify-between lg:hidden pb-3 border-b border-emerald-900/10">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-purple-600 to-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                P
              </div>
              <span className="font-bold text-sm text-slate-800">Creator Studio</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Creator Mini Identity Card */}
          <div className="p-3.5 rounded-2xl bg-white/70 border border-emerald-900/10 shadow-sm flex items-center space-x-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 p-[2px] shadow-sm shrink-0">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center font-extrabold text-purple-700 text-xs">
                {userInitials}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-1">
                <span className="text-sm font-bold text-slate-900 truncate">
                  {user?.username || "Creator"}
                </span>
                <CheckBadgeIcon className="h-4 w-4 text-purple-600 shrink-0" />
              </div>
              <p className="text-xs text-slate-500 truncate">
                {user?.email || `@${user?.username || "creator"}`}
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5" aria-label="Creator Studio navigation">
            {navItems.map((item) => {
              const active = isCurrentActive(item);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-gradient-to-r from-purple-100/90 to-emerald-50/80 text-purple-950 font-bold border border-purple-200/70 shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-colors ${
                      active ? item.activeColor : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Web3 Creator Badge */}
          <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-50/70 to-purple-50/70 border border-emerald-200/50">
            <div className="flex items-center space-x-1.5 mb-1 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              <SparklesIcon className="h-3.5 w-3.5 text-purple-600" />
              <span>Sepolia Web3 Ready</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Monetize stories directly with decentralized reader subscriptions.
            </p>
          </div>
        </div>

        {/* Sidebar Footer: Back to Social Feed */}
        <div className="p-4 border-t border-emerald-900/10">
          <Link
            href="/"
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl bg-white/70 hover:bg-white border border-emerald-900/10 text-xs font-semibold text-slate-700 hover:text-purple-700 shadow-sm transition-all group"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>← Back to Social Feed</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
