import { notFound } from 'next/navigation';
import { findExhibition } from '@/lib/exhibitions/catalog';
import { getPublishedWorks } from '@/lib/exhibitions/published-works';
import { constructMetadata } from '@/lib/seo/metadata';
import { ProgrammeShell, ProgrammeBackLink, ProgrammeLink, Artwork } from '@/components/exhibitions/Programme';
import styles from '@/components/exhibitions/programme.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exhibition = findExhibition(slug);
  if (!exhibition) return {};
  return constructMetadata({ title: exhibition.title, description: exhibition.standfirst, canonicalPath: `/exhibitions/${exhibition.slug}` });
}

export default async function ExhibitionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exhibition = findExhibition(slug);
  if (!exhibition) notFound();
  const images = await getPublishedWorks(exhibition.works);
  const hero = exhibition.works[0];
  return <ProgrammeShell>
    <ProgrammeBackLink />
    <header className={styles.showHeading}>
      <h1 className={styles.display}>{exhibition.title}</h1>
      <div><p className={styles.standfirst}>{exhibition.standfirst}</p><div className={styles.date}>Online exhibition · 7 October 2026 · Twelve STARs</div></div>
    </header>
    <div className={styles.cover}><Artwork work={hero} src={images.get(hero.id)?.src ?? null} priority essay /></div>
    <section className={styles.introduction} aria-labelledby="exhibition-introduction">
      <h2 id="exhibition-introduction">About the exhibition</h2>
      <div className={styles.prose}>{exhibition.introduction.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </section>
    <section aria-labelledby="exhibition-works">
      <div className={styles.sectionHeader}><h2 id="exhibition-works">Works in the exhibition</h2><p>Digital works · 2026</p></div>
      <div className={styles.workGrid}>{exhibition.works.slice(1).map(work => <Artwork key={work.id} work={work} src={images.get(work.id)?.src ?? null} essay />)}</div>
    </section>
    <aside className={styles.closing}><p>Continue with an essay on the works and the questions they share.</p><ProgrammeLink href={`/editorials/${exhibition.editorialSlug}`}>Read the accompanying essay</ProgrammeLink></aside>
  </ProgrammeShell>;
}
