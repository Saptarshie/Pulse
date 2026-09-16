import { fetchBlogById, getRecommendedBlogs } from "@/action/blogAction";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import BlogCard from "@/components/blog-feed/blog-card";
import {
  SimilarBlogs,
  SimilarBlogsLoading,
} from "@/components/blog-feed/similar-blogs";
import { Suspense } from "react";
import AskAIWrapper from "@/components/ask-ai/AskAIWrapper";
import BlogReadAloudWrapper from "@/components/blog-read-aloud";
import BlogComments from "@/components/blog-feed/blog-comments";
import {
  ArrowLeftIcon,
  CheckBadgeIcon,
  ClockIcon,
  SparklesIcon,
  LockClosedIcon,
  ShareIcon,
  BookmarkIcon,
  TagIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  try {
    const { "blog-id": blogId } = await params;
    if (!blogId) {
      return {
        title: "Story Not Found | Pulse",
        description: "The requested story could not be found on Pulse.",
      };
    }
    const { connectToDB } = await import("@/database");
    const { Blog } = await import("@/models");
    const mongoose = (await import("mongoose")).default;
    
    if (!mongoose.isValidObjectId(blogId)) {
      return {
        title: "Story Not Found | Pulse",
        description: "The requested story could not be found on Pulse.",
      };
    }

    await connectToDB();
    const blog = await Blog.findById(blogId).lean();
    if (!blog) {
      return {
        title: "Story Not Found | Pulse",
        description: "The requested story could not be found on Pulse.",
      };
    }
    const title = `${blog.title} — by @${blog.author}`;
    const description =
      blog.description ||
      "Read this story on Pulse (onlypain.in) — Social Content & Creator Network.";
    const imageUrl = blog.image?.imagePath;

    let safePublishedTime;
    try {
      if (blog.date) {
        const d = new Date(blog.date);
        if (!isNaN(d.getTime())) safePublishedTime = d.toISOString();
      }
    } catch {
      // ignore
    }

    return {
      title,
      description,
      alternates: {
        canonical: `https://onlypain.in/blogs/${blogId}`,
      },
      openGraph: {
        title,
        description,
        url: `https://onlypain.in/blogs/${blogId}`,
        siteName: "Pulse",
        type: "article",
        publishedTime: safePublishedTime,
        authors: [blog.author],
        tags: Array.isArray(blog.tags) ? blog.tags : [],
        images: imageUrl ? [{ url: imageUrl, alt: blog.title }] : [],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: imageUrl ? [imageUrl] : [],
      },
    };
  } catch (err) {
    return {
      title: "Pulse Story",
      description: "Read inspiring stories on Pulse (onlypain.in).",
    };
  }
}

export default async function BlogPage({ params }) {
  const { "blog-id": blogId } = await params;
  if (!blogId) {
    return notFound();
  }

  const res = await fetchBlogById(blogId);

  // If reader is not signed in, redirect to sign-in
  if (res.status === 401) {
    redirect("/authenticate/sign-in");
  }

  // Handle unauthorized access to premium content with a sleek modern paywall
  if (res.status === 403) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="relative w-full rounded-3xl overflow-hidden glass-card border border-slate-200/90 shadow-2xl p-8 sm:p-12 text-center">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-12 w-48 h-48 bg-gradient-to-br from-indigo-500/20 to-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Lock Icon */}
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/20">
            <LockClosedIcon className="h-8 w-8 stroke-2" />
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 mb-4">
            💎 Pulse Exclusive
          </span>

          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Members-Only Story
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-md mx-auto mb-8">
            This story is reserved for subscribed supporters of{" "}
            <span className="font-bold text-slate-900">
              @{res.author || "this creator"}
            </span>
            . Unlock full access to this article and their complete portfolio
            with a direct Web3 subscription.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/subscribe?author=${encodeURIComponent(res.author)}`}
              className="btn-gradient w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-8 py-3.5 rounded-full font-bold text-sm text-white shadow-lg"
            >
              <SparklesIcon className="h-4 w-4 text-pink-200" />
              <span>Subscribe to @{res.author || "Creator"}</span>
            </Link>

            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-6 py-3.5 rounded-full font-semibold text-sm text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Explore Free Stories</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Handle blog not found
  if (!res.success || !res.blog) {
    return notFound();
  }

  const { blog } = res;

  // Approximate reading time
  const readingTime = Math.max(
    2,
    Math.ceil(
      ((blog.content?.length || 500) + (blog.description?.length || 100)) / 500,
    ),
  );

  const authorInitials = blog.author
    ? blog.author.slice(0, 2).toUpperCase()
    : "PU";

  let safeDateStr = "Recently";
  try {
    if (blog.date) {
      const d = new Date(blog.date);
      if (!isNaN(d.getTime())) {
        safeDateStr = formatDistanceToNow(d, { addSuffix: true });
      }
    }
  } catch {
    safeDateStr = "Recently";
  }

  const commentCount = Array.isArray(blog.comments)
    ? blog.comments.length
    : (typeof blog.comments === "number" ? blog.comments : 0);

  return (
    <div className="min-h-screen pb-20">
      {/* Pulse AI Co-Pilot Drawer */}
      <AskAIWrapper blogContent={blog?.content} />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-xs sm:text-sm font-semibold text-slate-500 hover:text-purple-700 transition-colors group"
          >
            <ArrowLeftIcon className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Feed</span>
          </Link>

          {/* Tags & Status */}
          <div className="flex items-center space-x-2">
            {blog.isPremium && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-sm">
                💎 Premium
              </span>
            )}
            {blog.tags && blog.tags[0] && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/50">
                #{blog.tags[0]}
              </span>
            )}
          </div>
        </div>

        {/* Story Header */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-4">
            {blog.title}
          </h1>

          {blog.description && (
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed font-normal mb-6">
              {blog.description}
            </p>
          )}

          {/* Creator Profile & Metadata Bar */}
          <div className="p-4 rounded-2xl glass-card border border-emerald-900/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Creator info */}
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 p-[2px] shadow-sm shrink-0">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-sm font-bold text-purple-700">
                  {authorInitials}
                </div>
              </div>

              <div>
                <div className="flex items-center space-x-1">
                  <span className="font-bold text-slate-900 text-base">
                    {blog.author || "Pulse Creator"}
                  </span>
                  <CheckBadgeIcon className="h-4 w-4 text-purple-600 inline" />
                </div>

                <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                  <span>
                    @{blog.author ? blog.author.toLowerCase() : "creator"}
                  </span>
                  <span>•</span>
                  <span>{safeDateStr}</span>
                  <span>•</span>
                  <span className="flex items-center">
                    <ClockIcon className="h-3 w-3 mr-1" />
                    {readingTime} min read
                  </span>
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-2 self-start sm:self-center">
              <a
                href="#discussion"
                className="inline-flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold rounded-full border border-slate-200 bg-white/80 text-slate-600 hover:text-purple-700 hover:border-purple-300 transition-colors"
                title="Jump to discussion"
              >
                <span>💬</span>
                <span>{commentCount}</span>
              </a>

              <Link
                href={`/subscribe?author=${encodeURIComponent(blog.author)}`}
                className="btn-gradient inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold rounded-full text-white shadow-sm"
              >
                <UserPlusIcon className="h-3.5 w-3.5" />
                <span>Subscribe</span>
              </Link>
            </div>
          </div>

          {/* Read Aloud Audio Player dock - Dewy Calm Styling */}
          <div className="mt-4 flex items-center justify-between py-2.5 px-4 rounded-xl border border-emerald-200/50 text-xs">
            <div className="flex items-center space-x-2">
              {/* <span className="font-semibold text-emerald-950">Audio Narration:</span> */}
              <BlogReadAloudWrapper content={blog.content} />
            </div>
            <span className="text-slate-500 hidden sm:inline">
              Listen on the go with AI voice synthesis
            </span>
          </div>
        </header>

        {/* Featured Image */}
        {blog?.image?.imagePath && (
          <div className="mb-10 rounded-3xl overflow-hidden shadow-lg border border-emerald-900/10 relative">
            <Image
              src={blog.image.imagePath}
              alt={blog.title}
              height={500}
              width={1000}
              priority
              className="w-full max-h-[480px] object-cover"
            />
          </div>
        )}

        {/* Main Article Body with Enhanced Prose */}
        <div
          className="prose prose-lg sm:prose-xl max-w-none 
            prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-slate-900
            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:text-lg
            prose-a:text-purple-700 prose-a:font-semibold hover:prose-a:text-emerald-700
            prose-blockquote:border-l-4 prose-blockquote:border-purple-500 prose-blockquote:bg-purple-50/30 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-xl prose-blockquote:italic
            prose-code:text-purple-800 prose-code:bg-purple-50/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
            prose-img:rounded-2xl prose-img:shadow-md
            mb-12"
          dangerouslySetInnerHTML={{ __html: blog.content }}
        />

        {/* Topic Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="pt-6 pb-8 border-t border-emerald-900/10">
            <div className="flex items-center space-x-2 mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
              <TagIcon className="h-4 w-4" />
              <span>Topics & Communities</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag, index) => (
                <Link
                  key={index}
                  href={`/search?q=${tag}`}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-white/80 border border-emerald-900/10 text-slate-700 hover:border-purple-300 hover:text-purple-700 hover:bg-purple-50/50 transition-all shadow-sm"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Author Bio Footer Card */}
        <div className="p-6 sm:p-8 rounded-3xl glass-card border border-emerald-900/10 shadow-sm mb-12 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 text-center sm:text-left">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 p-[2.5px] shadow-md shrink-0">
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-lg font-bold text-purple-700">
              {authorInitials}
            </div>
          </div>

          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 flex items-center justify-center sm:justify-start">
                  Written by {blog.author}
                  <CheckBadgeIcon className="h-4 w-4 text-indigo-500 ml-1.5" />
                </h3>
                <p className="text-xs text-slate-500">
                  Content creator & publisher on the Pulse Network
                </p>
              </div>

              <Link
                href={`/subscribe?author=${encodeURIComponent(blog.author)}`}
                className="btn-gradient px-4 py-1.5 rounded-full text-xs font-bold text-white shadow-sm inline-block self-center sm:self-auto"
              >
                Follow & Support
              </Link>
            </div>

            <p className="text-sm text-slate-600 leading-relaxed">
              Enjoyed this piece? Support independent writers and receive
              exclusive updates directly in your social feed.
            </p>
          </div>
        </div>

        {/* Real-time MongoDB Discussion & Community Feedback */}
        <BlogComments
          blogId={blogId}
          initialComments={Array.isArray(blog.comments) ? blog.comments : []}
          initialLikes={Array.isArray(blog.likes) ? blog.likes : []}
          blogAuthor={blog.author}
        />

        {/* Similar Stories Section */}
        <div className="mt-12 pt-8 border-t border-slate-200">
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-6">
            Recommended Next on Pulse
          </h2>
          <Suspense fallback={<SimilarBlogsLoading />}>
            <SimilarBlogs blogId={blogId} />
          </Suspense>
        </div>
      </article>
    </div>
  );
}
