'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { toggleLikeBlog, toggleBookmarkBlog } from '@/action/blogAction';
import { 
  HeartIcon as HeartOutline,
  BookmarkIcon as BookmarkOutline,
  ChatBubbleLeftEllipsisIcon,
  ShareIcon,
  CheckBadgeIcon,
  SpeakerWaveIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { 
  HeartIcon as HeartSolid,
  BookmarkIcon as BookmarkSolid 
} from '@heroicons/react/24/solid';

export default function BlogCard({ blog }) {
  const router = useRouter();
  const currentUser = useSelector((state) => state.userslice);
  const currentUsername = currentUser?.username;

  const initialLikesCount = Array.isArray(blog?.likes) ? blog.likes.length : 0;
  const initialLiked = Boolean(currentUsername && Array.isArray(blog?.likes) && blog.likes.includes(currentUsername));

  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikesCount);
  const [isLiking, setIsLiking] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync like state when blog props or current user updates
  useEffect(() => {
    if (blog?.likes) {
      setLikeCount(blog.likes.length);
      if (currentUsername) {
        setLiked(blog.likes.includes(currentUsername));
      }
    }
  }, [blog?.likes, currentUsername]);

  // Sync bookmark state with localStorage and global events
  useEffect(() => {
    if (!blog?._id) return;
    try {
      const saved = JSON.parse(localStorage.getItem('pulse_bookmarks') || '[]');
      if (Array.isArray(saved) && saved.includes(blog._id.toString())) {
        setBookmarked(true);
      }
    } catch {
      // ignore
    }

    const handleBookmarkChange = (e) => {
      if (e.detail?.blogId === blog._id.toString()) {
        setBookmarked(Boolean(e.detail.bookmarked));
      }
    };
    window.addEventListener('pulse_bookmark_changed', handleBookmarkChange);
    return () => window.removeEventListener('pulse_bookmark_changed', handleBookmarkChange);
  }, [blog?._id]);

  if (!blog) return null;

  const commentCount = Array.isArray(blog?.comments) ? blog.comments.length : 0;

  // Calculate estimated reading time
  const readingTime = Math.max(
    2,
    Math.ceil(((blog.content?.length || 400) + (blog.description?.length || 100)) / 450)
  );

  // Format date or relative time
  const formattedDate = blog.date
    ? new Date(blog.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "Recent";

  const authorInitials = blog.author
    ? blog.author.slice(0, 2).toUpperCase()
    : "PU";

  const handleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUsername) {
      window.location.href = '/authenticate/sign-in';
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const nextLiked = !liked;
    const nextCount = nextLiked ? likeCount + 1 : Math.max(0, likeCount - 1);
    setLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      const res = await toggleLikeBlog(blog._id);
      if (res?.success) {
        setLiked(res.liked);
        setLikeCount(res.likeCount);
      } else {
        // Rollback
        setLiked(!nextLiked);
        setLikeCount(likeCount);
      }
    } catch (err) {
      console.error("Failed to like blog:", err);
      setLiked(!nextLiked);
      setLikeCount(likeCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!blog?._id) return;
    const blogIdStr = blog._id.toString();
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);

    try {
      const saved = JSON.parse(localStorage.getItem('pulse_bookmarks') || '[]');
      let updated;
      if (nextBookmarked) {
        updated = Array.from(new Set([...saved, blogIdStr]));
      } else {
        updated = saved.filter((id) => id !== blogIdStr);
      }
      localStorage.setItem('pulse_bookmarks', JSON.stringify(updated));
    } catch {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('pulse_bookmark_changed', {
          detail: { blogId: blogIdStr, bookmarked: nextBookmarked },
        })
      );
    }

    if (currentUsername) {
      try {
        await toggleBookmarkBlog(blog._id);
      } catch (err) {
        console.error('Failed to sync bookmark to server:', err);
      }
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (typeof window !== "undefined") {
        const url = `${window.location.origin}/blogs/${blog._id}`;
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <article className="group relative glass-card rounded-2xl border border-emerald-900/10 hover:border-purple-300 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col h-full card-hover">
      
      {/* Top Creator Meta Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between z-10">
        <Link
          href={`/profile/${blog.author || ''}`}
          className="flex items-center space-x-3 min-w-0 cursor-pointer hover:opacity-85 transition-opacity group/author"
          title={`View @${blog.author}'s Profile`}
        >
          {/* Creator Avatar */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-emerald-400 p-[1.5px] shadow-sm group-hover/author:scale-105 transition-transform">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-purple-700">
                {authorInitials}
              </div>
            </div>
          </div>

          {/* Author info */}
          <div className="min-w-0">
            <div className="flex items-center space-x-1">
              <span className="text-sm font-bold text-slate-900 group-hover/author:text-purple-700 transition-colors truncate">
                {blog.author || "Pulse Creator"}
              </span>
              <CheckBadgeIcon className="h-4 w-4 text-purple-600 shrink-0 inline" />
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>@{blog.author ? blog.author.toLowerCase() : "creator"}</span>
              <span>•</span>
              <span suppressHydrationWarning>{formattedDate}</span>
            </div>
          </div>
        </Link>

        {/* Premium Badge or Category Tag */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {blog.isPremium && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-amber-400 to-amber-500 text-amber-950 shadow-sm shadow-amber-500/20">
              💎 Premium
            </span>
          )}
          {blog.tags && blog.tags.length > 0 && !blog.isPremium && (
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/50">
              #{blog.tags[0]}
            </span>
          )}
        </div>
      </div>

      {/* Clickable post link */}
      <Link href={`/blogs/${blog._id}`} className="flex flex-col flex-1">

        {/* Thumbnail Preview if available */}
        {blog.image?.imagePath && (
          <div className="relative w-full h-52 sm:h-56 bg-slate-100 overflow-hidden mx-0 my-1">
            <Image
              src={blog.image.imagePath}
              alt={blog.title || "Post media preview"}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Post Text Content */}
        <div className="p-4 sm:p-5 pt-3 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug group-hover:text-purple-700 transition-colors line-clamp-2 mb-2">
              {blog.title || "Untitled Story"}
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed line-clamp-3 mb-4 font-normal">
              {blog.description || "Click to dive into the full story and join the creator conversation..."}
            </p>
          </div>

          {/* Tags cloud */}
          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {blog.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-0.5 rounded-md bg-emerald-50/70 hover:bg-purple-50 text-emerald-800 hover:text-purple-800 border border-emerald-200/40 font-medium transition-colors"
                >
                  #{tag}
                </span>
              ))}
              {blog.tags.length > 3 && (
                <span className="text-xs text-slate-400 self-center">
                  +{blog.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </Link>

      {/* Social Engagement Action Dock */}
      <div className="px-4 sm:px-5 py-3 bg-white/50 border-t border-emerald-900/10 flex items-center justify-between text-xs text-slate-500">
        
        {/* Left Actions: Likes, Comments, Read Time */}
        <div className="flex items-center space-x-4">
          
          {/* Like Button */}
          <button
            onClick={handleLike}
            className={`flex items-center space-x-1.5 py-1 px-1.5 rounded-lg transition-colors group/like ${
              liked 
                ? "text-rose-600 font-semibold" 
                : "text-slate-500 hover:text-rose-600 hover:bg-rose-50/60"
            }`}
            title="Like this story"
          >
            {liked ? (
              <HeartSolid className="h-4 w-4 text-rose-500 transform scale-110 transition-transform animate-in zoom-in-50 duration-200" />
            ) : (
              <HeartOutline className="h-4 w-4 group-hover/like:scale-110 transition-transform" />
            )}
            <span>{likeCount}</span>
          </button>

          {/* Comments count */}
          <Link
            href={`/blogs/${blog._id}#discussion`}
            className="flex items-center space-x-1.5 py-1 px-1.5 rounded-lg hover:text-purple-700 hover:bg-purple-50/60 transition-colors"
            title="Join discussion"
          >
            <ChatBubbleLeftEllipsisIcon className="h-4 w-4" />
            <span>{commentCount}</span>
          </Link>

          {/* Read Time */}
          <div className="hidden sm:flex items-center space-x-1 text-slate-400">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>{readingTime} min</span>
          </div>
        </div>

        {/* Right Actions: Listen, Share, Bookmark */}
        <div className="flex items-center space-x-2">
          {/* Listen to Story Audio Trigger */}
          <Link
            href={`/blogs/${blog._id}`}
            className="flex items-center space-x-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50/60 py-1 px-2 rounded-lg transition-colors"
            title="Listen to AI voice narration"
          >
            <SpeakerWaveIcon className="h-4 w-4" />
            <span className="hidden md:inline font-medium">Listen</span>
          </Link>

          {/* Share Button with Toast */}
          <div className="relative">
            <button
              onClick={handleShare}
              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60 transition-colors"
              title="Share story"
            >
              <ShareIcon className="h-4 w-4" />
            </button>
            {copied && (
              <span className="absolute -top-7 right-0 px-2 py-0.5 bg-slate-900 text-white text-[10px] font-medium rounded-md shadow-lg animate-in fade-in zoom-in-95 whitespace-nowrap z-30">
                Link Copied! ✨
              </span>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmark}
            className={`p-1.5 rounded-lg transition-colors ${
              bookmarked
                ? "text-indigo-600"
                : "text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/60"
            }`}
            title={bookmarked ? "Saved to bookmarks" : "Save bookmark"}
          >
            {bookmarked ? (
              <BookmarkSolid className="h-4 w-4 text-indigo-600" />
            ) : (
              <BookmarkOutline className="h-4 w-4" />
            )}
          </button>
        </div>

      </div>

    </article>
  );
}
