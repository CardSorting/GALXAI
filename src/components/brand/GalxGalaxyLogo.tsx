import React from 'react';

interface GalxGalaxyLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textClassName?: string;
  animate?: boolean;
}

export function GalxGalaxyLogo({
  size = 32,
  className = '',
  showText = true,
  textClassName = 'text-xl font-bold tracking-tight',
  animate = true,
}: GalxGalaxyLogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Galaxy Cosmic Spiral Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Ambient Nebula Glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-cyan-500/40 via-indigo-500/40 to-pink-500/30 blur-md transition-all duration-300 opacity-80 group-hover:opacity-100 group-hover:blur-lg" />

        <svg
          className={`w-full h-full relative z-10 drop-shadow-[0_0_8px_rgba(56,189,248,0.6)] ${
            animate ? 'group-hover:rotate-45 transition-transform duration-700 ease-out' : ''
          }`}
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="galxSpiralGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
            <linearGradient id="galxSpiralGrad2" x1="100%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <radialGradient id="galxCore" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#e0f2fe" />
              <stop offset="80%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Outer Cosmic Orbital Ring */}
          <ellipse
            cx="18"
            cy="18"
            rx="15"
            ry="7.5"
            transform="rotate(-28 18 18)"
            stroke="url(#galxSpiralGrad1)"
            strokeWidth="1.75"
            strokeDasharray="40 12"
            strokeLinecap="round"
            opacity="0.85"
          />

          {/* Intersecting Second Spiral Arm */}
          <ellipse
            cx="18"
            cy="18"
            rx="14"
            ry="6"
            transform="rotate(38 18 18)"
            stroke="url(#galxSpiralGrad2)"
            strokeWidth="1.5"
            strokeDasharray="32 10"
            strokeLinecap="round"
            opacity="0.75"
          />

          {/* Swirling Spiral Galaxy Core Petals */}
          <path
            d="M 18,18 C 14,14 10,17 7,15 C 4,13 6,8 10,9 C 14,10 16,15 18,18 Z"
            fill="url(#galxSpiralGrad1)"
            opacity="0.9"
          />
          <path
            d="M 18,18 C 22,22 26,19 29,21 C 32,23 30,28 26,27 C 22,26 20,21 18,18 Z"
            fill="url(#galxSpiralGrad2)"
            opacity="0.9"
          />

          {/* Glowing Galactic Core Pulsar */}
          <circle cx="18" cy="18" r="4.5" fill="url(#galxCore)" />
          <circle cx="18" cy="18" r="1.75" fill="#ffffff" />

          {/* Sparkling Satellite Stars */}
          <circle cx="28" cy="10" r="0.9" fill="#ffffff" opacity="0.9" />
          <circle cx="8" cy="26" r="0.8" fill="#38bdf8" opacity="0.9" />
          <circle cx="29" cy="25" r="0.7" fill="#ec4899" opacity="0.8" />
          <circle cx="7" cy="11" r="0.75" fill="#a855f7" opacity="0.85" />
        </svg>
      </div>

      {/* Typography: galx.ai */}
      {showText && (
        <div className={`flex items-baseline font-sans select-none ${textClassName}`}>
          <span className="text-white font-extrabold tracking-tight">galx</span>
          <span className="text-cyan-400 font-extrabold">.</span>
          <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent font-extrabold">
            ai
          </span>
        </div>
      )}
    </div>
  );
}
