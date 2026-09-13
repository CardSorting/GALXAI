import Link from 'next/link';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
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
const inclusions = [
  ['Create', 'Sites for your ideas, projects, and early product concepts'],
  ['Refine', 'Unlimited revisions and conversation turns, under fair use. No per-change charge.'],
  ['Revisit', 'Saved versions to return to as your idea evolves'],
  ['Publish', 'Publishing and a public GALX address included'],
];
const questions = [
  { question: 'Can I explore before choosing a plan?', answer: `Yes. Open Sites, explore the workspace, and write down your idea before choosing a plan. To create a Site, sign in and get GALX Pro for $${PRO_PLAN.monthlyPriceUsd} USD per month. There is no charge just to look around.` },
  { question: 'What can I make in this early preview?', answer: 'A landing page, a portfolio, an event page, or a simple page for an early product idea. No coding needed. Start with something small that you can share, learn from, and keep improving.' },
  { question: 'Are revisions and conversation turns unlimited?', answer: 'Yes. GALX Pro includes unlimited revisions and conversation turns under fair use, with no charge for each change. During this very early beta, you may occasionally need to wait before continuing.' },
  { question: 'Do I need to buy a domain?', answer: 'No. Publishing includes a public GALX address for your Site. You can send people a link without buying a domain or arranging separate hosting.' },
  { question: 'Do my changes go public straight away?', answer: 'No. Your draft stays private until you choose to publish. After that, you can keep refining it and return to earlier versions. Your public Site changes when you publish an update.' },
  { question: 'What does “extremely early public beta” mean?', answer: 'We’re sharing Sites early because we believe a real first version teaches you more than an idea left in your notes. Expect rough edges and a product that is still taking shape. Try a small idea, tell us where you get stuck, and help us understand what is worth building next.' },
];
export function PublicHome() {
  return <HomeMotion hero={<section className={styles.hero} aria-labelledby="sites-title" data-home-hero>
      <GalaxyScene />
      <div className={styles.heroCopy}>
        <h1 id="sites-title">Your idea,<br />ready to share.</h1>
        <p className={styles.lede}>Turn that “what if” into a website with <strong>GALX Sites.</strong> A first version, room to keep refining, and a public address to share.</p>
        <p className={styles.heroNote}>Bring the idea. The development and publishing are handled.</p>
        <div className={styles.actions}><Link className={styles.primary} href="/sites">Start with Sites <ArrowUpRight size={19} aria-hidden="true" /></Link><a className={styles.secondary} href="#pricing">See pricing</a></div>
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
        <article><h3>Get past the blank page.</h3><p>Describe your idea in your own words, or make a starting idea your own. No development project to set up.</p></article>
        <article><h3>Find the version that feels right.</h3><p>Ask for a change, explore another direction, or return to an earlier version. Keep refining without paying for each turn.</p></article>
        <article><h3>Share when you’re ready.</h3><p>Your draft stays private until you publish. Then send your public GALX link to the people whose feedback matters.</p></article>
      </div>
    </section>

    <section id="pricing" className={styles.pricing} aria-labelledby="pricing-title">
      <div className={styles.sectionIntro} data-home-reveal="intro"><h2 id="pricing-title">One plan.<br />Room to keep going.</h2><p>A first version rarely stays the first version. Your plan gives you room to keep shaping it.</p></div>
      <div className={styles.plan} data-home-reveal="plan">
        <div className={styles.planHeading}><div><h3>{PRO_PLAN.name}</h3><p>Sites included · one account</p></div><p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p></div>
        <table className={styles.priceTable}><caption className="sr-only">What is included in GALX Pro for Sites</caption><thead><tr><th scope="col">Your Sites plan</th><th scope="col">Included</th></tr></thead><tbody>{inclusions.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td><Check size={16} aria-hidden="true" /><span>{value}</span></td></tr>)}</tbody></table>
        <PlanAction />
        <p className={styles.planTerms}>If you cancel, access continues through your paid period. Fair use applies, and availability may vary during this very early beta. Image creation is priced separately.</p>
      </div>
    </section>

    <section id="faq" className={styles.faq} aria-labelledby="faq-title">
      <div className={styles.sectionIntro} data-home-reveal="intro"><h2 id="faq-title">Questions,<br />answered.</h2><p>A little clarity before your first Site.</p><a href="mailto:support@galx.ai" className={styles.textLink}>Share your feedback <ArrowUpRight size={16} aria-hidden="true" /></a></div>
      <div className={styles.questions}>{questions.map(item => <details key={item.question}><summary>{item.question}<Plus size={18} aria-hidden="true" /></summary><p>{item.answer}</p></details>)}</div>
    </section>

    <section className={styles.close} aria-labelledby="start-title" data-home-ending><div className={styles.endingOrbit} aria-hidden="true"><span /><span /><span /></div><div data-home-reveal="close"><h2 id="start-title">Make the first version.</h2><p>It doesn’t have to be your final idea to be worth trying.</p></div><Link className={styles.primary} href="/sites">Start with Sites <ArrowUpRight size={19} aria-hidden="true" /></Link></section>
    </div>
  </HomeMotion>;
}
