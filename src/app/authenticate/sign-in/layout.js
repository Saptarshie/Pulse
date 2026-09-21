export const metadata = {
  title: "Sign In to Pulse — Access Your Creator Feed & Network",
  description:
    "Sign in to your Pulse account on onlypain.in. Discover inspiring stories, follow leading creators, engage in real-time WebRTC live calls, and manage your creator studio.",
  alternates: {
    canonical: "https://onlypain.in/authenticate/sign-in",
  },
  openGraph: {
    title: "Sign In to Pulse — Social Content & Creator Network",
    description:
      "Sign in to access your customized story feed, follow creators, and connect live on onlypain.in.",
    url: "https://onlypain.in/authenticate/sign-in",
    siteName: "Pulse",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Sign In to Pulse — Social Content & Creator Network",
    description:
      "Sign in to your Pulse account on onlypain.in to curate your feed and connect live.",
  },
};

export default function SignInLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Sign In to Pulse",
            "url": "https://onlypain.in/authenticate/sign-in",
            "description":
              "Sign in to your Pulse account to follow creators, publish stories, and connect via live video.",
            "isPartOf": {
              "@type": "WebSite",
              "name": "Pulse",
              "url": "https://onlypain.in"
            }
          })
        }}
      />
      {children}
    </>
  );
}
