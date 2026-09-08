import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PersonaProvider } from "@/contexts/PersonaContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppearanceProvider } from "@/contexts/AppearanceContext";
import { SkipToContent } from "@/components/common/SkipToContent";
import { AccessibilityAnnouncer } from "@/components/common/AccessibilityAnnouncer";
import { Footer } from "@/components/dashboard/Footer";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { FloatingActionDock } from "@/components/common/FloatingActionDock";
import { KeyboardShortcutsModal } from "@/components/common/KeyboardShortcutsModal";
import { ClientResilienceProvider } from "@/components/common/ClientResilienceProvider";
import { SITE_CONFIG } from "@/lib/seo/siteConfig";
import { JsonLd, createOrganizationSchema, createWebSiteSchema } from "@/lib/seo/jsonld";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#07080d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_CONFIG.url),
  title: {
    default: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    template: `%s | ${SITE_CONFIG.name}`,
  },
  description: SITE_CONFIG.description,
  keywords: SITE_CONFIG.keywords,
  authors: SITE_CONFIG.authors,
  creator: SITE_CONFIG.creator,
  publisher: SITE_CONFIG.publisher,
  alternates: {
    canonical: SITE_CONFIG.url,
    types: {
      'application/rss+xml': `${SITE_CONFIG.url}/feed.xml`,
      'application/opensearchdescription+xml': `${SITE_CONFIG.url}/opensearch.xml`,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  applicationName: SITE_CONFIG.name,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_CONFIG.name,
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_CONFIG.url,
    siteName: SITE_CONFIG.name,
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: SITE_CONFIG.description,
    images: [
      {
        url: `${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`,
        width: 1200,
        height: 630,
        alt: `${SITE_CONFIG.name} Universal AI Gateway`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_CONFIG.name} — ${SITE_CONFIG.tagline}`,
    description: "One unified API for OpenAI GPT-5.6 models with automated failover and 25%–40% wholesale savings.",
    creator: SITE_CONFIG.twitterHandle,
    site: SITE_CONFIG.twitterHandle,
    images: [`${SITE_CONFIG.url}${SITE_CONFIG.ogImage}`],
  },
  verification: {
    google: SITE_CONFIG.verification.google,
    yandex: SITE_CONFIG.verification.yandex,
    other: {
      'msvalidate.01': SITE_CONFIG.verification.bing,
    },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootGraphSchema = {
    "@context": "https://schema.org",
    "@graph": [
      createOrganizationSchema(),
      createWebSiteSchema(),
    ],
  };

  return (
    <html lang="en" className={`dark ${fontSans.variable} ${fontMono.variable}`}>
      <head>
        {/* OpenSearch Auto-Discovery for Browser URL bar integration */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          title="GALXAI Model Search"
          href="/opensearch.xml"
        />
        {/* RSS / Atom Feed Auto-Discovery */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title="GALXAI Model & Engine Updates"
          href="/feed.xml"
        />
        {/* Network Resource Hints for Zero-Hesitation Connection Warm-Up */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#07090e] text-foreground antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
        <JsonLd data={rootGraphSchema} />

        {/* Ambient Nebula Background */}
        <div className="ambient-nebula-glow fixed inset-0 pointer-events-none overflow-hidden z-0 transform-gpu will-change-transform">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px] transform-gpu" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px] transform-gpu" />
          <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px] transform-gpu" />
          <div className="absolute inset-0 bg-cyber-grid bg-[size:40px_40px] opacity-20 transform-gpu" />
        </div>

        <ClientResilienceProvider>
          <AppearanceProvider>
            <LanguageProvider>
              <SkipToContent />
              <AccessibilityAnnouncer />
              <AuthProvider>
                <PersonaProvider>
                  <div id="main-content" tabIndex={-1} className="relative z-10 flex-1 flex flex-col pb-16 lg:pb-0 outline-none">
                    {children}
                    <Footer />
                  </div>
                  <FloatingActionDock />
                  <MobileBottomNav />
                  <KeyboardShortcutsModal />
                </PersonaProvider>
              </AuthProvider>
            </LanguageProvider>
          </AppearanceProvider>
        </ClientResilienceProvider>
      </body>
    </html>
  );
}
