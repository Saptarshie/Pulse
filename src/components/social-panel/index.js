// src/components/social-panel/index.js
// Unified In-Page 4th Column Panel: Direct Messages, Following & Followers
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector } from "react-redux";
import { getUserFollowList, toggleFollowUser } from "@/action/userAction";
import {
  getDMContactsAndConversations,
  getConversationMessages,
  sendMessage,
  getOrCreateConversation
} from "@/action/messageAction";
import { useRealtimeMessages } from "@/hooks/useRealtimeMessages";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  XMarkIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  UserPlusIcon,
  CheckIcon,
  ChatBubbleLeftRightIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  CheckBadgeIcon,
  PhoneIcon,
  VideoCameraIcon
} from "@heroicons/react/24/outline";
import { useCall } from "@/context/CallContext";

export default function SocialFollowPanel({
  isOpen,
  onClose,
  username: initialUsername,
  initialType = "followers", // 'followers' | 'following' | 'messages'
  inPage = false,
  className = "",
  drawerClassName = ""
}) {
  const router = useRouter();
  const currentUser = useSelector((state) => state.userslice);
  const currentUsername = currentUser?.username;
  const { startCall } = useCall();

  const [panelOpen, setPanelOpen] = useState(isOpen || false);
  const [targetUsername, setTargetUsername] = useState(initialUsername || "");
  const [activeTab, setActiveTab] = useState(initialType);
  const [searchFilter, setSearchFilter] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Social Connections State (Followers / Following)
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [followLoading, setFollowLoading] = useState({});

  // Direct Messages State
  const [conversations, setConversations] = useState([]);
  const [networkContacts, setNetworkContacts] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [loadingDM, setLoadingDM] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);

  const messagesEndRef = useRef(null);

  // Auto-scroll messages thread
  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Real-Time Incoming Message Handler
  const handleIncomingMessage = (incomingMsg) => {
    if (!incomingMsg) return;

    // 1. If currently in the active conversation, append message
    if (activeConversation && String(activeConversation._id) === String(incomingMsg.conversationId)) {
      setMessages((prev) => {
        // Prevent optimistic duplicate
        const exists = prev.some(
          (m) =>
            m._id === incomingMsg._id ||
            (m._id.startsWith("temp-") && m.content === incomingMsg.content && m.sender === incomingMsg.sender)
        );
        if (exists) {
          return prev.map((m) =>
            m._id.startsWith("temp-") && m.content === incomingMsg.content ? incomingMsg : m
          );
        }
        return [...prev, incomingMsg];
      });
      setTimeout(() => scrollToBottom("smooth"), 50);
    }

    // 2. Update conversations list & re-rank (unread on top)
    setConversations((prev) => {
      const convIndex = prev.findIndex((c) => String(c._id) === String(incomingMsg.conversationId));
      if (convIndex !== -1) {
        const updated = [...prev];
        const existing = updated[convIndex];
        const isCurrentActive = activeConversation && String(activeConversation._id) === String(incomingMsg.conversationId);
        const unreadCount = isCurrentActive ? 0 : (existing.unreadCount || 0) + (incomingMsg.sender !== currentUsername ? 1 : 0);

        updated[convIndex] = {
          ...existing,
          lastMessage: {
            content: incomingMsg.content,
            sender: incomingMsg.sender,
            createdAt: incomingMsg.createdAt
          },
          updatedAt: incomingMsg.createdAt,
          unreadCount
        };

        // Priority sort: unread first, then by updatedAt desc
        return updated.sort((a, b) => {
          if ((b.unreadCount > 0) !== (a.unreadCount > 0)) {
            return b.unreadCount > 0 ? 1 : -1;
          }
          return new Date(b.updatedAt) - new Date(a.updatedAt);
        });
      } else {
        // Reload conversations to pull the newly initiated thread
        loadDMData();
        return prev;
      }
    });
  };

  // Real-Time WebSocket & SSE Hook
  const { connectionType } = useRealtimeMessages(currentUsername, handleIncomingMessage);

  // Global pulse_open_dm event listener
  useEffect(() => {
    const handleOpenDM = async (e) => {
      setPanelOpen(true);
      setActiveTab("messages");
      const targetUser = e.detail?.username || e.detail?.recipient;
      if (targetUser && targetUser.toLowerCase() !== currentUsername?.toLowerCase()) {
        await startChatWithUser(targetUser);
      }
    };

    window.addEventListener("pulse_open_dm", handleOpenDM);
    return () => window.removeEventListener("pulse_open_dm", handleOpenDM);
  }, [currentUsername]);

  // Global pulse_open_follow_panel event listener
  useEffect(() => {
    const handleOpenFollow = (e) => {
      if (e.detail?.username) {
        setTargetUsername(e.detail.username);
        if (e.detail.type) setActiveTab(e.detail.type);
        setPanelOpen(true);
      }
    };

    window.addEventListener("pulse_open_follow_panel", handleOpenFollow);
    return () => window.removeEventListener("pulse_open_follow_panel", handleOpenFollow);
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
    if (!panelOpen || (activeTab !== "followers" && activeTab !== "following")) return;
    const userToFetch = targetUsername || currentUsername;
    if (!userToFetch) return;

    let isMounted = true;
    async function loadFollowData() {
      setLoadingUsers(true);
      try {
        const res = await getUserFollowList(userToFetch, activeTab);
        if (isMounted) {
          setUsers(res?.success ? res.users || [] : []);
        }
      } catch (err) {
        if (isMounted) setUsers([]);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    }

    loadFollowData();
    return () => { isMounted = false; };
  }, [panelOpen, targetUsername, currentUsername, activeTab]);

  // Load DM contacts and conversations
  const loadDMData = async (targetConvId = null) => {
    if (!currentUsername) return;
    setLoadingDM(true);
    try {
      const res = await getDMContactsAndConversations();
      if (res?.success) {
        setConversations(res.conversations || []);
        setNetworkContacts(res.networkContacts || []);

        if (targetConvId) {
          const matched = (res.conversations || []).find((c) => String(c._id) === String(targetConvId));
          if (matched) setActiveConversation(matched);
        }
      }
    } catch (err) {
      console.error("Failed to load DM data:", err);
    } finally {
      setLoadingDM(false);
    }
  };

  useEffect(() => {
    if (panelOpen && activeTab === "messages") {
      loadDMData();
    }
  }, [panelOpen, activeTab, currentUsername]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversation?._id) return;
    let isMounted = true;

    async function fetchMsgs() {
      setLoadingMessages(true);
      try {
        const res = await getConversationMessages(activeConversation._id);
        if (isMounted && res?.success) {
          setMessages(res.messages || []);
          setTimeout(() => scrollToBottom("auto"), 50);

          // Mark unread as 0 locally
          setConversations((prev) =>
            prev.map((c) =>
              String(c._id) === String(activeConversation._id) ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        console.error("Failed to fetch messages:", err);
      } finally {
        if (isMounted) setLoadingMessages(false);
      }
    }

    fetchMsgs();
    return () => { isMounted = false; };
  }, [activeConversation?._id]);

  // Start chat with a user (from followers/following or external trigger)
  const startChatWithUser = async (recipientUsername) => {
    if (!currentUsername) {
      router.push("/authenticate/sign-in");
      return;
    }
    setLoadingDM(true);
    try {
      const res = await getOrCreateConversation(recipientUsername);
      if (res?.success && res.conversation) {
        const convObj = {
          _id: res.conversation._id,
          participants: res.conversation.participants,
          lastMessage: res.conversation.lastMessage,
          updatedAt: res.conversation.updatedAt,
          unreadCount: 0,
          otherUser: res.recipient
        };
        setActiveConversation(convObj);
        setActiveTab("messages");
        await loadDMData(res.conversation._id);
      }
    } catch (err) {
      console.error("Failed to start chat:", err);
    } finally {
      setLoadingDM(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = newMessageText.trim();
    if (!text || sendingMsg || !activeConversation) return;

    const recipientUsername = activeConversation.otherUser?.username;
    if (!recipientUsername) return;

    setSendingMsg(true);
    setNewMessageText("");

    // Optimistic message bubble
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversationId: activeConversation._id,
      sender: currentUsername,
      recipient: recipientUsername,
      content: text,
      createdAt: new Date().toISOString(),
      read: false
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      const res = await sendMessage(activeConversation._id, recipientUsername, text);
      if (res?.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m._id === tempId ? res.message : m))
        );
        // Refresh conversation preview
        setConversations((prev) => {
          const updated = prev.map((c) =>
            String(c._id) === String(activeConversation._id)
              ? {
                  ...c,
                  lastMessage: { content: text, sender: currentUsername, createdAt: new Date() },
                  updatedAt: new Date()
                }
              : c
          );
          return updated.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        });
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleClose = () => {
    setPanelOpen(false);
    if (onClose) onClose();
  };

  const handleToggleFollow = async (person) => {
    setFollowLoading((prev) => ({ ...prev, [person.username]: true }));
    try {
      const res = await toggleFollowUser(person.username);
      if (res?.success) {
        const isNowFollowing = res.isFollowing !== undefined ? res.isFollowing : (res.action === "followed");
        setUsers((prev) =>
          prev.map((u) => {
            if (u.username === person.username) {
              return {
                ...u,
                isFollowing: isNowFollowing,
                followersCount:
                  isNowFollowing
                    ? u.followersCount + 1
                    : Math.max(0, u.followersCount - 1)
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

  const navigateToProfile = (username) => {
    if (!inPage) handleClose();
    router.push(`/profile/${username}`);
  };

  // Filter conversations & network contacts
  const q = searchFilter.toLowerCase().trim();
  const filteredConversations = conversations.filter((c) => {
    if (!q) return true;
    const name = c.otherUser?.name || "";
    const uname = c.otherUser?.username || "";
    const lastMsg = c.lastMessage?.content || "";
    return name.toLowerCase().includes(q) || uname.toLowerCase().includes(q) || lastMsg.toLowerCase().includes(q);
  });

  const filteredNetworkContacts = networkContacts.filter((nc) => {
    if (!q) return true;
    const name = nc.name || "";
    const uname = nc.username || "";
    const bio = nc.bio || "";
    return name.toLowerCase().includes(q) || uname.toLowerCase().includes(q) || bio.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter((u) => {
    if (!q) return true;
    return (
      (u.name || "").toLowerCase().includes(q) ||
      (u.username || "").toLowerCase().includes(q) ||
      (u.bio || "").toLowerCase().includes(q)
    );
  });

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  if (!panelOpen) return null;

  // Render Inner Content
  const content = (
    <>
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100/90 flex items-center justify-between shrink-0 bg-white/80">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            {activeTab === "messages" ? (
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
            ) : (
              <UserGroupIcon className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate flex items-center">
              {activeTab === "messages"
                ? "Direct Messages"
                : `@${targetUsername || currentUsername}'s Network`}
              {activeTab === "messages" && (
                <span
                  className={`ml-2 w-2 h-2 rounded-full ${
                    connectionType === "ws"
                      ? "bg-emerald-500 animate-pulse"
                      : connectionType === "sse"
                      ? "bg-purple-500"
                      : "bg-slate-300"
                  }`}
                  title={
                    connectionType === "ws"
                      ? "Connected via Real-Time WebSocket"
                      : connectionType === "sse"
                      ? "Connected via Live Stream"
                      : "Connecting..."
                  }
                />
              )}
            </h2>
            <p className="text-[11px] text-slate-400">
              {activeTab === "messages"
                ? activeConversation
                  ? `Chatting with @${activeConversation.otherUser?.username}`
                  : "Encrypted creator discussions"
                : "Connections & creators"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={handleClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
            title="Close panel"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* 3-Pill Tab Switcher: Messages vs Following vs Followers */}
      {!activeConversation && (
        <div className="px-4 pt-3 pb-2 shrink-0 bg-slate-50/60 border-b border-slate-100/80">
          <div className="p-1 bg-slate-200/60 rounded-2xl flex items-center space-x-1">
            {/* Messages Tab */}
            <button
              onClick={() => setActiveTab("messages")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
                activeTab === "messages"
                  ? "bg-white text-purple-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span>DMs</span>
              {totalUnreadCount > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-purple-600 text-white">
                  {totalUnreadCount}
                </span>
              )}
            </button>

            {/* Following Tab */}
            <button
              onClick={() => setActiveTab("following")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
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
                {activeTab === "following" && !loadingUsers ? users.length : ""}
              </span>
            </button>

            {/* Followers Tab */}
            <button
              onClick={() => setActiveTab("followers")}
              className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 ${
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
                {activeTab === "followers" && !loadingUsers ? users.length : ""}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MESSAGES TAB CONTENT                                      */}
      {/* ========================================================= */}
      {activeTab === "messages" ? (
        activeConversation ? (
          /* ACTIVE CHAT THREAD VIEW */
          <div className="flex-1 flex flex-col min-h-0 bg-white/70">
            {/* Chat Thread Header */}
            <div className="px-3.5 py-2.5 border-b border-slate-100/90 flex items-center justify-between bg-slate-50/70 shrink-0">
              <button
                onClick={() => setActiveConversation(null)}
                className="inline-flex items-center space-x-1 text-xs font-semibold text-purple-700 hover:text-purple-900 px-2 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                title="Back to all conversations"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                <span>All Chats</span>
              </button>

              {/* Right Side: Call Action Buttons & User Profile */}
              <div className="flex items-center space-x-2 min-w-0">
                {/* Audio & Video Call Action Buttons */}
                <div className="flex items-center space-x-1 bg-white/90 border border-slate-200/80 rounded-full px-1.5 py-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => startCall(activeConversation.otherUser, "audio")}
                    className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors cursor-pointer"
                    title={`Start audio call with @${activeConversation.otherUser?.username}`}
                  >
                    <PhoneIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => startCall(activeConversation.otherUser, "video")}
                    className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors cursor-pointer"
                    title={`Start video call with @${activeConversation.otherUser?.username}`}
                  >
                    <VideoCameraIcon className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div
                  onClick={() => navigateToProfile(activeConversation.otherUser?.username)}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-85 transition-opacity min-w-0"
                  title={`View @${activeConversation.otherUser?.username}'s Profile`}
                >
                  <div className="relative shrink-0">
                    {activeConversation.otherUser?.profilePic ? (
                      <img
                        src={activeConversation.otherUser.profilePic}
                        alt={activeConversation.otherUser.username}
                        className="w-7 h-7 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center text-[10px] font-bold">
                        {(activeConversation.otherUser?.name || activeConversation.otherUser?.username || "U").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-xs font-bold text-slate-900 truncate max-w-[90px] sm:max-w-[120px]">
                      {activeConversation.otherUser?.name || activeConversation.otherUser?.username}
                    </p>
                    <p className="text-[10px] text-purple-600 truncate max-w-[90px] sm:max-w-[120px]">
                      @{activeConversation.otherUser?.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 custom-scrollbar bg-slate-50/20">
              {loadingMessages ? (
                <div className="flex justify-center items-center h-full py-12">
                  <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-purple-600" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                  <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Start the conversation</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                    Say hello to @{activeConversation.otherUser?.username} and share thoughts on Pulse!
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender?.toLowerCase() === currentUsername?.toLowerCase();
                  const timeFormatted = msg.createdAt
                    ? new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                    : "";

                  return (
                    <div
                      key={msg._id || idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-xs shadow-xs"
                            : "bg-white text-slate-800 rounded-tl-xs border border-slate-200/80 shadow-xs"
                        }`}
                      >
                        <p className="break-words whitespace-pre-wrap">{msg.content}</p>
                      </div>
                      <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                        {timeFormatted}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Composer Input */}
            <form
              onSubmit={handleSendMessage}
              className="p-2.5 border-t border-slate-100/90 bg-white/95 flex items-center space-x-2 shrink-0"
            >
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder={`Message @${activeConversation.otherUser?.username}...`}
                className="flex-1 px-3 py-2 text-xs bg-slate-100/80 focus:bg-white text-slate-900 placeholder-slate-400 rounded-xl border border-slate-200/80 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/10 outline-none transition-all"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sendingMsg}
                className="btn-gradient p-2 rounded-xl text-white disabled:opacity-40 shadow-xs transition-transform active:scale-95 shrink-0 cursor-pointer"
                title="Send message"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </form>
          </div>
        ) : (
          /* CONVERSATIONS & CONTACTS LIST VIEW */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search filter */}
            <div className="p-3 border-b border-slate-100/80 shrink-0">
              <div className="relative flex items-center">
                <MagnifyingGlassIcon className="h-3.5 w-3.5 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search chats or network..."
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

            {/* Scrollable list of active conversations + network contacts */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
              {loadingDM ? (
                <div className="space-y-3 py-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-center space-x-3 p-2.5 rounded-2xl bg-slate-50/80 animate-pulse">
                      <div className="w-9 h-9 rounded-xl bg-slate-200 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-slate-200 rounded w-1/3" />
                        <div className="h-2 bg-slate-200 rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {/* SECTION 1: Active Conversations (Unread & Recent Prioritized) */}
                  <div>
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Recent Conversations ({filteredConversations.length})
                      </span>
                      {totalUnreadCount > 0 && (
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 border border-purple-200/50 px-2 py-0.5 rounded-full">
                          {totalUnreadCount} unread
                        </span>
                      )}
                    </div>

                    {filteredConversations.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-xs text-slate-400">
                        {searchFilter ? "No conversations match your search." : "No active chats yet. Start one below!"}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredConversations.map((conv) => {
                          const other = conv.otherUser || {};
                          const initials = (other.name || other.username || "U").slice(0, 2).toUpperCase();
                          const isUnread = (conv.unreadCount || 0) > 0;

                          return (
                            <button
                              key={conv._id}
                              onClick={() => setActiveConversation(conv)}
                              className={`w-full text-left p-2.5 rounded-2xl border transition-all flex items-center justify-between gap-2.5 group cursor-pointer ${
                                isUnread
                                  ? "bg-purple-50/90 border-purple-200/80 shadow-xs hover:bg-purple-100/80"
                                  : "bg-white/80 border-slate-100/80 hover:bg-white hover:border-purple-200 hover:shadow-xs"
                              }`}
                            >
                              <div className="relative shrink-0">
                                {other.profilePic ? (
                                  <img
                                    src={other.profilePic}
                                    alt={other.username}
                                    className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 group-hover:ring-purple-400 transition-all"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    {initials}
                                  </div>
                                )}
                                {isUnread && (
                                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white text-[9px] font-bold flex items-center justify-center shadow-xs">
                                    {conv.unreadCount}
                                  </span>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                  <p
                                    className={`text-xs truncate ${
                                      isUnread ? "font-extrabold text-slate-900" : "font-bold text-slate-800"
                                    } group-hover:text-purple-700 transition-colors`}
                                  >
                                    {other.name || other.username}
                                  </p>
                                  <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                                    {conv.updatedAt
                                      ? new Date(conv.updatedAt).toLocaleDateString([], {
                                          month: "short",
                                          day: "numeric"
                                        })
                                      : ""}
                                  </span>
                                </div>
                                <p
                                  className={`text-[11px] truncate mt-0.5 ${
                                    isUnread ? "font-semibold text-purple-900" : "text-slate-500"
                                  }`}
                                >
                                  {conv.lastMessage?.content || `@${other.username}`}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* SECTION 2: Network Contacts to Start New DM (Followers & Following) */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Start Conversation with Network ({filteredNetworkContacts.length})
                      </span>
                    </div>

                    {filteredNetworkContacts.length === 0 ? (
                      <div className="p-4 text-center rounded-2xl border border-dashed border-slate-200 bg-white/50 text-xs text-slate-400">
                        {searchFilter
                          ? "No network contacts match your search."
                          : "All your followers and followings have active chats!"}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {filteredNetworkContacts.map((contact) => {
                          const initials = (contact.name || contact.username || "U").slice(0, 2).toUpperCase();

                          return (
                            <div
                              key={contact._id || contact.username}
                              className="p-2.5 rounded-2xl border border-slate-100/80 bg-white/70 hover:bg-white hover:border-purple-200 hover:shadow-xs transition-all flex items-center justify-between gap-2.5 group"
                            >
                              <div
                                onClick={() => startChatWithUser(contact.username)}
                                className="flex items-center space-x-2.5 min-w-0 flex-1 cursor-pointer"
                              >
                                <div className="relative shrink-0">
                                  {contact.profilePic ? (
                                    <img
                                      src={contact.profilePic}
                                      alt={contact.username}
                                      className="w-9 h-9 rounded-xl object-cover ring-1 ring-slate-200 group-hover:ring-purple-400 transition-all"
                                    />
                                  ) : (
                                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                      {initials}
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                                    {contact.name || contact.username}
                                  </p>
                                  <p className="text-[10px] text-slate-400 truncate">
                                    @{contact.username} • {contact.relationship === "following" ? "Following" : "Follower"}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => startChatWithUser(contact.username)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors shrink-0 cursor-pointer shadow-2xs"
                                title={`Start chat with @${contact.username}`}
                              >
                                <ChatBubbleLeftRightIcon className="h-3.5 w-3.5" />
                                <span>Chat</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )
      ) : (
        /* ========================================================= */
        /* FOLLOWING & FOLLOWERS TABS CONTENT                        */
        /* ========================================================= */
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
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
            {loadingUsers ? (
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
                          onClick={() => startChatWithUser(person.username)}
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
                    : `@${targetUsername || currentUsername} has no ${activeTab} yet.`}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  // If inPage mode: Render as a pure card inside the page column (NO fixed positioning, NO dark backdrop)
  if (inPage) {
    return (
      <div
        className={`glass-card rounded-3xl border border-emerald-900/10 shadow-sm bg-white/90 backdrop-blur-xl flex flex-col overflow-hidden ${className || "h-[calc(100vh-6rem)]"}`}
        aria-label="Social connections and DMs panel"
      >
        {content}
      </div>
    );
  }

  // If global drawer mode (on standalone pages or mobile): Render as full screen on mobile, slide-out on sm+
  if (!mounted || typeof document === "undefined") return null;

  const drawerElement = (
    <div className={`fixed inset-0 z-[9999] overflow-hidden ${drawerClassName}`}>
      {/* Soft translucent backdrop (hidden on mobile because drawer is full-screen) */}
      <div
        onClick={handleClose}
        className="hidden sm:block fixed inset-0 bg-slate-900/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 pointer-events-auto"
      />

      <div className="fixed inset-0 sm:inset-y-0 sm:right-0 sm:left-auto w-full sm:w-[440px] max-w-full flex h-full pointer-events-none">
        <div
          className="pointer-events-auto w-full h-full sm:border-l sm:border-emerald-900/10 sm:shadow-2xl flex flex-col overflow-hidden bg-white/98 sm:backdrop-blur-2xl animate-in slide-in-from-right duration-300"
          aria-label="Social connections and DMs drawer"
        >
          {content}
        </div>
      </div>
    </div>
  );

  return createPortal(drawerElement, document.body);
}
