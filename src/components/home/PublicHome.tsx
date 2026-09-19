'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Cpu,
  Dices,
  Layers,
  Plus,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wand2,
  Zap,
} from 'lucide-react';
import { PLAN_INCLUSIONS as inclusions, HOME_FAQS as questions } from '@/lib/public-content/content';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { PublicImageMasonryStream } from '@/components/images/PublicImageMasonryStream';
import { PlanAction } from './PlanAction';
import { HomeMotion } from './HomeMotion';
import { GalaxyScene, GalaxyStory } from './GalaxyScene';
import styles from './public-home.module.css';

const HERO_RATIOS = ['1:1', '16:9', '9:16', '3:2', '4:3'] as const;

const PROMPT_PRESETS = [
  { label: 'Quiet landscape', ratio: '16:9', prompt: 'A quiet alpine lake at first light, cool blues, warm window-like highlights' },
  { label: 'Paper collage', ratio: '1:1', prompt: 'A paper-cut garden full of tiny doors, layered texture, soft afternoon light' },
  { label: 'Editorial portrait', ratio: '4:3', prompt: 'An editorial portrait with sculptural shadows, deep color, and a calm expression' },
  { label: 'Night market', ratio: '3:2', prompt: 'A night market in the rain, hand-painted signs, reflections, and warm lanterns' },
] as const;

export function PublicHome() {
  const router = useRouter();
  const [heroPrompt, setHeroPrompt] = useState('');
  const [heroRatio, setHeroRatio] = useState<string>('1:1');
  const [isEnhanced, setIsEnhanced] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleHeroSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (heroPrompt.trim()) params.set('prompt', heroPrompt.trim());
    params.set('aspect_ratio', heroRatio);
    router.push('/images?' + params.toString());
  };

  const handleApplyPreset = (prompt: string, ratio: string) => {
    setHeroPrompt(prompt);
    setHeroRatio(ratio);
    setIsEnhanced(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleMagicEnhance = () => {
    if (!heroPrompt.trim()) return;
    if (!heroPrompt.toLowerCase().includes('detailed')) {
      setHeroPrompt(heroPrompt.trim() + ', detailed texture, considered lighting');
    }
    setIsEnhanced(true);
  };

  return (
    <HomeMotion
      hero={
        <section className={styles.hero} aria-labelledby="images-title" data-home-hero>
          <GalaxyScene />
          <div className={styles.heroCopy}>
            <div className={styles.heroEyebrow}>
              <Sparkles size={13} aria-hidden="true" />
              <span>GALX Images</span>
            </div>
            <h1 id="images-title">Make something worth sharing.</h1>
            <p className={styles.lede}>Turn a prompt into an image. Explore what others create.</p>
            <p className={styles.heroNote}>Powered by GALX Nova.</p>

            <div className={styles.heroPromptWrap}>
              <form onSubmit={handleHeroSubmit} className={styles.promptBar}>
                <div className={styles.promptInputRow}>
                  <Wand2 size={20} aria-hidden="true" />
                  <textarea
                    ref={textareaRef}
                    className={styles.promptInput}
                    placeholder="Describe the image you want to create."
                    value={heroPrompt}
                    onChange={(event) => {
                      setHeroPrompt(event.target.value);
                      setIsEnhanced(false);
                    }}
                    rows={2}
                    aria-label="Describe the image you want to create"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleHeroSubmit(event as unknown as React.FormEvent<HTMLFormElement>);
                      }
                    }}
                  />
                  {heroPrompt && (
                    <button
                      type="button"
                      className={styles.promptClearBtn}
                      onClick={() => {
                        setHeroPrompt('');
                        setIsEnhanced(false);
                        textareaRef.current?.focus();
                      }}
                      aria-label="Clear prompt"
                    >
                      ×
                    </button>
                  )}
                </div>
                <div className={styles.promptControlsRow}>
                  <div className={styles.promptRatios} aria-label="Select aspect ratio">
                    {HERO_RATIOS.map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        className={styles.promptRatioBtn + (heroRatio === ratio ? ' ' + styles.active : '')}
                        onClick={() => setHeroRatio(ratio)}
                        aria-pressed={heroRatio === ratio}
                      >
                        <span className={styles.ratioIcon + ' ' + styles.ratioIconSquare} aria-hidden="true" />
                        <span>{ratio}</span>
                      </button>
                    ))}
                  </div>
                  <div className={styles.promptRightActions}>
                    <button
                      type="button"
                      className={styles.promptEnhanceBtn + (isEnhanced ? ' ' + styles.enhanced : '')}
                      onClick={handleMagicEnhance}
                    >
                      <Sparkles size={13} aria-hidden="true" />
                      <span>{isEnhanced ? 'Enhanced' : 'Enhance'}</span>
                    </button>
                    <button type="submit" className={styles.promptSubmitBtn}>
                      <Wand2 size={14} aria-hidden="true" />
                      <span>Create an image</span>
                    </button>
                  </div>
                </div>
                <div className={styles.promptFooterMeta}>
                  <span><kbd>Enter</kbd> to open the Image Studio</span>
                  <span>{heroPrompt.length} chars</span>
                </div>
              </form>
              <div className={styles.promptPresetsRow} aria-label="Starter prompts">
                <button
                  type="button"
                  className={styles.surpriseBtn}
                  onClick={() => {
                    const preset = PROMPT_PRESETS[Math.floor(Math.random() * PROMPT_PRESETS.length)];
                    handleApplyPreset(preset.prompt, preset.ratio);
                  }}
                >
                  <Dices size={13} aria-hidden="true" />
                  <span>Surprise me</span>
                </button>
                {PROMPT_PRESETS.map((preset) => (
                  <button key={preset.label} type="button" className={styles.presetChip} onClick={() => handleApplyPreset(preset.prompt, preset.ratio)}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <Link className={styles.primary} href="/images">
                Create an image <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <Link className={styles.secondary} href="/explore">
                Explore creations <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.betaNote}><span aria-hidden="true" />Creations are public by default.</p>
          </div>

          <div className={styles.example}>
            <div className={styles.exampleSheet}>
              <div className={styles.creationPreview}>
                <div className={styles.creationPreviewOrb} aria-hidden="true"><Sparkles size={30} /></div>
                <div className={styles.creationPreviewLabel}>
                  <span>GALX Images</span>
                  <span>Powered by GALX Nova.</span>
                </div>
                <p>Bring an idea, not an infrastructure plan.</p>
                <div className={styles.creationPreviewPrompt}>
                  <Wand2 size={16} aria-hidden="true" />
                  <span>Describe the image you want to create.</span>
                </div>
              </div>
              <div className={styles.creationPreviewFooter}>
                <span>Five supported aspect ratios</span>
                <span>Public by default</span>
              </div>
            </div>
          </div>
        </section>
      }
    >
      <div className={styles.story} data-home-story>
        <GalaxyStory />

        <div className={styles.trustRibbon} role="region" aria-label="GALX Images">
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><Share2 size={18} aria-hidden="true" /></div>
            <div><div className={styles.trustItemTitle}>Public creations</div><p className={styles.trustItemDesc}>Creations are public by default and may appear in the community stream.</p></div>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><Layers size={18} aria-hidden="true" /></div>
            <div><div className={styles.trustItemTitle}>Five aspect ratios</div><p className={styles.trustItemDesc}>Choose 1:1, 3:2, 9:16, 16:9, or 4:3 for the composition you want.</p></div>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><Zap size={18} aria-hidden="true" /></div>
            <div><div className={styles.trustItemTitle}>Create and explore</div><p className={styles.trustItemDesc}>Move from a prompt to your image, then find your next idea.</p></div>
          </div>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><ShieldCheck size={18} aria-hidden="true" /></div>
            <div><div className={styles.trustItemTitle}>Powered by GALX Nova</div><p className={styles.trustItemDesc}>Managed intelligence for reasoning and generation.</p></div>
          </div>
        </div>

        <section id="stream" className={styles.streamSection} aria-labelledby="showcase-heading">
          <div className={styles.streamSectionHeader}>
            <div className={styles.homeSectionEyebrow}><Compass size={14} aria-hidden="true" /><span>GALX COMMUNITY</span></div>
            <h2 id="showcase-heading">See what imagination looks like.</h2>
            <p>Explore images created on GALX. Find your next idea.</p>
          </div>
          <PublicImageMasonryStream className={styles.homeStream} showToolbar={false} initialSort="trending" />
          <div className={styles.exploreBanner}>
            <h3 className={styles.exploreBannerTitle}>Create your own</h3>
            <p className={styles.exploreBannerDesc}>Start with a sentence, make an image, and explore what comes next.</p>
            <Link href="/images" className={styles.exploreCtaBtn}>
              <Sparkles size={18} aria-hidden="true" />
              <span>Create an image</span>
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>

        <section id="possibilities" className={styles.benefits} aria-labelledby="possibilities-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="possibilities-title">Bring an idea,<br />not an infrastructure plan.</h2>
            <p>GALX puts the creation experience first. The service behind it stays simple to use.</p>
          </div>
          <div className={styles.benefitRows} data-home-journey>
            <article data-home-reveal="step">
              <div className={styles.homeBenefitEyebrow}><Wand2 size={12} aria-hidden="true" /><span>CREATE</span></div>
              <h3>Describe an image</h3>
              <p>Bring a prompt, choose a supported ratio, and create something worth sharing.</p>
            </article>
            <article data-home-reveal="step">
              <div className={styles.homeBenefitEyebrow}><Share2 size={12} aria-hidden="true" /><span>COMMUNITY</span></div>
              <h3>Public by default</h3>
              <p>Creations can enter the public stream so other people can discover and remix the idea.</p>
            </article>
            <article data-home-reveal="step">
              <div className={styles.homeBenefitEyebrow}><SlidersHorizontal size={12} aria-hidden="true" /><span>ITERATE</span></div>
              <h3>Explore and remix</h3>
              <p>Find a prompt you like, carry it into the Image Studio, and make the next version your own.</p>
            </article>
            <article data-home-reveal="step">
              <div className={styles.homeBenefitEyebrow}><Cpu size={12} aria-hidden="true" /><span>GALX NOVA</span></div>
              <h3>Intelligence, handled.</h3>
              <p>Nova is our managed intelligence layer for reasoning and generation. Use it through GALX, or subscribe to Developer Access to build with supported capabilities through the API.</p>
              <Link className={styles.textLink} href="/developers">Explore Developer <ArrowUpRight size={16} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="pricing-title">A plan for creating.</h2>
            <p>Create images, explore the public stream, and keep iterating in GALX Images.</p>
          </div>
          <div className={styles.plan} data-home-reveal="plan">
            <div className={styles.planHeading}>
              <div><h3>{PRO_PLAN.name}</h3><p>Image creation · community discovery</p></div>
              <p className={styles.price}><strong>{'$' + PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p>
            </div>
            <table className={styles.priceTable}>
              <caption className="sr-only">What is included in GALX Pro</caption>
              <thead><tr><th scope="col">Features</th><th scope="col">Included</th></tr></thead>
              <tbody>{inclusions.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td><Check size={16} aria-hidden="true" /><span>{value}</span></td></tr>)}</tbody>
            </table>
            <PlanAction />
            <Link href="/pricing" className={styles.textLink}>Explore pricing and plan details <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
        </section>

        <section id="faq" className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.sectionIntro} data-home-reveal="intro">
            <h2 id="faq-title">Questions,<br />answered.</h2>
            <p>Answers about creating in GALX, Nova, and Developer access.</p>
            <Link href="/faq" className={styles.textLink}>Browse all FAQs <ArrowUpRight size={16} aria-hidden="true" /></Link>
            <Link href="/knowledge-base" className={styles.textLink}>Explore the knowledge base <ArrowUpRight size={16} aria-hidden="true" /></Link>
          </div>
          <div className={styles.questions}>
            {questions.map((item) => <details key={item.question} data-home-reveal="question"><summary>{item.question}<Plus size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}
          </div>
        </section>

        <section className={styles.close} aria-labelledby="start-title" data-home-ending>
          <div className={styles.endingOrbit} aria-hidden="true"><span /><span /><span /></div>
          <div data-home-reveal="close">
            <h2 id="start-title">Make something worth sharing.</h2>
            <p>Start with a sentence. GALX handles the rest.</p>
          </div>
          <Link className={styles.primary} href="/images" data-home-reveal="action">Create an image <ArrowUpRight size={19} aria-hidden="true" /></Link>
        </section>
      </div>
    </HomeMotion>
  );
}
