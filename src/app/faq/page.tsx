import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { Breadcrumbs } from '@/components/common/Breadcrumbs';
import { HelpCircle, ShieldCheck, Zap, Sparkles, Lock, ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: 'FAQ & Knowledge Center | GALXAI',
  description: 'Answers to common questions about unified AI model routing, account pooling, security guarantees, and instant retraction.',
};

export default function FaqPage() {
  const faqs = [
    {
      q: 'Do I need to copy and paste API keys to use GALXAI?',
      a: 'No! You can simply click "Continue with OpenAI" or "Continue with xAI Grok". Your account identity automatically provisions compute quota in the background without you ever having to manage raw "sk-..." or "xai-..." keys.'
    },
    {
      q: 'How does multi-account pooling and automated failover work?',
      a: 'GALXAI aggregates the rate limits of multiple accounts into a unified, high-throughput gateway. When one account encounters a rate limit or cooldown, the router automatically fails over to other active accounts in the pool.'
    },
    {
      q: 'Are my account credentials safe and encrypted?',
      a: 'Yes. All credentials are encrypted using HKDF-SHA256 master key derivation and AES-256-GCM cipher mode with Authenticated Associated Data (AAD). Plaintext tokens in RAM are immediately overwritten with binary zeroes (Buffer.fill(0)) inside unconditional finally blocks after every request.'
    },
    {
      q: 'What is 1-Click Instant Disconnect?',
      a: 'Whenever you want to disconnect, pressing "Retract" aborts all in-flight worker leases, purges the in-memory cache, and revokes the cryptographic envelope in less than 40 milliseconds.'
    },
    {
      q: 'Can I keep my quota private and dedicated only to my requests?',
      a: 'Yes. You can switch any connected account between "Cooperative Pooled" and "Dedicated Private" mode with a single click in your Accounts dashboard.'
    },
    {
      q: 'Which models are supported?',
      a: 'GALXAI exclusively routes to the latest OpenAI Codex engines (GPT-5.6 Sol, GPT-5.6 Terra, GPT-5.6 Luna), xAI Grok 4.5 500K Multimodal Reasoning, and 8 high-definition visual synthesis models (GPT-Image-2, Grok Imagine, DALL-E 3).'
    }
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a
      }
    }))
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Navigation />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <Breadcrumbs items={[{ label: 'Knowledge & FAQ Center' }]} />

        {/* Hero Header */}
        <div className="glass-panel rounded-3xl p-6 sm:p-10 space-y-3 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>KNOWLEDGE BASE & ROUTER FAQ</span>
          </div>
          <h1 className="text-3xl font-black text-white">Frequently Asked Questions</h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Everything you need to know about 1-click authentication, multi-account pooling, security guarantees, and instant retraction.
          </p>
        </div>

        {/* FAQ List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="glass-card rounded-3xl p-6 sm:p-8 border border-white/5 space-y-3 group hover:border-indigo-500/30 transition-all"
            >
              <h2 className="text-base font-bold text-white group-hover:text-cyan-300 transition-colors flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-mono flex items-center justify-center shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <span>{faq.q}</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed pl-9">
                {faq.a}
              </p>
            </div>
          ))}
        </div>

        {/* CTA Footer */}
        <div className="glass-panel rounded-3xl p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white">Have More Questions?</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto">
            Explore our developer documentation or connect your provider account in 1-click.
          </p>
          <div className="flex justify-center gap-3">
            <Link
              href="/auth/connect"
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-amber-500 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20"
            >
              1-Click Connect
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
