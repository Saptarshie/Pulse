export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/creator-dashboard/",
          "/settings/",
          "/history/",
          "/messages/",
        ],
      },
    ],
    sitemap: "https://onlypain.in/sitemap.xml",
    host: "https://onlypain.in",
  };
}
