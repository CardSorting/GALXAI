'use client';

import React, { useState, useEffect, useRef } from 'react';

export function ReadingProgressBar() {
  const [isVisible, setIsVisible] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const doc = document.documentElement;
          const totalScroll = window.scrollY || doc.scrollTop || 0;
          const windowHeight = doc.scrollHeight - doc.clientHeight;

          if (windowHeight > 0) {
            const ratio = Math.min(1, Math.max(0, totalScroll / windowHeight));
            if (barRef.current) {
              barRef.current.style.transform = `scaleX(${ratio})`;
            }
            if (ratio > 0.005) {
              setIsVisible(true);
            } else {
              setIsVisible(false);
            }
          }
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 h-[2.5px] bg-transparent pointer-events-none transform-gpu">
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-[0_0_10px_#22d3ee] will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}

