'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowLeft, ArrowRight, ImageIcon, LayoutGrid, Maximize2, Pause, Play, RefreshCw } from 'lucide-react';
import type { StudioImage, StudioSettings } from './studio-contract';
import { StudioArtwork } from './StudioArtwork';

/** Decorative simulation only: no partial image, progress estimate, or provider data. */
function DenoisingSimulation({ running, seed }: { running: boolean; seed: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !context) return;
    const size = 192;
    canvas.width = size; canvas.height = size;
    const frame = context.createImageData(size, size);
    const field = new Float32Array(size * size);
    let randomState = (seed + 1) * 982451653;
    const random = () => { randomState ^= randomState << 13; randomState ^= randomState >>> 17; randomState ^= randomState << 5; return (randomState >>> 0) / 4294967296; };
    const noise = () => Float32Array.from({ length: size * size }, () => random());
    let from = noise(), to = noise(), epoch = -1;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      field[y * size + x] = (Math.sin(x / 39 + seed) + Math.cos(y / 47 - seed) + Math.sin((x + y) / 61)) / 6 + .5;
    }
    function draw(time: number) {
      const nextEpoch = Math.floor(time / 900);
      if (nextEpoch !== epoch) { from = to; to = noise(); epoch = nextEpoch; }
      const blend = (time % 900) / 900;
      const smooth = blend * blend * (3 - 2 * blend);
      const grain = .16 + .7 * Math.exp(-time / 6500);
      for (let i = 0; i < field.length; i++) {
        const value = field[i] * (1 - grain) + (from[i] * (1 - smooth) + to[i] * smooth) * grain;
        const pixel = i * 4;
        frame.data[pixel] = 24 + value * 116;
        frame.data[pixel + 1] = 28 + value * 122;
        frame.data[pixel + 2] = 47 + value * 158;
        frame.data[pixel + 3] = 255;
      }
      context!.putImageData(frame, 0, 0);
    }
    let animation = 0, previous = 0, painted = 0, visible = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function tick(time: number) {
      elapsed.current += previous ? Math.min(time - previous, 100) : 0;
      previous = time;
      if (time - painted >= 80) { draw(elapsed.current); painted = time; }
      animation = requestAnimationFrame(tick);
    }
    function sync() {
      cancelAnimationFrame(animation); previous = 0;
      if (running && visible && !document.hidden && !reducedMotion.matches) animation = requestAnimationFrame(tick);
    }
    draw(elapsed.current);
    const observer = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; sync(); });
    observer.observe(canvas);
    document.addEventListener('visibilitychange', sync);
    reducedMotion.addEventListener('change', sync);
    return () => { cancelAnimationFrame(animation); observer.disconnect(); document.removeEventListener('visibilitychange', sync); reducedMotion.removeEventListener('change', sync); };
  }, [running, seed]);

  return <canvas ref={canvasRef} className="studio-denoising" aria-hidden="true" />;
}

export function GenerationCanvas({ images, request, animating, onOpen, onDownload, onReuse, downloading, layout, onLayout, selectedId, onSelect, onLibrary }: {
  images: StudioImage[]; request: StudioSettings | null; animating: boolean;
  onOpen: (image: StudioImage) => void; onDownload: (image: StudioImage) => void; onReuse: (image: StudioImage) => void; downloading: boolean;
  layout: 'image' | 'grid'; onLayout: (layout: 'image' | 'grid') => void;
  onLibrary: () => void;
  selectedId: string | null; onSelect: (id: string | null) => void;
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
    <DenoisingSimulation running={running} seed={index} />
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
      </button> : <span className="sr-only">No images generated yet.</span>}
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
    {images.length > 0 && <p className="studio-session-note">Recent creations stay here. <button className="studio-text-button" onClick={onLibrary}>Browse all saved images<ArrowRight aria-hidden="true" /></button></p>}
  </section>;
}
