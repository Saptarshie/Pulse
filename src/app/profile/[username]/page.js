"use client";
import { useState, useEffect, useRef, use } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setUser } from "@/store/slices/user-slice";
import {
  getPublicUserProfile,
  toggleFollowUser,
  uploadProfilePhoto,
  updateUserProfile,
} from "@/action/userAction";
import BlogCard from "@/components/blog-feed/blog-card";
import SocialFollowPanel from "@/components/social-panel";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserCircleIcon,
  CheckBadgeIcon,
  Cog6ToothIcon,
  SparklesIcon,
  ArrowLeftIcon,
  CameraIcon,
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

export default function UserProfilePage({ params }) {
  // In Next.js 15 App Router, params is a Promise
  const resolvedParams = use(params);
  const targetUsername = resolvedParams.username;

  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef(null);

  const initialTab = searchParams.get("tab") || "stories"; // 'stories' | 'followers' | 'following'
  const reduxUser = useSelector((state) => state.userslice);

  const [userData, setUserData] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeTab, setActiveTab] = useState(initialTab);

  // Profile actions & edit states
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [listFollowLoading, setListFollowLoading] = useState({});

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      try {
        const res = await getPublicUserProfile(targetUsername);
        if (res?.success && res.user) {
          setUserData(res.user);
          setBlogs(res.blogs || []);
          setFollowers(res.followers || []);
          setFollowing(res.following || []);
          setIsFollowing(res.user.isFollowing || false);
          setEditName(res.user.name || res.user.username);
          setEditBio(res.user.bio || "");
        } else {
          setError(res?.message || "User not found");
        }
      } catch (err) {
        console.error("Failed to load user profile:", err);
        setError("Unable to load profile data");
      } finally {
        setLoading(false);
      }
    }

    if (targetUsername) {
      loadProfile();
    }
  }, [targetUsername]);

  // Toggle follow on the main profile user
  const handleToggleMainFollow = async () => {
    if (!reduxUser?.username) {
      router.push("/authenticate/sign-in");
      return;
    }
    setFollowLoading(true);
    try {
      const res = await toggleFollowUser(targetUsername);
      if (res?.success) {
        const followed = res.isFollowing !== undefined ? res.isFollowing : (res.action === "followed");
        setIsFollowing(followed);
        setUserData((prev) => ({
          ...prev,
          followersCount: followed
            ? prev.followersCount + 1
            : Math.max(0, prev.followersCount - 1),
        }));
      }
    } catch (err) {
      console.error("Failed to follow user:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  // Toggle follow on members listed in followers/following tabs
  const handleToggleMemberFollow = async (member) => {
    if (!reduxUser?.username) {
      router.push("/authenticate/sign-in");
      return;
    }
    setListFollowLoading((prev) => ({ ...prev, [member.username]: true }));
    try {
      const res = await toggleFollowUser(member.username);
      if (res?.success) {
        const followed = res.isFollowing !== undefined ? res.isFollowing : (res.action === "followed");
        const updateList = (list) =>
          list.map((m) =>
            m.username === member.username
              ? {
                  ...m,
                  isFollowing: followed,
                  followersCount:
                    followed
                      ? m.followersCount + 1
                      : Math.max(0, m.followersCount - 1),
                }
              : m
          );
        setFollowers((prev) => updateList(prev));
        setFollowing((prev) => updateList(prev));
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setListFollowLoading((prev) => ({ ...prev, [member.username]: false }));
    }
  };

  // Listen for pulse_open_dm to activate in-page messages tab on profile
  useEffect(() => {
    const handleProfileDM = () => {
      setActiveTab("messages");
      setTimeout(() => {
        const tabsElem = document.getElementById("profile-tabs-section");
        if (tabsElem) tabsElem.scrollIntoView({ behavior: "smooth" });
      }, 50);
    };
    window.addEventListener("pulse_open_dm", handleProfileDM);
    return () => window.removeEventListener("pulse_open_dm", handleProfileDM);
  }, []);

  // Open Direct Message in-page on profile without floating sidebar overlay
  const openDMWith = (username) => {
    if (!reduxUser?.username) {
      router.push("/authenticate/sign-in");
      return;
    }
    setActiveTab("messages");
    if (username) {
      setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent("pulse_open_dm", {
            detail: { username, recipient: username },
          })
        );
      }, 50);
    }
    const tabsElem = document.getElementById("profile-tabs-section");
    if (tabsElem) tabsElem.scrollIntoView({ behavior: "smooth" });
  };

  // Photo upload handler (for profile owner)
  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Photo size must be less than 5MB");
      return;
    }

    setUploadingPhoto(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadProfilePhoto(formData);
      if (res?.success && res.url) {
        setUserData((prev) => ({ ...prev, profilePic: res.url }));
        dispatch(
          setUser({
            ...reduxUser,
            profilePic: res.url,
          })
        );
        setSuccess("Profile photo updated successfully!");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(res?.message || "Failed to upload photo");
      }
    } catch (err) {
      console.error("Error uploading photo:", err);
      setError("Photo upload failed");
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Save Name and Bio (for profile owner)
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const res = await updateUserProfile({ name: editName, bio: editBio });
      if (res?.success) {
        setUserData((prev) => ({
          ...prev,
          name: editName,
          bio: editBio,
        }));
        dispatch(
          setUser({
            ...reduxUser,
            name: editName,
            bio: editBio,
          })
        );
        setIsEditing(false);
        setSuccess("Profile updated successfully!");
        setTimeout(() => setSuccess(""), 4000);
      } else {
        setError(res?.message || "Failed to update profile");
      }
    } catch (err) {
      console.error("Error updating profile:", err);
      setError("Failed to save changes");
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
          <UserCircleIcon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">{error}</h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          The user @{targetUsername} does not exist or has been removed from Pulse.
        </p>
        <Link
          href="/"
          className="btn-gradient inline-flex items-center space-x-2 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
        >
          <span>Return to Pulse Feed</span>
        </Link>
      </div>
    );
  }

  const isSelf = userData?.isSelf;
  const isCreator = userData?.subscriberCount !== undefined && userData?.subscriberCount >= 0;
  const initials = (userData?.name || userData?.username || "U").slice(0, 2).toUpperCase();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-purple-600 mb-6 group transition-colors"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5 group-hover:-translate-x-1 transition-transform" />
        <span>Back to Pulse Feed</span>
      </Link>

      {/* Profile Header Banner */}
      <div className="glass-card rounded-3xl overflow-hidden border border-slate-200/90 shadow-sm mb-8 bg-white/90">
        {/* Cover gradient */}
        <div className="h-44 sm:h-52 bg-gradient-to-r from-purple-950 via-indigo-900 to-emerald-900 relative">
          <div className="absolute inset-0 bg-radial-gradient opacity-40 pointer-events-none" />
          <div className="absolute top-4 right-4">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/15 text-white backdrop-blur-md border border-white/20">
              {isCreator ? "Verified Creator" : "Pulse Contributor"}
            </span>
          </div>
        </div>

        {/* Avatar & Meta Header */}
        <div className="px-6 sm:px-10 pb-6 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-16 sm:-mt-20 gap-4">
            
            {/* Avatar */}
            <div className="flex items-end space-x-5">
              <div className="relative group w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white p-1.5 shadow-xl shrink-0">
                {userData?.profilePic ? (
                  <img
                    src={userData.profilePic}
                    alt={userData.username}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 flex items-center justify-center text-3xl font-extrabold text-white">
                    {initials}
                  </div>
                )}

                {/* Edit Photo Overlay (Only if viewer is the profile owner) */}
                {isSelf && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute inset-1.5 rounded-2xl bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity backdrop-blur-xs cursor-pointer"
                      title="Upload profile photo"
                    >
                      {uploadingPhoto ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CameraIcon className="h-6 w-6 mb-1 text-white drop-shadow" />
                          <span className="text-[10px] font-bold tracking-wide">Edit Photo</span>
                        </>
                      )}
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handlePhotoUpload}
                      accept="image/*"
                      className="hidden"
                    />
                  </>
                )}
              </div>

              <div className="mb-2 min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight truncate">
                    {userData?.name || userData?.username}
                  </h1>
                  {isCreator && (
                    <CheckBadgeIcon className="h-6 w-6 text-purple-600 shrink-0" />
                  )}
                </div>
                <p className="text-xs sm:text-sm text-purple-700 font-semibold">
                  @{userData?.username}
                </p>

                {/* Interactive Followers / Following / Stories Counter Tabs */}
                <div className="flex items-center space-x-4 mt-2 text-xs">
                  <button
                    onClick={() => setActiveTab("stories")}
                    className={`hover:text-purple-700 transition-colors font-medium ${
                      activeTab === "stories" ? "text-purple-900 font-bold" : "text-slate-600"
                    }`}
                  >
                    <span className="font-extrabold text-slate-900">{userData?.storiesCount || blogs.length}</span> Stories
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => setActiveTab("followers")}
                    className={`hover:text-purple-700 transition-colors font-medium ${
                      activeTab === "followers" ? "text-purple-900 font-bold" : "text-slate-600"
                    }`}
                  >
                    <span className="font-extrabold text-slate-900">{userData?.followersCount || 0}</span> Followers
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => setActiveTab("following")}
                    className={`hover:text-purple-700 transition-colors font-medium ${
                      activeTab === "following" ? "text-purple-900 font-bold" : "text-slate-600"
                    }`}
                  >
                    <span className="font-extrabold text-slate-900">{userData?.followingCount || 0}</span> Following
                  </button>
                </div>
              </div>
            </div>

            {/* Profile Action CTAs */}
            <div className="flex items-center space-x-2.5 self-start sm:self-end">
              {isSelf ? (
                <>
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <PencilSquareIcon className="h-4 w-4 text-slate-400" />
                    <span>{isEditing ? "Close Editor" : "Edit Profile"}</span>
                  </button>

                  <button
                    onClick={() => openDMWith(null)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-purple-200 bg-purple-50/80 hover:bg-purple-100 text-xs font-bold text-purple-800 transition-colors shadow-2xs cursor-pointer"
                    title="Open your direct messages"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600" />
                    <span>Direct Messages</span>
                  </button>

                  <Link
                    href="/settings"
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Cog6ToothIcon className="h-4 w-4 text-slate-400" />
                    <span>Settings</span>
                  </Link>

                  {isCreator ? (
                    <Link
                      href="/creator-dashboard"
                      className="btn-gradient inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                    >
                      <SparklesIcon className="h-3.5 w-3.5 text-pink-200" />
                      <span>Creator Studio</span>
                    </Link>
                  ) : (
                    <Link
                      href="/become-creator"
                      className="btn-gradient inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                    >
                      <SparklesIcon className="h-3.5 w-3.5 text-pink-200" />
                      <span>Become Creator</span>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={handleToggleMainFollow}
                    disabled={followLoading}
                    className={`inline-flex items-center space-x-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all shadow-sm ${
                      isFollowing
                        ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200"
                        : "btn-gradient text-white"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlusIcon className="h-4 w-4" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openDMWith(userData.username)}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-full bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-colors"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    <span>Message</span>
                  </button>
                </>
              )}
            </div>

          </div>

          {/* Bio Section / Inline Editor */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            {isEditing && isSelf ? (
              <form onSubmit={handleSaveProfile} className="glass-card rounded-2xl p-5 border border-purple-100 bg-purple-50/20 max-w-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Edit Profile Information</h3>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Biography
                  </label>
                  <textarea
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell the Pulse community about yourself, your stories, or your insights..."
                    rows={3}
                    maxLength={250}
                    className="w-full px-3.5 py-2 text-sm bg-white rounded-xl border border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all resize-none"
                  />
                  <div className="flex justify-between items-center mt-1 text-[11px] text-slate-400">
                    <span>Markdown or plain text</span>
                    <span>{editBio.length}/250</span>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="btn-gradient px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm inline-flex items-center space-x-1.5"
                  >
                    {savingProfile ? (
                      <span>Saving...</span>
                    ) : (
                      <>
                        <CheckIcon className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="max-w-2xl">
                {userData?.bio ? (
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {userData.bio}
                  </p>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    {isSelf
                      ? 'No bio provided yet. Click "Edit Profile" to write your bio.'
                      : `@${userData?.username} hasn't written a biography yet.`}
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="mb-6 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess("")}><XMarkIcon className="h-4 w-4" /></button>
        </div>
      )}

      {/* Profile Page Interactive Tabs: Stories, Followers, Following, Direct Messages */}
      <div id="profile-tabs-section" className="border-b border-slate-200/90 mb-6 flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("stories")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === "stories"
              ? "border-purple-600 text-purple-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <DocumentTextIcon className="h-4 w-4" />
          <span>Stories ({blogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("followers")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === "followers"
              ? "border-purple-600 text-purple-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserGroupIcon className="h-4 w-4" />
          <span>Followers ({followers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("following")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === "following"
              ? "border-purple-600 text-purple-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <UserGroupIcon className="h-4 w-4" />
          <span>Following ({following.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("messages")}
          className={`pb-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center space-x-2 shrink-0 ${
            activeTab === "messages"
              ? "border-purple-600 text-purple-900"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-purple-600" />
          <span>Direct Messages</span>
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {/* STORIES TAB */}
        {activeTab === "stories" && (
          <div>
            {blogs.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {blogs.map((blog) => (
                  <BlogCard key={blog._id} blog={blog} />
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                  <DocumentTextIcon className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">
                  No published stories yet
                </h3>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                  {isSelf
                    ? "Start your creator journey on Pulse and publish your first story today."
                    : `@${userData?.username} has not published any stories on Pulse yet.`}
                </p>
                {isSelf && (
                  <Link
                    href="/creator-dashboard/create"
                    className="btn-gradient inline-flex items-center space-x-1.5 px-5 py-2.5 rounded-full text-xs font-bold text-white shadow-md"
                  >
                    <span>Write First Story</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* FOLLOWERS TAB */}
        {activeTab === "followers" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {followers.length > 0 ? (
              followers.map((member) => {
                const memberInitial = (member.name || member.username || "U").slice(0, 2).toUpperCase();
                const isMemberSelf = reduxUser?.username === member.username;

                return (
                  <div
                    key={member._id || member.username}
                    className="glass-card rounded-2xl p-4 border border-slate-200/90 hover:border-purple-200 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/profile/${member.username}`}
                        className="flex items-center space-x-3 min-w-0 group flex-1 cursor-pointer"
                      >
                        {member.profilePic ? (
                          <img
                            src={member.profilePic}
                            alt={member.username}
                            className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 group-hover:ring-purple-400 transition-all shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            {memberInitial}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                            {member.name || member.username}
                          </p>
                          <p className="text-xs text-purple-700 font-semibold truncate">
                            @{member.username}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {member.bio && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                        {member.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                      <span>{member.followersCount || 0} followers</span>

                      {!isMemberSelf && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleToggleMemberFollow(member)}
                            disabled={listFollowLoading[member.username]}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                              member.isFollowing
                                ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200"
                                : "btn-gradient text-white shadow-xs"
                            }`}
                          >
                            {member.isFollowing ? "Following" : "Follow"}
                          </button>
                          <button
                            onClick={() => openDMWith(member.username)}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title={`Message @${member.username}`}
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full glass-card rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
                <UserGroupIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No followers yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  When other creators follow @{userData?.username}, they will appear here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* FOLLOWING TAB */}
        {activeTab === "following" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {following.length > 0 ? (
              following.map((member) => {
                const memberInitial = (member.name || member.username || "U").slice(0, 2).toUpperCase();
                const isMemberSelf = reduxUser?.username === member.username;

                return (
                  <div
                    key={member._id || member.username}
                    className="glass-card rounded-2xl p-4 border border-slate-200/90 hover:border-purple-200 hover:shadow-sm transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/profile/${member.username}`}
                        className="flex items-center space-x-3 min-w-0 group flex-1 cursor-pointer"
                      >
                        {member.profilePic ? (
                          <img
                            src={member.profilePic}
                            alt={member.username}
                            className="w-12 h-12 rounded-2xl object-cover ring-1 ring-slate-200 group-hover:ring-purple-400 transition-all shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                            {memberInitial}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                            {member.name || member.username}
                          </p>
                          <p className="text-xs text-purple-700 font-semibold truncate">
                            @{member.username}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {member.bio && (
                      <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                        {member.bio}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100 text-xs text-slate-500">
                      <span>{member.followersCount || 0} followers</span>

                      {!isMemberSelf && (
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleToggleMemberFollow(member)}
                            disabled={listFollowLoading[member.username]}
                            className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
                              member.isFollowing
                                ? "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 border border-slate-200"
                                : "btn-gradient text-white shadow-xs"
                            }`}
                          >
                            {member.isFollowing ? "Following" : "Follow"}
                          </button>
                          <button
                            onClick={() => openDMWith(member.username)}
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            title={`Message @${member.username}`}
                          >
                            <ChatBubbleLeftRightIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="col-span-full glass-card rounded-3xl p-12 text-center border border-slate-200 max-w-md mx-auto">
                <UserGroupIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Not following anyone yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Creators and members followed by @{userData?.username} will be displayed here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* DIRECT MESSAGES TAB (In-Page on Profile, No Sidebar Effect!) */}
        {activeTab === "messages" && (
          <div className="max-w-4xl mx-auto animate-in fade-in duration-200">
            <SocialFollowPanel
              isOpen={true}
              inPage={true}
              username={reduxUser?.username || userData?.username}
              initialType="messages"
              className="h-[680px] shadow-md border border-slate-200/90"
            />
          </div>
        )}
      </div>

    </div>
  );
}
