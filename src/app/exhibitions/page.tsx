import { IntentLink as Link } from '@/components/common/IntentLink';
import { EXHIBITIONS, EDITORIALS } from '@/lib/exhibitions/catalog';
import { getPublishedWorks } from '@/lib/exhibitions/published-works';
import { constructMetadata } from '@/lib/seo/metadata';
import { ProgrammeShell, ProgrammeLink, Artwork } from '@/components/exhibitions/Programme';
import { ArtworkImage } from '@/components/exhibitions/ArtworkImage';
import { EditorialMeta } from '@/components/exhibitions/Editorial';
import styles from '@/components/exhibitions/programme.module.css';

export const dynamic = 'force-dynamic';
export const metadata = constructMetadata({ title: 'Exhibitions & editorials', description: 'A programme of STAR works, brought into dialogue through curated online exhibitions and critical writing.', canonicalPath: '/exhibitions' });

export default async function ExhibitionsPage() {
  const [current, previous] = EXHIBITIONS;
  const allWorks = EXHIBITIONS.flatMap(show => show.works);
  const hero = current.works[0];
  const previousHero = previous.works[7];
  const editorialWorks = EDITORIALS.map(essay => allWorks.find(work => work.id === essay.imageId)!);
  const images = await getPublishedWorks([hero, previousHero, ...editorialWorks]);
  return <ProgrammeShell>
    <header className={styles.masthead}>
      <div><h1>Exhibitions & editorials</h1><p>A programme of STAR works, brought into dialogue through exhibitions and critical writing.</p></div>
      <nav aria-label="Programme sections" className={styles.sectionNav}>
        <a href="#exhibitions">Exhibitions</a><a href="#editorials">Editorials</a>
      </nav>
    </header>
    <section className={styles.feature} id="exhibitions" aria-labelledby="current-exhibition">
      <Artwork work={hero} src={images.get(hero.id)?.src ?? null} priority />
      <div className={styles.featureText}>
        <h2 id="current-exhibition" className={styles.display}>{current.title}</h2>
        <div className={styles.date}>Online exhibition · 7 October 2026</div>
        <p>{current.standfirst}</p>
        <ProgrammeLink href={`/exhibitions/${current.slug}`}>Enter exhibition</ProgrammeLink>
      </div>
    </section>
    <div className={styles.sectionHeader}><h2>Also on view</h2><p>Two exhibitions. Twelve distinct practices.</p></div>
    <section className={styles.secondShow} aria-labelledby="previous-exhibition">
      <div className={styles.featureText}>
        <h2 id="previous-exhibition" className={styles.display}>{previous.title}</h2>
        <div className={styles.date}>Online exhibition · 7 October 2026</div>
        <p>{previous.standfirst}</p>
        <ProgrammeLink href={`/exhibitions/${previous.slug}`}>Enter exhibition</ProgrammeLink>
      </div>
      <Artwork work={previousHero} src={images.get(previousHero.id)?.src ?? null} />
    </section>
    <section id="editorials" aria-labelledby="editorials-title">
      <div className={styles.sectionHeader}><h2 id="editorials-title">Editorials</h2><ProgrammeLink href="/editorials">All editorials</ProgrammeLink></div>
      <div className={styles.editorialGrid}>
        {EDITORIALS.map((essay, index) => {
          const work = editorialWorks[index];
          return <article className={styles.editorialItem} key={essay.slug}>
            <ArtworkImage src={images.get(work.id)?.thumbnailSrc ?? images.get(work.id)?.src ?? null} alt={work.alt} width={work.width} height={work.height} compact />
            <div><h3><Link href={`/editorials/${essay.slug}`}>{essay.title}</Link></h3>
              <EditorialMeta essay={essay} className={styles.editorialMetadata} />
              <p>{essay.standfirst}</p><ProgrammeLink href={`/editorials/${essay.slug}`} ariaLabel={`Read essay: ${essay.title}`}>Read essay</ProgrammeLink>
            </div>
          </article>;
        })}
      </div>
    </section>
    <aside className={styles.closing}>
      <p>The programme brings STAR works into conversation through sustained looking, precise captions and curatorial writing. Each exhibition is a selection; each artist’s public practice continues beyond it.</p>
      <ProgrammeLink href="/stars">Meet the STARs</ProgrammeLink>
    </aside>
  </ProgrammeShell>;
}
