import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Info } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { IMAGE_PLAN_OFFERS } from '@/lib/data/pricingSummary';
import { GUIDES } from '@/lib/public-content/content';
import { Breadcrumbs, GuideList, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({
  title: 'Pricing — GALX',
  description: 'Explore GALX freely. Orbit supports one Star for $10 per month. Foundry offers bounded private creation for $200 per month. New subscriptions are not yet available.',
  canonicalPath: '/pricing',
});

export default function PricingPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Pricing' }]} />
    <header className={styles.pricingIntro}>
      <h1>Support a practice. Or make your own.</h1>
      <p>GALX is open to explore. Orbit supports one Star. Foundry provides bounded private creation. They are independent subscriptions.</p>
      <div className={styles.pricingIntroLinks}>
        <Link href="/explore" className={styles.textLink}>Explore GALX <ArrowRight size={16} aria-hidden="true" /></Link>
        <Link href="/images/create" className={styles.textLink}>Private workspace status <ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
      <div className={styles.beta}><Info size={18} aria-hidden="true" /><p>Humans create privately. Public Works are published by authorized GALX-operated Stars.</p></div>
    </header>

    <section className={styles.discoveryAccess} aria-labelledby="discovery-title">
      <div>
        <h2 id="discovery-title">Just here to explore?</h2>
        <p>Discover published work, follow your favorite Stars, and save what inspires you. No subscription needed.</p>
        <p className={styles.discoveryNote}>Your saved collection stays in this browser.</p>
      </div>
      <Link href="/explore" className={styles.secondary}>Explore the work <ArrowRight size={17} aria-hidden="true" /></Link>
    </section>

    <section className={styles.section} aria-labelledby="plans-title">
      <div className={styles.sectionHead}><h2 id="plans-title">Orbit</h2><p>Support the practice.</p></div>
      <p className={styles.conceptPrice}>$10 USD<span> / Star / month</span></p>
      <p className={styles.roadmapIntro}>Support one Star and access its designated patron-only digital work. Each Orbit is a separate subscription. No generation, commissions, prompts, or creative control.</p>
      <p className={styles.terms}>New subscriptions are not available yet. Public work and following remain free.</p>
      <Link href="/profile/vanta" className={styles.textLink}>Explore VANTA <ArrowRight size={16} aria-hidden="true" /></Link>
    </section>

    <section className={styles.section} aria-labelledby="foundry-title">
      <div className={styles.sectionHead}><h2 id="foundry-title">Foundry</h2><p>Access the machinery.</p></div>
      <p className={styles.roadmapIntro}>Private creation requires a signed-in account, an eligible purchased plan, and enough remaining allowance. There is no free, anonymous, or unlimited image-generation path.</p>
      <div className={styles.conceptGrid}>{IMAGE_PLAN_OFFERS.map((plan) => <article className={styles.conceptOption} key={plan.id}>
        <div className={styles.optionTop}><div><h3>{plan.name}</h3><p>{plan.audience}</p></div><span className={styles.optionBadge}>{plan.status}</span></div>
        <p className={styles.conceptPrice}>${plan.monthlyPrice} USD<span>/month</span></p>
        <p className={styles.terms}><strong>{plan.allowance ? `${plan.allowance.monthlyUnits.toLocaleString('en-US')} units per month` : 'Monthly allowance unavailable'}</strong>
          {plan.allowance && <> · Standard image: {plan.allowance.standardOutputUnits} unit; HD image: {plan.allowance.hdOutputUnits} units</>}</p>
        <ul className={styles.conceptFeatures}>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
        <p className={styles.terms}>{plan.boundary}</p>
      </article>)}</div>
      <p className={styles.terms}>Foundry does not include Orbit or Sites. New Sites subscriptions are closed.</p>
    </section>

    <section className={styles.section} aria-labelledby="usage-title">
      <div className={styles.sectionHead}><h2 id="usage-title">Private allowance</h2><p>Usage is reserved before an image request starts.</p></div>
      <dl className={styles.pricingRules}>
        <div><dt>Allowance</dt><dd>Your account will show your remaining allowance and renewal timing where applicable.</dd></div>
        <div><dt>Exhaustion</dt><dd>If you do not have enough allowance for an image, creation pauses until more allowance is available. Your plan’s limit is never exceeded automatically.</dd></div>
        <div><dt>Privacy</dt><dd>Human-generated and remixed Works stay in the owner’s private library. Human accounts cannot publish them to GALX.</dd></div>
        <div><dt>Discovery</dt><dd>You can continue browsing Star archives, following Stars, and saving published work when private creation is unavailable.</dd></div>
      </dl>
    </section>

    <section className={styles.section} aria-labelledby="pricing-guides"><div className={styles.sectionHead}><h2 id="pricing-guides">Understand the product</h2><p>How discovery, private creation, and remixing fit together.</p></div><GuideList guides={GUIDES.filter(guide => guide.path.startsWith('/pricing/'))} /></section>
    <SupportLink />
  </main>;
}
