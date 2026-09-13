import Link from 'next/link';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import { PLAN_INCLUSIONS as inclusions, HOME_FAQS as questions } from '@/lib/public-content/content';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { SitesExample } from './SitesExample';
import { PlanAction } from './PlanAction';
import { HomeMotion } from './HomeMotion';
import { GalaxyScene, GalaxyStory } from './GalaxyScene';
import styles from './public-home.module.css';

// Homepage extension: Sites owns the pitch; preserve GALX's dark visual identity.
// Story: idea -> first version -> revisions -> public address -> price -> beta FAQ.
// First viewport: clear offer and action beside an explicitly illustrative Site.
// Product claims stay public-facing; this file contains no implementation guide.
export function PublicHome() {
  return <HomeMotion hero={<section className={styles.hero} aria-labelledby="sites-title" data-home-hero>
      <GalaxyScene />
      <div className={styles.heroCopy}>
        <h1 id="sites-title">Your idea,<br />ready to share.</h1>
        <p className={styles.lede}>Turn that “what if” into a website with <strong>GALX Sites.</strong> A first version, room to keep refining, and a public address to share.</p>
        <p className={styles.heroNote}>Bring the idea. The development and publishing are handled.</p>
        <div className={styles.actions}><Link className={styles.primary} href="/sites">Start with Sites <ArrowUpRight size={19} aria-hidden="true" /></Link><Link className={styles.secondary} href="/pricing">See pricing</Link></div>
        <p className={styles.entryTerms}>Explore the workspace first. Create with {PRO_PLAN.name} for <strong>${PRO_PLAN.monthlyPriceUsd}/month.</strong></p>
        <p className={styles.betaNote}><span aria-hidden="true" />Very early public beta. Bring a small idea.</p>
      </div>
      <SitesExample />
    </section>}>

    <div className={styles.story} data-home-story>
    <GalaxyStory />
    <section id="possibilities" className={styles.benefits} aria-labelledby="possibilities-title">
      <div className={styles.sectionIntro} data-home-reveal="intro"><h2 id="possibilities-title">Less getting set up.<br />More getting somewhere.</h2><p>Give a small idea a first version. Let real feedback help you find the next one.</p></div>
      <div className={styles.benefitRows} data-home-journey>
        <article data-home-reveal="step"><h3>Get past the blank page.</h3><p>Describe your idea in your own words, or make a starting idea your own. No development project to set up.</p></article>
        <article data-home-reveal="step"><h3>Find the version that feels right.</h3><p>Ask for a change, explore another direction, or return to an earlier version. Keep refining without paying for each turn.</p></article>
        <article data-home-reveal="step"><h3>Share when you’re ready.</h3><p>Your draft stays private until you publish. Then send your public GALX link to the people whose feedback matters.</p></article>
      </div>
    </section>

    <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
      <div className={styles.sectionIntro} data-home-reveal="intro"><h2 id="pricing-title">One plan.<br />Room to keep going.</h2><p>A first version rarely stays the first version. Your plan gives you room to keep shaping it.</p></div>
      <div className={styles.plan} data-home-reveal="plan">
        <div className={styles.planHeading}><div><h3>{PRO_PLAN.name}</h3><p>Sites included · one account</p></div><p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p></div>
        <table className={styles.priceTable}><caption className="sr-only">What is included in GALX Pro for Sites</caption><thead><tr><th scope="col">Your Sites plan</th><th scope="col">Included</th></tr></thead><tbody>{inclusions.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td><Check size={16} aria-hidden="true" /><span>{value}</span></td></tr>)}</tbody></table>
        <PlanAction />
        <Link href="/pricing" className={styles.textLink}>Explore pricing and plan guides <ArrowUpRight size={16} aria-hidden="true" /></Link>
        <p className={styles.planTerms}>If you cancel, access continues through your paid period. Fair use applies, and availability may vary during this very early beta. Image creation is priced separately.</p>
      </div>
    </section>

    <section id="faq" className={styles.faq} aria-labelledby="faq-title">
      <div className={styles.sectionIntro} data-home-reveal="intro"><h2 id="faq-title">Questions,<br />answered.</h2><p>A little clarity before your first Site.</p><Link href="/faq" className={styles.textLink}>Browse all FAQs <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/knowledge-base" className={styles.textLink}>Explore the knowledge base <ArrowUpRight size={16} aria-hidden="true" /></Link><a href="mailto:support@galx.ai" className={styles.textLink}>Share your feedback <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      <div className={styles.questions}>{questions.map(item => <details key={item.question} data-home-reveal="question"><summary>{item.question}<Plus size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
    </section>

    <section className={styles.close} aria-labelledby="start-title" data-home-ending><div className={styles.endingOrbit} aria-hidden="true"><span /><span /><span /></div><div data-home-reveal="close"><h2 id="start-title">Make the first version.</h2><p>It doesn’t have to be your final idea to be worth trying.</p></div><Link className={styles.primary} href="/sites" data-home-reveal="action">Start with Sites <ArrowUpRight size={19} aria-hidden="true" /></Link></section>
    </div>
  </HomeMotion>;
}
