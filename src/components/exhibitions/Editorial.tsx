import { IntentLink as Link } from '@/components/common/IntentLink';
import type { Editorial } from '@/lib/exhibitions/catalog';
import { editorialDate, editorialReadingMinutes } from '@/lib/exhibitions/editorials';
import { ChevronRight } from 'lucide-react';
import styles from './editorial.module.css';

export function EditorialMeta({ essay, className = '' }: { essay: Editorial; className?: string }) {
  return <p className={`${styles.meta} ${className}`}>
    <span>{essay.byline}</span>
    <time dateTime={essay.publishedOn}>{editorialDate(essay.publishedOn)}</time>
    <span>{editorialReadingMinutes(essay)} min read</span>
  </p>;
}

export function EditorialNav({ essayTitle }: { essayTitle?: string }) {
  return <nav aria-label={essayTitle ? 'Breadcrumb' : 'Programme'} className={`${styles.navigation} ${essayTitle ? styles.breadcrumb : ''}`}>
    <ol>
      {!essayTitle && <li><Link href="/exhibitions">Exhibitions</Link></li>}
      <li>{essayTitle ? <Link href="/editorials">Editorials</Link> : <span aria-current="page">Editorials</span>}</li>
      {essayTitle && <li><ChevronRight size={14} aria-hidden="true" /><span aria-current="page">{essayTitle}</span></li>}
    </ol>
  </nav>;
}
