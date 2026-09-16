export const metadata = {
  title: "Sign In & Join Pulse — Social Content & Creator Network",
  description:
    "Sign in to your Pulse account or create a new profile to follow top creators, discover inspiring stories, publish articles, and connect via WebRTC live calls on onlypain.in.",
  alternates: {
    canonical: "https://onlypain.in/authenticate/sign-in",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Join Pulse — Social Content & Creator Network",
    description:
      "Sign in or create an account to discover stories, connect with creators, and publish on onlypain.in.",
    url: "https://onlypain.in/authenticate/sign-in",
    siteName: "Pulse",
    type: "website",
  },
};

export default function AuthenticateLayout({ children }) {
  return children;
}
