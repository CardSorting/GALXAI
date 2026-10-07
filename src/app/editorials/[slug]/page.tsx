import { notFound } from 'next/navigation';
import { findEditorial, findExhibition } from '@/lib/exhibitions/catalog';
import { getPublishedWorks } from '@/lib/exhibitions/published-works';
import { constructMetadata } from '@/lib/seo/metadata';
import { ProgrammeShell, ProgrammeBackLink, ProgrammeLink, Artwork } from '@/components/exhibitions/Programme';
import styles from '@/components/exhibitions/programme.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const essay = findEditorial(slug);
  if (!essay) return {};
  return constructMetadata({ title: essay.title, description: essay.standfirst, canonicalPath: `/editorials/${essay.slug}` });
}

export default async function EditorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const essay = findEditorial(slug);
  if (!essay) notFound();
  const exhibition = findExhibition(essay.exhibitionSlug)!;
  const work = exhibition.works.find(item => item.id === essay.imageId)!;
  const images = await getPublishedWorks([work]);
  return <ProgrammeShell>
    <ProgrammeBackLink />
    <article>
      <header className={styles.essayHeader}>
        <h1 className={styles.display}>{essay.title}</h1>
        <p className={styles.standfirst}>{essay.standfirst}</p>
        <div className={styles.byline}><span>GALX Editorial</span><time dateTime="2026-10-07">7 October 2026</time></div>
      </header>
      <div className={`${styles.prose} ${styles.essayBody}`}>{essay.paragraphs.slice(0, 3).map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      <div className={styles.essayFigure}><Artwork work={work} src={images.get(work.id)?.src ?? null} /></div>
      <div className={`${styles.prose} ${styles.essayBody}`}>{essay.paragraphs.slice(3).map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
      <aside className={styles.essayRelated}><p>Accompanies the online exhibition</p><ProgrammeLink href={`/exhibitions/${exhibition.slug}`}>{exhibition.title}</ProgrammeLink></aside>
    </article>
  </ProgrammeShell>;
}
