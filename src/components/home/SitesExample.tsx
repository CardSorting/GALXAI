'use client';
import Link from 'next/link';
import { useState, type CSSProperties } from 'react';
import { ArrowUpRight, Globe2, RotateCcw } from 'lucide-react';
import { SITE_STARTERS, siteStarterHref } from '@/lib/sites/starters';
import styles from './public-home.module.css';

const examples = {
  product: {
    brand: 'Daylight', slug: 'daylight', request: 'A launch page for a calmer way to plan the week.',
    change: 'Make it more personal. Focus on meaningful work.',
    versions: [
      { title: 'A calmer week starts here.', intro: 'A thoughtful planner for small teams. Bring your priorities together and make space for the work that matters.', heading: 'Find your focus', body: 'A shared place for the week ahead, with less time spent piecing it together.' },
      { title: 'Make room for your best work.', intro: 'Your week is more than a list of tasks. Give the important things a little more room with Daylight.', heading: 'A little more clarity', body: 'See what matters, make a plan together, and finish the week feeling good about it.' },
    ],
  },
  portfolio: {
    brand: 'Maya Chen', slug: 'maya-design', request: 'A warm, confident portfolio for an independent designer.',
    change: 'Speak directly to small businesses finding their voice.',
    versions: [
      { title: 'Thoughtful design. Lasting character.', intro: 'Independent brand design for people with something to say. Clear ideas, considered details, and a point of view.', heading: 'Made with purpose', body: 'An introduction to selected work, the thinking behind it, and ways to work together.' },
      { title: 'A small business. A voice of its own.', intro: 'You bring the story. Together, we give it a look and a voice that feel unmistakably yours.', heading: 'From the inside out', body: 'Design that starts with what makes your business different, then brings it into focus.' },
    ],
  },
  event: {
    brand: 'Common Ground', slug: 'common-ground', request: 'An introduction to a neighborhood makers market.',
    change: 'Make the invitation warmer for neighbors and families.',
    versions: [
      { title: 'Meet your local makers.', intro: 'A neighborhood market for handmade finds, good conversations, and the people who make this place their own.', heading: 'Plan a little visit', body: 'Meet the makers, discover something unexpected, and spend time close to home.' },
      { title: 'Bring the family. Meet the neighbors.', intro: 'An easy day out, right around the corner. Discover local makers and find a new reason to love your neighborhood.', heading: 'Everyone is welcome', body: 'Come for a browse, stay for a conversation, and make an afternoon of it together.' },
    ],
  },
};

function ExampleContent({ brand, version }: { brand: string; version: (typeof examples)['product']['versions'][number] }) {
  return <>
    <p className={styles.exampleBrand}>{brand}</p>
    <h2>{version.title}</h2><p className={styles.exampleIntro}>{version.intro}</p>
    <div className={styles.exampleSection}><h3>{version.heading}</h3><p>{version.body}</p></div>
  </>;
}

/** Authored examples illustrate possibilities; the entry action carries an editable idea. */
export function SitesExample() {
  const [selected, setSelected] = useState(0);
  const [revised, setRevised] = useState(false);
  const [direction, setDirection] = useState(1);
  const starter = SITE_STARTERS[selected];
  const example = examples[starter.id];
  const version = example.versions[revised ? 1 : 0];

  return <figure className={styles.example} aria-label="Explore starting ideas for your Site" style={{ '--draft-direction': direction } as CSSProperties}>
    <figcaption className={styles.exampleLabel}><span>A starting point for your idea.</span><span>Illustrative examples</span></figcaption>
    <div className={styles.starterPicker} role="group" aria-label="Choose an example" style={{ '--starter-index': selected } as CSSProperties}>
      <span className={styles.starterIndicator} aria-hidden="true" />
      {SITE_STARTERS.map((item, index) => <button type="button" key={item.id} aria-pressed={selected === index} onClick={() => { setDirection(index >= selected ? 1 : -1); setSelected(index); setRevised(false); }}>{item.label}</button>)}
    </div>
    <p className={styles.exampleRequest}><span>{revised ? 'A change to try' : 'The starting idea'}</span>“{revised ? example.change : example.request}”</p>
    <div className={styles.exampleSheet} data-revised={revised}>
      <div className={styles.exampleAddress}><Globe2 size={15} aria-hidden="true" /><span>{example.slug}.yourname.galx.ai</span><span className={styles.exampleVersion}>{revised ? 'Revised' : 'First draft'}</span></div>
      <div className={styles.exampleCanvas}>
        {/* Intrinsic sizing keeps the actions in place as text wraps at each width. */}
        {Object.entries(examples).flatMap(([id, item]) => item.versions.map((sizingVersion, index) =>
          <div key={`${id}-${index}`} className={`${styles.examplePaper} ${styles.exampleSizer}`} aria-hidden="true">
            <ExampleContent brand={item.brand} version={sizingVersion} />
          </div>
        ))}
        <div className={styles.examplePaper} aria-live="polite" aria-atomic="true">
          <div key={`${starter.id}-${revised}`} className={styles.exampleResult}><ExampleContent brand={example.brand} version={version} /></div>
        </div>
      </div>
    </div>
    <div className={styles.exampleActions}>
      <button type="button" className={styles.revisionAction} onClick={() => { setDirection(revised ? -1 : 1); setRevised(value => !value); }} aria-pressed={revised}><RotateCcw size={15} aria-hidden="true" />{revised ? 'Back to first draft' : 'See a revision'}</button>
      <Link className={styles.exampleStart} href={siteStarterHref(starter.id, revised)}>Use this idea <ArrowUpRight size={16} aria-hidden="true" /></Link>
    </div>
    <p className={styles.exampleNote}>Opens an editable starting idea in Sites. Make it your own.</p>
  </figure>;
}
