import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ||
    (host.startsWith("localhost") ? "http" : "https");
  const ogImage = `${protocol}://${host}/og-v2.png`;

  return {
    title: "Pearl Laundry · Shop Operations",
    description:
      "Secure laundry billing, customers, payments, catalog management, and reports for shop owners and staff.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Pearl Laundry · Shop Operations",
      description:
        "Secure billing, customers, payments, reports, and service management for a modern laundry shop.",
      type: "website",
      images: [{ url: ogImage, width: 1735, height: 907 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pearl Laundry · Shop Operations",
      description:
        "Run laundry orders, payments, customers, reports, and service pricing in one secure app.",
      images: [ogImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
