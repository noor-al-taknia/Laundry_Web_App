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
  const ogImage = `${protocol}://${host}/og.png`;

  return {
    title: "Pearl Laundry · Saudi VAT Invoice",
    description:
      "Create, preview, QR-code, and print Saudi ZATCA Phase 1 laundry tax invoices.",
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      title: "Pearl Laundry · Tax Invoice Studio",
      description:
        "A browser-based Saudi VAT invoice generator with ZATCA Phase 1 QR codes.",
      type: "website",
      images: [{ url: ogImage, width: 1735, height: 907 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Pearl Laundry · Tax Invoice Studio",
      description:
        "Build and print Saudi VAT laundry invoices with a compliant QR code.",
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
