import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
const SITE_URL = "https://www.unitybag.com";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const urls: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/catalog`,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    console.error("Sitemap: Supabase environment configuration is missing.");
    return urls;
  }
  try {
    const supabase = createClient(
      supabaseUrl,
      supabasePublishableKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );
    const { data, error } = await supabase
      .from("catalog_products")
      .select("slug")
      .eq("is_active", true)
      .not("slug", "is", null);
    if (error) {
      console.error("Sitemap product lookup failed:", error.message);
      throw new Error("Could not retrieve published catalog products.");
    }
    const seen = new Set<string>();
    for (const product of data ?? []) {
      const slug =
        typeof product.slug === "string" ? product.slug.trim() : "";
      if (!slug) continue;
      const url = `${SITE_URL}/catalog/${encodeURIComponent(slug)}`;
      if (seen.has(url)) continue;
      seen.add(url);
      urls.push({
        url,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    return urls;
  } catch (error) {
    console.error("Sitemap generation failed:", error);
    throw error;
  }
}
