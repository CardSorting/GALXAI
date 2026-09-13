import Link from 'next/link';
import { Navigation } from '@/components/dashboard/Navigation';
import { DeveloperPreview } from '@/components/developers/DeveloperPreview';
import { constructMetadata } from '@/lib/seo/metadata';
import styles from '@/components/developers/developer-preview.module.css';
export const metadata = constructMetadata({ title: 'Developer API private preview', description: 'Apply to a small GALX developer cohort. Build with us, share private feedback, and help shape a better API experience. Images and Sites are open now.', canonicalPath: '/developers' });
export default function DevelopersPage() {
  return <><Navigation /><main className={styles.page}>
    <header className={styles.hero}><h1>A smaller cohort.<br />A better place to build.</h1>
      <p>We’re opening the developer API to small groups of builders. That gives us room to keep costs manageable, improve performance, and give each person a thoughtful first experience.</p>
    </header>
    <div className={styles.layout}><DeveloperPreview /><aside className={styles.aside} aria-label="About the private cohort">
      <section><h2>Build with us, from the beginning</h2><p>Bring a real project or an early idea. Try the API, tell us what works, and share privately where the experience could be better.</p><p>We grow each cohort at a pace we can support.</p></section>
      <section><h2>What builders are reporting</h2><p>Current cohort members report <strong>30–60% lower token and inference spend.</strong></p><p>These are participant-reported results. Savings vary by workload and aren’t guaranteed.</p></section>
      <section><h2>What happens next</h2><ol className={styles.steps}><li><strong>Share your application</strong>An introduction, a profile, and your project.</li><li><strong>We review it personally</strong>We consider your project and the room in the next cohort.</li><li><strong>Check your access here</strong>Your status and next steps appear on this page. There’s no fixed invitation date.</li></ol></section>
      <section><h2>Ready to make something today?</h2><p>Images and Sites are open now. No developer waitlist needed.</p><div className={styles.publicLinks}><Link href="/images">Create images</Link><Link href="/sites">Build a site</Link></div></section>
    </aside></div>
  </main></>;
}
