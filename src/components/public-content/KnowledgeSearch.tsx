'use client';

import { useState } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { filterGuides } from '@/lib/public-content/content';
import styles from './public-content.module.css';

const categories = ['All topics', 'Getting started', 'Creating and publishing', 'Plans and billing'];

export function KnowledgeSearch() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All topics');
  const results = filterGuides(query, category);
  function reset() { setQuery(''); setCategory('All topics'); document.getElementById('guide-search')?.focus(); }
  return <section aria-label="Find a guide">
    <div className={styles.searchArea} role="search"><label htmlFor="guide-search" className={styles.searchLabel}>Search the knowledge base</label>
      <div className={styles.searchField}><Search size={20} aria-hidden="true" /><input id="guide-search" type="search" autoComplete="off" value={query} maxLength={160} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') setQuery(''); }} placeholder="Try publishing, revisions, or billing" aria-controls="guide-results" />
        {query && <button type="button" aria-label="Clear search" onClick={() => { setQuery(''); document.getElementById('guide-search')?.focus(); }}><X size={18} aria-hidden="true" /></button>}
      </div>
    </div>
    <div className={styles.filters} role="group" aria-label="Filter guides by topic">{categories.map(item => <button type="button" key={item} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <div className={styles.searchHeading}><h2>{query.trim() ? 'Search results' : category === 'All topics' ? 'Browse all guides' : category}</h2><p role="status" aria-live="polite" aria-atomic="true">{results.length} {results.length === 1 ? 'guide' : 'guides'}{category !== 'All topics' ? ` in ${category.toLowerCase()}` : ''}{query.trim() ? ' matching your search' : ''}</p></div>
    <div id="guide-results">
      {results.length ? <ul className={styles.guideList}>{results.map(guide => <li key={guide.path}><Link href={guide.path} className={styles.guideRow}><div><h3>{guide.title}</h3><p>{guide.description}</p><span className={styles.guideMeta}>{guide.category}</span></div><ArrowRight size={20} aria-hidden="true" /></Link></li>)}</ul>
        : <div className={styles.empty}><h3>No guides found</h3><p>Try a shorter search, choose another topic, or browse every guide.</p><button type="button" className={styles.primary} onClick={reset}>Clear search and filters</button></div>}
    </div>
  </section>;
}
