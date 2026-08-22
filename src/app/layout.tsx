import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { PersonaProvider } from "@/contexts/PersonaContext";
import { Footer } from "@/components/dashboard/Footer";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { FloatingActionDock } from "@/components/common/FloatingActionDock";
import { KeyboardShortcutsModal } from "@/components/common/KeyboardShortcutsModal";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://galx.ai";

export const viewport: Viewport = {
  themeColor: "#07080d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "GALXAI — Unified AI Model Router & Universal API Gateway",
    template: "%s | GALXAI",
  },
  description: "One unified OpenAI-compatible API for the world's best models. Sub-millisecond routing, automatic failover, and rate-limit pooling across OpenAI Codex and xAI Grok with 25%–40% wholesale savings.",
  keywords: [
    "AI Gateway",
    "Model Router",
    "Unified AI API",
    "OpenAI Codex",
    "xAI Grok",
    "gpt-5.6-sol",
    "gpt-5.6-terra",
    "gpt-5.6-luna",
    "grok-4.5",
    "Continuous Token Governor",
    "Circuit Breaker",
    "Multi-Account Routing",
    "Wholesale AI Tokens",
    "Cursor AI API Key",
    "Windsurf Base URL"
  ],
  authors: [{ name: "GALXAI Core Team" }],
  creator: "GALXAI",
  publisher: "GALXAI",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: APP_URL,
    siteName: "GALXAI",
    title: "GALXAI — Unified AI Model Router & Universal API Gateway",
    description: "One unified API for the world's best AI models with automatic failover, sub-millisecond routing, and continuous rate limit governance.",
  },
  twitter: {
    card: "summary_large_image",
    title: "GALXAI — Unified AI Model Router & Gateway",
    description: "One unified API for OpenAI Codex and xAI Grok models with automated failover and 25%–40% wholesale savings.",
    creator: "@galxai",
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
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        "name": "GALXAI",
        "url": APP_URL,
        "logo": `${APP_URL}/icon.png`,
        "description": "Enterprise-grade universal AI model router and low-latency API gateway.",
        "sameAs": [
          "https://twitter.com/galxai",
          "https://github.com/galxai"
        ]
      },
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        "url": APP_URL,
        "name": "GALXAI",
        "publisher": {
          "@id": `${APP_URL}/#organization`
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${APP_URL}/models?q={search_term_string}`,
          "query-input": "required name=search_term_string"
        }
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${APP_URL}/#software`,
        "name": "GALXAI Universal Gateway",
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0.00",
          "priceCurrency": "USD"
        },
        "description": "Universal AI model router and OpenAI-compatible API gateway for OpenAI Codex and xAI Grok frontier models with continuous rate-limit governance."
      }
    ]
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen bg-[#07080d] text-zinc-100 antialiased selection:bg-indigo-500 selection:text-white flex flex-col">
        {/* Ambient Nebula Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
          <div className="absolute top-1/3 -right-40 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
          <div className="absolute -bottom-40 left-1/3 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[160px]" />
          <div className="absolute inset-0 bg-cyber-grid bg-[size:40px_40px] opacity-20" />
        </div>

        <AuthProvider>
          <PersonaProvider>
            <div className="relative z-10 flex-1 flex flex-col pb-16 lg:pb-0">
              {children}
              <Footer />
            </div>
            <FloatingActionDock />
            <MobileBottomNav />
            <KeyboardShortcutsModal />
          </PersonaProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
