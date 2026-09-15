// src/action/messageAction.js
'use server'

import { connectToDB } from "@/database";
import { Conversation, Message, User } from "@/models";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import mongoose from "mongoose";

// Helper: Get authenticated user from session cookie
async function getAuthUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    return decoded;
  } catch (err) {
    return null;
  }
}

// Get or Create 1-on-1 Conversation
export async function getOrCreateConversation(recipientUsername) {
  try {
    await connectToDB();
    const auth = await getAuthUser();
    if (!auth) {
      return { success: false, status: 401, message: "Please sign in to send messages" };
    }

    const currentUsername = auth.username;
    if (currentUsername === recipientUsername) {
      return { success: false, status: 400, message: "You cannot message yourself" };
    }

    const recipientUser = await User.findOne({ username: recipientUsername })
      .select("username name profilePic bio")
      .lean();

    if (!recipientUser) {
      return { success: false, status: 404, message: "Recipient user not found" };
    }

    // Find conversation with both participants
    let conversation = await Conversation.findOne({
      participants: { $all: [currentUsername, recipientUsername] }
    }).lean();

    if (!conversation) {
      const created = await Conversation.create({
        participants: [currentUsername, recipientUsername],
        lastMessage: {
          content: '',
          sender: '',
          createdAt: new Date()
        },
        updatedAt: new Date()
      });
      conversation = created.toObject();
    }

    return {
      success: true,
      status: 200,
      conversation: JSON.parse(JSON.stringify(conversation)),
      recipient: {
        username: recipientUser.username,
        name: recipientUser.name || recipientUser.username,
        profilePic: recipientUser.profilePic || "",
        bio: recipientUser.bio || ""
      }
    };
  } catch (error) {
    console.error("Error in getOrCreateConversation:", error);
    return { success: false, status: 500, message: error.message };
  }
}

// Get All Conversations for Current User
export async function getUserConversations() {
  try {
    await connectToDB();
    const auth = await getAuthUser();
    if (!auth) {
      return { success: false, status: 401, message: "Not authenticated", conversations: [] };
    }

    const currentUsername = auth.username;

    const rawConversations = await Conversation.find({
      participants: currentUsername
    })
      .sort({ updatedAt: -1 })
      .lean();

    if (!rawConversations.length) {
      return { success: true, conversations: [] };
    }

    // Collect other participants
    const otherUsernames = rawConversations.map(conv =>
      conv.participants.find(p => p !== currentUsername)
    ).filter(Boolean);

    const userDetails = await User.find(
      { username: { $in: otherUsernames } },
      { username: 1, name: 1, profilePic: 1, bio: 1 }
    ).lean();

    const userMap = new Map();
    userDetails.forEach(u => userMap.set(u.username, u));

    // Get unread counts per conversation
    const unreadCounts = await Message.aggregate([
      {
        $match: {
          recipient: currentUsername,
          read: false
        }
      },
      {
        $group: {
          _id: "$conversationId",
          count: { $sum: 1 }
        }
      }
    ]);

    const unreadMap = new Map();
    unreadCounts.forEach(item => unreadMap.set(item._id.toString(), item.count));

    const conversations = rawConversations.map(conv => {
      const otherUsername = conv.participants.find(p => p !== currentUsername) || "User";
      const otherUser = userMap.get(otherUsername);
      return {
        _id: conv._id.toString(),
        participants: conv.participants,
        lastMessage: conv.lastMessage || null,
        updatedAt: conv.updatedAt,
        unreadCount: unreadMap.get(conv._id.toString()) || 0,
        otherUser: {
          username: otherUsername,
          name: otherUser?.name || otherUsername,
          profilePic: otherUser?.profilePic || "",
          bio: otherUser?.bio || ""
        }
      };
    });

    return {
      success: true,
      status: 200,
      conversations: JSON.parse(JSON.stringify(conversations))
    };
  } catch (error) {
    console.error("Error in getUserConversations:", error);
    return { success: false, status: 500, message: error.message, conversations: [] };
  }
}

// Get All Messages in a Conversation
export async function getConversationMessages(conversationId) {
  try {
    await connectToDB();
    const auth = await getAuthUser();
    if (!auth) {
      return { success: false, status: 401, message: "Not authenticated", messages: [] };
    }

    const currentUsername = auth.username;

    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
      return { success: false, status: 400, message: "Invalid conversation ID", messages: [] };
    }

    const conversation = await Conversation.findById(conversationId).lean();
    if (!conversation || !conversation.participants.includes(currentUsername)) {
      return { success: false, status: 403, message: "Access denied", messages: [] };
    }

    // Fetch messages
    const messages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(150)
      .lean();

    // Mark any unread messages sent to current user as read
    await Message.updateMany(
      {
        conversationId,
        recipient: currentUsername,
        read: false
      },
      {
        $set: { read: true }
      }
    );

    return {
      success: true,
      status: 200,
      messages: JSON.parse(JSON.stringify(messages))
    };
  } catch (error) {
    console.error("Error in getConversationMessages:", error);
    return { success: false, status: 500, message: error.message, messages: [] };
  }
}

// Send a Direct Message
export async function sendMessage(conversationId, recipientUsername, content) {
  try {
    await connectToDB();
    const auth = await getAuthUser();
    if (!auth) {
      return { success: false, status: 401, message: "Not authenticated" };
    }

    const currentUsername = auth.username;
    const cleanContent = (content || "").trim();
    if (!cleanContent) {
      return { success: false, status: 400, message: "Message content cannot be empty" };
    }

    let convId = conversationId;

    // If conversationId is not provided, locate or create
    if (!convId || !mongoose.Types.ObjectId.isValid(convId)) {
      let conv = await Conversation.findOne({
        participants: { $all: [currentUsername, recipientUsername] }
      });
      if (!conv) {
        conv = await Conversation.create({
          participants: [currentUsername, recipientUsername],
          lastMessage: { content: cleanContent, sender: currentUsername, createdAt: new Date() },
          updatedAt: new Date()
        });
      }
      convId = conv._id;
    }

    const newMessage = await Message.create({
      conversationId: new mongoose.Types.ObjectId(convId),
      sender: currentUsername,
      recipient: recipientUsername,
      content: cleanContent,
      createdAt: new Date(),
      read: false
    });

    // Update conversation metadata
    await Conversation.findByIdAndUpdate(convId, {
      $set: {
        lastMessage: {
          content: cleanContent,
          sender: currentUsername,
          createdAt: new Date()
        },
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      status: 200,
      message: JSON.parse(JSON.stringify(newMessage))
    };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    return { success: false, status: 500, message: error.message };
  }
}

// Get Total Unread Messages Count for Current User
export async function getUnreadMessageCount() {
  try {
    await connectToDB();
    const auth = await getAuthUser();
    if (!auth) return { success: true, count: 0 };

    const count = await Message.countDocuments({
      recipient: auth.username,
      read: false
    });

    return { success: true, count };
  } catch (error) {
    return { success: false, count: 0 };
  }
}
