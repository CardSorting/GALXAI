import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Check, Info } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { GUIDES, PLAN_INCLUSIONS } from '@/lib/public-content/content';
import { PlanAction } from '@/components/home/PlanAction';
import { Breadcrumbs, GuideList, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Pricing — GALX Pro for Images', description: `Synthesize images at scale with GALX Pro for $${PRO_PLAN.monthlyPriceUsd} USD per month. Priority GPU queues, unlimited prompt remixes, and community stream discovery.`, canonicalPath: '/pricing' });

export default function PricingPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Pricing' }]} />
    <div className={styles.pricingHero}>
      <header className={styles.pricingIntro}><h1>One plan.<br />Infinite creation.</h1><p>Synthesize high-resolution imagery, remix community prompts across 5 aspect ratios, and publish to the live stream.</p><Link href="/knowledge-base/getting-started" className={styles.textLink}>New to Images? Start here <ArrowRight size={16} aria-hidden="true" /></Link><div className={styles.beta}><Info size={18} aria-hidden="true" /><p>GALX Images is in active public beta. Every generation is public by default in the community masonry feed.</p></div></header>
      <section className={styles.plan} aria-labelledby="plan-name"><div className={styles.planTop}><div><h2 id="plan-name">{PRO_PLAN.name}</h2><p>Images Pro · one account</p></div></div><p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p>
        <ul className={styles.inclusions}>{PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><Check size={16} aria-hidden="true" /><span>{value}</span></li>)}</ul>
        <PlanAction className={styles.planAction} actionClassName={styles.primary} /><p className={styles.terms}>Access continues through your paid period if you cancel. Fair use applies; queue pacing maintains stability. Developer API compute carries separate usage terms.</p>
      </section>
    </div>
    <section className={styles.section} aria-labelledby="pricing-guides"><div className={styles.sectionHead}><h2 id="pricing-guides">Understand your plan.</h2><p>The details, before you decide.</p></div><GuideList guides={GUIDES.filter(guide => guide.path.startsWith('/pricing/'))} /></section>
    <section className={styles.section} aria-labelledby="other-products"><h2 id="other-products" className={styles.sectionHead}>Looking for something else?</h2><div className={styles.otherProducts}><div><h3>Image Studio</h3><p>Synthesize visual art, curate your personal library, and download lossless PNGs.</p><Link href="/images" className={styles.textLink}>Open Image Studio <ArrowRight size={16} aria-hidden="true" /></Link></div><div><h3>Developer Tier & Compute</h3><p>Get instant Developer Tier API access for $10 USD (pay-as-you-go for images and frontier OpenAI models), or join the free cohort.</p><Link href="/developers/pricing" className={styles.textLink}>View Developer Tier & Compute Pricing <ArrowRight size={16} aria-hidden="true" /></Link></div></div></section>
    <SupportLink />
  </main>;
}
