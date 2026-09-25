'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ImageIcon, LayoutGrid, Maximize2, Pause, Play, RefreshCw, Sparkles } from 'lucide-react';
import { STARTER_TEMPLATES, type StarterTemplate, type StudioImage, type StudioSettings } from './studio-contract';
import { StudioArtwork } from './StudioArtwork';

/** Decorative placeholder only; it is not a progress indicator or result preview. */
function CreationPlaceholderAnimation({ running, seed }: { running: boolean; seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;

    // Deterministic particle set generated from seed for repeatable, jitter-free flow
    const particleCount = 36;
    const particles = Array.from({ length: particleCount }, (_, i) => {
      const angle = (i / particleCount) * Math.PI * 2 + (seed * 1.618);
      const radius = 26 + ((i * 19 + seed * 37) % 85);
      const speed = 0.0007 + ((i * 7) % 5) * 0.0003;
      const radiusOffset = ((i * 13) % 7) * 0.1;
      const pSize = 1.1 + ((i * 11) % 4) * 0.45;
      const hue = ((seed * 53 + i * 23) % 140) + 175; // electric cyan through magenta/violet
      return { angle, radius, speed, radiusOffset, size: pSize, hue };
    });

    function draw(time: number) {
      context!.clearRect(0, 0, size, size);

      // 1. Deep cosmic dark background with gentle radial vignette
      const bgGrad = context!.createRadialGradient(centerX, centerY, 8, centerX, centerY, size * 0.72);
      bgGrad.addColorStop(0, '#0d1322');
      bgGrad.addColorStop(0.55, '#080a12');
      bgGrad.addColorStop(1, '#05060a');
      context!.fillStyle = bgGrad;
      context!.fillRect(0, 0, size, size);

      const t = time * 0.0012;
      context!.save();
      context!.globalCompositeOperation = 'screen';

      // 2. Harmonic Fluid Waves: Luminous Cyan Ribbon
      context!.beginPath();
      const wave1Grad = context!.createLinearGradient(0, centerY - 45, size, centerY + 45);
      wave1Grad.addColorStop(0, 'rgba(0, 229, 255, 0.02)');
      wave1Grad.addColorStop(0.5, 'rgba(0, 240, 255, 0.28)');
      wave1Grad.addColorStop(1, 'rgba(0, 160, 255, 0.02)');
      context!.fillStyle = wave1Grad;
      context!.moveTo(0, size);
      for (let x = 0; x <= size; x += 8) {
        const y = centerY + Math.sin(x * 0.018 + t + seed) * 30 + Math.cos(x * 0.011 - t * 0.8) * 16;
        context!.lineTo(x, y);
      }
      context!.lineTo(size, size);
      context!.closePath();
      context!.fill();

      // 3. Harmonic Fluid Waves: Radiant Magenta / Violet Ribbon
      context!.beginPath();
      const wave2Grad = context!.createLinearGradient(0, centerY + 35, size, centerY - 35);
      wave2Grad.addColorStop(0, 'rgba(255, 42, 133, 0.02)');
      wave2Grad.addColorStop(0.5, 'rgba(255, 0, 128, 0.24)');
      wave2Grad.addColorStop(1, 'rgba(138, 43, 226, 0.02)');
      context!.fillStyle = wave2Grad;
      context!.moveTo(0, 0);
      for (let x = 0; x <= size; x += 8) {
        const y = centerY + Math.sin(x * 0.015 - t * 1.1 + seed * 2) * 26 + Math.sin(x * 0.025 + t * 0.7) * 14;
        context!.lineTo(x, y);
      }
      context!.lineTo(size, 0);
      context!.closePath();
      context!.fill();

      // 4. Central Luminous Core Flare (Breathing aperture)
      const pulse = Math.sin(t * 2.2) * 0.16 + 0.84;
      const coreGrad = context!.createRadialGradient(centerX, centerY, 0, centerX, centerY, 46 * pulse);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.2, 'rgba(0, 240, 255, 0.6)');
      coreGrad.addColorStop(0.55, 'rgba(168, 85, 247, 0.22)');
      coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      context!.fillStyle = coreGrad;
      context!.beginPath();
      context!.arc(centerX, centerY, 46 * pulse, 0, Math.PI * 2);
      context!.fill();

      // 5. Latent Particle Vectors with Additive Bloom
      context!.globalCompositeOperation = 'lighter';
      for (const p of particles) {
        const curAngle = p.angle + time * p.speed;
        const r = p.radius * (0.88 + Math.sin(time * 0.0015 + p.angle + p.radiusOffset) * 0.12);
        const px = centerX + Math.cos(curAngle) * r;
        const py = centerY + Math.sin(curAngle) * r * 0.72; // slight perspective inclination

        context!.beginPath();
        context!.arc(px, py, p.size, 0, Math.PI * 2);
        context!.fillStyle = `hsla(${p.hue}, 95%, 68%, 0.88)`;
        context!.fill();

        context!.beginPath();
        context!.arc(px, py, p.size * 2.8, 0, Math.PI * 2);
        context!.fillStyle = `hsla(${p.hue}, 90%, 62%, 0.18)`;
        context!.fill();
      }

      context!.restore();
    }

    let animation = 0, previous = 0, painted = 0, visible = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function tick(time: number) {
      elapsed.current += previous ? Math.min(time - previous, 100) : 0;
      previous = time;
      if (time - painted >= 16) { draw(elapsed.current); painted = time; }
      animation = requestAnimationFrame(tick);
    }

    function sync() {
      cancelAnimationFrame(animation); previous = 0;
      if (running && visible && !document.hidden && !reducedMotion.matches) {
        animation = requestAnimationFrame(tick);
      } else {
        draw(elapsed.current || 1200);
      }
    }

    draw(elapsed.current || 1200);
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    return () => { cancelAnimationFrame(animation); observer.disconnect(); document.removeEventListener('visibilitychange', sync); reducedMotion.removeEventListener('change', sync); };
  }, [running, seed]);

  return <canvas ref={canvasRef} className="studio-placeholder-animation" aria-hidden="true" />;
}

export function GenerationCanvas({ images, request, animating, onOpen, onDownload, onReuse, downloading, layout, onLayout, selectedId, onSelect, onLibrary,
  onSelectTemplate }: {
  images: StudioImage[]; request: StudioSettings | null; animating: boolean;
  onOpen: (image: StudioImage) => void; onDownload: (image: StudioImage) => void; onReuse: (image: StudioImage) => void; downloading: boolean;
  layout: 'image' | 'grid'; onLayout: (layout: 'image' | 'grid') => void;
  onLibrary: () => void;
  selectedId: string | null; onSelect: (id: string | null) => void;
  onSelectTemplate?: (template: StarterTemplate) => void;
}) {
  const [paused, setPaused] = useState(false);
  const stripRef = useRef<HTMLOListElement>(null);
  const latest = images.at(-1);
  const selected = images.find(image => image.id === selectedId) || latest;
  const selectedIndex = selected ? images.findIndex(image => image.id === selected.id) : -1;
  const showingPending = Boolean(request && !selectedId);
  const running = animating && !paused;

  useEffect(() => {
    const strip = stripRef.current;
    const item = strip?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (strip && item) strip.scrollLeft = item.offsetLeft - (strip.clientWidth - item.clientWidth) / 2;
  }, [selected?.id, showingPending, layout]);

  function move(direction: number) {
    const image = images[selectedIndex + direction];
    if (image) onSelect(image.id);
  }

  const pending = (index: number) => <div className="studio-generation-placeholder" role="img" aria-label={`Image ${index + 1} is pending. Generation animation, not an image preview.`}>
    <CreationPlaceholderAnimation running={running} seed={index} />
    <div className="studio-pending-hud" aria-hidden="true">
      <div className="studio-hud-badge">
        <span className="studio-hud-pulse" />
        <span>Creating your image privately…</span>
      </div>
    </div>
  </div>;

  return <section className="studio-creations" aria-labelledby="studio-creations-title">
    <div className="studio-creations-toolbar">
      <div><h2 id="studio-creations-title">Your creations</h2><p>{images.length} recent {images.length === 1 ? 'image' : 'images'}</p></div>
      <div className="studio-layout-toggle" role="group" aria-label="Results view">
        <button type="button" aria-pressed={layout === 'image'} onClick={() => onLayout('image')}><ImageIcon aria-hidden="true" />Image</button>
        <button type="button" aria-pressed={layout === 'grid'} onClick={() => onLayout('grid')}><LayoutGrid aria-hidden="true" />Grid</button>
      </div>
    </div>
    {images.length > 0 && <div className="studio-browse-toolbar">
      <div className="studio-image-paging" role="group" aria-label="Browse generated images">
        <button type="button" className="studio-icon-button" aria-label="Previous generated image" disabled={showingPending ? false : selectedIndex <= 0} onClick={() => { onLayout('image'); if (showingPending) onSelect(latest!.id); else move(-1); }}><ArrowLeft aria-hidden="true" /></button>
        <span aria-live="polite" aria-atomic="true">{showingPending ? 'Generating…' : `${selectedIndex + 1} of ${images.length}`}</span>
        <button type="button" className="studio-icon-button" aria-label="Next generated image" disabled={showingPending || selectedIndex >= images.length - 1} onClick={() => { onLayout('image'); move(1); }}><ArrowRight aria-hidden="true" /></button>
      </div>
      <button type="button" className="studio-text-button" disabled={!selectedId && layout === 'image'} onClick={() => { onSelect(null); onLayout('image'); }}>{request ? 'View generation' : 'Latest image'}<ArrowRight aria-hidden="true" /></button>
    </div>}
    {layout === 'grid' ? <ol className="studio-creation-grid" aria-label="Generated images">
      {images.map((image, index) => <li key={image.id} className="studio-creation-thumbnail">
        <button type="button" onClick={() => { onSelect(image.id); onOpen(image); }} aria-label={`Open image: ${image.prompt.slice(0, 100)}`}>
          <StudioArtwork image={image} /><span className="studio-thumbnail-number">{index + 1}</span>
        </button>
        <p>{image.prompt}</p>
      </li>)}
      {request && Array.from({ length: request.count }, (_, index) => <li key={`pending-${index}`} className="studio-creation-thumbnail">{pending(index)}<p>Generating…</p></li>)}
    </ol> : <div className="studio-focused-canvas" aria-busy={showingPending} onKeyDown={event => {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.nativeEvent.isComposing || showingPending) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); move(event.key === 'ArrowLeft' ? -1 : 1); }
    }}>
      {showingPending ? pending(0) : selected ? <button type="button" className="studio-focused-image" onClick={() => onOpen(selected)} aria-label={`Open image: ${selected.prompt.slice(0, 100)}`}>
        <StudioArtwork key={selected.id} image={selected} large reveal={!selectedId} /><span className="studio-expand"><Maximize2 aria-hidden="true" />Open image</span>
      </button> : <div className="studio-canvas-empty-state">
        <div className="studio-canvas-empty-icon"><Sparkles aria-hidden="true" /></div>
        <h3>Your creative canvas</h3>
        <p>Describe what you imagine in the composer, or pick a starter template below to begin.</p>
        <span className="sr-only">No images generated yet.</span>
      </div>}
    </div>}
    {layout === 'image' && images.length > 1 && <ol ref={stripRef} className="studio-filmstrip" aria-label="Choose a generated image">
      {images.map((image, index) => <li key={image.id}><button type="button" aria-label={`Show image ${index + 1}: ${image.prompt.slice(0, 100)}`} aria-pressed={!showingPending && selected?.id === image.id} onClick={() => onSelect(image.id)}>
        <StudioArtwork image={image} /><span className="studio-thumbnail-number">{index + 1}</span>
      </button></li>)}
    </ol>}
    {request && (showingPending || layout === 'grid') ? <div className="studio-canvas-caption">
      <div><p>Generation animation</p><span>Your {request.count === 1 ? 'image appears' : 'images appear'} when ready.</span></div>
      <button type="button" className="studio-text-button studio-animation-toggle" disabled={!animating} onClick={() => setPaused(value => !value)}>
        {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{running ? 'Pause animation' : 'Play animation'}
      </button>
    </div> : selected && layout === 'image' ? <div className="studio-canvas-caption studio-result-caption">
      <p className="studio-canvas-prompt">{selected.prompt}</p><div className="studio-selected-actions"><button type="button" className="studio-text-button" onClick={() => onReuse(selected)}><RefreshCw aria-hidden="true" />Reuse prompt</button><button type="button" className="studio-icon-button" aria-label="Download selected image" disabled={downloading} onClick={() => onDownload(selected)}><ArrowDownToLine aria-hidden="true" /></button></div>
    </div> : null}

    {images.length === 0 && !request && <div className="studio-starter-section" aria-label="Inspiration starters">
      <div className="studio-starter-header">
        <div className="studio-starter-title">
          <Sparkles aria-hidden="true" />
          <h3>Need an idea? Try an inspiration starter</h3>
        </div>
        <p>Click any card to populate its prompt and ideal aspect ratio into the composer</p>
      </div>
      <div className="studio-starter-grid">
        {STARTER_TEMPLATES.map(template => (
          <button
            key={template.id}
            type="button"
            className="studio-starter-card"
            onClick={() => onSelectTemplate?.(template)}
          >
            <div className="studio-starter-card-top">
              <span className="studio-starter-category">{template.category}</span>
              <span className="studio-starter-ratio">{template.ratio}</span>
            </div>
            <h4>{template.title}</h4>
            <p>{template.prompt}</p>
          </button>
        ))}
      </div>
      <div className="studio-guide-banner">
        <div>
          <h4>Tips for stunning artwork</h4>
          <p>Combine subject, environment, lighting, and mood for the most expressive renders.</p>
        </div>
        <div className="studio-guide-chips">
          <span>✨ 16:9 for banners</span>
          <span>✨ 9:16 for mobile stories</span>
          <span>✨ 1:1 for avatars</span>
        </div>
      </div>
    </div>}

    {images.length > 0 && <p className="studio-session-note">Recent creations stay here. <button className="studio-text-button" onClick={onLibrary}>Browse all saved images<ArrowRight aria-hidden="true" /></button></p>}
  </section>;
}
