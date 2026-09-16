import BlogList from "@/components/blog-feed/blog-list";
import { getTrendingTopicsAndCreators } from "@/action/trendingAction";

export const metadata = {
  title: "Pulse — Discover Inspiring Stories, Leading Creators & Live Network",
  description:
    "Explore the live social feed on Pulse (onlypain.in). Read trending stories, discover featured creators, engage in real-time direct messaging, and connect via native WebRTC live calls.",
  alternates: {
    canonical: "https://onlypain.in",
  },
  openGraph: {
    title: "Pulse — Discover Inspiring Stories, Leading Creators & Live Network",
    description:
      "Explore the live social feed on Pulse (onlypain.in). Read trending stories, discover featured creators, and connect in real-time.",
    url: "https://onlypain.in",
  },
};

export default async function Home() {
  const trendingData = await getTrendingTopicsAndCreators();

  return (
    <BlogList initialTrending={trendingData} />
  );
}
