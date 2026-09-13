'use client';

import { useEffect, useRef } from 'react';
import styles from './public-home.module.css';

const TAU = Math.PI * 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
const mix = (a: number, b: number, amount: number) => a + (b - a) * amount;

// Fixed seeds keep resizing, hydration and repeated visits visually coherent.
const particles = Array.from({ length: 360 }, (_, index) => {
  const noise = (salt: number) => { const n = Math.sin((index + 1) * salt) * 43758.5453; return n - Math.floor(n); };
  return { x: noise(12.9898), y: noise(78.233), radius: noise(39.425), phase: noise(93.989) * TAU, arm: index % 3, size: .5 + noise(27.196) * 1.1 };
});

const constellations = [
  [[.04, .17], [.09, .12], [.14, .16], [.20, .09], [.26, .13]],
  [[.39, .12], [.44, .07], [.49, .13], [.54, .06], [.60, .11]],
  [[.77, .10], [.83, .13], [.88, .19], [.94, .14], [.97, .24], [.90, .28], [.88, .19]],
  [[.03, .67], [.09, .72], [.07, .80], [.13, .85], [.18, .78], [.09, .72]],
  [[.33, .88], [.39, .82], [.44, .90], [.49, .83], [.55, .89]],
  [[.79, .83], [.85, .76], [.90, .84], [.96, .79], [.92, .92], [.85, .88], [.79, .83]],
];
const anchors = constellations.flat();

/** One bounded, decorative scene; product content and controls never depend on it. */
export function GalaxyFormation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const page = canvas?.closest('main');
    if (!canvas || !page) return;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return; // The server-rendered image and star map remain visible.
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0, height = 0, count = 360;
    let frame = 0, running = false, elapsed = reduce.matches ? 24000 : 8000, previous = 0, lastPaint = -Infinity;
    let interval = 1000 / 30;
    const positions = new Float32Array(particles.length * 2);

    function draw(seconds: number) {
      if (!context || !width || !height) return;
      context.clearRect(0, 0, width, height);
      const phase = seconds % 36;
      const release = 1 - ease((phase - 28) / 8);
      const spiral = ease(phase / 8) * release;
      const formation = ease((phase - 12) / 6) * release;
      const trace = ease((phase - 18) / 6) * release;
      const compact = width < 760;
      const centerX = width * (compact ? .72 : .56);
      const centerY = height * (compact ? .24 : .39);

      for (let index = 0; index < count; index++) {
        const star = particles[index];
        const radius = Math.sqrt(star.radius) * width * .63;
        const angle = star.arm * TAU / 3 + star.radius * 7 + seconds * .025;
        const armX = Math.cos(angle) * radius;
        const armY = Math.sin(angle) * radius * .3;
        const cloudX = star.x * width + Math.sin(seconds * .08 + star.phase) * 7;
        const cloudY = star.y * height + Math.cos(seconds * .06 + star.phase) * 5;
        let x = mix(cloudX, centerX + armX * .94 + armY * .34, spiral * .9);
        let y = mix(cloudY, centerY - armX * .34 + armY * .94, spiral * .9);
        if (index < anchors.length) {
          x = mix(x, anchors[index][0] * width, formation);
          y = mix(y, anchors[index][1] * height, formation);
        }
        positions[index * 2] = x;
        positions[index * 2 + 1] = y;
        // Keep a calm reading pocket behind the headline and introductory copy.
        const quiet = x < width * .43 && y > height * .23 && y < height * .75 ? .36 : 1;
        const shimmer = .68 + Math.sin(seconds * .65 + star.phase) * .2;
        const featured = index < anchors.length;
        context.globalAlpha = (featured ? .72 : .3 + star.radius * .4) * shimmer * quiet;
        context.fillStyle = index % 9 === 0 ? '#fbbf24' : '#f3f4f6';
        context.beginPath();
        context.arc(x, y, star.size * (featured ? 1.35 : 1), 0, TAU);
        context.fill();
        if (featured && index % 3 === 0) {
          context.globalAlpha *= .24;
          context.fillRect(x - 4, y - .35, 8, .7);
          context.fillRect(x - .35, y - 4, .7, 8);
        }
      }

      let offset = 0;
      context.strokeStyle = '#d4d4d8';
      context.lineWidth = .75;
      for (const group of constellations) {
        for (let point = 1; point < group.length; point++) {
          const length = clamp(trace * (group.length - 1) - (point - 1));
          if (length > 0) {
            const from = (offset + point - 1) * 2, to = (offset + point) * 2;
            context.globalAlpha = .35 * release;
            context.beginPath();
            context.moveTo(positions[from], positions[from + 1]);
            context.lineTo(mix(positions[from], positions[to], length), mix(positions[from + 1], positions[to + 1], length));
            context.stroke();
          }
        }
        offset += group.length;
      }

      // One occasional meteor, in the same clock and rendering budget as the stars.
      const meteor = (seconds + 8) % 20;
      if (running && meteor < 1.8) {
        const t = meteor / 1.8;
        const x = width * (.12 + t * .70), y = height * (.10 + t * .15);
        const tail = Math.min(100, width * .16);
        const gradient = context.createLinearGradient(x - tail, y - 24, x, y);
        gradient.addColorStop(0, 'rgba(243,244,246,0)');
        gradient.addColorStop(1, 'rgba(243,244,246,.8)');
        context.strokeStyle = gradient;
        context.globalAlpha = Math.sin(t * Math.PI) * .8;
        context.lineWidth = 1.25;
        context.beginPath(); context.moveTo(x - tail, y - 24); context.lineTo(x, y); context.stroke();
      }
      context.globalAlpha = 1;
    }

    function tick(now: number) {
      if (!running) return;
      elapsed += now - previous;
      previous = now;
      if (now - lastPaint >= interval) { draw(elapsed / 1000); lastPaint = now; }
      frame = requestAnimationFrame(tick);
    }
    function sync() {
      const shouldRun = !!page && page.dataset.motion === 'on' && page.dataset.skyActive === 'true' && !document.hidden && !reduce.matches;
      if (shouldRun === running) return;
      running = shouldRun;
      if (running) { previous = performance.now(); lastPaint = -Infinity; frame = requestAnimationFrame(tick); }
      else { cancelAnimationFrame(frame); frame = 0; }
    }
    function resize() {
      if (!canvas || !context) return;
      const box = canvas.getBoundingClientRect();
      const nextWidth = Math.round(box.width), nextHeight = Math.round(box.height);
      if (!nextWidth || !nextHeight || (nextWidth === width && nextHeight === height)) return;
      width = nextWidth; height = nextHeight;
      count = width < 760 ? 220 : 360;
      interval = 1000 / (width < 760 ? 24 : 30);
      const ratio = Math.min(devicePixelRatio || 1, 1.5, Math.sqrt(1_600_000 / (width * height)));
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      draw(elapsed / 1000);
    }
    const changes = new MutationObserver(sync);
    changes.observe(page, { attributes: true, attributeFilter: ['data-motion', 'data-sky-active'] });
    const sizes = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    sizes?.observe(canvas);
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    resize(); sync();
    return () => {
      running = false;
      cancelAnimationFrame(frame);
      changes.disconnect(); sizes?.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      reduce.removeEventListener('change', sync);
    };
  }, []);

  return <canvas ref={canvasRef} className={styles.galaxyFormation} aria-hidden="true" />;
}
