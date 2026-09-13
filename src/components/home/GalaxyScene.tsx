import Image from 'next/image';
import styles from './public-home.module.css';

/** Decorative geometry, deliberately separate from the illustrative product result. */
export function GalaxyScene() {
  return <div className={styles.sky} aria-hidden="true">
    <div className={styles.skyDepth} data-home-sky>
      <div className={styles.skyParallax} data-home-parallax>
      <Image src="/brand/galaxy-hero-banner.jpg" alt="" fill priority sizes="(max-width: 800px) 100vw, 1280px" />
      <svg className={styles.orbits} viewBox="0 0 1280 860" fill="none" focusable="false">
        <g className={styles.orbitPlane}>
          <ellipse cx="850" cy="420" rx="510" ry="280" transform="rotate(-28 850 420)" />
          <ellipse cx="850" cy="420" rx="570" ry="345" transform="rotate(-28 850 420)" />
          <ellipse cx="850" cy="420" rx="630" ry="410" transform="rotate(-28 850 420)" />
          <ellipse className={styles.orbitHighlight} cx="850" cy="420" rx="570" ry="345" transform="rotate(-28 850 420)" pathLength="100" />
        </g>
        <g className={styles.constellation}>
          <path d="M74 245 165 183 296 216M990 716 1104 660 1208 701" />
          {[[74,245],[165,183],[296,216],[990,716],[1104,660],[1208,701]].map(([cx,cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="2.5" />)}
        </g>
        <g className={styles.stars}>
          {[[46,490],[113,650],[209,374],[360,82],[477,733],[598,158],[654,787],[789,60],[920,804],[1068,102],[1169,310],[1234,567]].map(([cx,cy], index) => <circle key={cx} cx={cx} cy={cy} r={index % 3 === 0 ? 2 : 1} />)}
        </g>
      </svg>
      </div>
    </div>
    <span className={styles.shootingStar} data-home-comet />
  </div>;
}

/** A quiet, continuous star map connects the reading sections without another bitmap. */
export function GalaxyStory() {
  return <div className={styles.storySky} aria-hidden="true">
    <svg viewBox="0 0 1280 2200" preserveAspectRatio="none" fill="none" focusable="false">
      <path className={styles.storyOrbit} d="M-120 70C120 470 670 250 1190 660S140 1160 110 1480S1080 1850 1320 2230" />
      <path className={styles.storyFlight} pathLength="1" d="M-120 70C120 470 670 250 1190 660S140 1160 110 1480S1080 1850 1320 2230" />
      <path className={styles.storyOrbit} d="M-150 115C120 510 670 290 1170 710S180 1200 145 1480S1100 1820 1360 2200" />
      {[[80,185],[215,330],[1100,230],[1180,505],[83,735],[1000,1030],[60,1220],[1210,1350],[280,1590],[950,1720],[90,1980],[1150,2140]].map(([cx,cy],index) => <circle key={cx} cx={cx} cy={cy} r={index % 3 === 0 ? 2 : 1} />)}
    </svg>
  </div>;
}
