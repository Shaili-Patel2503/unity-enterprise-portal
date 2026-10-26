
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.unitybag.com"),
  title: {
    default: "Unity Enterprise | Jute, Cloth & Paper Bags",
    template: "%s | Unity Enterprise",
  },
  description:
    "Explore Unity Enterprise's reusable jute bags, cloth bags and paper bags in Bharuch, Gujarat. Browse product models, sizes, colours and availability, and enquire about your requirements.",
  applicationName: "Unity Enterprise",
  keywords: [
    "Unity Enterprise",
    "jute bags",
    "cloth bags",
    "paper bags",
    "reusable bags",
    "carry bags",
    "bag supplier in Bharuch",
    "bag supplier in Gujarat",
    "bulk bag enquiries",
  ],
  authors: [{ name: "Unity Enterprise" }],
  publisher: "Unity Enterprise",
  openGraph: {
    title: "Unity Enterprise | Jute, Cloth & Paper Bags",
    description:
      "Browse reusable jute bags, cloth bags and paper bags from Unity Enterprise in Bharuch, Gujarat.",
    url: "https://www.unitybag.com/catalog",
    siteName: "Unity Enterprise",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/unity-logo.png",
        alt: "Unity Enterprise",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Unity Enterprise | Jute, Cloth & Paper Bags",
    description:
      "Explore reusable bag models, sizes, colours and availability from Unity Enterprise.",
    images: ["/unity-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
