import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/login",
        "/dashboard",
        "/products",
        "/inventory",
        "/orders",
        "/store",
      ],
    },
    sitemap: "https://www.unitybag.com/sitemap.xml",
  };
}