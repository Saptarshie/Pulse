'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { toggleLikeBlog, addBlogComment } from '@/action/blogAction';
import { 
  HeartIcon as HeartOutline,
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';

export default function BlogComments({ blogId, initialComments = [], initialLikes = [], blogAuthor = '' }) {
  const currentUser = useSelector((state) => state.userslice);
  const currentUsername = currentUser?.username;

  const [likes, setLikes] = useState(initialLikes || []);
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLiked = Boolean(currentUsername && likes.includes(currentUsername));
  const userInitials = currentUsername ? currentUsername.slice(0, 2).toUpperCase() : 'ME';

  const handleLike = async () => {
    if (!currentUsername) {
      window.location.href = '/authenticate/sign-in';
      return;
    }
    if (isLiking) return;
    setIsLiking(true);

    const prevLikes = [...likes];
    // Optimistic toggle
    if (isLiked) {
      setLikes(likes.filter((u) => u !== currentUsername));
    } else {
      setLikes([...likes, currentUsername]);
    }

    try {
      const res = await toggleLikeBlog(blogId);
      if (res?.success) {
        setLikes(res.likes || []);
      } else {
        setLikes(prevLikes);
      }
    } catch (err) {
      console.error('Failed to toggle like:', err);
      setLikes(prevLikes);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!currentUsername) {
      window.location.href = '/authenticate/sign-in';
      return;
    }

    const trimmed = newComment.trim();
    if (!trimmed) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await addBlogComment(blogId, trimmed);
      if (res?.success) {
        setComments(res.comments || [...comments, res.comment]);
        setNewComment('');
        setSuccess('Your thoughts have been posted to the discussion! 🌿');
        setTimeout(() => setSuccess(''), 4000);
      } else {
        setError(res?.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="discussion" className="mt-16 pt-10 border-t border-emerald-900/10 scroll-mt-24">
      {/* Header with Like Bar & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-emerald-900/10">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-purple-600" />
            <span>Community Discussion</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
              {comments.length}
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Share reflections, pose questions, or engage with {blogAuthor ? (
              <Link href={`/profile/${blogAuthor}`} className="text-purple-600 font-semibold hover:underline">
                @{blogAuthor}
              </Link>
            ) : 'the author'} and fellow readers.
          </p>
        </div>

        {/* Reader Story Like Button */}
        <button
          onClick={handleLike}
          disabled={isLiking}
          className={`inline-flex items-center space-x-2.5 px-4 py-2 rounded-full border text-sm font-semibold transition-all shadow-sm ${
            isLiked
              ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-rose-100'
              : 'bg-white border-slate-200 text-slate-700 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50/40'
          }`}
          title={isLiked ? 'Unlike story' : 'Like this story'}
        >
          {isLiked ? (
            <HeartSolid className="h-5 w-5 text-rose-500 animate-in zoom-in-50 duration-200" />
          ) : (
            <HeartOutline className="h-5 w-5 group-hover:scale-110 transition-transform" />
          )}
          <span>{likes.length} {likes.length === 1 ? 'Like' : 'Likes'}</span>
        </button>
      </div>

      {/* Post a Comment Form */}
      <div className="glass-card rounded-2xl border border-emerald-900/10 p-5 sm:p-6 shadow-sm mb-10">
        {currentUsername ? (
          <form onSubmit={handleCommentSubmit} className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-emerald-400 p-[1.5px] shrink-0 mt-0.5">
                <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-purple-700">
                  {userInitials}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="What are your thoughts on this story? Leave a comment..."
                  rows={3}
                  maxLength={1000}
                  className="w-full rounded-xl border border-slate-200/90 bg-white/70 px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all resize-y"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                {newComment.length} / 1000 characters
              </span>

              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="btn-gradient inline-flex items-center space-x-2 px-5 py-2 rounded-full text-xs font-bold text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5 text-white mr-1" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <span>Post Comment</span>
                    <PaperAirplaneIcon className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                {error}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-700 font-medium bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                {success}
              </p>
            )}
          </form>
        ) : (
          <div className="text-center py-6">
            <SparklesIcon className="h-8 w-8 text-purple-500 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-800">
              Join the conversation on Pulse
            </p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Sign in to share your thoughts, comment on stories, and interact directly with creators.
            </p>
            <Link
              href="/authenticate/sign-in"
              className="btn-gradient inline-flex items-center space-x-2 px-6 py-2 rounded-full text-xs font-bold text-white shadow-sm"
            >
              Sign In to Comment
            </Link>
          </div>
        )}
      </div>

      {/* List of Existing Comments */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">No comments yet</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Be the first to share your perspective on this piece!
            </p>
          </div>
        ) : (
          comments.map((comment, index) => {
            const authorInitials = comment.username ? comment.username.slice(0, 2).toUpperCase() : '??';
            const isAuthor = comment.username === blogAuthor;
            let timeAgo = 'Just now';
            try {
              if (comment.createdAt) {
                timeAgo = `${formatDistanceToNow(new Date(comment.createdAt))} ago`;
              }
            } catch {
              timeAgo = 'Recently';
            }

            return (
              <div
                key={comment._id || index}
                className="p-4 sm:p-5 rounded-2xl bg-white/80 border border-emerald-900/10 shadow-sm hover:border-purple-200 transition-all"
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center space-x-2.5">
                    <Link
                      href={`/profile/${comment.username}`}
                      className="flex items-center space-x-2.5 group cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-emerald-400 p-[1.5px] shrink-0 group-hover:ring-2 group-hover:ring-purple-300 transition-all">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-purple-700">
                          {authorInitials}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-sm font-bold text-slate-900 group-hover:text-purple-600 transition-colors">
                            {comment.username}
                          </span>
                          {isAuthor && (
                            <span className="inline-flex items-center space-x-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                              <CheckBadgeIcon className="h-3 w-3 mr-0.5" /> Author
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  </div>

                  <span className="text-xs text-slate-400">
                    {timeAgo}
                  </span>
                </div>

                <p className="text-sm text-slate-700 leading-relaxed pl-10 whitespace-pre-line">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
