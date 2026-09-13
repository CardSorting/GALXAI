'use client';

import Image from 'next/image';
import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import type { StudioImage } from './studio-contract';

export function StudioArtwork({ image, large = false, reveal = false }: { image: StudioImage; large?: boolean; reveal?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return failed ? <div className="studio-image-fallback"><ImageIcon aria-hidden="true" /><span>Preview unavailable</span><span>You can still try downloading this image.</span></div>
    : <Image src={!large && image.thumbnailUrl ? image.thumbnailUrl : image.url} alt={image.prompt.slice(0, 200) || 'Generated image'} fill unoptimized sizes={large ? '90vw' : '160px'}
      onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
      className={`studio-artwork${reveal && loaded ? ' studio-artwork-reveal' : ''}`} />;
}
