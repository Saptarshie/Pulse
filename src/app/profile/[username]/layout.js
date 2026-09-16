export async function generateMetadata({ params }) {
  const { username } = await params;
  const cleanUsername = username ? decodeURIComponent(username) : "creator";
  return {
    title: `@${cleanUsername} — Creator Profile`,
    description: `Explore published stories, subscriber metrics, and updates by @${cleanUsername} on Pulse (onlypain.in).`,
    alternates: {
      canonical: `https://onlypain.in/profile/${cleanUsername}`,
    },
    openGraph: {
      title: `@${cleanUsername} | Pulse Creator Network`,
      description: `Explore published stories and updates by @${cleanUsername} on Pulse (onlypain.in).`,
      url: `https://onlypain.in/profile/${cleanUsername}`,
      siteName: "Pulse",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title: `@${cleanUsername} — Pulse Creator Profile`,
      description: `Explore published stories and updates by @${cleanUsername} on Pulse (onlypain.in).`,
    },
  };
}

export default function ProfileLayout({ children }) {
  return children;
}
