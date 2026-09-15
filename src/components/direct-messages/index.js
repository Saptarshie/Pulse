"use client";
import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  getOrCreateConversation
} from '@/action/messageAction';
import {
  XMarkIcon,
  PaperAirplaneIcon,
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';

export default function DirectMessageDrawer({ isOpen, onClose, initialRecipient }) {
  const currentUser = useSelector((state) => state.userslice);
  const currentUsername = currentUser?.username;

  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // Auto-scroll messages
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Load conversations list
  const loadConversations = async (targetActiveConvId = null) => {
    if (!currentUsername) return;
    try {
      const res = await getUserConversations();
      if (res?.success) {
        setConversations(res.conversations || []);
        if (targetActiveConvId) {
          const found = res.conversations.find((c) => c._id === targetActiveConvId);
          if (found) setActiveConversation(found);
        } else if (!activeConversation && res.conversations?.length > 0) {
          setActiveConversation(res.conversations[0]);
        }
      }
    } catch (err) {
      console.error("Error loading conversations:", err);
    }
  };

  // Load messages for the active conversation
  const loadMessages = async (convId, isInitial = false) => {
    if (!convId) return;
    if (isInitial) setLoadingMessages(true);
    try {
      const res = await getConversationMessages(convId);
      if (res?.success) {
        setMessages(res.messages || []);
        if (isInitial) {
          setTimeout(() => scrollToBottom('auto'), 100);
        } else {
          scrollToBottom('smooth');
        }
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  };

  // If initial recipient was requested (e.g. from People card or Profile)
  useEffect(() => {
    if (isOpen && initialRecipient && initialRecipient !== currentUsername) {
      const initChat = async () => {
        setLoadingConv(true);
        try {
          const res = await getOrCreateConversation(initialRecipient);
          if (res?.success && res.conversation) {
            const formatted = {
              _id: res.conversation._id,
              participants: res.conversation.participants,
              lastMessage: res.conversation.lastMessage,
              updatedAt: res.conversation.updatedAt,
              unreadCount: 0,
              otherUser: res.recipient
            };
            setActiveConversation(formatted);
            await loadConversations(res.conversation._id);
            await loadMessages(res.conversation._id, true);
          }
        } catch (err) {
          console.error("Error opening initial chat:", err);
        } finally {
          setLoadingConv(false);
        }
      };
      initChat();
    } else if (isOpen) {
      loadConversations();
    }
  }, [isOpen, initialRecipient, currentUsername]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversation?._id) {
      loadMessages(activeConversation._id, true);
    }
  }, [activeConversation?._id]);

  // Reactive message polling every 4s when drawer is open
  useEffect(() => {
    if (isOpen && activeConversation?._id) {
      pollIntervalRef.current = setInterval(() => {
        loadMessages(activeConversation._id, false);
      }, 4000);
    }
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isOpen, activeConversation?._id]);

  // Send message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    const text = newMessageText.trim();
    if (!text || sending || !activeConversation) return;

    const recipientUsername = activeConversation.otherUser?.username;
    if (!recipientUsername) return;

    setSending(true);
    setNewMessageText('');

    // Optimistic message bubble
    const optimisticMsg = {
      _id: `temp-${Date.now()}`,
      conversationId: activeConversation._id,
      sender: currentUsername,
      recipient: recipientUsername,
      content: text,
      createdAt: new Date().toISOString(),
      read: false
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom('smooth'), 50);

    try {
      const res = await sendMessage(activeConversation._id, recipientUsername, text);
      if (res?.success) {
        // Refresh conversations list to update last message preview
        loadConversations(activeConversation._id);
      }
    } catch (err) {
      console.error("Error sending message:", err);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const filteredConversations = conversations.filter((c) => {
    const name = c.otherUser?.name || '';
    const username = c.otherUser?.username || '';
    const q = searchQuery.toLowerCase();
    return name.toLowerCase().includes(q) || username.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-10">
        <div className="w-screen max-w-4xl glass-card rounded-l-3xl shadow-2xl border-l border-emerald-900/10 flex flex-col overflow-hidden bg-white/95">
          
          {/* Top Drawer Header */}
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <ChatBubbleLeftRightIcon className="h-5 w-5 stroke-2" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center">
                  Direct Messages
                  <span className="ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/50">
                    Live
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time encrypted discussions on Pulse
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Close Messages"
            >
              <XMarkIcon className="h-6 w-6 stroke-2" />
            </button>
          </div>

          {/* 2-Column Split: Conversations on Left, Active Chat on Right */}
          <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT PANE: Conversation List */}
            <div className="w-72 sm:w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
              
              {/* Search contacts */}
              <div className="p-3 border-b border-slate-100">
                <div className="relative flex items-center">
                  <MagnifyingGlassIcon className="h-4 w-4 text-slate-400 absolute left-3 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search conversations..."
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-white text-slate-800 placeholder-slate-400 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/10"
                  />
                </div>
              </div>

              {/* Conversations scroll area */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100/80">
                {filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    <SparklesIcon className="h-6 w-6 mx-auto mb-2 text-slate-300" />
                    <p className="font-semibold text-slate-600">No conversations yet</p>
                    <p className="mt-1">Connect with creators using the "Message" button on their cards!</p>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = activeConversation?._id === conv._id;
                    const other = conv.otherUser || {};
                    const initials = (other.name || other.username || 'U').slice(0, 2).toUpperCase();

                    return (
                      <button
                        key={conv._id}
                        onClick={() => setActiveConversation(conv)}
                        className={`w-full text-left p-3.5 flex items-start space-x-3 transition-colors ${
                          isSelected
                            ? 'bg-purple-50/80 border-l-4 border-purple-600'
                            : 'hover:bg-white'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {other.profilePic ? (
                            <img
                              src={other.profilePic}
                              alt={other.username}
                              className="w-10 h-10 rounded-full object-cover shadow-sm border border-slate-200"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                              {initials}
                            </div>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {other.name || other.username}
                            </p>
                            <span className="text-[10px] text-slate-400">
                              {conv.updatedAt
                                ? new Date(conv.updatedAt).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric"
                                  })
                                : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {conv.lastMessage?.content || `@${other.username}`}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* RIGHT PANE: Chat Messages Thread */}
            <div className="flex-1 flex flex-col bg-white">
              {activeConversation ? (
                <>
                  {/* Chat Active Header */}
                  <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/40">
                    <div className="flex items-center space-x-3">
                      {activeConversation.otherUser?.profilePic ? (
                        <img
                          src={activeConversation.otherUser.profilePic}
                          alt={activeConversation.otherUser.username}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
                          {(activeConversation.otherUser?.name || activeConversation.otherUser?.username || 'U').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center">
                          {activeConversation.otherUser?.name || activeConversation.otherUser?.username}
                          <CheckBadgeIcon className="h-4 w-4 text-purple-600 ml-1 inline" />
                        </h3>
                        <p className="text-xs text-slate-500">
                          @{activeConversation.otherUser?.username}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Messages Bubble Stream */}
                  <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
                    {loadingMessages ? (
                      <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600"></div>
                      </div>
                    ) : messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
                          <ChatBubbleLeftRightIcon className="h-6 w-6 stroke-2" />
                        </div>
                        <p className="text-sm font-bold text-slate-800">Start the conversation</p>
                        <p className="text-xs text-slate-500 max-w-xs mt-1">
                          Say hello, share ideas, or collaborate on articles!
                        </p>
                      </div>
                    ) : (
                      messages.map((msg, index) => {
                        const isMe = msg.sender === currentUsername;
                        const timeStr = msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : '';

                        return (
                          <div
                            key={msg._id || index}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
                                isMe
                                  ? 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white rounded-br-none'
                                  : 'bg-white text-slate-900 border border-slate-200/80 rounded-bl-none'
                              }`}
                            >
                              <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 px-1">
                              {timeStr}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Message Input Bar */}
                  <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 bg-white">
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMessageText}
                        onChange={(e) => setNewMessageText(e.target.value)}
                        placeholder={`Message @${activeConversation.otherUser?.username || 'user'}...`}
                        className="flex-1 px-4 py-2.5 text-sm bg-slate-50 focus:bg-white text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all"
                      />
                      <button
                        type="submit"
                        disabled={!newMessageText.trim() || sending}
                        className="btn-gradient px-4 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Send</span>
                        <PaperAirplaneIcon className="h-3.5 w-3.5 -rotate-45" />
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-8">
                  <ChatBubbleLeftRightIcon className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-800">No conversation selected</p>
                  <p className="text-xs text-slate-500">
                    Pick a conversation from the left or message a creator from their card.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
