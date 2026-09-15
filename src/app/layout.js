import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import CommonLayout from "@/components/common-layout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Pulse — Social Content & Creator Network",
  description: "Discover inspiring stories, follow leading creators, and monetize high-impact content in a next-generation decentralized social network.",
  keywords: ["pulse", "social platform", "creator network", "web3 publishing", "stories", "articles", "feed"],
  openGraph: {
    title: "Pulse — Social Content & Creator Network",
    description: "Where ideas find their rhythm. Discover, create, and monetize next-gen content.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full scroll-smooth" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col font-sans antialiased text-slate-900 bg-slate-50 selection:bg-indigo-500 selection:text-white`}
      >
        <CommonLayout>
          {children}
        </CommonLayout>
      </body>
    </html>
  );
}
