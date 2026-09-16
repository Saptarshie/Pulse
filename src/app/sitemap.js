import { connectToDB } from "@/database";
import { Blog, User } from "@/models";

export default async function sitemap() {
  const baseUrl = "https://onlypain.in";

  // Static high-priority pages
  const staticRoutes = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/search`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/authenticate/sign-in`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: `${baseUrl}/authenticate/sign-up`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  let dynamicBlogRoutes = [];
  let dynamicProfileRoutes = [];

  try {
    await connectToDB();

    // Fetch published stories
    const blogs = await Blog.find({}, { _id: 1, date: 1 })
      .sort({ date: -1 })
      .limit(100)
      .lean();

    if (Array.isArray(blogs)) {
      dynamicBlogRoutes = blogs.map((b) => ({
        url: `${baseUrl}/blogs/${b._id}`,
        lastModified: b.date || new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      }));
    }

    // Fetch active creators
    const users = await User.find({}, { username: 1, updatedAt: 1 })
      .limit(100)
      .lean();

    if (Array.isArray(users)) {
      dynamicProfileRoutes = users
        .filter((u) => u.username)
        .map((u) => ({
          url: `${baseUrl}/profile/${u.username}`,
          lastModified: u.updatedAt || new Date(),
          changeFrequency: "weekly",
          priority: 0.7,
        }));
    }
  } catch (err) {
    console.error("Error generating sitemap dynamic routes:", err);
  }

  return [...staticRoutes, ...dynamicBlogRoutes, ...dynamicProfileRoutes];
}
