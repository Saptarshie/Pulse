"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import BlogCard from "../blog-card";
import { fetchBlogs, fetchBookmarkedBlogs } from "@/action/blogAction";
import {
  getPeopleYouMightKnow,
  toggleFollowUser,
  getUserFollowStats,
  getUserFollowList
} from "@/action/userAction";
import SocialFollowPanel from "@/components/social-panel";
import {
  FireIcon,
  SparklesIcon,
  BoltIcon,
  BookmarkIcon,
  ClockIcon,
  PencilSquareIcon,
  ChartBarSquareIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  PhotoIcon,
  CpuChipIcon,
  UserPlusIcon,
  CheckIcon,
  AdjustmentsHorizontalIcon,
  UserGroupIcon,
  ArrowPathIcon,
  CameraIcon,
  XMarkIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";

export default function BlogList({ initialTrending }) {
  const router = useRouter();
  const user = useSelector((state) => state.userslice);

  // States
  const [blogs, setBlogs] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState("for-you"); // "for-you", "following", "trending", "premium", "bookmarks"
  const [selectedTopic, setSelectedTopic] = useState("All");
  const [followedCreators, setFollowedCreators] = useState({});

  // People You Might Know & Follow States
  const [peopleYouMightKnow, setPeopleYouMightKnow] = useState([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [followStats, setFollowStats] = useState({ followersCount: 0, followingCount: 0 });
  const [followPanelOpen, setFollowPanelOpen] = useState(false);
  const [followPanelType, setFollowPanelType] = useState('followers');

  useEffect(() => {
    const handleOpenFollow = (e) => {
      if (e.detail?.type) {
        setFollowPanelType(e.detail.type);
      }
      setFollowPanelOpen(true);
    };
    window.addEventListener("pulse_open_follow_panel", handleOpenFollow);
    return () => window.removeEventListener("pulse_open_follow_panel", handleOpenFollow);
  }, []);

  // Real-time trending data
  const [trendingTopics, setTrendingTopics] = useState(initialTrending?.trendingTopics || []);
  const [suggestedCreators, setSuggestedCreators] = useState(initialTrending?.featuredCreators || []);

  useEffect(() => {
    if (!initialTrending?.trendingTopics || initialTrending.trendingTopics.length === 0) {
      import("@/action/trendingAction").then(({ getTrendingTopicsAndCreators }) => {
        getTrendingTopicsAndCreators().then((res) => {
          if (res?.success) {
            if (res.trendingTopics?.length) setTrendingTopics(res.trendingTopics);
            if (res.featuredCreators?.length) setSuggestedCreators(res.featuredCreators);
          }
        });
      });
    }
  }, [initialTrending]);

  const observerRef = useRef(null);
  const lastBlogRef = useRef(null);

  const availableChips = useMemo(() => {
    const list = ["All"];
    if (Array.isArray(trendingTopics) && trendingTopics.length > 0) {
      trendingTopics.forEach((t) => {
        const name = t.rawTag || t.tag;
        if (!list.includes(name)) list.push(name);
      });
    }
    ["AI", "Dharma", "Gita", "Lord", "TechNews", "Growth"].forEach((def) => {
      if (!list.some((item) => item.toLowerCase() === def.toLowerCase())) {
        list.push(def);
      }
    });
    return list;
  }, [trendingTopics]);

  // Load blogs with filters
  const loadMoreBlogs = async (reset = false, customTab = activeTab, customTopic = selectedTopic) => {
    if (loading) return;
    if (!reset && !hasMore) return;

    setLoading(true);
    const targetPage = reset ? 1 : page;

    try {
      if (customTab === "bookmarks") {
        let localIds = [];
        if (typeof window !== "undefined") {
          try {
            localIds = JSON.parse(localStorage.getItem('pulse_bookmarks') || '[]');
          } catch (e) {
            // ignore
          }
        }
        const response = await fetchBookmarkedBlogs(localIds);
        if (response?.success) {
          let incoming = response.blogs || [];
          if (customTopic !== "All") {
            const topicRegex = new RegExp(customTopic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
            incoming = incoming.filter((b) => 
              (Array.isArray(b.tags) && b.tags.some((t) => topicRegex.test(t))) ||
              topicRegex.test(b.title || "") ||
              topicRegex.test(b.description || "")
            );
          }
          setBlogs(incoming);
        } else {
          setBlogs([]);
        }
        setHasMore(false);
        setLoading(false);
        return;
      }

      const filters = {};
      if (customTab === "premium") {
        filters.isPremium = true;
      } else if (customTab === "trending") {
        filters.tab = "trending";
      }
      if (customTopic !== "All") {
        filters.topic = customTopic;
        filters.tags = [customTopic];
      }

      const response = await fetchBlogs(targetPage, 8, filters);

      if (response?.success) {
        const incoming = response.blogs || [];
        if (incoming.length === 0) {
          if (reset) setBlogs([]);
          setHasMore(false);
        } else {
          setBlogs((prev) => (reset ? incoming : [...prev, ...incoming]));
          setPage(targetPage + 1);
          if (incoming.length < 8) {
            setHasMore(false);
          }
        }
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading social feed:", error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadMoreBlogs(true, activeTab, selectedTopic);
  }, [activeTab, selectedTopic]);

  // Listen for real-time bookmark updates across cards
  useEffect(() => {
    const handleBookmarkChange = () => {
      if (activeTab === "bookmarks") {
        loadMoreBlogs(true, "bookmarks", selectedTopic);
      }
    };
    window.addEventListener("pulse_bookmark_changed", handleBookmarkChange);
    return () => window.removeEventListener("pulse_bookmark_changed", handleBookmarkChange);
  }, [activeTab, selectedTopic]);

  // Infinite Scroll Observer
  useEffect(() => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreBlogs(false);
        }
      },
      { threshold: 0.2 }
    );

    if (lastBlogRef.current) {
      observerRef.current.observe(lastBlogRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [loading, hasMore, blogs]);

  // Load People You Might Know & Follow Stats on mount / user change
  useEffect(() => {
    getPeopleYouMightKnow(8).then((res) => {
      if (res?.success && res.people) {
        setPeopleYouMightKnow(res.people);
      }
    });

    if (user?.username) {
      getUserFollowStats(user.username).then((res) => {
        if (res?.success) {
          setFollowStats({
            followersCount: res.followersCount || 0,
            followingCount: res.followingCount || 0
          });
        }
      });
    }
  }, [user?.username]);

  // Handle Follow Toggle with Real Database Sync
  const handleToggleFollow = async (targetUsername) => {
    if (!user?.username) {
      router.push("/authenticate/sign-in");
      return;
    }

    const currentStatus = followedCreators[targetUsername] ?? false;
    setFollowedCreators((prev) => ({
      ...prev,
      [targetUsername]: !currentStatus,
    }));

    try {
      const res = await toggleFollowUser(targetUsername);
      if (res?.success) {
        setFollowedCreators((prev) => ({
          ...prev,
          [targetUsername]: res.isFollowing,
        }));
        if (res.followingCount !== undefined) {
          setFollowStats((prev) => ({ ...prev, followingCount: res.followingCount }));
        }
      } else {
        // Rollback
        setFollowedCreators((prev) => ({
          ...prev,
          [targetUsername]: currentStatus,
        }));
      }
    } catch (err) {
      console.error("Failed to follow creator:", err);
      setFollowedCreators((prev) => ({
        ...prev,
        [targetUsername]: currentStatus,
      }));
    }
  };

  // Open Direct Message modal with user
  const openDMWith = (targetUsername) => {
    if (!user?.username) {
      router.push("/authenticate/sign-in");
      return;
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pulse_open_dm", { detail: { username: targetUsername } })
      );
    }
  };

  // Dismiss person card from hero section
  const dismissPerson = (targetUsername) => {
    setPeopleYouMightKnow((prev) => prev.filter((p) => p.username !== targetUsername));
  };

  // Shuffle / Refresh recommendations with stochasticity
  const handleShuffleRecommendations = async () => {
    if (isShuffling) return;
    setIsShuffling(true);
    try {
      const res = await getPeopleYouMightKnow(8);
      if (res?.success && res.people) {
        setPeopleYouMightKnow(res.people);
      }
    } catch (err) {
      console.error("Error shuffling recommendations:", err);
    } finally {
      setIsShuffling(false);
    }
  };

  // Open Followers/Following Side Panel
  const openFollowPanel = (type) => {
    if (!user?.username) {
      router.push("/authenticate/sign-in");
      return;
    }
    setFollowPanelType(type);
    setFollowPanelOpen(true);
  };

  const isCreator = user?.subscriberCount !== undefined && user?.subscriberCount >= 0;
  const userInitials = user?.username ? user.username.slice(0, 2).toUpperCase() : "ME";

  return (
    <div
      className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-all duration-300 ${
        followPanelOpen ? "max-w-[1720px] 2xl:max-w-[1800px]" : "max-w-7xl"
      }`}
    >
      
      {/* Responsive Multi-Column Social Layout */}
      <div className="flex flex-col lg:flex-row gap-6 xl:gap-7 items-start justify-center">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: Social Hub & Creator Identity (Desktop)      */}
        {/* ========================================================= */}
        <aside className="hidden lg:block w-64 xl:w-72 shrink-0 sticky top-20 space-y-5">
          
          {/* User Mini Profile Card */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <Link
              href={user?.username ? `/profile/${user.username}` : "/profile"}
              className="flex items-center space-x-3 mb-4 group cursor-pointer"
            >
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-[2px] shadow-sm shrink-0">
                <div suppressHydrationWarning className="w-full h-full rounded-full bg-white flex items-center justify-center font-bold text-indigo-700 text-sm overflow-hidden">
                  {user?.profilePic ? (
                    <img src={user.profilePic} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    userInitials
                  )}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p suppressHydrationWarning className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate flex items-center">
                  {user?.name || user?.username || "Guest Reader"}
                  {isCreator && (
                    <CheckBadgeIcon className="h-4 w-4 text-indigo-500 ml-1 shrink-0" />
                  )}
                </p>
                <p suppressHydrationWarning className="text-xs text-slate-500 truncate">
                  @{user?.username ? user.username.toLowerCase() : "pulse_member"}
                </p>
              </div>
            </Link>

            {/* Quick Stats: Followers | Following | Stories */}
            <div className="grid grid-cols-3 gap-1 py-2 px-1 rounded-xl bg-slate-50 border border-slate-100 mb-4 text-center">
              <button
                type="button"
                onClick={() => openFollowPanel('followers')}
                className="hover:bg-white rounded-lg py-1 transition-colors group"
                title="View Followers in Side Panel"
              >
                <p className="text-[10px] text-slate-500 group-hover:text-purple-600">Followers</p>
                <p suppressHydrationWarning className="text-xs sm:text-sm font-bold text-slate-900">
                  {followStats.followersCount}
                </p>
              </button>
              <button
                type="button"
                onClick={() => openFollowPanel('following')}
                className="hover:bg-white rounded-lg py-1 transition-colors group"
                title="View Following in Side Panel"
              >
                <p className="text-[10px] text-slate-500 group-hover:text-purple-600">Following</p>
                <p suppressHydrationWarning className="text-xs sm:text-sm font-bold text-slate-900">
                  {followStats.followingCount}
                </p>
              </button>
              <div className="py-1">
                <p className="text-[10px] text-slate-500">Stories</p>
                <p suppressHydrationWarning className="text-xs sm:text-sm font-bold text-slate-900">
                  {user?.blogs?.length || 0}
                </p>
              </div>
            </div>

            {/* Direct Write Story Button */}
            <Link
              href="/creator-dashboard/create"
              className="btn-gradient w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-semibold text-white shadow-sm"
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span>Create New Story</span>
            </Link>
          </div>

          {/* Social Nav Navigation Pills */}
          <nav className="glass-card rounded-2xl p-2.5 border border-emerald-900/10 space-y-1 text-sm">
            <button
              onClick={() => {
                setActiveTab("for-you");
                setSelectedTopic("All");
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "for-you"
                  ? "bg-gradient-to-r from-purple-100/90 to-emerald-50/80 text-purple-950 font-bold border border-purple-200/60 shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900"
              }`}
            >
              <FireIcon className="h-5 w-5 text-purple-600" />
              <span>For You Feed</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("trending");
                setSelectedTopic("All");
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "trending"
                  ? "bg-gradient-to-r from-purple-100/90 to-emerald-50/80 text-purple-950 font-bold border border-purple-200/60 shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900"
              }`}
            >
              <BoltIcon className="h-5 w-5 text-amber-500" />
              <span>Trending Now</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("premium");
                setSelectedTopic("All");
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "premium"
                  ? "bg-gradient-to-r from-purple-100/90 to-emerald-50/80 text-purple-950 font-bold border border-purple-200/60 shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900"
              }`}
            >
              <SparklesIcon className="h-5 w-5 text-emerald-600" />
              <span>Premium Exclusives</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("bookmarks");
                setSelectedTopic("All");
              }}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium transition-all ${
                activeTab === "bookmarks"
                  ? "bg-gradient-to-r from-purple-100/90 to-emerald-50/80 text-purple-950 font-bold border border-purple-200/60 shadow-sm"
                  : "text-slate-600 hover:bg-emerald-50/50 hover:text-slate-900"
              }`}
            >
              <BookmarkIcon className={`h-5 w-5 ${activeTab === "bookmarks" ? "text-purple-700 fill-purple-600" : "text-slate-400"}`} />
              <span>Saved Bookmarks</span>
            </button>

            <Link
              href="/history"
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ClockIcon className="h-5 w-5 text-slate-400" />
              <span>Reading History</span>
            </Link>

            <Link
              href={isCreator ? "/creator-dashboard" : "/become-creator"}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <ChartBarSquareIcon className="h-5 w-5 text-indigo-500" />
              <span>{isCreator ? "Creator Dashboard" : "Monetize Content"}</span>
            </Link>
          </nav>

          {/* Platform Tagline Footer */}
          <div className="px-3 text-xs text-slate-400 space-y-1">
            <p className="font-semibold text-slate-500">Pulse Content Network © 2026</p>
            <p>Empowering decentralized writers, thinkers, and builders.</p>
          </div>

        </aside>

        {/* ========================================================= */}
        {/* CENTER COLUMN: Interactive Feed Stream                    */}
        {/* ========================================================= */}
        <main className="min-w-0 flex-1 max-w-2xl xl:max-w-3xl space-y-5">
          
          {/* Quick Story Composer Box */}
          <div className="glass-card rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div suppressHydrationWarning className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                {userInitials}
              </div>
              <Link
                href="/creator-dashboard/create"
                className="flex-1 px-4 py-2.5 text-sm bg-slate-100/90 hover:bg-slate-100 text-slate-500 rounded-full border border-slate-200/70 transition-all text-left truncate"
              >
                Share an insight, breakdown, or story with Pulse...
              </Link>
            </div>

            {/* Quick Composer Action Triggers */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <Link
                  href="/creator-dashboard/create"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                >
                  <PencilSquareIcon className="h-4 w-4 text-indigo-500" />
                  <span className="font-medium">Rich Story</span>
                </Link>

                <Link
                  href="/creator-dashboard/create"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                >
                  <PhotoIcon className="h-4 w-4 text-emerald-500" />
                  <span className="font-medium">Media Post</span>
                </Link>

                <Link
                  href="/creator-dashboard/create"
                  className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg hover:bg-purple-50 hover:text-purple-600 transition-colors"
                >
                  <CpuChipIcon className="h-4 w-4 text-purple-500" />
                  <span className="font-medium">AI Co-Write</span>
                </Link>
              </div>

              <Link
                href="/creator-dashboard/create"
                className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-slate-900 text-white font-medium hover:bg-indigo-600 transition-colors"
              >
                Publish
              </Link>
            </div>
          </div>

          {/* "PEOPLE YOU MIGHT KNOW" HERO SECTION (Graph-based Friends of Friends) */}
          {peopleYouMightKnow.length > 0 && (
            <div className="glass-card rounded-3xl p-5 border border-slate-200/90 shadow-sm relative overflow-hidden bg-gradient-to-br from-white/95 via-purple-50/20 to-emerald-50/20">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
                    <UserGroupIcon className="h-4 w-4 stroke-2" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center">
                      People You Might Know
                      <span className="ml-2 text-[10px] font-bold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                        Network
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Discovered via friends & mutual interests
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleShuffleRecommendations}
                  disabled={isShuffling}
                  className="inline-flex items-center space-x-1 text-xs text-purple-700 hover:text-purple-900 font-semibold px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                  title="Discover more people (stochastic re-ranking)"
                >
                  <ArrowPathIcon className={`h-3.5 w-3.5 ${isShuffling ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Horizontal Scrollable Hero Cards Deck */}
              <div className="flex items-stretch space-x-3.5 overflow-x-auto pb-2 scrollbar-none no-scrollbar pt-1">
                {peopleYouMightKnow.map((person) => {
                  const initials = (person.name || person.username || 'U').slice(0, 2).toUpperCase();
                  const isFollowing = followedCreators[person.username] ?? person.isFollowing;

                  return (
                    <div
                      key={person._id || person.username}
                      className="w-48 sm:w-52 shrink-0 glass-card rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200 transition-all bg-white/95 group relative"
                    >
                      {/* Dismiss button */}
                      <button
                        onClick={() => dismissPerson(person.username)}
                        className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 p-1 transition-colors"
                        title="Dismiss"
                      >
                        <XMarkIcon className="h-3.5 w-3.5" />
                      </button>

                      {/* Avatar & User Info - Clickable to Profile */}
                      <Link
                        href={`/profile/${person.username}`}
                        className="flex flex-col items-center text-center mt-1 group cursor-pointer hover:opacity-90 transition-opacity"
                        title={`View @${person.username}'s Profile`}
                      >
                        <div className="relative mb-2">
                          {person.profilePic ? (
                            <img
                              src={person.profilePic}
                              alt={person.username}
                              className="w-14 h-14 rounded-2xl object-cover shadow-sm border border-slate-100 group-hover:ring-2 group-hover:ring-purple-400 transition-all"
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white text-base font-bold shadow-sm group-hover:scale-105 transition-transform">
                              {initials}
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white" />
                        </div>

                        <p className="font-bold text-slate-900 text-xs truncate max-w-full group-hover:text-purple-700 transition-colors">
                          {person.name || person.username}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate max-w-full">
                          @{person.username}
                        </p>

                        {/* Connection reason tag */}
                        <span className="mt-2 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-full line-clamp-1 max-w-full">
                          {person.reason || "Active Creator"}
                        </span>
                      </Link>

                      {/* Actions: Follow + Message */}
                      <div className="mt-3.5 pt-2.5 border-t border-slate-100/80 flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFollow(person.username);
                          }}
                          className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                            isFollowing
                              ? 'bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-600'
                              : 'btn-gradient text-white shadow-xs'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDMWith(person.username);
                          }}
                          className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors shrink-0"
                          title={`Message @${person.username}`}
                        >
                          <ChatBubbleLeftRightIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STICKY FEED CATEGORY & TOPICS BAR (Sticks just below Nav) */}
          {/* ========================================================= */}
          <div className="sticky top-16 z-30 pt-2 pb-2.5 bg-slate-50/95 backdrop-blur-md -mx-2 px-2 sm:-mx-0 sm:px-0 border-b border-slate-200/80 shadow-xs space-y-2">
            {/* Social Feed Tabs */}
            <div className="flex items-center justify-between border-b border-emerald-900/10 pb-1">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => setActiveTab("for-you")}
                  className={`pb-2 px-3 text-sm font-bold relative transition-all ${
                    activeTab === "for-you"
                      ? "text-purple-950"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>For You</span>
                  {activeTab === "for-you" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("trending")}
                  className={`pb-2 px-3 text-sm font-bold relative transition-all ${
                    activeTab === "trending"
                      ? "text-purple-950"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>🔥 Trending</span>
                  {activeTab === "trending" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("premium")}
                  className={`pb-2 px-3 text-sm font-bold relative transition-all ${
                    activeTab === "premium"
                      ? "text-purple-950"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>💎 Premium</span>
                  {activeTab === "premium" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full" />
                  )}
                </button>

                <button
                  onClick={() => setActiveTab("bookmarks")}
                  className={`pb-2 px-3 text-sm font-bold relative transition-all ${
                    activeTab === "bookmarks"
                      ? "text-purple-950"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <span>🔖 Bookmarks</span>
                  {activeTab === "bookmarks" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-emerald-500 rounded-full" />
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {blogs.length} {activeTab === "bookmarks" ? "saved" : "stories"}
              </div>
            </div>

            {/* Topic Filter Chips */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
              {availableChips.map((topic) => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs transition-all ${
                    selectedTopic === topic
                      ? "bg-gradient-to-r from-purple-700 to-emerald-700 text-white shadow-sm shadow-purple-600/20 font-bold"
                      : "bg-white/90 text-slate-700 hover:bg-emerald-50/80 border border-emerald-900/10 font-medium"
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Main Feed Content Stream */}
          <div className="space-y-6">
            {blogs.map((blog, index) => {
              const isLast = index === blogs.length - 1;
              return (
                <div
                  key={`${blog._id || index}-${index}`}
                  ref={isLast ? lastBlogRef : null}
                >
                  <BlogCard blog={blog} />
                </div>
              );
            })}
          </div>

          {/* Loading Skeletons */}
          {loading && (
            <div className="space-y-4 pt-2">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="glass-card rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-4"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-slate-200 rounded-full" />
                    <div className="space-y-2 flex-1">
                      <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                      <div className="h-2.5 bg-slate-200 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 rounded w-3/4" />
                  <div className="h-32 bg-slate-200 rounded-xl" />
                  <div className="h-3 bg-slate-200 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* End of Feed: You're all caught up */}
          {!hasMore && blogs.length > 0 && (
            <div className="p-8 text-center glass-card rounded-2xl border border-slate-200/80 my-8">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckIcon className="h-6 w-6 stroke-2" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                You're all caught up!
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                You've seen all the latest stories in this section. Follow more creators or share your own thoughts!
              </p>
              <Link
                href="/creator-dashboard/create"
                className="mt-4 inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors"
              >
                <PencilSquareIcon className="h-4 w-4" />
                <span>Write the Next Story</span>
              </Link>
            </div>
          )}

          {/* Empty State */}
          {!hasMore && blogs.length === 0 && (
            <div className="text-center py-16 glass-card rounded-2xl border border-slate-200/80 p-8">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                {activeTab === "bookmarks" ? (
                  <BookmarkIcon className="h-8 w-8 text-purple-600 fill-purple-600" />
                ) : (
                  <SparklesIcon className="h-8 w-8" />
                )}
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {activeTab === "bookmarks"
                  ? "No bookmarked stories yet"
                  : "No stories found in this channel"}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {activeTab === "bookmarks"
                  ? "Tap the bookmark icon on any story card to save it here for later reading."
                  : "Be the pioneer creator to publish the first story here!"}
              </p>
              {activeTab === "bookmarks" ? (
                <button
                  onClick={() => {
                    setActiveTab("for-you");
                    setSelectedTopic("All");
                  }}
                  className="btn-gradient inline-flex items-center space-x-2 mt-5 px-5 py-2.5 rounded-full text-xs font-semibold text-white shadow-sm"
                >
                  <span>Explore Stories</span>
                </button>
              ) : (
                <Link
                  href="/creator-dashboard/create"
                  className="btn-gradient inline-flex items-center space-x-2 mt-5 px-5 py-2.5 rounded-full text-xs font-semibold text-white shadow-sm"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  <span>Start Writing on Pulse</span>
                </Link>
              )}
            </div>
          )}

        </main>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: Trending Topics & Creator Network (Desktop) */}
        {/* ========================================================= */}
        <aside className="hidden lg:block w-72 xl:w-80 shrink-0 sticky top-20 space-y-5">
          
          {/* On lg viewports (1024-1279px where 4 columns wouldn't fit side-by-side): show in-page follow panel here */}
          {followPanelOpen && (
            <div className="block xl:hidden mb-5 animate-in fade-in slide-in-from-top-3 duration-200">
              <SocialFollowPanel
                isOpen={true}
                inPage={true}
                onClose={() => setFollowPanelOpen(false)}
                username={user?.username}
                initialType={followPanelType}
              />
            </div>
          )}
          
          {/* Trending Topics Widget */}
          <div className="glass-card rounded-2xl p-5 border border-slate-200/80 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Trending Topics</h3>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                Live
              </span>
            </div>

            <div className="space-y-2.5">
              {trendingTopics.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Calculating network trends...</p>
              ) : (
                trendingTopics.map((topic) => (
                  <button
                    key={topic.tag}
                    onClick={() => {
                      setSelectedTopic(topic.rawTag || topic.tag);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="w-full flex items-center justify-between text-left group hover:bg-emerald-50/70 p-2 rounded-xl transition-all"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors truncate">
                        #{topic.tag}
                      </p>
                      <p className="text-[11px] text-slate-400">{topic.count}</p>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50 shrink-0">
                      {topic.growth}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Top Creators to Follow */}
          <div className="glass-card rounded-2xl p-5 border border-emerald-900/10 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Featured Creators</h3>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setFollowPanelType("following");
                    setFollowPanelOpen((prev) => !prev);
                  }}
                  className="text-xs font-semibold text-purple-700 hover:text-purple-900 cursor-pointer"
                  title="Toggle your social network connections pane"
                >
                  {followPanelOpen ? "Hide Network" : "My Network"}
                </button>
                <span className="text-slate-300">•</span>
                <Link href="/become-creator" className="text-xs font-semibold text-slate-500 hover:text-slate-800 hover:underline">
                  Join
                </Link>
              </div>
            </div>

            <div className="space-y-3.5">
              {suggestedCreators.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">Discovering creators...</p>
              ) : (
                suggestedCreators.map((creator) => {
                  const isFollowing = followedCreators[creator.handle];
                  return (
                    <div key={creator.handle} className="flex items-center justify-between gap-2">
                      <Link
                        href={`/profile/${creator.handle}`}
                        className="flex items-center space-x-2.5 min-w-0 hover:opacity-80 transition-opacity group cursor-pointer"
                        title={`View @${creator.handle}'s Profile`}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                          {creator.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                            {creator.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {creator.role} • {creator.subs}
                          </p>
                        </div>
                      </Link>

                      <button
                        type="button"
                        onClick={() => toggleFollow(creator.handle)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold transition-all shrink-0 ${
                          isFollowing
                            ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            : "bg-emerald-950 text-white hover:bg-purple-700 shadow-sm"
                        }`}
                      >
                        {isFollowing ? "Following" : "Follow"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Web3 Creator Economy Spotlight Card */}
          <div className="rounded-2xl p-5 bg-gradient-to-br from-emerald-950 via-slate-900 to-purple-950 text-white shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-24 h-24 bg-purple-500/20 rounded-full blur-xl pointer-events-none" />
            
            <div className="flex items-center space-x-2 mb-2">
              <CurrencyDollarIcon className="h-5 w-5 text-emerald-300" />
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-300">
                Web3 Creator Monetization
              </span>
            </div>

            <h4 className="text-sm font-bold leading-snug mb-1.5">
              Get paid in Sepolia ETH directly from your readers
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Set your own subscription price, keep 100% of community direct support, and distribute exclusive content.
            </p>

            <Link
              href={isCreator ? "/creator-dashboard/earnings" : "/become-creator"}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white text-slate-900 text-xs font-bold hover:bg-emerald-50 transition-colors shadow"
            >
              <span>{isCreator ? "View Earnings" : "Start Monetizing"}</span>
              <span>→</span>
            </Link>
          </div>

        </aside>

        {/* ========================================================= */}
        {/* IN-PAGE 4TH COLUMN: Network Connections (Desktop xl+)     */}
        {/* Placed in the same page, on the right side of the pane!   */}
        {/* ========================================================= */}
        {followPanelOpen && (
          <aside className="hidden xl:block w-80 2xl:w-[350px] shrink-0 sticky top-20 animate-in fade-in slide-in-from-right-4 duration-300">
            <SocialFollowPanel
              isOpen={true}
              inPage={true}
              onClose={() => setFollowPanelOpen(false)}
              username={user?.username}
              initialType={followPanelType}
            />
          </aside>
        )}

      </div>

      {/* Dedicated Clean Mobile View (< lg) when opened on mobile screens */}
      {followPanelOpen && (
        <div className="block lg:hidden">
          <SocialFollowPanel
            isOpen={true}
            inPage={false}
            onClose={() => setFollowPanelOpen(false)}
            username={user?.username}
            initialType={followPanelType}
          />
        </div>
      )}

    </div>
  );
}