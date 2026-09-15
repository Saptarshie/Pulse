"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import LogoutButton from '../buttons/logout-button';
import { useSelector, useDispatch } from 'react-redux';
import { setUser } from '@/store/slices/user-slice';
import { fetchUserAction } from '@/action';
import { 
  MagnifyingGlassIcon, 
  PencilSquareIcon, 
  ChartBarSquareIcon, 
  UserCircleIcon, 
  ClockIcon, 
  Cog6ToothIcon, 
  SparklesIcon, 
  CheckBadgeIcon, 
  Bars3Icon, 
  XMarkIcon, 
  ChatBubbleLeftRightIcon 
} from '@heroicons/react/24/outline';
import SocialFollowPanel from '../social-panel';
import { getUnreadMessageCount } from '@/action/messageAction';

export default function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const user = useSelector((state) => state.userslice);
  
  // States
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isDMOpen, setIsDMOpen] = useState(false);
  const [dmRecipient, setDmRecipient] = useState(null);
  const [unreadDMs, setUnreadDMs] = useState(0);
  
  // Refs for click outside detection
  const desktopMenuRef = useRef(null);
  const userButtonRef = useRef(null);
  
  // Listen for global pulse_open_dm event
  useEffect(() => {
    const handleOpenDM = (e) => {
      if (pathname === '/' || pathname.startsWith('/profile')) return; // Handled in-page by feed and profile page
      setIsDMOpen(true);
      setDmRecipient(e.detail?.username || e.detail?.recipient || null);
    };
    window.addEventListener('pulse_open_dm', handleOpenDM);
    return () => window.removeEventListener('pulse_open_dm', handleOpenDM);
  }, [pathname]);

  // Fetch unread messages
  useEffect(() => {
    if (user?.username) {
      getUnreadMessageCount().then((res) => {
        if (res?.success) setUnreadDMs(res.count || 0);
      });
    }
  }, [user?.username, isDMOpen]);
  
  // Fetch user data on component mount
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetchUserAction();
        if (response?.success && response?.user) {
          dispatch(setUser(response.user));
        }
      } catch (err) {
        console.error("Failed to load user state:", err);
      }
    };
    fetchUserData();
  }, [dispatch]);
  
  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Click outside detection for dropdown menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (!isMenuOpen) return;
      
      const isButton = userButtonRef.current && userButtonRef.current.contains(event.target);
      const isMenu = desktopMenuRef.current && desktopMenuRef.current.contains(event.target);
      
      if (!isButton && !isMenu) {
        setIsMenuOpen(false);
      }
    }
    
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);
  
  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileNavOpen(false);
    }
  };
  
  const resetNavStates = () => {
    setIsMenuOpen(false);
    setIsMobileNavOpen(false);
  };

  const isCreator = (user?.subscriberCount !== undefined && user?.subscriberCount >= 0);
  const initials = user?.username ? user.username.slice(0, 2).toUpperCase() : 'ME';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? "glass-nav shadow-sm py-2.5" 
        : "bg-white/80 backdrop-blur-md border-b border-slate-200/60 py-3"
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-10">
          
          {/* Brand / Logo */}
          <div className="flex items-center space-x-3">
            <Link href="/" onClick={resetNavStates} className="flex items-center space-x-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center shadow-md shadow-purple-500/20 group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" opacity="0.2"/>
                  <path d="M3.5 12h3.2l2.3-5.2 4 10.4 2.8-6.4 2.2 3.2h2.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-950 via-slate-900 to-emerald-950 bg-clip-text text-transparent">
                    Pulse
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                    Network
                  </span>
                </div>
              </div>
            </Link>
          </div>

          {/* Center Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <form onSubmit={handleSearch} className="w-full relative">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search stories, creators, topics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-12 py-2 text-sm bg-emerald-50/40 hover:bg-emerald-50/70 focus:bg-white text-slate-800 placeholder-slate-400 rounded-full border border-emerald-200/40 focus:border-purple-400 focus:ring-4 focus:ring-purple-500/10 focus:outline-none transition-all"
                />
                <span className="absolute right-3.5 hidden sm:inline-block text-[11px] font-mono text-slate-400 bg-white/80 px-1.5 py-0.5 rounded border border-emerald-200/40 pointer-events-none">
                  ⌘K
                </span>
              </div>
            </form>
          </div>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Direct Messages Icon Button */}
            <button
              type="button"
              onClick={() => {
                if (pathname === '/' || pathname.startsWith('/profile')) {
                  window.dispatchEvent(new CustomEvent('pulse_open_dm', { detail: { toggle: true } }));
                } else {
                  setIsDMOpen((prev) => !prev);
                  setDmRecipient(null);
                }
              }}
              className="relative p-2 rounded-full text-slate-600 hover:text-purple-700 hover:bg-purple-50/70 transition-all border border-emerald-200/40 cursor-pointer"
              title="Direct Messages"
            >
              <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
              {unreadDMs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm animate-pulse">
                  {unreadDMs}
                </span>
              )}
            </button>

            {/* Quick Post / Write Action */}
            <Link
              href="/creator-dashboard/create"
              onClick={resetNavStates}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-purple-700 hover:bg-purple-50/70 rounded-full border border-emerald-200/50 transition-all"
            >
              <PencilSquareIcon className="h-4 w-4 text-purple-600" />
              <span>Write Story</span>
            </Link>

            {/* Creator Studio CTA */}
            <Link
              href={isCreator ? "/creator-dashboard" : "/become-creator"}
              onClick={resetNavStates}
              className="btn-gradient inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-full shadow-sm"
            >
              <SparklesIcon className="h-3.5 w-3.5 text-emerald-200" />
              <span>{isCreator ? "Creator Studio" : "Join Creators"}</span>
            </Link>

            {/* User Profile Avatar Dropdown */}
            <div className="relative">
              <button
                ref={userButtonRef}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                aria-label="User menu"
                className="flex items-center justify-center w-9 h-9 rounded-full overflow-hidden bg-gradient-to-tr from-purple-50 to-emerald-50 border border-purple-200/60 text-purple-800 font-semibold text-xs hover:ring-2 hover:ring-purple-400/50 transition-all focus:outline-none"
              >
                {user?.profilePic ? (
                  <img
                    src={user.profilePic}
                    alt={user.username || 'User'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials
                )}
              </button>

              {isMenuOpen && (
                <div
                  ref={desktopMenuRef}
                  className="glass-dropdown absolute right-0 mt-2 w-64 rounded-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  {/* User info preview */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-sm shrink-0">
                        {user?.profilePic ? (
                          <img
                            src={user.profilePic}
                            alt={user.username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate flex items-center">
                          {user?.username || "Guest Creator"}
                          {isCreator && (
                            <CheckBadgeIcon className="h-4 w-4 text-indigo-500 ml-1 inline shrink-0" />
                          )}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          @{user?.username ? user.username.toLowerCase() : "pulse_user"}
                        </p>
                      </div>
                    </div>

                    {/* Subscriber badge */}
                    <div className="mt-2.5 flex items-center justify-between px-2 py-1 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                      <span>Subscribers</span>
                      <span className="font-semibold text-indigo-600">
                        {user?.subscriberCount >= 0 ? user.subscriberCount : "Reader"}
                      </span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="px-2 py-1.5 space-y-0.5 text-sm">
                    <Link
                      href="/profile"
                      onClick={resetNavStates}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                    >
                      <UserCircleIcon className="h-4 w-4 text-slate-400" />
                      <span>Your Profile</span>
                    </Link>

                    <Link
                      href={isCreator ? "/creator-dashboard" : "/become-creator"}
                      onClick={resetNavStates}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                    >
                      <ChartBarSquareIcon className="h-4 w-4 text-slate-400" />
                      <span>{isCreator ? "Creator Dashboard" : "Become a Creator"}</span>
                    </Link>

                    <Link
                      href="/history"
                      onClick={resetNavStates}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                    >
                      <ClockIcon className="h-4 w-4 text-slate-400" />
                      <span>Reading History</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={resetNavStates}
                      className="flex items-center space-x-2.5 px-3 py-2 rounded-xl text-slate-700 hover:text-indigo-600 hover:bg-indigo-50/70 transition-colors"
                    >
                      <Cog6ToothIcon className="h-4 w-4 text-slate-400" />
                      <span>Settings</span>
                    </Link>
                  </div>

                  {/* Logout Button */}
                  <div className="pt-1.5 mt-1 border-t border-slate-100 px-2">
                    <LogoutButton
                      onClick={resetNavStates}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors text-left"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center space-x-2">
            <Link
              href="/creator-dashboard/create"
              className="p-1.5 text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
              aria-label="Create Post"
            >
              <PencilSquareIcon className="h-5 w-5" />
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              aria-label="Toggle navigation"
              className="p-1.5 text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 focus:outline-none"
            >
              {isMobileNavOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {isMobileNavOpen && (
        <div className="md:hidden glass-dropdown border-b border-slate-200 px-4 pt-3 pb-5 space-y-3 animate-in fade-in slide-in-from-top-3">
          {/* Mobile Search */}
          <form onSubmit={handleSearch} className="relative">
            <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Pulse feed..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-slate-100 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </form>

          {/* Mobile CTAs */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link
              href="/creator-dashboard/create"
              onClick={resetNavStates}
              className="flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-xl"
            >
              <PencilSquareIcon className="h-4 w-4" />
              <span>Write Story</span>
            </Link>
            <Link
              href={isCreator ? "/creator-dashboard" : "/become-creator"}
              onClick={resetNavStates}
              className="btn-gradient flex items-center justify-center space-x-1.5 py-2 text-xs font-semibold rounded-xl text-white"
            >
              <SparklesIcon className="h-4 w-4" />
              <span>{isCreator ? "Studio" : "Join Creators"}</span>
            </Link>
          </div>

            <button
              type="button"
              onClick={() => {
                resetNavStates();
                if (pathname === '/' || pathname.startsWith('/profile')) {
                  window.dispatchEvent(new CustomEvent('pulse_open_dm', { detail: { toggle: true } }));
                } else {
                  setIsDMOpen(true);
                  setDmRecipient(null);
                }
              }}
              className="w-full flex items-center justify-between px-3 py-2 text-slate-700 hover:bg-purple-50 rounded-lg text-sm font-medium"
            >
              <div className="flex items-center space-x-3">
                <ChatBubbleLeftRightIcon className="h-5 w-5 text-purple-600" />
                <span>Direct Messages</span>
              </div>
              {unreadDMs > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-600 text-white">
                  {unreadDMs}
                </span>
              )}
            </button>
            <Link
              href="/profile"
              onClick={resetNavStates}
              className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              <UserCircleIcon className="h-5 w-5 text-slate-400" />
              <span>Profile (@{user?.username || "guest"})</span>
            </Link>
            <Link
              href="/history"
              onClick={resetNavStates}
              className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              <ClockIcon className="h-5 w-5 text-slate-400" />
              <span>Reading History</span>
            </Link>
            <Link
              href="/settings"
              onClick={resetNavStates}
              className="flex items-center space-x-3 px-3 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
            >
              <Cog6ToothIcon className="h-5 w-5 text-slate-400" />
              <span>Settings</span>
            </Link>
            <div className="pt-2">
              <LogoutButton
                onClick={resetNavStates}
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
              />
            </div>
          </div>
        )}

      {/* Globally Mounted Social & DM Panel (for other standalone pages e.g. /search, /settings) */}
      {pathname !== '/' && !pathname.startsWith('/profile') && (
        <SocialFollowPanel
          isOpen={isDMOpen}
          onClose={() => {
            setIsDMOpen(false);
            setDmRecipient(null);
          }}
          inPage={false}
          initialType="messages"
          username={user?.username}
        />
      )}
    </nav>
  );
}
