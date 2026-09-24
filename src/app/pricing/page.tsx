import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Check, Info } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { FREE_IMAGE_OFFER, IMAGE_PLAN_OFFERS } from '@/lib/data/pricingSummary';
import { GUIDES, FREE_PLAN_INCLUSIONS, PLAN_INCLUSIONS } from '@/lib/public-content/content';
import { PlanAction } from '@/components/home/PlanAction';
import { Breadcrumbs, GuideList, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Pricing — GALX Images', description: 'Start free, then choose a monthly Image Studio plan from $10 to $200. Private mode keeps drafts out of Explore under published fair-use terms.', canonicalPath: '/pricing' });

export default function PricingPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Pricing' }]} />
    <header className={styles.pricingIntro}><h1>Make more room for ideas.</h1><p>Support persistent Star creators and enjoy archival access across the publishing network.</p><div className={styles.pricingIntroLinks}><Link href="/knowledge-base/getting-started" className={styles.textLink}>New to GALX? Start here <ArrowRight size={16} aria-hidden="true" /></Link><Link href="/explore" className={styles.textLink}>Explore Releases <ArrowRight size={16} aria-hidden="true" /></Link></div><div className={styles.beta}><Info size={18} aria-hidden="true" /><p>Published series are curated and archived by HEAV3NS lab. Finite editions keep the network intentional.</p></div></header>

    <section className={styles.pricingOptions} aria-labelledby="options-title">
      <h2 className={styles.visuallyHidden} id="options-title">GALX Images options</h2>
      <article className={styles.option} aria-labelledby="free-option-title">
        <div className={styles.optionTop}><div><h2 id="free-option-title">{FREE_IMAGE_OFFER.name}</h2><p>{FREE_IMAGE_OFFER.audience}</p></div><span className={styles.optionBadge}>No card required</span></div>
        <p className={styles.price}><strong>$0</strong><span>to start</span></p>
        <ul className={styles.inclusions}>{FREE_PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><Check size={16} aria-hidden="true" /><span><strong>{label}:</strong> {value}</span></li>)}</ul>
        <Link href="/explore" className={styles.secondary}>Explore Releases <ArrowRight size={17} aria-hidden="true" /></Link>
        <p className={styles.terms}>The welcome allowance is one-time and account-bound.</p>
      </article>

      <article className={`${styles.option} ${styles.featuredOption}`} aria-labelledby="pro-option-title">
        <div className={styles.optionTop}><div><h2 id="pro-option-title">{PRO_PLAN.name}</h2><p>For ongoing image creation</p></div><span className={styles.optionBadgeFeatured}>Current plan</span></div>
        <p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p>
        <ul className={styles.inclusions}>{PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><Check size={16} aria-hidden="true" /><span><strong>{label}:</strong> {value}</span></li>)}</ul>
        <PlanAction className={styles.planAction} actionClassName={styles.primary} /><p className={styles.terms}>Renews monthly. Cancel anytime. Published plan terms and fair-use boundaries apply.</p>
      </article>
    </section>

    <section className={styles.section} aria-labelledby="plans-title"><div className={styles.sectionHead}><h2 id="plans-title">Choose the pace that fits your practice.</h2><p>Every paid tier opens the current Image Studio for one account.</p></div><p className={styles.roadmapIntro}>Creator, Studio, and MAX are live monthly options for one account. MAX is the highest individual tier; account sharing, seats, and shared workspaces are not included.</p><div className={styles.conceptGrid}>{IMAGE_PLAN_OFFERS.map((plan) => <article className={styles.conceptOption} key={plan.id}><div className={styles.optionTop}><div><h3>{plan.name}</h3><p>{plan.audience}</p></div><span className={styles.optionBadge}>{plan.status}</span></div><p className={styles.conceptPrice}>${plan.monthlyPrice}<span>/month</span></p><ul className={styles.conceptFeatures}>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul><p className={styles.terms}>{plan.boundary}</p><Link href={`/billing/plan?plan=${plan.id}`} className={styles.textLink}>Choose {plan.name} <ArrowRight size={16} aria-hidden="true" /></Link></article>)}</div></section>

    <section className={styles.section} aria-labelledby="usage-title"><div className={styles.sectionHead}><h2 id="usage-title">Simple usage, clear expectations.</h2><p>One image output keeps the offer easy to understand.</p></div><dl className={styles.pricingRules}><div><dt>Image output</dt><dd>Each generated image counts as one output.</dd></div><div><dt>Batch size</dt><dd>Choose 1–4 images per request. A four-image request uses four outputs.</dd></div><div><dt>Creation controls</dt><dd>All supported ratios and Standard/HD detail options are available in the Image Studio.</dd></div><div><dt>Sharing</dt><dd>Creations are public by default. Private mode keeps a new creation in your library and out of Explore until you publish it.</dd></div></dl></section>

    <section className={styles.section} aria-labelledby="pricing-guides"><div className={styles.sectionHead}><h2 id="pricing-guides">Understand your plan.</h2><p>The details, before you decide.</p></div><GuideList guides={GUIDES.filter(guide => guide.path.startsWith('/pricing/'))} /></section>
    <SupportLink />
  </main>;
}
