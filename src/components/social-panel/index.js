"use client";
import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { getUserFollowList, toggleFollowUser } from "@/action/userAction";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserPlusIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon
} from "@heroicons/react/24/outline";

export default function SocialFollowPanel({
  isOpen,
  onClose,
  username: initialUsername,
  initialType = "followers",
  inPage = false,
  className = ""
}) {
  const router = useRouter();
  const currentUser = useSelector((state) => state.userslice);

  const [panelOpen, setPanelOpen] = useState(isOpen || false);
  const [targetUsername, setTargetUsername] = useState(initialUsername || "");
  const [activeTab, setActiveTab] = useState(initialType);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [followLoading, setFollowLoading] = useState({});

  // Listen to global pulse_open_follow_panel events
  useEffect(() => {
    const handleOpen = (e) => {
      if (e.detail?.username) {
        setTargetUsername(e.detail.username);
        if (e.detail.type) setActiveTab(e.detail.type);
        setPanelOpen(true);
      }
    };

    window.addEventListener("pulse_open_follow_panel", handleOpen);
    return () => window.removeEventListener("pulse_open_follow_panel", handleOpen);
  }, []);

  useEffect(() => {
    if (isOpen !== undefined) setPanelOpen(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (initialUsername) setTargetUsername(initialUsername);
  }, [initialUsername]);

  useEffect(() => {
    if (initialType) setActiveTab(initialType);
  }, [initialType]);

  // Load followers or following list
  useEffect(() => {
    if (!panelOpen || !targetUsername) return;

    let isMounted = true;
    async function loadData() {
      setLoading(true);
      try {
        const res = await getUserFollowList(targetUsername, activeTab);
        if (isMounted) {
          if (res?.success) {
            setUsers(res.users || []);
          } else {
            setUsers([]);
          }
        }
      } catch (err) {
        console.error("Failed to load follow list:", err);
        if (isMounted) setUsers([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, [panelOpen, targetUsername, activeTab]);

  const handleClose = () => {
    setPanelOpen(false);
    if (onClose) onClose();
  };

  const handleToggleFollow = async (person) => {
    setFollowLoading((prev) => ({ ...prev, [person.username]: true }));
    try {
      const res = await toggleFollowUser(person.username);
      if (res?.success) {
        setUsers((prev) =>
          prev.map((u) => {
            if (u.username === person.username) {
              return {
                ...u,
                isFollowing: res.action === "followed",
                followersCount:
                  res.action === "followed"
                    ? u.followersCount + 1
                    : Math.max(0, u.followersCount - 1),
              };
            }
            return u;
          })
        );
      }
    } catch (err) {
      console.error("Follow toggle failed:", err);
    } finally {
      setFollowLoading((prev) => ({ ...prev, [person.username]: false }));
    }
  };

  const openDMWith = (username) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pulse_open_dm", {
          detail: { username, recipient: username },
        })
      );
    }
  };

  const navigateToProfile = (username) => {
    if (!inPage) handleClose();
    router.push(`/profile/${username}`);
  };

  const filteredUsers = users.filter((u) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.bio || "").toLowerCase().includes(q)
    );
  });

  if (!panelOpen) return null;

  // Shared content components
  const content = (
    <>
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-100/90 flex items-center justify-between shrink-0 bg-white/70">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <UserGroupIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              @{targetUsername}&apos;s Network
            </h2>
            <p className="text-[11px] text-slate-400">
              Connections & creators
            </p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
          title="Close network panel"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Sleek Pill Tab Switcher: Followers vs Following */}
      <div className="px-4 pt-3 pb-2 shrink-0 bg-slate-50/60 border-b border-slate-100/80">
        <div className="p-1 bg-slate-200/60 rounded-2xl flex items-center space-x-1">
          <button
            onClick={() => setActiveTab("followers")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "followers"
                ? "bg-white text-purple-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Followers</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === "followers"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {activeTab === "followers" && !loading ? users.length : (activeTab === "followers" ? "…" : "")}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("following")}
            className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
              activeTab === "following"
                ? "bg-white text-purple-900 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <span>Following</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                activeTab === "following"
                  ? "bg-purple-100 text-purple-700"
                  : "bg-slate-200/80 text-slate-600"
              }`}
            >
              {activeTab === "following" && !loading ? users.length : (activeTab === "following" ? "…" : "")}
            </span>
          </button>
        </div>
      </div>

      {/* Live Search & Filter Bar */}
      <div className="p-3 border-b border-slate-100/80 shrink-0">
        <div className="relative flex items-center">
          <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-100/70 hover:bg-slate-100 focus:bg-white text-slate-900 rounded-xl border border-slate-200/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter("")}
              className="absolute right-2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Clear search"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Members List Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 custom-scrollbar">
        {loading ? (
          <div className="space-y-3 py-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50/80 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                  <div className="h-2 bg-slate-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map((person) => {
            const initials = (person.name || person.username || "U").slice(0, 2).toUpperCase();
            const isSelf = currentUser?.username === person.username;

            return (
              <div
                key={person._id || person.username}
                className="p-2.5 rounded-2xl border border-slate-100/80 bg-white/70 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all flex items-center justify-between gap-2 group"
              >
                {/* Clickable Avatar + Name */}
                <div
                  onClick={() => navigateToProfile(person.username)}
                  className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
                >
                  <div className="relative shrink-0">
                    {person.profilePic ? (
                      <img
                        src={person.profilePic}
                        alt={person.username}
                        className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 shrink-0 group-hover:ring-purple-400 transition-all"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                      {person.name || person.username}
                    </p>
                    <p className="text-[10px] text-slate-400 truncate">
                      @{person.username}
                    </p>
                    {person.bio && (
                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                        {person.bio}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Follow / DM */}
                {!isSelf && (
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleToggleFollow(person)}
                      disabled={followLoading[person.username]}
                      className={`inline-flex items-center justify-center px-2 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                        person.isFollowing
                          ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200"
                          : "btn-gradient text-white shadow-xs"
                      }`}
                      title={person.isFollowing ? "Unfollow" : "Follow"}
                    >
                      {person.isFollowing ? (
                        <>
                          <CheckIcon className="h-3 w-3 mr-0.5" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlusIcon className="h-3 w-3 mr-0.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => openDMWith(person.username)}
                      className="p-1 rounded-lg border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                      title={`Message @${person.username}`}
                    >
                      <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-10 px-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-2">
              <UserGroupIcon className="h-5 w-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">
              No {activeTab} found
            </h3>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              {searchFilter
                ? `No members match "${searchFilter}".`
                : `@${targetUsername} has no ${activeTab} yet.`}
            </p>
          </div>
        )}
      </div>
    </>
  );

  // If inPage mode: Render as a pure card inside the page column (NO fixed positioning, NO dark backdrop)
  if (inPage) {
    return (
      <div
        className={`glass-card rounded-3xl border border-emerald-900/10 shadow-sm bg-white/90 backdrop-blur-xl flex flex-col h-[calc(100vh-6rem)] overflow-hidden ${className}`}
        aria-label="Social connections panel"
      >
        {content}
      </div>
    );
  }

  // If mobile view (< lg): Render as dedicated clean full-screen view (NO dark backdrop, matching page background)
  return (
    <div
      className="fixed inset-0 z-50 bg-[#f4f7f5] flex flex-col animate-in slide-in-from-right duration-200"
      aria-label="Social connections mobile screen"
    >
      {/* Mobile Top Navigation Bar */}
      <div className="px-4 py-3 border-b border-slate-200/80 bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <button
          onClick={handleClose}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-purple-600"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          <span>Back to Feed</span>
        </button>

        <span className="text-xs font-bold text-slate-900">
          @{targetUsername}&apos;s Network
        </span>

        <button
          onClick={handleClose}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full overflow-hidden">
        {content}
      </div>
    </div>
  );
}
