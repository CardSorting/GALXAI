'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Compass,
  Cpu,
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
import { GalaxyStory } from './GalaxyScene';
import styles from './public-home.module.css';

export function PublicHome() {
  return (
    <HomeMotion
      hero={
        <section className={styles.hero} aria-labelledby="images-title" data-home-hero>
          <div className={styles.heroCopy}>
            <h1 id="images-title">Turn a thought into something worth sharing.</h1>
            <p className={styles.lede}>Describe an idea, make an image, and discover what the community creates next.</p>

            <div className={styles.actions}>
              <Link className={styles.primary} href="/images">
                Start creating <ArrowUpRight size={19} aria-hidden="true" />
              </Link>
              <Link className={styles.secondary} href="/explore">
                Explore creations <ArrowRight size={19} aria-hidden="true" />
              </Link>
            </div>
            <p className={styles.heroNote}>Open the Image Studio when you’re ready. No setup or creative brief required.</p>
          </div>

          <aside className={styles.studioPreview} aria-label="Image Studio preview">
            <div className={styles.studioBar}>
              <div className={styles.studioBrand}><Sparkles size={15} aria-hidden="true" /><span>Image Studio</span></div>
              <span className={styles.studioStatus}><span aria-hidden="true" />Ready when you are</span>
            </div>
            <div className={styles.studioCanvas}>
              <div className={styles.studioPrompt}>
                <span className={styles.studioPromptLabel}>Describe an idea</span>
                <p>“A quiet street after rain, warm windows, and a sky full of stars.”</p>
              </div>
              <div className={styles.studioFlow} role="list" aria-label="Creation flow">
                <div className={styles.studioFlowStep} role="listitem">
                  <span className={styles.studioFlowMarker}><Wand2 size={15} aria-hidden="true" /></span>
                  <span><strong>Describe</strong><small>Start with a thought</small></span>
                </div>
                <span className={styles.studioFlowLine} aria-hidden="true" />
                <div className={styles.studioFlowStep} role="listitem">
                  <span className={styles.studioFlowMarker}><Sparkles size={15} aria-hidden="true" /></span>
                  <span><strong>Make</strong><small>Shape the direction</small></span>
                </div>
                <span className={styles.studioFlowLine} aria-hidden="true" />
                <div className={styles.studioFlowStep} role="listitem">
                  <span className={styles.studioFlowMarker}><Compass size={15} aria-hidden="true" /></span>
                  <span><strong>Discover</strong><small>Find what’s next</small></span>
                </div>
              </div>
            </div>
            <div className={styles.studioFooter}>
              <span>No setup required</span>
              <span>Make, explore, repeat</span>
            </div>
          </aside>
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
              <p>Nova is our managed intelligence layer for reasoning and generation. Use it through the GALX product experience.</p>
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
            <p>Answers about creating in GALX and using Nova-powered experiences.</p>
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
