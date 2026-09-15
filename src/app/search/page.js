"use client";
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { searchBlogs } from '@/action/blogAction';
import { searchPeople, toggleFollowUser } from '@/action/userAction';
import BlogCard from '@/components/blog-feed/blog-card';
import { 
  MagnifyingGlassIcon, 
  SparklesIcon, 
  ArrowLeftIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  CheckIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = searchParams.get('q') || '';
  const initialTab = searchParams.get('type') || 'all'; // 'all' | 'stories' | 'people'
  
  const [searchInput, setSearchInput] = useState(query);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [blogs, setBlogs] = useState([]);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState({});

  useEffect(() => {
    setSearchInput(query);
    async function fetchResults() {
      setLoading(true);
      try {
        const [blogsRes, peopleRes] = await Promise.all([
          query ? searchBlogs(query) : Promise.resolve({ success: true, blogs: [] }),
          searchPeople(query) // returns fuzzy matches or featured creators if empty
        ]);

        if (blogsRes?.success && blogsRes?.blogs) {
          setBlogs(blogsRes.blogs);
        } else {
          setBlogs([]);
        }

        if (peopleRes?.success && peopleRes?.users) {
          setPeople(peopleRes.users);
        } else {
          setPeople([]);
        }
      } catch (err) {
        console.error("Error searching:", err);
        setBlogs([]);
        setPeople([]);
      } finally {
        setLoading(false);
      }
    }

    fetchResults();
  }, [query]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchInput.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchInput.trim())}`);
    }
  };

  const handleToggleFollow = async (person) => {
    setFollowLoading(prev => ({ ...prev, [person.username]: true }));
    try {
      const res = await toggleFollowUser(person.username);
      if (res?.success) {
        setPeople(prev => prev.map(p => {
          if (p.username === person.username) {
            return {
              ...p,
              isFollowing: res.action === 'followed',
              followersCount: res.action === 'followed' ? p.followersCount + 1 : Math.max(0, p.followersCount - 1)
            };
          }
          return p;
        }));
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setFollowLoading(prev => ({ ...prev, [person.username]: false }));
    }
  };

  const openDMWith = (username) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('pulse_open_dm', { detail: { username, recipient: username } }));
    }
  };

  const SUGGESTED_TAGS = ["AI", "Web3", "NextJS", "Design", "Crypto", "Tutorials"];

  const showStories = activeTab === 'all' || activeTab === 'stories';
  const showPeople = activeTab === 'all' || activeTab === 'people';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Pulse Feed</span>
      </Link>

      {/* Search Header */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm mb-8">
        <form onSubmit={handleSearchSubmit} className="max-w-2xl">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
            Search Stories & People
          </label>
          <div className="relative flex items-center">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400 absolute left-4 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by name, username, topic, or keyword..."
              className="w-full pl-12 pr-28 py-3.5 text-sm sm:text-base bg-slate-50 hover:bg-white focus:bg-white text-slate-900 rounded-2xl border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all shadow-inner"
            />
            <button
              type="submit"
              className="absolute right-2.5 btn-gradient px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm"
            >
              Search
            </button>
          </div>
        </form>

        {/* Popular searches suggestions */}
        <div className="flex items-center flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">Trending searches:</span>
          {SUGGESTED_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSearchInput(tag);
                router.push(`/search?q=${encodeURIComponent(tag)}`);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors"
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-4 mb-6">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Results ({blogs.length + people.length})
          </button>
          <button
            onClick={() => setActiveTab('people')}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'people'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserGroupIcon className="h-4 w-4" />
            <span>People ({people.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all ${
              activeTab === 'stories'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <DocumentTextIcon className="h-4 w-4" />
            <span>Stories ({blogs.length})</span>
          </button>
        </div>

        <p className="text-xs text-slate-500 hidden sm:block">
          {query ? `Showing results for "${query}"` : "Showing featured creators & content"}
        </p>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-slate-200 animate-pulse flex items-center space-x-4">
                <div className="w-12 h-12 bg-slate-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-1/2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card rounded-2xl p-5 border border-slate-200 animate-pulse space-y-3">
                <div className="h-44 bg-slate-200 rounded-xl" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-200 rounded w-full" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* SECTION: People Results */}
          {showPeople && people.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <UserGroupIcon className="h-5 w-5 text-indigo-600" />
                  <span>People & Creators ({people.length})</span>
                </h3>
                {query && (
                  <span className="text-xs text-slate-400 font-medium">
                    Includes exact and similar matches
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {people.map((person) => {
                  const initial = (person.name || person.username || 'U').slice(0, 2).toUpperCase();
                  const isMatchSimilar = person.matchType === 'similar';

                  return (
                    <div
                      key={person._id}
                      className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/90 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <Link
                            href={`/profile/${person.username}`}
                            className="flex items-center space-x-3 min-w-0 group cursor-pointer"
                          >
                            {person.profilePic ? (
                              <img
                                src={person.profilePic}
                                alt={person.username}
                                className="w-12 h-12 rounded-2xl object-cover ring-2 ring-indigo-100 shrink-0 group-hover:ring-indigo-300 transition-all"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                                {initial}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                                {person.name || person.username}
                              </h4>
                              <p className="text-xs text-indigo-600 font-medium truncate">
                                @{person.username}
                              </p>
                            </div>
                          </Link>

                          {/* Match badge */}
                          {person.matchType && person.matchType !== 'featured' && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                              person.matchType === 'exact' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : isMatchSimilar
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}>
                              {person.matchType === 'exact' ? 'Exact Match' : isMatchSimilar ? 'Similar Match' : 'Keyword Match'}
                            </span>
                          )}
                        </div>

                        {/* Bio */}
                        {person.bio && (
                          <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                            {person.bio}
                          </p>
                        )}

                        {/* Social stats */}
                        <div className="flex items-center space-x-4 mt-3 text-xs text-slate-500">
                          <div>
                            <span className="font-bold text-slate-800">{person.followersCount}</span> followers
                          </div>
                          <div>
                            <span className="font-bold text-slate-800">{person.storiesCount || 0}</span> stories
                          </div>
                        </div>
                      </div>

                      {/* Card Actions: Follow & Message */}
                      <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100">
                        <button
                          onClick={() => handleToggleFollow(person)}
                          disabled={followLoading[person.username]}
                          className={`flex-1 inline-flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            person.isFollowing
                              ? 'bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {person.isFollowing ? (
                            <>
                              <CheckIcon className="h-3.5 w-3.5" />
                              <span>Following</span>
                            </>
                          ) : (
                            <>
                              <UserPlusIcon className="h-3.5 w-3.5" />
                              <span>Follow</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => openDMWith(person.username)}
                          title={`Message @${person.username}`}
                          className="inline-flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                        >
                          <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                          <span>Message</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: Stories Results */}
          {showStories && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center space-x-2">
                  <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                  <span>Stories & Articles ({blogs.length})</span>
                </h3>
              </div>

              {blogs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {blogs.map((blog) => (
                    <BlogCard key={blog._id} blog={blog} />
                  ))}
                </div>
              ) : (
                activeTab === 'stories' && (
                  <div className="text-center py-12 glass-card rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
                    <DocumentTextIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <h4 className="text-sm font-bold text-slate-800">No stories match this search</h4>
                    <p className="text-xs text-slate-500 mt-1">Try other keywords or check people results above.</p>
                  </div>
                )
              )}
            </div>
          )}

          {/* Empty state when neither people nor blogs matched */}
          {blogs.length === 0 && people.length === 0 && (
            <div className="text-center py-16 glass-card rounded-3xl border border-slate-200 p-8 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                No matching results found
              </h3>
              <p className="text-slate-500 text-xs sm:text-sm mb-6 leading-relaxed">
                We couldn&apos;t find any stories or people matching &quot;{query}&quot;. Try searching with broader keywords, or explore our trending feed.
              </p>
              <Link
                href="/"
                className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
              >
                <span>Explore Trending Feed</span>
              </Link>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

export default function SearchResults() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

