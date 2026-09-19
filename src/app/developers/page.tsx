import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { DeveloperPreview } from '@/components/developers/DeveloperPreview';
import { constructMetadata } from '@/lib/seo/metadata';
import styles from '@/components/developers/developer-preview.module.css';

export const metadata = constructMetadata({
  title: 'GALX Developer — Build with GALX Nova',
  description: 'A developer membership for programmable access to GALX Nova’s managed intelligence. $50/month for API access; usage is billed separately and no usage credits are included.',
  canonicalPath: '/developers',
});

export default function DevelopersPage() {
  return (
    <>
      <Navigation />
      <main className={styles.page}>
        <header className={styles.hero}>
          <h1>GALX Developer<br />Build with GALX Nova.</h1>
          <p>A developer membership for programmable access to GALX Nova’s managed intelligence.<br /><strong>$50/month for API access.</strong> Usage billed separately. No usage credits included.</p>
          <div className={styles.publicLinks} style={{ marginTop: 16 }}>
            <Link href="#developer-access" className={styles.primary}>
              Subscribe to Developer Access <ArrowRight size={14} style={{ marginLeft: 6 }} />
            </Link>
            <Link href="/docs" className={styles.secondary}>
              Read the documentation
            </Link>
          </div>
        </header>

        <div className={styles.layout}>
          <DeveloperPreview />
          <aside className={styles.aside} aria-label="About GALX Developer access">
            <section>
              <h2>GALX Nova — Developer Access</h2>
              <p className={styles.accessPrice}>$50/month</p>
              <p>Recurring API access membership for GALX Nova.</p>
              <p>Usage billed separately. No usage credits included.</p>
              <div className={styles.publicLinks}>
                <Link href="#developer-access" className={styles.asideLink}>
                  Subscribe to Developer Access →
                </Link>
                <Link href="/pricing/usage" className={styles.asideLink}>
                  View usage pricing and terms →
                </Link>
              </div>
            </section>
            <section>
              <h2>Membership for access. Separate billing for usage.</h2>
              <p>Think of Developer Access like membership to a managed workspace. The subscription gives you access to the service; consumption is billed separately.</p>
              <p>Your $50 monthly subscription provides API access. API usage is billed separately and is not deducted from the subscription fee.</p>
            </section>
            <section>
              <h2>Your application. Nova’s intelligence.</h2>
              <p>Use the documented API to work with Nova’s supported capabilities. GALX handles the underlying execution; you build the experience around it.</p>
            </section>
            <section>
              <h2>Private preview</h2>
              <ol className={styles.steps}>
                <li><strong>Share what you are building</strong>A short introduction and project description help us understand the request.</li>
                <li><strong>Review supported access</strong>We check the application against current capability and availability.</li>
                <li><strong>Check your status here</strong>Your account shows the next step. Applying does not grant API access.</li>
              </ol>
            </section>
            <section>
              <h2>Ready to create?</h2>
              <p>GALX Images is the place to create and explore without an API integration.</p>
              <div className={styles.publicLinks}>
                <Link href="/images">Create an image</Link>
                <Link href="/explore">Explore creations</Link>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </>
  );
}
