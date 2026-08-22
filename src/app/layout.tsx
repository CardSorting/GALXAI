import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Footer } from "@/components/dashboard/Footer";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "GALXAI — Unified AI Model Router & Universal API Gateway",
    template: "%s | GALXAI",
  },
  description: "One unified OpenAI-compatible API for the world's best models. Sub-millisecond routing, automatic failover, and rate-limit pooling across OpenAI Codex and xAI Grok.",
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
    "Multi-Account Routing"
  ],
  authors: [{ name: "GALXAI Core Team" }],
  creator: "GALXAI",
  publisher: "GALXAI",
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
    images: [
      {
        url: `${APP_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "GALXAI Unified AI Model Router & API Gateway",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GALXAI — Unified AI Model Router",
    description: "One unified API for OpenAI Codex and xAI Grok models with automated failover.",
    images: [`${APP_URL}/og-image.png`],
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
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "GALXAI",
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "All",
    "offers": {
      "@type": "Offer",
      "price": "0.00",
      "priceCurrency": "USD"
    },
    "description": "Universal AI model router and OpenAI-compatible API gateway for OpenAI Codex and xAI Grok frontier models."
  };

  return (
    <html lang="en" className="dark">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
          <div className="relative z-10 flex-1 flex flex-col">
            {children}
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
