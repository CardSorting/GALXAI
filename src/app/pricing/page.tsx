import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Check, Info } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { GUIDES, PLAN_INCLUSIONS } from '@/lib/public-content/content';
import { PlanAction } from '@/components/home/PlanAction';
import { Breadcrumbs, GuideList, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Pricing — GALX Pro', description: 'Create images with GALX Pro at $10/month. Private integrations are administered separately and are not a public subscription.', canonicalPath: '/pricing' });

export default function PricingPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Pricing' }]} />
    <div className={styles.pricingHero}>
      <header className={styles.pricingIntro}><h1>A plan for creating.</h1><p>Create images, explore the public stream, and keep iterating in GALX Images.</p><Link href="/knowledge-base/getting-started" className={styles.textLink}>New to Images? Start here <ArrowRight size={16} aria-hidden="true" /></Link><div className={styles.beta}><Info size={18} aria-hidden="true" /><p>Creations are public by default and may appear in the community stream. Review the current product controls before creating anything that should not be shared publicly.</p></div></header>
      <section className={styles.plan} aria-labelledby="plan-name"><div className={styles.planTop}><div><h2 id="plan-name">{PRO_PLAN.name}</h2><p>Images Pro · one account</p></div></div><p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p>
        <ul className={styles.inclusions}>{PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><Check size={16} aria-hidden="true" /><span>{value}</span></li>)}</ul>
        <PlanAction className={styles.planAction} actionClassName={styles.primary} /><p className={styles.terms}>Published plan terms and fair-use boundaries apply. Private integrations are administered separately.</p>
      </section>
    </div>
    <section className={styles.section} aria-labelledby="pricing-guides"><div className={styles.sectionHead}><h2 id="pricing-guides">Understand your plan.</h2><p>The details, before you decide.</p></div><GuideList guides={GUIDES.filter(guide => guide.path.startsWith('/pricing/'))} /></section>
    <section className={styles.section} aria-labelledby="other-products"><h2 id="other-products" className={styles.sectionHead}>Looking for something else?</h2><div className={styles.otherProducts}><div><h3>Image Studio</h3><p>Describe an image, explore your library, and keep iterating.</p><Link href="/images" className={styles.textLink}>Open Image Studio <ArrowRight size={16} aria-hidden="true" /></Link></div><div><h3>GALX Nova</h3><p>Nova powers supported GALX experiences and selected private integrations. General-purpose developer access is not self-service.</p><Link href="/developers" className={styles.textLink}>Learn about private access <ArrowRight size={16} aria-hidden="true" /></Link></div></div></section>
    <SupportLink />
  </main>;
}
