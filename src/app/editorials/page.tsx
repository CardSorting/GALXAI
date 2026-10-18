import { IntentLink as Link } from '@/components/common/IntentLink';
import { EDITORIALS } from '@/lib/exhibitions/catalog';
import { getEditorialContext } from '@/lib/exhibitions/editorials';
import { getPublishedWorks } from '@/lib/exhibitions/published-works';
import { constructMetadata } from '@/lib/seo/metadata';
import { ProgrammeShell, ProgrammeLink, Artwork } from '@/components/exhibitions/Programme';
import { EditorialMeta, EditorialNav } from '@/components/exhibitions/Editorial';
import styles from '@/components/exhibitions/editorial.module.css';

export const dynamic = 'force-dynamic';
export const metadata = constructMetadata({
  title: 'Editorials',
  description: 'Essays on STAR works, the questions they ask, and the exhibitions that bring them together.',
  canonicalPath: '/editorials',
});

export default async function EditorialsPage() {
  const entries = EDITORIALS.map(essay => ({ essay, context: getEditorialContext(essay) }));
  const images = await getPublishedWorks(entries.flatMap(({ context }) => context ? [context.work] : []));

  return <ProgrammeShell className={styles.editorial}>
    <header>
      <div className={styles.indexMasthead}>
        <h1>Editorials</h1>
        <p>Essays on STAR works, the questions they ask, and the exhibitions that bring them together.</p>
      </div>
      <EditorialNav />
    </header>
    <div className={styles.entries}>
      {entries.map(({ essay, context }, index) => <article key={essay.slug}
        className={index === 0 ? styles.leadEntry : styles.entry} aria-labelledby={`title-${essay.slug}`}>
        <div className={styles.entryText}>
          <h2 id={`title-${essay.slug}`}><Link href={`/editorials/${essay.slug}`}>{essay.title}</Link></h2>
          <p className={styles.deck}>{essay.standfirst}</p>
          <EditorialMeta essay={essay} />
          <ProgrammeLink href={`/editorials/${essay.slug}`} ariaLabel={`Read essay: ${essay.title}`}>Read essay</ProgrammeLink>
          {context && <p className={styles.exhibitionReference}>Accompanies <Link href={`/exhibitions/${context.exhibition.slug}`}>{context.exhibition.title}</Link></p>}
        </div>
        {context && <div className={styles.entryArtwork}>
          <Artwork work={context.work} src={images.get(context.work.id)?.src ?? null} priority={index === 0} />
        </div>}
      </article>)}
    </div>
  </ProgrammeShell>;
}
