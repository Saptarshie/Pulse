import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="w-full max-w-md glass-card rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center mx-auto text-2xl font-black shadow-lg shadow-indigo-500/20">
          404
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Story or Page Not Found
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The story, creator profile, or route you are looking for does not exist, has been removed, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="btn-gradient w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3 rounded-full text-xs font-bold text-white shadow-md"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>Return to Feed</span>
          </Link>
          <Link
            href="/search"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-full text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            Search Pulse
          </Link>
        </div>
      </div>
    </div>
  );
}
