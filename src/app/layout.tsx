import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Footer } from "@/components/Footer";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "https://heckled.dev"),
  title: { default: "Heckled: get your landing page roasted", template: "%s · Heckled" },
  description:
    "Paste a URL. A voiced roaster performs a 45 second roast of your landing page, then gives you one real fix.",
  openGraph: { siteName: "Heckled", type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
  icons: { icon: "/favicon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#09090b" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-theme is set before paint by the script below, so React will find
    // an attribute it didn't render.
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          // Dark, unless the reader turned the sheet over to light.
          dangerouslySetInnerHTML={{
            __html: `try{document.documentElement.dataset.theme=localStorage.getItem("heckled_theme")==="light"?"light":"dark"}catch(e){}`,
          }}
        />
        <link rel="preconnect" href="https://use.typekit.net" crossOrigin="" />
        <link rel="stylesheet" href="https://use.typekit.net/guv6qty.css" />
      </head>
      <body>
        {/* The sheet: one column with hairline edges, like the other sites. */}
        <div className="mx-auto flex min-h-dvh max-w-[1270px] flex-col border-x border-line bg-sheet">
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <Script src="https://analytics.joncp.dev/s.js?site=heckled.dev" data-site="heckled.dev" strategy="afterInteractive" />
      </body>
    </html>
  );
}
