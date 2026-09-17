import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, Plus } from 'lucide-react';
import { constructMetadata } from '@/lib/seo/metadata';
import { FAQS, FAQ_GROUPS } from '@/lib/public-content/content';
import { Breadcrumbs, SupportLink } from '@/components/public-content/ReadingPage';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Frequently asked questions', description: 'Answers about GALX Images, Pro pricing, generation, stream discovery, and prompt remixing.', canonicalPath: '/faq' });

export default function FAQPage() {
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'FAQ' }]} />
    <header className={styles.intro}><h1>A little clarity.<br />Then, your first creation.</h1><p>Answers to common questions about generating images, public streams, and subscriptions.</p></header>
    <div className={styles.readingLayout}><nav className={styles.sidebar} aria-label="FAQ topics"><p>Jump to a topic</p>{FAQ_GROUPS.map(group => <a key={group.id} href={`#${group.id}`}>{group.title}</a>)}<Link href="/knowledge-base" className={styles.backLink}>Explore the knowledge base</Link></nav>
      <div>{FAQ_GROUPS.map(group => <section key={group.id} id={group.id} className={styles.faqSection} aria-labelledby={`${group.id}-title`}><h2 id={`${group.id}-title`}>{group.title}</h2>{FAQS.filter(faq => faq.group === group.id).map(faq => <details className={styles.disclosure} key={faq.id}><summary>{faq.question}<Plus aria-hidden="true" /></summary><div className={styles.answer}><p>{faq.answer}</p><Link className={styles.textLink} href={faq.guide}>Read the guide <ArrowRight size={16} aria-hidden="true" /></Link></div></details>)}</section>)}<Link className={styles.textLink} href="/knowledge-base">Find step-by-step guidance <ArrowRight size={16} aria-hidden="true" /></Link></div>
    </div><SupportLink />
  </main>;
}
