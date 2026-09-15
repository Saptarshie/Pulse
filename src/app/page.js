import BlogList from "@/components/blog-feed/blog-list";
import { getTrendingTopicsAndCreators } from "@/action/trendingAction";

export default async function Home() {
  const trendingData = await getTrendingTopicsAndCreators();

  return (
    <BlogList initialTrending={trendingData} />
  );
}
