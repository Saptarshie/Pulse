import { fetchBlogById, getRecommendedBlogs } from "@/action/blogAction";
import BlogCard from "@/components/blog-feed/blog-card";

// Similar Blogs Component
export async function SimilarBlogs({ blogId }) {
  try {
    const similarBlogs = await getRecommendedBlogs([blogId], 4, 10);
    
    if (!similarBlogs || similarBlogs.length === 0) {
      return (
        <p className="text-sm text-slate-400 italic">
          No related stories found at this moment.
        </p>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {similarBlogs.map((similarBlog) => (
          <BlogCard key={similarBlog._id} blog={similarBlog} />
        ))}
      </div>
    );
  } catch (error) {
    console.error("Error fetching similar blogs:", error);
    return null;
  }
}

// Loading component for SimilarBlogs
export function SimilarBlogsLoading() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[1, 2].map((i) => (
        <div key={i} className="glass-card rounded-2xl p-5 border border-slate-200/80 animate-pulse space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-slate-200 rounded-full" />
            <div className="h-3 bg-slate-200 rounded w-1/3" />
          </div>
          <div className="h-36 bg-slate-200 rounded-xl" />
          <div className="h-4 bg-slate-200 rounded w-2/3" />
          <div className="h-3 bg-slate-200 rounded w-full" />
        </div>
      ))}
    </div>
  );
}
