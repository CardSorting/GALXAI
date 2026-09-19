import { constructMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs, SupportLink } from '@/components/public-content/ReadingPage';
import { KnowledgeSearch } from '@/components/public-content/KnowledgeSearch';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Knowledge base — GALX Images and Nova guides', description: 'Learn how to create in GALX Images, explore public creations, and understand GALX Nova-powered experiences.', canonicalPath: '/knowledge-base' });

export default function KnowledgeBasePage() {
  return <main className={styles.page}><Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Knowledge base' }]} /><header className={styles.intro}><h1>From a first prompt<br />to your next creation.</h1><p>A practical guide to creating in GALX Images, exploring the community stream, and building with supported Nova capabilities.</p></header><KnowledgeSearch /><SupportLink /></main>;
}
