import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createClient } from "@supabase/supabase-js";
const SITE_URL = "https://www.unitybag.com";
type RouteProps = {
  params: Promise<{ slug: string }>;
};
export async function generateMetadata({
  params,
}: RouteProps): Promise<Metadata> {
  const { slug } = await params;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabasePublishableKey) {
    return {
      title: "Product Details",
      description:
        "Explore reusable bag models in the Unity Enterprise catalog.",
    };
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
    const { data: product, error } = await supabase
      .from("catalog_products")
      .select(
        "slug, model, name, category, size, colors, public_description, image_urls, is_active"
      )
      .eq("slug", slug)
      .eq("is_active", true)
      .maybeSingle();
    if (error || !product) {
      return {
        title: "Product Details",
        description:
          "Explore reusable bag models in the Unity Enterprise catalog.",
      };
    }
    const productName =
      typeof product.name === "string" && product.name.trim()
        ? product.name.trim()
        : product.model;
    const model = typeof product.model === "string"
      ? product.model.trim()
      : "";
    const title = model
      ? `${productName} (${model}) | Unity Enterprise`
      : `${productName} | Unity Enterprise`;
    const descriptionParts = [
      typeof product.public_description === "string"
        ? product.public_description.trim()
        : "",
      typeof product.category === "string" && product.category.trim()
        ? `Category: ${product.category.trim()}.`
        : "",
      typeof product.size === "string" && product.size.trim()
        ? `Size: ${product.size.trim()}.`
        : "",
      typeof product.colors === "string" && product.colors.trim()
        ? `Colours: ${product.colors.trim()}.`
        : "",
    ].filter(Boolean);
    const description = (
      descriptionParts.join(" ") ||
      `Explore ${productName} in the Unity Enterprise reusable bag catalog.`
    ).slice(0, 160);
    const imageUrls = Array.isArray(product.image_urls)
      ? product.image_urls.filter(
          (url: unknown): url is string =>
            typeof url === "string" &&
            (url.startsWith("https://") ||
              url.startsWith("http://") ||
              url.startsWith("/"))
        )
      : [];
    const canonicalUrl =
      `${SITE_URL}/catalog/${encodeURIComponent(slug)}`;
    const openGraphImages = imageUrls.length > 0
      ? imageUrls.slice(0, 3).map((url) => ({
          url,
          alt: title,
        }))
      : [
          {
            url: "/unity-logo.png",
            alt: "Unity Enterprise",
          },
        ];
    return {
      title: {
        absolute: title,
      },
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      robots: {
        index: true,
        follow: true,
      },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        siteName: "Unity Enterprise",
        locale: "en_IN",
        type: "website",
        images: openGraphImages,
      },
      twitter: {
        card: "summary",
        title,
        description,
        images: imageUrls.length > 0
          ? imageUrls.slice(0, 3)
          : ["/unity-logo.png"],
      },
    };
  } catch (error) {
    console.error("Product metadata lookup failed:", error);
    return {
      title: "Product Details",
      description:
        "Explore reusable bag models in the Unity Enterprise catalog.",
    };
  }
}
export default function ProductSlugLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}