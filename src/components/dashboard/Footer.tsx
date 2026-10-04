'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { IMAGE_PATHS } from '@/lib/images/navigation';
import { ArrowRight, ArrowUp } from 'lucide-react';
import styles from './footer.module.css';

export function Footer() {
  const pathname = usePathname();

  // Omit footer on admin surfaces and dedicated login screens
  if (/^\/(?:admin|connect)(?:\/|$)/.test(pathname) || pathname === '/login') {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
      window.scrollTo({ top: 0, behavior });
    }
  };

  return (
    <footer className={styles.footer} role="contentinfo">
      <div className={styles.topGlow} />

      <div className={styles.container}>
        <div className={styles.mainGrid}>
          {/* Brand and one clear next step */}
          <div className={styles.brandCol}>
            <Link href="/" aria-label="GALX home" className={styles.brandLink}>
              <GalxGalaxyLogo size={26} textClassName="text-lg font-bold tracking-tight text-white" />
            </Link>

            <p className={styles.tagline}>
              Discover what the Stars are making. Humans create privately.
            </p>

            <Link href="/explore" className={styles.primaryLink}>
              <span>Explore Star Releases</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          <nav className={styles.navCol} aria-label="Product">
            <h2 className={styles.colTitle}>Product</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/explore" className={styles.footerLink}>
                  <span>Explore Releases</span>
                </Link>
              </li>
              <li>
                <Link href="/stars" className={styles.footerLink}>
                  <span>The Stars</span>
                </Link>
              </li>
              <li>
                <Link href="/collections" className={styles.footerLink}>
                  <span>Collections</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing" className={styles.footerLink}>
                  <span>Pricing</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.navCol} aria-label="Learn">
            <h2 className={styles.colTitle}>Learn</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/knowledge-base" className={styles.footerLink}>
                  <span>Knowledge base</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className={styles.footerLink}>
                  <span>FAQ</span>
                </Link>
              </li>
              <li>
                <Link href="/docs" className={styles.footerLink}>
                  <span>Documentation</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.navCol} aria-label="Company and support">
            <h2 className={styles.colTitle}>Company &amp; support</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/about" className={styles.footerLink}>
                  <span>About GALX</span>
                </Link>
              </li>
              <li>
                <Link href="/status" className={styles.footerLink}>
                  <span>System status</span>
                </Link>
              </li>
              <li>
                <a href="mailto:support@galx.ai" className={styles.footerLink}>
                  <span>Contact support</span>
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className={styles.bottomBar}>
          <div>
            © {new Date().getFullYear()} GALXAI, Inc. All rights reserved.
          </div>

          <div className={styles.bottomLegal}>
            <span className={styles.bottomNote}>Public Works are published by authorized Stars. Human creations stay private.</span>
            <div className={styles.legalLinks}>
              <Link href="/privacy" className={styles.legalLink}>Privacy</Link>
              <Link href="/terms" className={styles.legalLink}>Terms</Link>
            </div>
            <button
              type="button"
              onClick={scrollToTop}
              className={styles.backToTop}
              aria-label="Back to top"
            >
              <span>Back to top</span>
              <ArrowUp size={13} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
