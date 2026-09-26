'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, Bookmark, Compass } from 'lucide-react';

interface CaughtUpCardProps {
  authorHandle?: string | null;
}

const STAR_SUGGESTIONS = [
  { handle: 'vanta', name: 'VANTA', series: 'Architectural work' },
  { handle: 'morrowkest', name: 'Morrow Kest', series: 'Portrait studies' },
  { handle: 'soravale', name: 'Sora Vale', series: 'Botanical studies' },
  { handle: 'soravale', name: 'Sora Vale', series: 'Botanical Futures' },
];

export function CaughtUpCard({ authorHandle }: CaughtUpCardProps) {
  const otherStars = authorHandle
    ? STAR_SUGGESTIONS.filter((s) => s.handle.toLowerCase() !== authorHandle.toLowerCase())
    : STAR_SUGGESTIONS;

  return (
    <div
      role="region"
      aria-label="Archive caught up"
      style={{
        margin: '48px auto 24px',
        maxWidth: '720px',
        padding: '36px clamp(20px, 4vw, 40px)',
        borderRadius: '16px',
        background: 'radial-gradient(circle at 50% 0%, rgba(251, 191, 36, 0.08), transparent 70%), #0d101c',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          background: 'rgba(251, 191, 36, 0.1)',
          border: '1px solid rgba(251, 191, 36, 0.35)',
          display: 'grid',
          placeItems: 'center',
          color: '#fbbf24',
        }}
      >
        <Sparkles size={24} />
      </div>

      <div>
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '22px',
            fontWeight: 600,
            color: '#f3f4f6',
            letterSpacing: '-0.02em',
          }}
        >
          You’re all caught up.
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            lineHeight: 1.6,
            color: '#9ca3af',
            maxWidth: '52ch',
          }}
        >
          {authorHandle
            ? `You’ve explored all published works by @${authorHandle}. Bounded production keeps our archive finite and intentional.`
            : 'You’ve explored all currently published releases. Each Star’s archive is here whenever you want to return.'}
        </p>
      </div>

      <div style={{ marginTop: '8px', width: '100%' }}>
        <span
          style={{
            display: 'block',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: '#71717a',
            marginBottom: '10px',
          }}
        >
          Explore Other Creator Archives
        </span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {otherStars.slice(0, 3).map((star) => (
            <Link
              key={star.handle}
              href={`/profile/${star.handle}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#d4d4d8',
                fontSize: '12px',
                textDecoration: 'none',
                transition: 'all 0.16s ease',
              }}
            >
              <span>@{star.handle}</span>
              <span style={{ color: '#71717a' }}>· {star.series}</span>
              <ArrowRight size={11} style={{ opacity: 0.6 }} />
            </Link>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginTop: '8px',
          paddingTop: '16px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          width: '100%',
          justifyContent: 'center',
        }}
      >
        <Link
          href="/collections"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#fbbf24',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          <Bookmark size={14} />
          <span>View your saved collections</span>
        </Link>
        <span style={{ color: '#52525b' }}>·</span>
        <Link
          href="/stars"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#f3f4f6',
            fontSize: '13px',
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          <Compass size={14} />
          <span>Browse all Stars</span>
        </Link>
      </div>
    </div>
  );
}
