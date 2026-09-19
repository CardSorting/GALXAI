import Link from 'next/link';
import { ArrowRight, BarChart3, CheckCircle2, ChevronRight, Gauge, KeyRound, ShieldCheck } from 'lucide-react';
import { Navigation } from '@/components/dashboard/Navigation';
import { constructMetadata } from '@/lib/seo/metadata';
import styles from '@/components/developers/developer-preview.module.css';

export const metadata = constructMetadata({
  title: 'GALX Developer access',
  description: 'Programmable GALX capabilities are available only to explicitly authorized private integrations. GALX Nova is not a public self-service API subscription.',
  canonicalPath: '/developers',
});

export default function DevelopersPage() {
  return <>
    <Navigation />
    <main className={styles.page}>
      <div className={styles.breadcrumbs}><Link href="/">GALX</Link><ChevronRight size={14} aria-hidden="true" /><span>Developer</span><ChevronRight size={14} aria-hidden="true" /><strong>Private access</strong></div>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <h1>GALX Nova<br />Private access, by decision.</h1>
          <p>GALX Nova powers supported GALX experiences and selected private integrations. General-purpose developer access is not a public subscription or self-service product.</p>
          <div className={styles.publicLinks}>
            <Link href="/images" className={styles.primary}>Explore GALX <ArrowRight size={14} aria-hidden="true" /></Link>
            <Link href="/pricing" className={styles.secondary}>View GALX plans</Link>
          </div>
        </div>
        <aside className={styles.availability} aria-label="Developer access availability">
          <div className={styles.availabilityStatus}><span className={styles.statusDot} aria-hidden="true" />Availability</div>
          <strong>Not a public self-service product</strong>
          <p>Private access is considered deliberately for supported integrations and bounded cohorts.</p>
        </aside>
      </header>
      <div className={styles.consoleLayout}>
        <section className={styles.panel} aria-labelledby="private-access-heading">
          <div className={styles.panelHeader}><div><h2 id="private-access-heading">A clear operating boundary</h2><p>When GALX chooses to authorize an integration, the access model stays simple to understand and safe to operate.</p></div><span className={styles.panelTag}><ShieldCheck size={14} aria-hidden="true" /> Administered</span></div>
          <div className={styles.boundaryList}>
            <div className={styles.boundaryRow}><span className={styles.boundaryIcon}><KeyRound size={17} aria-hidden="true" /></span><div><strong>Explicit</strong><p>Access is granted deliberately to an approved integration.</p></div><CheckCircle2 size={17} aria-hidden="true" /></div>
            <div className={styles.boundaryRow}><span className={styles.boundaryIcon}><Gauge size={17} aria-hidden="true" /></span><div><strong>Bounded</strong><p>Allocations are set for the approved cohort and use case.</p></div><CheckCircle2 size={17} aria-hidden="true" /></div>
            <div className={styles.boundaryRow}><span className={styles.boundaryIcon}><BarChart3 size={17} aria-hidden="true" /></span><div><strong>Administered</strong><p>Private access is managed by GALX for the approved integration.</p></div><CheckCircle2 size={17} aria-hidden="true" /></div>
            <div className={styles.boundaryRow}><span className={styles.boundaryIcon}><ShieldCheck size={17} aria-hidden="true" /></span><div><strong>Revocable</strong><p>GALX can change or disable private access when needed.</p></div><CheckCircle2 size={17} aria-hidden="true" /></div>
          </div>
          <div className={styles.panelFooter}><span>Existing authorized integrations remain subject to their assigned terms.</span><Link href="/images" className={styles.textLink}>Create with GALX Images <ArrowRight size={14} aria-hidden="true" /></Link></div>
        </section>
        <aside className={styles.asideCard} aria-labelledby="available-heading">
          <h2 id="available-heading">What remains available</h2>
          <p>Retiring public distribution does not retire the capabilities behind GALX products.</p>
          <ul className={styles.surfaceList}>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span><strong>GALX Images</strong> Public creation and exploration.</span></li>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span><strong>Supported integrations</strong> Private access when GALX chooses to provide it.</span></li>
            <li><CheckCircle2 size={16} aria-hidden="true" /><span><strong>GALX infrastructure</strong> The underlying systems continue powering selected experiences.</span></li>
          </ul>
        </aside>
      </div>
      <section className={styles.policyNote}><ShieldCheck size={18} aria-hidden="true" /><p><strong>Public experience, deliberate access.</strong> There is no public checkout, application, or automatic credential workflow for developer access.</p></section>
    </main>
  </>;
}
