'use server';
import {User,Blog,History} from "@/models";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import {connectToDB} from "@/database";
import {writeFile,mkdir} from "fs/promises";
import { uploadAndTransform, deleteImage } from "@/action/helper/handleImage";
import createVector from "@/action/helper/createVector";
import mongoose from 'mongoose';
import { BlogSchema } from "@/components/joi-schemas/add-blog";
import { trackBlogVisit } from "./helper/trackBlogVisit";
export async function AddBlog(data) {
  try {
    await connectToDB();
    // const token = await cookies().get("token")?.value;
        const cookieStore = await cookies(); // ✅ await the cookies() call
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "User not authenticated",
      };
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
      };
    }

    // Process file upload if image is provided as FormData
    let imagePath = data.image ,image_id="";
    if (data.image instanceof File || data.image instanceof Blob) {
      ({imagePath,image_id} = await uploadAndTransform(data.image));
    }

    // Prepare blog data with the image path
    const blogData = {
      ...data,
      image: {imagePath,image_id},
      author: user.username
    };

    // Validate the blog data
    const { error } = BlogSchema.validate(blogData);
    if (error) {
      return {
        success: false,
        status: 400,
        message: error.details[0].message,
      };
    }
    // ---------------------------------
    if(data._id){
          const blog1 = await Blog.findById(data._id);
          if (blog1?.author !== user.username) {
            return {
              success: false,
              status: 403,
              message: "You are not authorized to edit this blog",
            };
          }
          // Delete the image file if it exists
        if (imagePath && imagePath !== blog1?.image.imagePath && blog1?.image && blog1?.image?.imagePath) {
      const oldImageId = blog1?.image?.image_id;
      try {
        // Check if file exists before attempting to delete
        if(oldImageId) deleteImage(oldImageId);
        ({imagePath,image_id} = await uploadAndTransform(data.image));
      } catch (Error) {
        console.error(`Failed to delete image file: ${oldImageId}`, Error);
        // Continue with blog deletion even if image deletion fails
      }
    }

      // Update the blog
      const blog = await Blog.findByIdAndUpdate(data._id, blogData, { new: true });
      if (!blog) {
        return {
          success: false,
          status: 404,
          message: "Blog not found",
        };
      }
      createVector(blog);
      return {
        success: true,
        status: 200,
        message: "Blog updated successfully",
        blog: JSON.parse(JSON.stringify(blog))
      };
    }
    // ---------------------------------
    // Create new blog entry
    const newBlog = new Blog(blogData);
    await newBlog.save();
    createVector(newBlog);
    // Update user's blogs array
    await User.findByIdAndUpdate(
      user._id,
      { $push: { blogs: newBlog._id } }
    );

    return {
      success: true,
      status: 201,
      message: "Blog created successfully",
      blog: JSON.parse(JSON.stringify(newBlog))
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      status: 500,
      message: error.message || "An error occurred while creating the blog",
    };
  }
}

export async function fetchBlogs(page = 1, limit = 10, filters = {}) {
  try {
    await connectToDB();
    
    // Build query object based on filters
    const query = {};
    
    // Add filter for premium content
    if (filters.isPremium !== undefined) {
      query.isPremium = filters.isPremium;
    }
    
    // Add filter for specific blog IDs
    if (filters.ids && filters.ids.length > 0) {
      query._id = { $in: filters.ids };
    }
    
    // Add filter for author
    if (filters.author) {
      query.author = filters.author;
    }
    
    // Add filter for topic or tags (case-insensitive across tags, title, and description)
    const topic = filters.topic || (filters.tags && filters.tags.length > 0 ? filters.tags[0] : null);
    if (topic && topic !== "All") {
      const clean = topic.replace(/^#+/, "").replace(/["']/g, "").trim();
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      
      let topicRegex;
      if (clean.length <= 2) {
        topicRegex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}([^a-zA-Z0-9]|$)`, "i");
      } else {
        topicRegex = new RegExp(escaped, "i");
      }

      query.$or = [
        { tags: { $regex: topicRegex } },
        { title: { $regex: topicRegex } },
        { description: { $regex: topicRegex } }
      ];
    } else if (filters.tags && filters.tags.length > 0) {
      const tagRegexes = filters.tags.map(t => {
        const cleanT = t.replace(/^#+/, "").replace(/["']/g, "").trim();
        return new RegExp(cleanT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      });
      query.tags = { $in: tagRegexes };
    }
    
    // Add search functionality
    if (filters.search) {
      const searchRegex = new RegExp(filters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const searchConditions = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
        { tags: { $regex: searchRegex } }
      ];

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions }
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }
    
    // Calculate skip value for pagination
    const skip = (page - 1) * limit;

    // Dynamic sort option
    let sortQuery = { date: -1 };
    if (filters.tab === "trending") {
      sortQuery = { views: -1, date: -1 };
    }
    
    // Fetch blogs with pagination
    const blogs = await Blog.find(query, { content: 0 }) //Prevents premium content from being sent to unauthorized users
      .sort(sortQuery)
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Get total count for this query (for pagination info)
    const total = await Blog.countDocuments(query);
    
    return {
      success: true,
      status: 200,
      blogs: JSON.parse(JSON.stringify(blogs)),
      pagination: {
        page,
        limit,
        total,
        hasMore: skip + blogs.length < total
      }
    };
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to fetch blogs"
    };
  }
}

// In your blogAction.js file
export async function searchBlogs(searchText) {
  try {
    await connectToDB();
    if (!searchText || !searchText.trim()) {
      return { success: true, blogs: [] };
    }
    const cleanSearch = searchText.trim();
    // 1. First try MongoDB text search
    let blogs = await Blog.find(
      { 
        $text: { 
          $search: cleanSearch, 
          $caseSensitive: false, 
          $diacriticSensitive: false 
        } 
      },
      { score: { $meta: "textScore" }, content: 0 }
    )
    .sort({ score: { $meta: "textScore" } })
    .limit(30)
    .lean();

    // 2. If text search returns empty (e.g. for partial words, prefixes, hashtags), fall back to case-insensitive regex
    if (!blogs || blogs.length === 0) {
      const regex = new RegExp(cleanSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      blogs = await Blog.find(
        {
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { tags: { $regex: regex } },
            { author: { $regex: regex } }
          ]
        },
        { content: 0 }
      )
      .sort({ date: -1 })
      .limit(30)
      .lean();
    }

    // Convert Mongoose documents to plain JavaScript objects
    const plainBlogs = JSON.parse(JSON.stringify(blogs));
    return { success: true, blogs: plainBlogs };
  } catch (error) {
    console.error('Search error, falling back to regex:', error);
    try {
      const regex = new RegExp((searchText || '').trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      const fallbackBlogs = await Blog.find(
        {
          $or: [
            { title: { $regex: regex } },
            { description: { $regex: regex } },
            { tags: { $regex: regex } }
          ]
        },
        { content: 0 }
      )
      .sort({ date: -1 })
      .limit(30)
      .lean();
      return { success: true, blogs: JSON.parse(JSON.stringify(fallbackBlogs)) };
    } catch (fallbackErr) {
      return { success: false, message: 'Failed to search blogs', blogs: [] };
    }
  }
}

export async function fetchBlogById(blogId) {
  try {
    if (!blogId || !mongoose.isValidObjectId(blogId)) {
      return {
        success: false,
        status: 404,
        message: "Invalid story ID"
      };
    }

    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    
    let user = null;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        user = await User.findById(decoded.id);
      } catch (tokenErr) {
        // Invalid or expired token
      }
    }

    const blog = await Blog.findById(blogId).lean();

    if (!blog) {
      return {
        success: false,
        status: 404,
        message: "Blog not found"
      };
    }

    // Gate premium stories for non-subscribers or guests
    if (blog.isPremium) {
      if (!user) {
        return {
          success: false,
          status: 401,
          message: "User not authenticated",
        };
      }
      if (blog.author !== user.username && !user.subscription?.includes(blog.author)) {
        return {
          success: false,
          status: 403,
          message: "You are not authorized to view this blog",
          author: blog.author
        };
      }
    }

    if (user?.username) {
      trackBlogVisit(user.username, blogId);
    }
    
    // Safely update views and viewsLog (handle documents where viewsLog was stored as a number)
    const updateOps = { $inc: { views: 1 } };
    if (Array.isArray(blog.viewsLog)) {
      updateOps.$push = {
        viewsLog: {
          $each: [{ date: new Date() }],
          $slice: -50
        }
      };
    } else {
      updateOps.$set = { viewsLog: [{ date: new Date() }] };
    }
    Blog.findByIdAndUpdate(blogId, updateOps).catch(err => console.error("Error logging blog view event:", err));

    const plainBlog = JSON.parse(JSON.stringify(blog));
    if (!Array.isArray(plainBlog.comments)) {
      plainBlog.comments = [];
    }
    if (!Array.isArray(plainBlog.likes)) {
      plainBlog.likes = [];
    }

    return {
      success: true,
      status: 200,
      blog: plainBlog
    };
  } catch (error) {
    console.error("Error fetching blog:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to fetch blog"
    };
  }
}

export async function deleteBlog(blogId) {
  try {
    await connectToDB();
    // const token = await cookies().get("token")?.value;
        const cookieStore = await cookies(); // ✅ await the cookies() call
    const token = cookieStore.get("token")?.value;
    
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "User not authenticated",
      };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
      };
    }
    
    // Find the blog
    const blog = await Blog.findById(blogId);
    
    if (!blog) {
      return {
        success: false,
        status: 404,
        message: "Blog not found",
      };
    }
    
    // Check if user is the author
    if (blog.author !== user.username) {
      return {
        success: false,
        status: 403,
        message: "You don't have permission to delete this blog",
      };
    }
    
    if (blog.image?.image_id) {
      try {
        await deleteImage(blog.image.image_id);
        console.log(`Deleted image: ${blog.image.image_id}`);
      } catch (fileError) {
        console.error(`Failed to delete image: ${blog.image.image_id}`, fileError);
      }
    }


    // Delete the blog
    await Blog.findByIdAndDelete(blogId);
    
    // Remove blog from user's blogs array
    await User.findByIdAndUpdate(
      user._id,
      { $pull: { blogs: blogId } }
    );
    
    return {
      success: true,
      status: 200,
      message: "Blog deleted successfully",
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      status: 500,
      message: error.message || "An error occurred while deleting the blog",
    };
  }
}
export async function fetchHistory() {
  try {
    await connectToDB();
    // const token = await cookies().get("token")?.value;
        const cookieStore = await cookies(); // ✅ await the cookies() call
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "User not authenticated",
        visitedBlogs: [] // Always include an empty array
      };
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
        visitedBlogs: [] // Always include an empty array
      };
    }
    
    const history = await History.findOne({ username: user.username });

    if (!history || !history.visitHistory || history.visitHistory.length === 0) {
      return {
        success: true,
        status: 200,
        visitedBlogs: [] // Return empty array if no history found
      };
    }

    // Extract blog IDs from visitHistory
    const blogIds = history.visitHistory.map(visit => visit.blogId);

    // Fetch blog details
    const blogs = await Blog.find({ _id: { $in: blogIds } }).lean();

    return {
      success: true,
      status: 200,
      visitedBlogs:  JSON.parse(JSON.stringify(blogs))
    };
  } catch (error) {
    console.log("Error fetching history:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to fetch history",
      visitedBlogs: [] // Always include an empty array
    };
  }
}


const RECOMMENDER_URL = process.env.RECOMMENDER_API_URL // e.g. "https://api.myapp.com"

export async function getRecommendedBlogs(blogIds, k = 5, candidate_pool_size = 30) {
  try {
    if (RECOMMENDER_URL) {
      // 1) Call the Python recommender with 3s timeout
      const res = await fetch(`${RECOMMENDER_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blog_ids: blogIds, k, candidate_pool_size }),
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const { recommended_ids } = await res.json();
        if (recommended_ids && recommended_ids.length > 0) {
          await connectToDB();
          const objectIds = recommended_ids.map(id => new mongoose.Types.ObjectId(id));
          const blogs = await Blog.find({ _id: { $in: objectIds } })
            .sort({ date: -1 })
            .lean();
          return JSON.parse(JSON.stringify(blogs));
        }
      }
    }
  } catch (err) {
    console.warn('Recommender unavailable or timed out, falling back to recent stories:', err.message);
  }

  // Graceful Fallback: Fetch recent stories excluding current blog
  try {
    await connectToDB();
    const excludeIds = (blogIds || [])
      .filter(id => mongoose.isValidObjectId(id))
      .map(id => new mongoose.Types.ObjectId(id));
    const fallbackBlogs = await Blog.find({ _id: { $nin: excludeIds } })
      .sort({ date: -1 })
      .limit(k)
      .lean();
    return JSON.parse(JSON.stringify(fallbackBlogs));
  } catch (fallbackErr) {
    console.error('Fallback query error:', fallbackErr);
    return [];
  }
}

export async function fetchBlogsByIds(blogIds = []) {
  try {
    await connectToDB();
    
    // Validate input
    if (!Array.isArray(blogIds) || blogIds.length === 0) {
      return {
        success: false,
        status: 400,
        message: "Invalid blog IDs provided",
        blogs: []
      };
    }
    
    // Fetch blogs by IDs
    const blogs = await Blog.find({ _id: { $in: blogIds } }, { content: 0 })
      .sort({ date: -1 })
      .lean();
    
    return {
      success: true,
      status: 200,
      blogs: JSON.parse(JSON.stringify(blogs))
    };
  } catch (error) {
    console.error("Error fetching blogs by IDs:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to fetch blogs",
      blogs: []
    };
  }
}

export async function toggleLikeBlog(blogId) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "Please sign in to like this story",
      };
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
      };
    }

    const blog = await Blog.findById(blogId);
    if (!blog) {
      return {
        success: false,
        status: 404,
        message: "Blog not found",
      };
    }

    const username = user.username;
    const likes = Array.isArray(blog.likes) ? blog.likes : [];
    const alreadyLiked = likes.includes(username);

    let updatedBlog;
    if (alreadyLiked) {
      updatedBlog = await Blog.findByIdAndUpdate(
        blogId,
        { $pull: { likes: username } },
        { new: true }
      );
    } else {
      updatedBlog = await Blog.findByIdAndUpdate(
        blogId,
        { $addToSet: { likes: username } },
        { new: true }
      );
    }

    const newLikes = updatedBlog?.likes || [];
    return {
      success: true,
      status: 200,
      liked: !alreadyLiked,
      likeCount: newLikes.length,
      likes: newLikes
    };
  } catch (error) {
    console.error("Error toggling blog like:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to toggle like",
    };
  }
}

export async function addBlogComment(blogId, content) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "Please sign in to leave a comment",
      };
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
      };
    }

    const trimmedContent = (content || '').trim();
    if (!trimmedContent) {
      return {
        success: false,
        status: 400,
        message: "Comment cannot be empty",
      };
    }
    if (trimmedContent.length > 1000) {
      return {
        success: false,
        status: 400,
        message: "Comment exceeds maximum limit of 1000 characters",
      };
    }

    const newComment = {
      username: user.username,
      content: trimmedContent,
      createdAt: new Date()
    };

    const updatedBlog = await Blog.findByIdAndUpdate(
      blogId,
      { $push: { comments: newComment } },
      { new: true }
    );

    if (!updatedBlog) {
      return {
        success: false,
        status: 404,
        message: "Blog not found",
      };
    }

    return {
      success: true,
      status: 200,
      message: "Comment posted successfully",
      comment: JSON.parse(JSON.stringify(newComment)),
      comments: JSON.parse(JSON.stringify(updatedBlog.comments || []))
    };
  } catch (error) {
    console.error("Error posting comment:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to post comment",
    };
  }
}

export async function uploadInlineImage(formData) {
  try {
    const file = formData.get('file');
    if (!file) {
      return { success: false, message: 'No file provided' };
    }

    try {
      const { imagePath } = await uploadAndTransform(file);
      if (imagePath) {
        return { success: true, url: imagePath };
      }
    } catch (uploadErr) {
      console.warn('Cloudinary upload error, falling back to data URL:', uploadErr.message);
    }

    // Fallback: Convert to Base64 Data URL so user is never blocked
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    return { success: true, url: dataUrl };
  } catch (error) {
    console.error('Error in uploadInlineImage:', error);
    return { success: false, message: error.message || 'Failed to upload image' };
  }
}

export async function toggleBookmarkBlog(blogId) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) {
      return {
        success: false,
        status: 401,
        message: "Please sign in to bookmark stories",
      };
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
    const user = await User.findById(decoded.id);
    if (!user) {
      return {
        success: false,
        status: 404,
        message: "User not found",
      };
    }

    const currentBookmarks = Array.isArray(user.bookmarks) 
      ? user.bookmarks.map(id => id.toString()) 
      : [];
    const isBookmarked = currentBookmarks.includes(blogId.toString());

    let updatedUser;
    if (isBookmarked) {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $pull: { bookmarks: new mongoose.Types.ObjectId(blogId) } },
        { new: true }
      );
    } else {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        { $addToSet: { bookmarks: new mongoose.Types.ObjectId(blogId) } },
        { new: true }
      );
    }

    const updatedBookmarks = (updatedUser?.bookmarks || []).map(id => id.toString());

    return {
      success: true,
      status: 200,
      bookmarked: !isBookmarked,
      bookmarks: updatedBookmarks
    };
  } catch (error) {
    console.error("Error toggling bookmark:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to toggle bookmark",
    };
  }
}

export async function fetchBookmarkedBlogs(fallbackIds = []) {
  try {
    await connectToDB();
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    let targetIds = [];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret");
        const user = await User.findById(decoded.id);
        if (user && Array.isArray(user.bookmarks)) {
          targetIds = user.bookmarks.map(id => id.toString());
        }
      } catch (err) {
        console.warn("Token verification failed in fetchBookmarkedBlogs:", err.message);
      }
    }

    // Merge with any client fallbackIds that are valid ObjectIds
    if (Array.isArray(fallbackIds) && fallbackIds.length > 0) {
      fallbackIds.forEach(id => {
        if (mongoose.Types.ObjectId.isValid(id) && !targetIds.includes(id.toString())) {
          targetIds.push(id.toString());
        }
      });
    }

    if (targetIds.length === 0) {
      return {
        success: true,
        status: 200,
        blogs: []
      };
    }

    const objectIds = targetIds.map(id => new mongoose.Types.ObjectId(id));
    const blogs = await Blog.find({ _id: { $in: objectIds } }, { content: 0 })
      .sort({ date: -1 })
      .lean();

    return {
      success: true,
      status: 200,
      blogs: JSON.parse(JSON.stringify(blogs))
    };
  } catch (error) {
    console.error("Error fetching bookmarked blogs:", error);
    return {
      success: false,
      status: 500,
      message: error.message || "Failed to fetch bookmarks",
      blogs: []
    };
  }
}


