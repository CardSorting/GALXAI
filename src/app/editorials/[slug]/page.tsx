import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { findEditorial } from '@/lib/exhibitions/catalog';
import { getEditorialContext, nextEditorial } from '@/lib/exhibitions/editorials';
import { getPublishedWorks } from '@/lib/exhibitions/published-works';
import { constructMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/jsonld';
import { SITE_CONFIG } from '@/lib/seo/siteConfig';
import { ProgrammeShell, ProgrammeLink, Artwork } from '@/components/exhibitions/Programme';
import { EditorialMeta, EditorialNav } from '@/components/exhibitions/Editorial';
import { EssayActions } from '@/components/exhibitions/EssayActions';
import styles from '@/components/exhibitions/editorial.module.css';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const essay = findEditorial(slug);
  if (!essay) return {};
  return constructMetadata({
    title: essay.title, description: essay.standfirst, canonicalPath: `/editorials/${essay.slug}`,
    ogType: 'article', publishedTime: essay.publishedOn, authors: [essay.byline],
  });
}

export default async function EditorialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const essay = findEditorial(slug);
  if (!essay) notFound();
  const context = getEditorialContext(essay);
  if (!context) notFound();
  const { exhibition, work } = context;
  const images = await getPublishedWorks([work]);
  const nextEssay = nextEditorial(essay.slug);

  return <ProgrammeShell className={`${styles.editorial} ${styles.essayPage}`}>
    <JsonLd data={{
      '@context': 'https://schema.org', '@type': 'Article',
      headline: essay.title, description: essay.standfirst,
      datePublished: essay.publishedOn,
      author: { '@type': 'Organization', name: essay.byline },
      mainEntityOfPage: `${SITE_CONFIG.url}/editorials/${essay.slug}`,
    }} />
    <EditorialNav essayTitle={essay.title} />
    <article aria-labelledby="essay-title" className={styles.essay}>
      <header className={styles.essayHeader}>
        <h1 id="essay-title">{essay.title}</h1>
        <p className={styles.deck}>{essay.standfirst}</p>
        <EditorialMeta essay={essay} />
        <EssayActions canonicalUrl={`${SITE_CONFIG.url}/editorials/${essay.slug}`} />
      </header>
      <div className={styles.body}>
        {essay.paragraphs.map((paragraph, index) => <Fragment key={`${essay.slug}-${index}`}>
          <p>{paragraph}</p>
          {index + 1 === essay.figureAfterParagraph && <div id="illustrated-work" className={styles.figure}
            style={{ maxWidth: `${Math.min(52, 40 * work.width / work.height)}rem` }}>
            <Artwork work={work} src={images.get(work.id)?.src ?? null} essay className={styles.essayArtwork}
              imageClassName={styles.essayImage} loading="eager" />
          </div>}
        </Fragment>)}
      </div>
      <footer className={styles.essayFooter}>
        <div><h2>Continue with the exhibition</h2><p>{exhibition.standfirst}</p></div>
        <ProgrammeLink href={`/exhibitions/${exhibition.slug}`}>{exhibition.title}</ProgrammeLink>
      </footer>
    </article>
    {nextEssay && <nav aria-labelledby="read-next" className={styles.readNext}>
      <div className={styles.readNextHeading}><h2 id="read-next">Read next</h2><Link href="/editorials">All editorials</Link></div>
      <div className={styles.nextEntry}>
        <h3><Link href={`/editorials/${nextEssay.slug}`}>{nextEssay.title}</Link></h3>
        <div><p className={styles.deck}>{nextEssay.standfirst}</p><EditorialMeta essay={nextEssay} />
          <ProgrammeLink href={`/editorials/${nextEssay.slug}`} ariaLabel={`Read next: ${nextEssay.title}`}>Read essay</ProgrammeLink></div>
      </div>
    </nav>}
  </ProgrammeShell>;
}
