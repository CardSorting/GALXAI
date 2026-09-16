import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { DeveloperPreview } from '@/components/developers/DeveloperPreview';
import { constructMetadata } from '@/lib/seo/metadata';
import styles from '@/components/developers/developer-preview.module.css';
export const metadata = constructMetadata({ title: 'Developer API & Developer Tier', description: 'Get instant Developer Tier API access for images and frontier OpenAI models ($10 pay-as-you-go credit), or apply to the free developer cohort.', canonicalPath: '/developers' });
export default function DevelopersPage() {
  return <><Navigation /><main className={styles.page}>
    <header className={styles.hero}><h1>Developer API & Developer Tier.<br />A better place to build.</h1>
      <p>Instant pay-as-you-go API access for image generation and frontier OpenAI models with the $10 Developer Tier, or join the private builder cohort.</p>
      <div className={styles.publicLinks} style={{ marginTop: 16 }}>
        <Link href="/developers/pricing" className={styles.primary}>View Developer Pricing & Compute Tiers <ArrowRight size={14} style={{ marginLeft: 6 }} /></Link>
      </div>
    </header>
    <div className={styles.layout}><DeveloperPreview /><aside className={styles.aside} aria-label="About developer access">
      <section><h2>Developer Tier ($10 USD)</h2><p>Unlock pay-as-you-go API access immediately with a $10 deposit ($20 usable credit). No manual review or waitlist application needed.</p><p><Link href="/developers/pricing" style={{ color: '#a5b4fc', textDecoration: 'underline' }}>Explore all compute packs and model token rates &rarr;</Link></p></section>
      <section><h2>What builders are reporting</h2><p>Current cohort members report <strong>30–60% lower token and inference spend.</strong></p><p>These are participant-reported results. Savings vary by workload and aren’t guaranteed.</p></section>
      <section><h2>Free Preview Cohort</h2><ol className={styles.steps}><li><strong>Share your application</strong>An introduction, a profile, and your project.</li><li><strong>We review it personally</strong>We consider your project and the room in the next cohort.</li><li><strong>Check your access here</strong>Your status and next steps appear on this page. There’s no fixed invitation date.</li></ol></section>
      <section><h2>Ready to make something today?</h2><p>Images and Sites are open now. No developer waitlist needed.</p><div className={styles.publicLinks}><Link href="/images">Create images</Link><Link href="/sites">Build a site</Link></div></section>
    </aside></div>
  </main></>;
}
