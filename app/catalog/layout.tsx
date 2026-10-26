import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: {
    absolute: "Jute, Cloth & Paper Bag Catalog | Unity Enterprise",
  },
  description:
    "Explore Unity Enterprise's reusable jute bags, cloth bags and paper bags. Browse our public catalog for product models, sizes, colours, availability and enquiries.",
  alternates: {
    canonical: "/catalog",
  },
  openGraph: {
    title: "Jute, Cloth & Paper Bag Catalog | Unity Enterprise",
    description:
      "Browse reusable jute bags, cloth bags and paper bags from Unity Enterprise in Bharuch, Gujarat.",
    url: "https://www.unitybag.com/catalog",
    siteName: "Unity Enterprise",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/unity-logo.png",
        alt: "Unity Enterprise bag catalog",
      },
    ],
  },
};
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Unity Enterprise",
  url: "https://www.unitybag.com",
  logo: "https://www.unitybag.com/unity-logo.png",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Bharuch",
    addressRegion: "Gujarat",
    addressCountry: "IN",
  },
};
export default function CatalogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const safeSchema = JSON.stringify(organizationSchema).replace(
    /</g,
    "\\u003c"
  );
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeSchema }}
      />
      {children}
    </>
  );
}