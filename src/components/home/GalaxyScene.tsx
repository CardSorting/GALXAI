import Image from 'next/image';
import { type CSSProperties } from 'react';
import { GalaxyFormation } from './GalaxyFormation';
import styles from './public-home.module.css';

const distantStars = Array.from({ length: 72 }, (_, index) => [
  Math.round(((index * 173 + 47) % 1280)),
  Math.round(((index * 227 + 83) % 860)),
]);
const storyConstellations = [
  [[85, 170], [155, 220], [245, 155], [315, 235], [370, 190]],
  [[960, 520], [1045, 450], [1120, 495], [1200, 420]],
  [[55, 930], [115, 1010], [205, 975], [260, 1050], [330, 995]],
  [[1000, 1360], [1080, 1300], [1170, 1350], [1130, 1430], [1035, 1410], [1000, 1360]],
  [[75, 1750], [160, 1810], [215, 1760], [295, 1840]],
  [[905, 2010], [1010, 1960], [1090, 2040], [1175, 1980]],
];

/** Decorative geometry, deliberately separate from the illustrative product result. */
export function GalaxyScene() {
  return <div className={styles.sky} aria-hidden="true">
    <div className={styles.skyDepth} data-home-sky>
      <div className={styles.skyParallax} data-home-parallax>
      <Image src="/brand/galaxy-hero-banner.jpg" alt="" fill priority sizes="(max-width: 800px) 100vw, 1280px" />
      <GalaxyFormation />
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
          {distantStars.map(([cx,cy], index) => <circle key={index} cx={cx} cy={cy} r={index % 9 === 0 ? 1.7 : .7} opacity={index % 3 === 0 ? .8 : .4} />)}
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
      {distantStars.map(([cx,cy],index) => <circle key={index} cx={cx} cy={cy * 2.5} r={index % 9 === 0 ? 1.8 : .8} />)}
      {storyConstellations.map((points, index) => <g key={index} className={styles.storyConstellation} style={{ '--constellation-step': index * .12 } as CSSProperties}>
        <path d={points.map(([x,y], point) => `${point ? 'L' : 'M'}${x} ${y}`).join(' ')} pathLength="1" />
        {points.map(([cx,cy], point) => <circle key={point} cx={cx} cy={cy} r={point % 2 ? 2 : 2.6} />)}
      </g>)}
    </svg>
  </div>;
}
