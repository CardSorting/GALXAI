'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { IntentLink as Link } from '@/components/common/IntentLink';
import { GalxGalaxyLogo } from '@/components/brand/GalxGalaxyLogo';
import { ArrowUp } from 'lucide-react';
import styles from './footer.module.css';

export function Footer() {
  const pathname = usePathname();

  // Omit footer on admin surfaces and dedicated login screens
  if (/^\/admin(?:\/|$)/.test(pathname) || pathname === '/login') {
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
          {/* Brand & Platform Status */}
          <div className={styles.brandCol}>
            <Link href="/" aria-label="GALX home" className={styles.brandLink}>
              <GalxGalaxyLogo size={26} textClassName="text-lg font-bold tracking-tight text-white" />
            </Link>

            <p className={styles.tagline}>
              GALX is where people create — with helpful tools for images, ideas, and selected private integrations.
            </p>

            <Link href="/status" className={styles.statusPill} aria-label="View GALX system status">
              <span className={styles.statusDot} />
              <span>View system status</span>
            </Link>
          </div>

          {/* Primary user journeys */}
          <nav className={styles.navCol} aria-label="Create">
            <h2 className={styles.colTitle}>Create</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/images" className={styles.footerLink}>
                  <span>Image Studio</span>
                </Link>
              </li>
              <li>
                <Link href="/explore" className={styles.footerLink}>
                  <span>Explore</span>
                </Link>
              </li>
              <li>
                <Link href="/library" className={styles.footerLink}>
                  <span>Visual Library</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.navCol} aria-label="Learn">
            <h2 className={styles.colTitle}>Learn</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/docs" className={styles.footerLink}>
                  <span>Docs</span>
                </Link>
              </li>
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
                <Link href="/status" className={styles.footerLink}>
                  <span>System status</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.navCol} aria-label="Plans and access">
            <h2 className={styles.colTitle}>Plans & access</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/pricing" className={styles.footerLink}>
                  <span>Pricing</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing/galx-pro" className={styles.footerLink}>
                  <span>GALX Pro</span>
                </Link>
              </li>
              <li>
                <Link href="/developers" className={styles.footerLink}>
                  <span>Private access</span>
                </Link>
              </li>
            </ul>
          </nav>

          <nav className={styles.navCol} aria-label="Company and legal">
            <h2 className={styles.colTitle}>Company & legal</h2>
            <ul className={styles.linkList}>
              <li>
                <Link href="/about" className={styles.footerLink}>
                  <span>About GALX</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={styles.footerLink}>
                  <span>Privacy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className={styles.footerLink}>
                  <span>Terms</span>
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div>
            © {new Date().getFullYear()} GALXAI, Inc. All rights reserved.
          </div>

          <div className={styles.bottomLegal}>
            <span>Private access is provided by decision, not self-service enrollment.</span>
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
