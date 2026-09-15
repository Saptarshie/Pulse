import HistoryList from "@/components/history-list";
import Link from "next/link";
import { ArrowLeftIcon, ClockIcon } from "@heroicons/react/24/outline";

export default function HistoryPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Feed</span>
      </Link>

      {/* Header */}
      <div className="flex items-center space-x-3 mb-8">
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
          <ClockIcon className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Reading History
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Stories and perspectives you've recently engaged with on Pulse
          </p>
        </div>
      </div>

      {/* Content */}
      <HistoryList />
    </div>
  );
}