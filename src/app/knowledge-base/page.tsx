import { constructMetadata } from '@/lib/seo/metadata';
import { Breadcrumbs, SupportLink } from '@/components/public-content/ReadingPage';
import { KnowledgeSearch } from '@/components/public-content/KnowledgeSearch';
import styles from '@/components/public-content/public-content.module.css';

export const metadata = constructMetadata({ title: 'Knowledge base — Sites guides and help', description: 'Learn how to create, revise, and publish a Site. Find guides to GALX Pro, fair use, billing, and the public beta.', canonicalPath: '/knowledge-base' });

export default function KnowledgeBasePage() {
  return <main className={styles.page}><Breadcrumbs items={[{ name: 'Home', url: '/' }, { name: 'Knowledge base' }]} /><header className={styles.intro}><h1>From a first idea<br />to your next step.</h1><p>A practical guide to GALX. Find your way around Sites, understand your plan, and share something you’ve made.</p></header><KnowledgeSearch /><SupportLink /></main>;
}
