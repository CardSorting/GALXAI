'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Plus,
  Sparkles,
  Wand2,
  Compass,
  Copy,
  Dices,
  Layers,
  Zap,
  ShieldCheck,
  Share2,
  X,
  SlidersHorizontal,
  Cpu,
} from 'lucide-react';
import { PLAN_INCLUSIONS as inclusions, HOME_FAQS as questions } from '@/lib/public-content/content';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { PlanAction } from './PlanAction';
import { HomeMotion } from './HomeMotion';
import { GalaxyScene, GalaxyStory } from './GalaxyScene';
import styles from './public-home.module.css';

const HERO_RATIOS = ['1:1', '16:9', '9:16', '3:2', '4:3'] as const;

const PROMPT_PRESETS = [
  {
    label: '🐱 Cafe Cat',
    ratio: '1:1',
    prompt:
      'An orange tabby cat wearing round glasses and cozy plaid shirt, typing on a laptop at a wooden Starbucks cafe table with a latte, photorealistic 8k',
  },
  {
    label: '🧝 Horned Elf',
    ratio: '9:16',
    prompt:
      'A celestial blonde horned elf princess with piercing emerald green eyes, golden tiara and cyan gem necklace, anime aesthetic high detail key visual',
  },
  {
    label: '🌅 Cinematic Sky',
    ratio: '16:9',
    prompt:
      'Cinematic anime visual scene, dramatic sweeping lens flare, rich cloudscapes and glowing horizons, Makoto Shinkai quality emotional lighting',
  },
  {
    label: '⚡ Shadow Monarch',
    ratio: '9:16',
    prompt:
      'High-impact cinematic manhwa digital rendering, glowing violet and blue aura, sharp specular highlights, dynamic shadow monarch action illustration',
  },
  {
    label: '🧊 3D Isometric',
    ratio: '1:1',
    prompt:
      'A futuristic isometric 3D render, glowing volumetric lighting, glassmorphism textures, Unreal Engine 5 ambient occlusion and neon reflections',
  },
  {
    label: '🌆 Cyber City',
    ratio: '16:9',
    prompt:
      'Meticulously detailed retro-futurist cyberpunk anime illustration, dense line work rendering urban decay and technology, flat cel-shaded colors, dramatic neon shadow contrast',
  },
] as const;

const SHOWCASE_ITEMS = [
  {
    id: 'cat',
    title: 'Cafe Cat',
    ratio: '1:1',
    ratioLabel: '1:1 SQUARE',
    prompt:
      'An orange tabby cat wearing round glasses and cozy plaid shirt, typing on a laptop at a wooden Starbucks cafe table with a latte, photorealistic 8k',
    url: '/images/showcase/cafe_cat.jpg',
    thumbUrl: '/images/showcase/cafe_cat_thumb.jpg',
    speed: '0.8s',
    seed: '#482910',
  },
  {
    id: 'elf',
    title: 'Elf Princess',
    ratio: '9:16',
    ratioLabel: '9:16 PORTRAIT',
    prompt:
      'A celestial blonde horned elf princess with piercing emerald green eyes, golden tiara and cyan gem necklace, anime aesthetic high detail key visual',
    url: '/images/showcase/elf_princess.jpg',
    thumbUrl: '/images/showcase/elf_princess_thumb.jpg',
    speed: '1.1s',
    seed: '#91823',
  },
  {
    id: 'sky',
    title: 'Cinematic Sky',
    ratio: '16:9',
    ratioLabel: '16:9 CINEMA',
    prompt:
      'Cinematic anime visual scene, dramatic sweeping lens flare, rich cloudscapes and glowing horizons, Makoto Shinkai quality emotional lighting',
    url: '/images/showcase/cinematic_sky_16_9.jpg',
    thumbUrl: '/images/showcase/cinematic_sky_16_9_thumb.jpg',
    speed: '1.2s',
    seed: '#77215',
  },
  {
    id: 'shadow',
    title: 'Shadow Monarch',
    ratio: '9:16',
    ratioLabel: '9:16 STORIES',
    prompt:
      'High-impact cinematic manhwa digital rendering, glowing violet and blue aura, sharp specular highlights, dynamic shadow monarch action illustration',
    url: '/images/showcase/shadow_monarch_9_16.jpg',
    thumbUrl: '/images/showcase/shadow_monarch_9_16_thumb.jpg',
    speed: '0.9s',
    seed: '#63810',
  },
  {
    id: 'render3d',
    title: '3D Isometric',
    ratio: '1:1',
    ratioLabel: '1:1 SQUARE',
    prompt:
      'A futuristic isometric 3D render, glowing volumetric lighting, glassmorphism textures, Unreal Engine 5 ambient occlusion and neon reflections',
    url: '/images/showcase/render_3d.jpg',
    thumbUrl: '/images/showcase/render_3d_thumb.jpg',
    speed: '0.9s',
    seed: '#51294',
  },
  {
    id: 'cyber',
    title: 'Cyber City',
    ratio: '16:9',
    ratioLabel: '16:9 CINEMA',
    prompt:
      'Meticulously detailed retro-futurist cyberpunk anime illustration, dense line work rendering urban decay and technology, flat cel-shaded colors, dramatic neon shadow contrast',
    url: '/images/showcase/cyber_akira_16_9.jpg',
    thumbUrl: '/images/showcase/cyber_akira_16_9_thumb.jpg',
    speed: '1.0s',
    seed: '#34912',
  },
];


export function PublicHome() {
  const router = useRouter();
  const [heroPrompt, setHeroPrompt] = useState('');
  const [heroRatio, setHeroRatio] = useState<string>('1:1');
  const [activeShowcase, setActiveShowcase] = useState(0);
  const [copiedShowcase, setCopiedShowcase] = useState(false);
  const [copiedCardId, setCopiedCardId] = useState<string | null>(null);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = heroPrompt.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set('prompt', trimmed);
    if (heroRatio) params.set('aspect_ratio', heroRatio);
    router.push(`/images?${params.toString()}`);
  };

  const handleApplyPreset = (prompt: string, ratio: string) => {
    setHeroPrompt(prompt);
    setHeroRatio(ratio);
    setIsEnhanced(false);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  const handleSurpriseMe = () => {
    const random = PROMPT_PRESETS[Math.floor(Math.random() * PROMPT_PRESETS.length)];
    handleApplyPreset(random.prompt, random.ratio);
  };

  const handleClearPrompt = () => {
    setHeroPrompt('');
    setIsEnhanced(false);
    textareaRef.current?.focus();
  };

  const handleMagicEnhance = () => {
    const detailKeywords = 'photorealistic 8k, cinematic lighting, sharp focus, masterpiece';
    if (!heroPrompt.includes('photorealistic')) {
      const updated = heroPrompt.trim() ? `${heroPrompt.trim()}, ${detailKeywords}` : detailKeywords;
      setHeroPrompt(updated);
      setIsEnhanced(true);
    } else {
      setIsEnhanced(true);
    }
  };

  const currentItem = SHOWCASE_ITEMS[activeShowcase];

  const handleCopyShowcase = async () => {
    try {
      await navigator.clipboard.writeText(currentItem.prompt);
      setCopiedShowcase(true);
      setTimeout(() => setCopiedShowcase(false), 2000);
    } catch {
      // Ignore clipboard write failures
    }
  };

  const handleUseShowcaseInComposer = () => {
    setHeroPrompt(currentItem.prompt);
    setHeroRatio(currentItem.ratio);
    setIsEnhanced(false);
    textareaRef.current?.focus();
    textareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <HomeMotion
      hero={
        <section className={styles.hero} aria-labelledby="images-title" data-home-hero>
          <GalaxyScene />
          <div className={styles.heroCopy}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 12px',
                borderRadius: '999px',
                background: 'rgba(99, 102, 241, 0.15)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                color: '#a5b4fc',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <Sparkles size={13} />
              <span>GALX IMAGES &middot; ZERO WAITLIST</span>
            </div>

            <h1 id="images-title">
              Create without limits.<br />Explore without end.
            </h1>
            <p className={styles.lede}>
              A generative creative playground for community creators paired with sustainable frontier-level intelligence. Prompt, remix, and build without constraints.
            </p>
            <p className={styles.heroNote}>
              Every creation is public by default. Powered by high-speed visual diffusion and GALX Nova—curated for the highest performance per dollar.
            </p>

            {/* Fast Prompt Composer Cockpit */}
            <div className={styles.heroPromptWrap}>
              <form onSubmit={handleHeroSubmit} className={styles.promptBar}>
                <div className={styles.promptInputRow}>
                  <Wand2 size={20} aria-hidden="true" />
                  <textarea
                    ref={textareaRef}
                    className={styles.promptInput}
                    placeholder="Describe what you want to create..."
                    value={heroPrompt}
                    onChange={(e) => {
                      setHeroPrompt(e.target.value);
                      setIsEnhanced(false);
                    }}
                    rows={2}
                    aria-label="Enter prompt for image generation"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleHeroSubmit(e);
                      }
                    }}
                  />
                  {heroPrompt.length > 0 && (
                    <button
                      type="button"
                      className={styles.promptClearBtn}
                      onClick={handleClearPrompt}
                      aria-label="Clear prompt"
                      title="Clear prompt"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className={styles.promptControlsRow}>
                  <div className={styles.promptRatios} aria-label="Select aspect ratio">
                    {HERO_RATIOS.map((ratio) => {
                      let iconClass = styles.ratioIconSquare;
                      if (ratio === '16:9') iconClass = styles.ratioIconWide;
                      if (ratio === '9:16') iconClass = styles.ratioIconPortrait;
                      if (ratio === '3:2') iconClass = styles.ratioIconClassic;
                      if (ratio === '4:3') iconClass = styles.ratioIconMonitor;

                      return (
                        <button
                          key={ratio}
                          type="button"
                          className={`${styles.promptRatioBtn} ${heroRatio === ratio ? styles.active : ''}`}
                          onClick={() => setHeroRatio(ratio)}
                          aria-pressed={heroRatio === ratio}
                        >
                          <span className={`${styles.ratioIcon} ${iconClass}`} aria-hidden="true" />
                          <span>{ratio}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={styles.promptRightActions}>
                    <button
                      type="button"
                      className={`${styles.promptEnhanceBtn} ${isEnhanced ? styles.enhanced : ''}`}
                      onClick={handleMagicEnhance}
                      title="Enhance prompt with photorealistic and lighting keywords"
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>{isEnhanced ? 'Enhanced' : 'Enhance'}</span>
                    </button>

                    <button type="submit" className={styles.promptSubmitBtn}>
                      <Wand2 size={14} />
                      <span>Generate in Studio</span>
                    </button>
                  </div>
                </div>

                <div className={styles.promptFooterMeta}>
                  <span>
                    <kbd>↵ Enter</kbd> to Launch Studio &middot; <kbd>Shift + ↵</kbd> for newline
                  </span>
                  <span>{heroPrompt.length} chars</span>
                </div>
              </form>

              {/* Quick Inspiration Style Chips */}
              <div className={styles.promptPresetsRow} aria-label="Inspiration style presets">
                <button
                  type="button"
                  className={styles.surpriseBtn}
                  onClick={handleSurpriseMe}
                  title="Randomize prompt and aspect ratio"
                >
                  <Dices size={13} />
                  <span>Surprise Me</span>
                </button>

                {PROMPT_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    className={styles.presetChip}
                    onClick={() => handleApplyPreset(preset.prompt, preset.ratio)}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <Link className={styles.primary} href="/images">
                Open Image Studio <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <a className={styles.secondary} href="#stream">
                Explore Community Stream ↓
              </a>
            </div>

            <p className={styles.betaNote}>
              <span aria-hidden="true" />
              High-resolution generative diffusion engine. Public by default.
            </p>
          </div>

          {/* Interactive Community Creation Spotlight Showcase */}
          <div className={styles.example}>
            {/* Tab selector */}
            <div className={styles.showcaseTabs} role="tablist" aria-label="Spotlight community creations">
              {SHOWCASE_ITEMS.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeShowcase === index}
                  className={`${styles.showcaseTabBtn} ${activeShowcase === index ? styles.active : ''}`}
                  onClick={() => setActiveShowcase(index)}
                >
                  <img
                    src={item.thumbUrl}
                    alt=""
                    aria-hidden="true"
                    className={styles.showcaseTabThumb}
                  />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            {/* Showcase Image & Parameters Card */}
            <div
              className={styles.exampleSheet}
              style={{
                background: '#090b14',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                boxShadow: '0 20px 50px -10px rgba(0,0,0,0.8), 0 0 30px rgba(168, 85, 247, 0.2)',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: currentItem.ratio === '16:9' ? '16/9' : currentItem.ratio === '9:16' ? '9/16' : '1/1',
                  maxHeight: '440px',
                  overflow: 'hidden',
                  borderRadius: '14px',
                  transition: 'aspect-ratio 0.3s ease',
                }}
              >
                <img
                  src={currentItem.url}
                  alt={currentItem.prompt}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />

                {/* Bottom Overlay with Prompt & Quick Remix */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    insetInline: 0,
                    background: 'linear-gradient(to top, rgba(9, 11, 20, 0.96) 0%, rgba(9, 11, 20, 0.75) 60%, transparent 100%)',
                    padding: '20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(56, 189, 248, 0.2)',
                        color: '#38bdf8',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {currentItem.ratioLabel}
                    </span>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        background: 'rgba(168, 85, 247, 0.2)',
                        color: '#c084fc',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      ⚡ {currentItem.speed} DISPATCH
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      {currentItem.seed}
                    </span>
                  </div>

                  <p
                    style={{
                      color: '#ffffff',
                      fontSize: '13px',
                      margin: 0,
                      lineHeight: 1.5,
                      fontWeight: 500,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    &ldquo;{currentItem.prompt}&rdquo;
                  </p>

                  <div className={styles.showcaseActions}>
                    <Link
                      href={`/images?prompt=${encodeURIComponent(currentItem.prompt)}&aspect_ratio=${currentItem.ratio}`}
                      className={styles.showcaseRemixBtn}
                    >
                      <Sparkles size={13} />
                      <span>Remix in Studio</span>
                    </Link>

                    <button
                      type="button"
                      className={styles.showcaseCopyBtn}
                      onClick={handleCopyShowcase}
                    >
                      {copiedShowcase ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedShowcase ? 'Copied' : 'Copy Prompt'}</span>
                    </button>

                    <button
                      type="button"
                      className={styles.showcaseTryBtn}
                      onClick={handleUseShowcaseInComposer}
                      title="Load this prompt into the composer above"
                    >
                      <Wand2 size={13} />
                      <span>Try in Composer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      }
    >
      <div className={styles.story} data-home-story>
        <GalaxyStory />

        {/* --- Trust & Architecture Metrics Ribbon --- */}
        <div className={styles.trustRibbon} role="region" aria-label="Platform capabilities">
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <Share2 size={18} />
            </div>
            <div>
              <div className={styles.trustItemTitle}>100% Public Stream</div>
              <p className={styles.trustItemDesc}>
                Instant community broadcast of every creation for collective discovery.
              </p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <Layers size={18} />
            </div>
            <div>
              <div className={styles.trustItemTitle}>5 Dynamic Aspect Ratios</div>
              <p className={styles.trustItemDesc}>
                1:1, 16:9, 9:16, 3:2, and 4:3 with zero layout shift or distortion.
              </p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <Zap size={18} />
            </div>
            <div>
              <div className={styles.trustItemTitle}>Sub-Second Dispatch</div>
              <p className={styles.trustItemDesc}>
                High-performance GPU cluster inference with live streaming status.
              </p>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className={styles.trustItemTitle}>Lossless Raw PNG</div>
              <p className={styles.trustItemDesc}>
                Direct binary downloads with stripped metadata and pristine clarity.
              </p>
            </div>
          </div>
        </div>

        {/* --- Section 1: Curated Trending Showcase --- */}
        <section id="stream" className={styles.streamSection} aria-labelledby="showcase-heading">
          <div className={styles.streamSectionHeader}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                borderRadius: '9999px',
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#c084fc',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '16px',
              }}
            >
              <Compass size={14} />
              <span>COMMUNITY SPOTLIGHT</span>
            </div>
            <h2 id="showcase-heading">Trending Community Creations</h2>
            <p>
              High-resolution diffusion visuals crafted with GALX AI. Click any creation to inspect the prompt recipe or remix it instantly in the Studio.
            </p>
          </div>

          {/* Curated 6-Card Showcase Grid */}
          <div className={styles.showcaseGrid}>
            {SHOWCASE_ITEMS.map((item) => (
              <article key={item.id} className={styles.curatedCard}>
                <div className={styles.curatedMedia}>
                  <img
                    src={item.url}
                    alt={item.prompt}
                    loading="lazy"
                    className={styles.curatedImg}
                  />
                  <div className={styles.curatedBadgeRow}>
                    <span className={styles.curatedBadgeRatio}>{item.ratioLabel}</span>
                    <span className={styles.curatedBadgeSpeed}>⚡ {item.speed}</span>
                  </div>
                </div>

                <div className={styles.curatedBody}>
                  <div>
                    <h3 className={styles.curatedTitle}>{item.title}</h3>
                    <p className={styles.curatedPrompt}>&ldquo;{item.prompt}&rdquo;</p>
                  </div>

                  <div className={styles.curatedActions}>
                    <Link
                      href={`/images?prompt=${encodeURIComponent(item.prompt)}&aspect_ratio=${item.ratio}`}
                      className={styles.curatedRemixBtn}
                    >
                      <Sparkles size={13} />
                      <span>Remix in Studio</span>
                    </Link>

                    <button
                      type="button"
                      className={styles.curatedCopyBtn}
                      onClick={() => {
                        navigator.clipboard.writeText(item.prompt);
                        setCopiedCardId(item.id);
                        setTimeout(() => setCopiedCardId(null), 2000);
                      }}
                      aria-label={`Copy prompt for ${item.title}`}
                    >
                      {copiedCardId === item.id ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedCardId === item.id ? 'Copied' : 'Copy Prompt'}</span>
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* World-Class Explore Callout Banner */}
          <div className={styles.exploreBanner}>
            <h3 className={styles.exploreBannerTitle}>Browse 10,000+ Community Creations</h3>
            <p className={styles.exploreBannerDesc}>
              Every creation generated on GALX is streamed live into our collective discovery gallery. Search by keyword, filter by aspect ratio and style, and remix thousands of community prompts.
            </p>
            <Link href="/explore" className={styles.exploreCtaBtn}>
              <Compass size={18} />
              <span>Explore All Community Creations</span>
              <ArrowRight size={18} />
            </Link>
            <div className={styles.exploreMetaRow}>
              <span>⚡ Sub-Second GPU Dispatch</span>
              <span>•</span>
              <span>💎 100% Lossless Raw PNGs</span>
              <span>•</span>
              <span>🔄 Live Real-Time Feed</span>
            </div>
          </div>
        </section>

        {/* --- Section 2: Possibilities / Product Highlights --- */}
        <section id="possibilities" className={styles.benefits} aria-labelledby="possibilities-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="possibilities-title">
              Instant diffusion.<br />Pure visual freedom.
            </h2>
            <p>
              Leave complex setups and heavy constraints behind. GALX Images delivers speed, clarity, and community synergy.
            </p>
          </div>
          <div className={styles.benefitRows} data-home-journey>
            <article data-home-reveal="step">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <Zap size={12} />
                <span>SUB-SECOND DISPATCH</span>
              </div>
              <h3>High-Fidelity Prompt Execution</h3>
              <p>
                From intricate photorealism to flat minimal vector art, our high-res diffusion pipeline adheres tightly to nuanced prompt instructions with sub-second cluster dispatch.
              </p>
            </article>
            <article data-home-reveal="step">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <Share2 size={12} />
                <span>COMMUNITY BROADCAST</span>
              </div>
              <h3>Public by Default</h3>
              <p>
                Every generation enters the public stream. Browse the feed for fresh prompt inspirations, copy proven styles with one click, or fork community artwork into your own creations.
              </p>
            </article>
            <article data-home-reveal="step">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(251, 191, 36, 0.15)',
                  color: '#fbbf24',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <SlidersHorizontal size={12} />
                <span>ERGONOMIC CONTROL</span>
              </div>
              <h3>Floating Studio Composer</h3>
              <p>
                Switch aspect ratios, counts, and creative inspirations seamlessly in our floating bottom dock with instant keyboard shortcut execution and lossless raw PNG downloads.
              </p>
            </article>
            <article data-home-reveal="step">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '10px',
                }}
              >
                <Cpu size={12} />
                <span>FRONTIER INTELLIGENCE &middot; OPTIMAL $/PERF</span>
              </div>
              <h3>Curated Developer Foundation: GALX Nova</h3>
              <p>
                We believe developers reach their goals faster with unconstrained exploration. Based on extensive private internal testing, we exclusively serve GALX Nova for text and reasoning—delivering the highest performance per dollar so you can test, iterate, and build without artificial markups or quality compromises.
              </p>
            </article>
          </div>
        </section>

        {/* --- Section 3: Pro Plan --- */}
        <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="pricing-title">One plan.<br />Unlimited inspiration.</h2>
            <p>
              Generate high-resolution visual artwork with priority quota and dedicated generation bandwidth.
            </p>
          </div>
          <div className={styles.plan} data-home-reveal="plan">
            <div className={styles.planHeading}>
              <div>
                <h3>{PRO_PLAN.name}</h3>
                <p>High-resolution diffusion · priority queue</p>
              </div>
              <p className={styles.price}>
                <strong>${PRO_PLAN.monthlyPriceUsd}</strong>
                <span>USD / month</span>
              </p>
            </div>
            <table className={styles.priceTable}>
              <caption className="sr-only">What is included in GALX Pro</caption>
              <thead>
                <tr>
                  <th scope="col">Features</th>
                  <th scope="col">Included</th>
                </tr>
              </thead>
              <tbody>
                {inclusions.map(([label, value]) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    <td>
                      <Check size={16} aria-hidden="true" />
                      <span>{value}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PlanAction />
            <Link href="/pricing" className={styles.textLink}>
              Explore pricing and plan details <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </section>

        {/* --- Section 4: FAQ --- */}
        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="faq-title">Questions,<br />answered.</h2>
            <p>Everything you need to know about generating and sharing images with GALX.</p>
            <Link href="/faq" className={styles.textLink}>
              Browse all FAQs <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
            <Link href="/knowledge-base" className={styles.textLink}>
              Explore the knowledge base <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.questions}>
            {questions.map((item) => (
              <details key={item.question} data-home-reveal="question">
                <summary>
                  {item.question}
                  <Plus size={18} aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* --- Section 5: Closing CTA --- */}
        <section className={styles.close} aria-labelledby="start-title" data-home-ending>
          <div className={styles.endingOrbit} aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div data-home-reveal="close">
            <h2 id="start-title">Bring your idea to light.</h2>
            <p>Start with a simple sentence and watch it materialize in seconds.</p>
          </div>
          <Link className={styles.primary} href="/images" data-home-reveal="action">
            Launch Image Studio <ArrowUpRight size={19} aria-hidden="true" />
          </Link>
        </section>
      </div>
    </HomeMotion>
  );
}
