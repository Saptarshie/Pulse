// src/action/userAction.js
'use server'

import { connectToDB } from "@/database";
import { User, Blog } from "@/models";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { isValidWalletAddress } from "@/utils/functions/isValidWallet";
import { uploadAndTransform } from "@/action/helper/handleImage";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// Levenshtein distance helper for fuzzy person name matching
function getLevenshteinDistance(a, b) {
  if (!a || !b) return (a || b || '').length;
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + 1  // substitution
        );
      }
    }
  }
  return dp[m][n];
}

// Similarity score (0.0 to 1.0)
function computeStringSimilarity(s1, s2) {
  const str1 = (s1 || '').toLowerCase().trim();
  const str2 = (s2 || '').toLowerCase().trim();
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1.0;
  if (str1.startsWith(str2) || str2.startsWith(str1)) return 0.85;
  if (str1.includes(str2) || str2.includes(str1)) return 0.7;

  const dist = getLevenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  return Math.max(0, 1 - dist / maxLen);
}

// Update creator settings (price and wallet)
export async function updateCreatorSettings(data) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Not authenticated" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    
    if (data.walletAddress && !isValidWalletAddress(data.walletAddress)) {
      return { success: false, status: 400, message: "Invalid wallet address" };
    }
    
    if (data.subscriptionPrice && (data.subscriptionPrice < 0 || data.subscriptionPrice > 0.99)) {
      return { success: false, status: 400, message: "Subscription price must be between $0 and $99.99" };
    }
    
    const updateFields = {};
    if (data.walletAddress !== undefined) updateFields.walletAddress = data.walletAddress;
    if (data.subscriptionPrice !== undefined) updateFields.subscriptionPrice = data.subscriptionPrice;
    
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $set: updateFields },
      { new: true }
    );
    
    if (!user) {
      return { success: false, status: 404, message: "User not found" };
    }
    
    return {
      success: true,
      status: 200,
      message: "Settings updated successfully",
      user: JSON.parse(JSON.stringify(user))
    };
  } catch (error) {
    console.error(error);
    return { success: false, status: 500, message: error.message };
  }
}

// Get creator earnings data
export async function getCreatorEarnings() {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Not authenticated" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return { success: false, status: 404, message: "User not found" };
    }
    
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const recentEarnings = (user.earnings || []).filter(
      item => new Date(item.date) >= threeMonthsAgo
    );
    
    const totalEarnings = (user.earnings || []).reduce((sum, item) => sum + item.amount, 0);
    
    return {
      success: true,
      status: 200,
      walletAddress: user.walletAddress,
      subscriptionPrice: user.subscriptionPrice,
      subscriberCount: user.subscriberCount,
      recentEarnings: recentEarnings || [],
      totalEarnings
    };
  } catch (error) {
    console.error(error);
    return { success: false, status: 500, message: error.message };
  }
}

// Update basic user settings (email & password)
export async function updateUserSettings(data) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Not authenticated" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    
    if (data.email && !isValidEmail(data.email)) {
      return { success: false, status: 400, message: "Invalid email address" };
    }
    
    if (data.password && data.password.length < 8) {
      return { success: false, status: 400, message: "Password must be at least 8 characters" };
    }
    
    const updateFields = {};
    if (data.email !== undefined) updateFields.email = data.email;
    if (data.password !== undefined) updateFields.password = bcrypt.hashSync(data.password, 10);
    
    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $set: updateFields },
      { new: true }
    );
    
    if (!user) {
      return { success: false, status: 404, message: "User not found" };
    }
    
    return {
      success: true,
      status: 200,
      message: "Settings updated successfully",
      user: JSON.parse(JSON.stringify(user))
    };
  } catch (error) {
    console.error(error);
    return { success: false, status: 500, message: error.message };
  }
}

// Upload & Edit Profile Photo with Cloudinary stream and Base64 fallback
export async function uploadProfilePhoto(formData) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Not authenticated" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const file = formData.get('file');
    if (!file) {
      return { success: false, status: 400, message: "No image file provided" };
    }

    let profilePic = "";
    try {
      const { imagePath } = await uploadAndTransform(file);
      if (imagePath) profilePic = imagePath;
    } catch (uploadErr) {
      console.warn("Cloudinary upload failed, falling back to Base64 Data URL:", uploadErr.message);
    }

    if (!profilePic) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString('base64');
      const mimeType = file.type || 'image/jpeg';
      profilePic = `data:${mimeType};base64,${base64}`;
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      { $set: { profilePic } },
      { new: true }
    ).lean();

    return {
      success: true,
      status: 200,
      profilePic,
      url: profilePic,
      user: JSON.parse(JSON.stringify(updatedUser))
    };
  } catch (error) {
    console.error("Error in uploadProfilePhoto:", error);
    return { success: false, status: 500, message: error.message || "Failed to update profile photo" };
  }
}

// Update Profile Details (Name, Bio)
export async function updateUserProfile(data) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Not authenticated" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const updateFields = {};
    if (data.name !== undefined) updateFields.name = data.name.trim();
    if (data.bio !== undefined) updateFields.bio = data.bio.trim();

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { $set: updateFields },
      { new: true }
    ).lean();

    return {
      success: true,
      status: 200,
      message: "Profile updated successfully",
      user: JSON.parse(JSON.stringify(user))
    };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { success: false, status: 500, message: error.message };
  }
}

// Toggle Follow / Unfollow user
export async function toggleFollowUser(targetUsername) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return { success: false, status: 401, message: "Please sign in to follow creators" };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return { success: false, status: 404, message: "Current user not found" };
    }
    if (currentUser.username === targetUsername) {
      return { success: false, status: 400, message: "You cannot follow yourself" };
    }

    const targetUser = await User.findOne({ username: targetUsername });
    if (!targetUser) {
      return { success: false, status: 404, message: "Target user not found" };
    }

    const currentFollowing = Array.isArray(currentUser.following) 
      ? currentUser.following.map(id => id.toString()) 
      : [];
    const isFollowing = currentFollowing.includes(targetUser._id.toString());

    let updatedCurrent;
    let updatedTarget;

    if (isFollowing) {
      // Unfollow
      updatedCurrent = await User.findByIdAndUpdate(
        currentUser._id,
        { $pull: { following: targetUser._id } },
        { new: true }
      );
      updatedTarget = await User.findByIdAndUpdate(
        targetUser._id,
        { $pull: { followers: currentUser._id } },
        { new: true }
      );
    } else {
      // Follow
      updatedCurrent = await User.findByIdAndUpdate(
        currentUser._id,
        { $addToSet: { following: targetUser._id } },
        { new: true }
      );
      updatedTarget = await User.findByIdAndUpdate(
        targetUser._id,
        { $addToSet: { followers: currentUser._id } },
        { new: true }
      );
    }

    return {
      success: true,
      status: 200,
      isFollowing: !isFollowing,
      action: !isFollowing ? "followed" : "unfollowed",
      followersCount: updatedTarget.followers?.length || 0,
      followingCount: updatedCurrent.following?.length || 0
    };
  } catch (error) {
    console.error("Error in toggleFollowUser:", error);
    return { success: false, status: 500, message: error.message };
  }
}

// Get the list of all usernames the currently authenticated user follows
export async function getCurrentUserFollowingMap() {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return { success: true, followingUsernames: [] };

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id).select("following").lean();
    if (!user || !Array.isArray(user.following) || user.following.length === 0) {
      return { success: true, followingUsernames: [] };
    }

    const followingUsers = await User.find(
      { _id: { $in: user.following } },
      { username: 1 }
    ).lean();

    const usernames = followingUsers.map((u) => u.username);
    return { success: true, followingUsernames: usernames };
  } catch (err) {
    console.error("Error in getCurrentUserFollowingMap:", err);
    return { success: false, followingUsernames: [] };
  }
}

// Get Follow Stats & Follow State for a User
export async function getUserFollowStats(username) {
  try {
    await connectToDB();
    const user = await User.findOne({ username }).lean();
    if (!user) return { success: false, message: "User not found" };

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let isFollowing = false;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        if (Array.isArray(user.followers)) {
          isFollowing = user.followers.some(id => id.toString() === decoded.id.toString());
        }
      } catch (err) {}
    }

    return {
      success: true,
      followersCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0,
      isFollowing
    };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

// Get User Followers or Following List
export async function getUserFollowList(username, type = 'followers') {
  try {
    await connectToDB();
    const user = await User.findOne({ username }).lean();
    if (!user) return { success: false, users: [] };

    const targetIds = type === 'following' 
      ? (user.following || []) 
      : (user.followers || []);

    if (!targetIds.length) return { success: true, users: [] };

    const users = await User.find(
      { _id: { $in: targetIds } },
      { username: 1, name: 1, bio: 1, profilePic: 1, subscriberCount: 1, followers: 1, following: 1, blogs: 1 }
    ).lean();

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let currentFollowing = [];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        const cur = await User.findById(decoded.id).select("following").lean();
        currentFollowing = (cur?.following || []).map(id => id.toString());
      } catch (e) {}
    }

    const formatted = users.map(u => ({
      _id: u._id.toString(),
      username: u.username,
      name: u.name || u.username,
      bio: u.bio || "",
      profilePic: u.profilePic || "",
      followersCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
      storiesCount: u.blogs?.length || 0,
      isFollowing: currentFollowing.includes(u._id.toString())
    }));

    return { success: true, users: formatted };
  } catch (error) {
    console.error("Error in getUserFollowList:", error);
    return { success: false, users: [] };
  }
}

// Search People with Fuzzy & Similarity Matching (names, usernames, bio)
export async function searchPeople(query = "") {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let currentUserId = null;
    let currentFollowing = [];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        currentUserId = decoded.id;
        const cur = await User.findById(currentUserId).select("following").lean();
        currentFollowing = (cur?.following || []).map(id => id.toString());
      } catch (e) {}
    }

    const cleanQuery = (query || "").trim();

    // 1. Fetch all users (projections for speed)
    const allUsers = await User.find(
      {},
      { username: 1, name: 1, bio: 1, profilePic: 1, subscriberCount: 1, followers: 1, following: 1, blogs: 1 }
    ).lean();

    if (!cleanQuery) {
      // If no query, return active creators
      const popular = allUsers
        .filter(u => !currentUserId || u._id.toString() !== currentUserId.toString())
        .map(u => ({
          _id: u._id.toString(),
          username: u.username,
          name: u.name || u.username,
          bio: u.bio || "",
          profilePic: u.profilePic || "",
          followersCount: u.followers?.length || 0,
          followingCount: u.following?.length || 0,
          storiesCount: u.blogs?.length || 0,
          isFollowing: currentFollowing.includes(u._id.toString()),
          similarityScore: 1.0,
          matchType: 'featured'
        }))
        .sort((a, b) => b.followersCount - a.followersCount)
        .slice(0, 15);

      return { success: true, users: popular };
    }

    const lowerQuery = cleanQuery.toLowerCase();
    const queryRegex = new RegExp(cleanQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

    // 2. Score each user with multi-tier fuzzy matching
    const scoredUsers = [];

    for (const u of allUsers) {
      if (currentUserId && u._id.toString() === currentUserId.toString()) continue;

      const uName = (u.username || "").toLowerCase();
      const dName = (u.name || "").toLowerCase();
      const bioText = (u.bio || "").toLowerCase();

      let score = 0;
      let matchType = 'similar';

      // Tier 1: Exact matches
      if (uName === lowerQuery || dName === lowerQuery) {
        score = 1.0;
        matchType = 'exact';
      }
      // Tier 2: Prefix matches
      else if (uName.startsWith(lowerQuery) || dName.startsWith(lowerQuery)) {
        score = 0.85;
        matchType = 'prefix';
      }
      // Tier 3: Substring regex match
      else if (queryRegex.test(u.username) || queryRegex.test(u.name)) {
        score = 0.7;
        matchType = 'contains';
      }
      else if (queryRegex.test(u.bio)) {
        score = 0.55;
        matchType = 'bio';
      }
      // Tier 4: Fuzzy String Similarity (Levenshtein / Edit distance tolerance)
      else {
        const simUsername = computeStringSimilarity(cleanQuery, u.username);
        const simName = computeStringSimilarity(cleanQuery, u.name);
        const maxSim = Math.max(simUsername, simName);

        if (maxSim >= 0.4) {
          score = maxSim * 0.6;
          matchType = 'similar';
        }
      }

      if (score > 0) {
        // Boost slightly if user has followers
        const popularityBoost = Math.min(0.08, (u.followers?.length || 0) * 0.01);
        scoredUsers.push({
          _id: u._id.toString(),
          username: u.username,
          name: u.name || u.username,
          bio: u.bio || "",
          profilePic: u.profilePic || "",
          followersCount: u.followers?.length || 0,
          followingCount: u.following?.length || 0,
          storiesCount: u.blogs?.length || 0,
          isFollowing: currentFollowing.includes(u._id.toString()),
          similarityScore: score + popularityBoost,
          matchType
        });
      }
    }

    // Sort by similarity score descending
    scoredUsers.sort((a, b) => b.similarityScore - a.similarityScore);

    return {
      success: true,
      users: scoredUsers.slice(0, 20),
      query: cleanQuery
    };
  } catch (error) {
    console.error("Error in searchPeople:", error);
    return { success: false, users: [], message: error.message };
  }
}

// "People You Might Know" Graph Recommendation (Depth-Limited BFS + Stochasticity)
export async function getPeopleYouMightKnow(limit = 8) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    let currentUserId = null;
    let currentUserFollowing = [];
    let currentUsername = null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        currentUserId = decoded.id;
        currentUsername = decoded.username;
        const curUser = await User.findById(currentUserId).select("following username").lean();
        currentUserFollowing = (curUser?.following || []).map(id => id.toString());
      } catch (e) {}
    }

    // 1. Fetch depth-1 neighbors (Following list F1)
    let candidateScores = new Map(); // candidateId -> { score, mutualCount, mutualFriends: [] }

    if (currentUserFollowing.length > 0) {
      // Depth 1: Following users
      const f1Users = await User.find(
        { _id: { $in: currentUserFollowing.slice(0, 40) } },
        { username: 1, following: 1 }
      ).lean();

      // Depth 2: Collect friends-of-friends
      for (const friend of f1Users) {
        const f2List = (friend.following || []).map(id => id.toString());
        for (const candidateId of f2List) {
          // Exclude self and anyone already followed
          if (candidateId === currentUserId?.toString()) continue;
          if (currentUserFollowing.includes(candidateId)) continue;

          const existing = candidateScores.get(candidateId) || {
            mutualCount: 0,
            mutualFriends: [],
            adamicAdar: 0
          };

          existing.mutualCount += 1;
          if (existing.mutualFriends.length < 3 && !existing.mutualFriends.includes(friend.username)) {
            existing.mutualFriends.push(friend.username);
          }
          // Adamic-Adar connectivity bonus: 1 / log(1 + friend's out-degree)
          const outDegree = f2List.length || 1;
          existing.adamicAdar += 1 / Math.log(2 + outDegree);

          candidateScores.set(candidateId, existing);
        }
      }
    }

    // 2. Fetch candidate user details from MongoDB
    const candidateIds = Array.from(candidateScores.keys());
    let candidateUsers = [];

    if (candidateIds.length > 0) {
      candidateUsers = await User.find(
        { _id: { $in: candidateIds.map(id => new mongoose.Types.ObjectId(id)) } },
        { username: 1, name: 1, bio: 1, profilePic: 1, subscriberCount: 1, followers: 1, following: 1, blogs: 1 }
      ).lean();
    }

    // 3. Score candidates with Stochasticity to avoid extreme repetitiveness
    let recommendations = candidateUsers.map(user => {
      const stats = candidateScores.get(user._id.toString()) || { mutualCount: 1, mutualFriends: [] };
      const baseScore = stats.mutualCount * 2.0 + (stats.adamicAdar || 0.5);
      
      // Stochastic temperature perturbation (noise between 0.7 and 1.3)
      const stochasticMultiplier = 0.75 + 0.5 * Math.random();
      const finalScore = baseScore * stochasticMultiplier;

      const mutualText = stats.mutualFriends.length > 0
        ? `Followed by @${stats.mutualFriends[0]}${stats.mutualCount > 1 ? ` +${stats.mutualCount - 1} more` : ''}`
        : `${stats.mutualCount} mutual connection${stats.mutualCount > 1 ? 's' : ''}`;

      return {
        _id: user._id.toString(),
        username: user.username,
        name: user.name || user.username,
        bio: user.bio || "",
        profilePic: user.profilePic || "",
        followersCount: user.followers?.length || 0,
        followingCount: user.following?.length || 0,
        storiesCount: user.blogs?.length || 0,
        reason: mutualText,
        score: finalScore,
        isFollowing: false
      };
    });

    // 4. Cold-Start / Fallback: If we have fewer than limit recommendations, backfill with active platform creators
    if (recommendations.length < limit) {
      const existingIds = new Set([
        ...(currentUserId ? [currentUserId.toString()] : []),
        ...currentUserFollowing,
        ...recommendations.map(r => r._id)
      ]);

      const backfillUsers = await User.find(
        { _id: { $nin: Array.from(existingIds).map(id => new mongoose.Types.ObjectId(id)) } },
        { username: 1, name: 1, bio: 1, profilePic: 1, subscriberCount: 1, followers: 1, following: 1, blogs: 1 }
      )
      .limit(20)
      .lean();

      // Apply random shuffle to backfill
      const shuffledBackfill = backfillUsers
        .sort(() => 0.5 - Math.random())
        .slice(0, limit - recommendations.length)
        .map(user => ({
          _id: user._id.toString(),
          username: user.username,
          name: user.name || user.username,
          bio: user.bio || "",
          profilePic: user.profilePic || "",
          followersCount: user.followers?.length || 0,
          followingCount: user.following?.length || 0,
          storiesCount: user.blogs?.length || 0,
          reason: (user.subscriberCount >= 0) ? "Popular Creator" : "Active Member",
          score: Math.random(),
          isFollowing: false
        }));

      recommendations.push(...shuffledBackfill);
    }

    // Sort by stochastic score descending
    recommendations.sort((a, b) => b.score - a.score);

    return {
      success: true,
      people: recommendations.slice(0, limit)
    };
  } catch (error) {
    console.error("Error in getPeopleYouMightKnow:", error);
    return { success: false, people: [], message: error.message };
  }
}

// Helper function to validate email
export async function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Get Public User Profile with Published Stories and Social Connections
export async function getPublicUserProfile(username) {
  try {
    if (!username) return { success: false, message: "Username is required" };
    await connectToDB();

    const cleanUsername = username.trim();
    const targetUser = await User.findOne({ 
      username: { $regex: new RegExp(`^${cleanUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, 'i') } 
    }).lean();

    if (!targetUser) {
      return { success: false, message: "User not found" };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let currentUserId = null;
    let currentUsername = null;
    let isSelf = false;
    let isFollowing = false;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        currentUserId = decoded.id;
        currentUsername = decoded.username;
        isSelf = (currentUsername?.toLowerCase() === targetUser.username.toLowerCase()) || 
                 (currentUserId?.toString() === targetUser._id.toString());
        if (!isSelf && Array.isArray(targetUser.followers)) {
          isFollowing = targetUser.followers.some(id => id.toString() === currentUserId.toString());
        }
      } catch (err) {}
    }

    // Fetch published stories
    const blogs = await Blog.find({ author: targetUser.username }).sort({ date: -1 }).lean();

    // Fetch follower and following lists for profile tabs
    const followerIds = targetUser.followers || [];
    const followingIds = targetUser.following || [];

    const [followerUsers, followingUsers] = await Promise.all([
      followerIds.length > 0
        ? User.find({ _id: { $in: followerIds } }, { username: 1, name: 1, bio: 1, profilePic: 1, followers: 1, following: 1 }).lean()
        : Promise.resolve([]),
      followingIds.length > 0
        ? User.find({ _id: { $in: followingIds } }, { username: 1, name: 1, bio: 1, profilePic: 1, followers: 1, following: 1 }).lean()
        : Promise.resolve([])
    ]);

    // Check if current user is following any of them
    let viewerFollowing = [];
    if (currentUserId) {
      try {
        const cur = await User.findById(currentUserId).select("following").lean();
        viewerFollowing = (cur?.following || []).map(id => id.toString());
      } catch (e) {}
    }

    const formatSocialUser = (u) => ({
      _id: u._id.toString(),
      username: u.username,
      name: u.name || u.username,
      bio: u.bio || "",
      profilePic: u.profilePic || "",
      followersCount: u.followers?.length || 0,
      followingCount: u.following?.length || 0,
      isFollowing: viewerFollowing.includes(u._id.toString())
    });

    return {
      success: true,
      user: {
        _id: targetUser._id.toString(),
        username: targetUser.username,
        name: targetUser.name || targetUser.username,
        bio: targetUser.bio || "",
        profilePic: targetUser.profilePic || "",
        walletAddress: targetUser.walletAddress || "",
        subscriberCount: targetUser.subscriberCount ?? -1,
        followersCount: targetUser.followers?.length || 0,
        followingCount: targetUser.following?.length || 0,
        storiesCount: blogs.length,
        isFollowing,
        isSelf
      },
      blogs: JSON.parse(JSON.stringify(blogs)),
      followers: followerUsers.map(formatSocialUser),
      following: followingUsers.map(formatSocialUser)
    };
  } catch (error) {
    console.error("Error in getPublicUserProfile:", error);
    return { success: false, message: error.message };
  }
}

