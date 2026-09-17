import { constructMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs, SupportLink } from '@/components/public-content/ReadingPage';
import { KnowledgeSearch } from '@/components/public-content/KnowledgeSearch';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Knowledge base — GALX Images guides and help', description: 'Learn how to synthesize images, remix prompts, and explore the stream. Find guides to GALX Pro, credit plans, and billing.', canonicalPath: '/knowledge-base' });

export default function KnowledgeBasePage() {
  return <main className={styles.page}><Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Knowledge base' }]} /><header className={styles.intro}><h1>From a first prompt<br />to your next creation.</h1><p>A practical guide to GALX Images. Master prompt engineering, understand your plan, and explore the community stream.</p></header><KnowledgeSearch /><SupportLink /></main>;
}
