import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Check, Info } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { PRO_PLAN } from '@/lib/billing/pro-plan';
import { GUIDES, PLAN_INCLUSIONS } from '@/lib/public-content/content';
import { PlanAction } from '@/components/home/PlanAction';
import { Breadcrumbs, GuideList, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Pricing — GALX Pro for Sites', description: `Create, revise, and publish Sites with GALX Pro for $${PRO_PLAN.monthlyPriceUsd} USD per month. Explore what’s included, fair use, and monthly billing.`, canonicalPath: '/pricing' });

export default function PricingPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Pricing' }]} />
    <div className={styles.pricingHero}>
      <header className={styles.pricingIntro}><h1>One plan.<br />Room to keep going.</h1><p>Make a first version with Sites. Keep shaping it, then publish when it feels ready.</p><Link href="/knowledge-base/getting-started" className={styles.textLink}>New to Sites? Start here <ArrowRight size={16} aria-hidden="true" /></Link><div className={styles.beta}><Info size={18} aria-hidden="true" /><p>Sites is in a very early public beta. Bring a small idea, expect rough edges, and help shape what comes next.</p></div></header>
      <section className={styles.plan} aria-labelledby="plan-name"><div className={styles.planTop}><div><h2 id="plan-name">{PRO_PLAN.name}</h2><p>Sites included · one account</p></div></div><p className={styles.price}><strong>${PRO_PLAN.monthlyPriceUsd}</strong><span>USD / month</span></p>
        <ul className={styles.inclusions}>{PLAN_INCLUSIONS.map(([label, value]) => <li key={label}><Check size={16} aria-hidden="true" /><span>{value}</span></li>)}</ul>
        <PlanAction className={styles.planAction} actionClassName={styles.primary} /><p className={styles.terms}>Access continues through your paid period if you cancel. Fair use applies; beta availability may vary. Image creation is priced separately.</p>
      </section>
    </div>
    <section className={styles.section} aria-labelledby="pricing-guides"><div className={styles.sectionHead}><h2 id="pricing-guides">Understand your plan.</h2><p>The details, before you decide.</p></div><GuideList guides={GUIDES.filter(guide => guide.path.startsWith('/pricing/'))} /></section>
    <section className={styles.section} aria-labelledby="other-products"><h2 id="other-products" className={styles.sectionHead}>Looking for something else?</h2><div className={styles.otherProducts}><div><h3>Image creation</h3><p>Create images, keep a library, and download your work. Images has separate pricing; review the available options in your account.</p><Link href="/images" className={styles.textLink}>Explore Images <ArrowRight size={16} aria-hidden="true" /></Link></div><div><h3>Developer Tier & Compute</h3><p>Get instant Developer Tier API access for $10 USD (pay-as-you-go for images and frontier OpenAI models), or join the free cohort.</p><Link href="/developers/pricing" className={styles.textLink}>View Developer Tier & Compute Pricing <ArrowRight size={16} aria-hidden="true" /></Link></div></div></section>
    <SupportLink />
  </main>;
}
