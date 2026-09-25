import { IntentLink as Link } from '@/components/common/IntentLink';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { JsonLd, createBreadcrumbSchema } from '@/lib/seo/jsonld';
import { PlanAction } from '@/components/home/PlanAction';
import { getGuide, type Guide } from '@/lib/public-content/content';
import styles from './public-content.module.css';

export function Breadcrumbs({ items }: { items: { name: string; url?: string }[] }) {
  return <><JsonLd data={createBreadcrumbSchema(items)} /><nav aria-label="Breadcrumb" className={styles.breadcrumbs}><ol>{items.map((item, index) =>
    <li key={item.name}>{index > 0 && <ChevronRight size={13} aria-hidden="true" />}{item.url ? <Link href={item.url}>{item.name}</Link> : <span aria-current="page">{item.name}</span>}</li>)}</ol></nav></>;
}

export function GuideList({ guides, showCategory = false }: { guides: Guide[]; showCategory?: boolean }) {
  return <ul className={styles.guideList}>{guides.map(guide => <li key={guide.path}><Link href={guide.path} className={styles.guideRow}>
    <div><h3>{guide.title}</h3><p>{guide.description}</p>{showCategory && <span className={styles.guideMeta}>{guide.category}</span>}</div><ArrowRight size={20} aria-hidden="true" />
  </Link></li>)}</ul>;
}

export function SupportLink() {
  return <section className={styles.support} aria-label="Contact support"><div><h2>Still have a question?</h2><p>Tell us what you’re trying to do. We can help you find your next step.</p></div><a href="mailto:support@galx.ai" className={styles.textLink}>Contact support <ArrowRight size={17} aria-hidden="true" /></a></section>;
}

export function GuidePage({ guide }: { guide: Guide }) {
  const isPricing = guide.path.startsWith('/pricing/');
  const parent = isPricing ? { name: 'Pricing', url: '/pricing' } : { name: 'Knowledge base', url: '/knowledge-base' };
  const related = guide.related.map(getGuide).filter((item): item is Guide => Boolean(item));
  return <main className={styles.page}>
    <Breadcrumbs items={[{ name: 'Home', url: '/' }, parent, { name: guide.title }]} />
    <header className={styles.intro}><h1>{guide.title}</h1><p>{guide.description}</p></header>
    <div className={styles.readingLayout}>
      <nav className={styles.sidebar} aria-label="On this page"><p>In this guide</p>{guide.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}<Link className={styles.backLink} href={parent.url}>All {isPricing ? 'pricing guides' : 'guides'}</Link></nav>
      <article className={styles.article} aria-label={guide.title}>
        {guide.sections.map(section => <section className={styles.articleSection} id={section.id} key={section.id} aria-labelledby={`${section.id}-title`}>
          <h2 id={`${section.id}-title`}>{section.title}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}
          {section.steps && <ol>{section.steps.map(step => <li key={step}>{step}</li>)}</ol>}
          {section.example && <div className={styles.example}><span>Example request</span><blockquote>{section.example}</blockquote></div>}
        </section>)}
        {isPricing ? <PlanAction className={styles.planAction} actionClassName={styles.primary} /> : <Link href="/images/create" className={styles.primary}>Create privately<ArrowRight size={18} aria-hidden="true" /></Link>}
        <section className={styles.section} aria-labelledby="related-guides"><h2 id="related-guides" className={styles.sectionHead}>Keep reading</h2><GuideList guides={related} /><Link href="/faq" className={styles.textLink}>Browse frequently asked questions <ArrowRight size={16} aria-hidden="true" /></Link></section>
      </article>
    </div>
    <SupportLink />
  </main>;
}
