export const metadata = {
  title: "Create an Account — Join Pulse Social & Creator Network",
  description:
    "Create your free account on Pulse (onlypain.in). Join an active community of writers and creators, publish stories, monetize through Web3, and connect via live video calls.",
  alternates: {
    canonical: "https://onlypain.in/authenticate/sign-up",
  },
  openGraph: {
    title: "Join Pulse — Social Content & Creator Network",
    description:
      "Create your free account on Pulse. Publish rich articles, build an audience, and connect with creators on onlypain.in.",
    url: "https://onlypain.in/authenticate/sign-up",
    siteName: "Pulse",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Join Pulse Creator Network",
    description:
      "Create a free account on Pulse (onlypain.in) and start publishing stories today.",
  },
};

export default function SignUpLayout({ children }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            "name": "Create an Account on Pulse",
            "url": "https://onlypain.in/authenticate/sign-up",
            "description":
              "Create an account on Pulse to write stories, build a following, and monetize your content.",
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
