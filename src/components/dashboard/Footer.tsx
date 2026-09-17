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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
              A generative creative playground for community creators paired with sustainable frontier-level intelligence. Serving GPT-5.6 Luna — proven in private internal testing to deliver the highest performance per dollar so developers can build and explore without constraints.
            </p>

            <Link href="/status" className={styles.statusPill}>
              <span className={styles.statusDot} />
              <span>All Systems Operational</span>
            </Link>
          </div>

          {/* Column 1: Platform */}
          <div className={styles.navCol}>
            <div className={styles.colTitle}>Platform</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/images" className={styles.footerLink}>
                  <span>Image Studio</span>
                </Link>
              </li>
              <li>
                <Link href="/explore" className={styles.footerLink}>
                  <span>Community Explore</span>
                  <span className={styles.linkBadge}>Live</span>
                </Link>
              </li>
              <li>
                <Link href="/models" className={styles.footerLink}>
                  <span>Frontier Model (GPT-5.6 Luna)</span>
                </Link>
              </li>
              <li>
                <Link href="/playground" className={styles.footerLink}>
                  <span>Playground</span>
                </Link>
              </li>
              <li>
                <Link href="/library" className={styles.footerLink}>
                  <span>Visual Library</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Developers */}
          <div className={styles.navCol}>
            <div className={styles.colTitle}>Developers</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/developers" className={styles.footerLink}>
                  <span>Developer Hub</span>
                  <span className={styles.linkBadge}>$10 Tier</span>
                </Link>
              </li>
              <li>
                <Link href="/developers/pricing" className={styles.footerLink}>
                  <span>Developer Compute</span>
                </Link>
              </li>
              <li>
                <Link href="/keys" className={styles.footerLink}>
                  <span>API Secret Keys</span>
                </Link>
              </li>
              <li>
                <Link href="/tools" className={styles.footerLink}>
                  <span>Developer Tools</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Pricing & Billing */}
          <div className={styles.navCol}>
            <div className={styles.colTitle}>Pricing & Plans</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/pricing" className={styles.footerLink}>
                  <span>Pricing Overview</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing/galx-pro" className={styles.footerLink}>
                  <span>GALX Pro ($10/mo)</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing/fair-use" className={styles.footerLink}>
                  <span>Fair Use & SLAs</span>
                </Link>
              </li>
              <li>
                <Link href="/pricing/billing-and-cancellation" className={styles.footerLink}>
                  <span>Billing & Cancellation</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Resources & Legal */}
          <div className={styles.navCol}>
            <div className={styles.colTitle}>Resources & Trust</div>
            <ul className={styles.linkList}>
              <li>
                <Link href="/knowledge-base" className={styles.footerLink}>
                  <span>Knowledge Base</span>
                </Link>
              </li>
              <li>
                <Link href="/faq" className={styles.footerLink}>
                  <span>Frequently Asked Questions</span>
                </Link>
              </li>
              <li>
                <Link href="/security" className={styles.footerLink}>
                  <span>Security & Compliance</span>
                </Link>
              </li>
              <li>
                <Link href="/status" className={styles.footerLink}>
                  <span>System Status</span>
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={styles.footerLink}>
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link href="/terms" className={styles.footerLink}>
                  <span>Terms of Service</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className={styles.bottomBar}>
          <div>
            © {new Date().getFullYear()} GALXAI, Inc. All rights reserved.
          </div>

          <div className={styles.bottomLegal}>
            <span>Images and Explore are live. Developer tools in preview.</span>
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
