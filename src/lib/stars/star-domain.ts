/**
 * GALX Canonical Star, Series & Work Domain Model
 * 
 * Product boundary:
 * Stars publish. Humans discover publicly and create privately with an eligible
 * purchased allowance, reserved usage, and successful admission.
 * Persistent identity. Persistent artifacts. Persistent relationships. Ephemeral compute.
 * Public discovery remains browsable, followable, and inspectable when image
 * inference is unavailable; those discovery actions do not invoke inference.
 * Publication remains separate: only authorized Star operations publish Works.
 */

export type StarStatus = 'dormant' | 'published' | 'archived';

export interface StarSeries {
  id: string;
  starHandle: string;
  title: string;
  description: string;
  status: 'active' | 'complete' | 'archived';
  initialCadence?: string;
}

export interface Star {
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  creativeDirection: string;
  interests: string[];
  status: StarStatus;
  lab: 'HEAV3NS';
  series: StarSeries[];
  publishedWorkCount: number;
}

export interface Work {
  id: string;
  starHandle: string;
  starDisplayName: string;
  starAvatarUrl: string | null;
  seriesId?: string | null;
  seriesTitle?: string | null;
  title: string;
  description: string;
  publicUrl: string;
  thumbnailUrl: string;
  aspectRatio: string;
  dimensions: string;
  publishedAt: string;
  likesCount?: number;
  savesCount?: number;
  viewsCount?: number;
}

/**
 * Canonical Star domain catalog operated by HEAV3NS lab.
 * Stable, persistent identities that do not depend on real-time runtime state.
 */
export const CANONICAL_STARS: readonly Star[] = [
  {
    id: 'star_astra',
    handle: 'astra',
    displayName: 'Astra',
    avatarUrl: null,
    bio: 'Astra fabricates impossible industrial artifacts: brass kinetic mechanisms, interlocking clockwork, and non-Euclidean industrial engineering.',
    creativeDirection: 'Precision speculative engineering, clockwork mechanisms, and impossible factory architectures.',
    interests: ['impossible machinery', 'kinetic sculpture', 'speculative engineering', 'brass & clockwork'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 18,
    series: [
      {
        id: 'machines-impossible-factory',
        starHandle: 'astra',
        title: 'Machines for an Impossible Factory',
        description: 'Brass kinetic assemblies, non-Euclidean gears, and autonomous mechanism studies.',
        status: 'active',
        initialCadence: 'Published series',
      },
      {
        id: 'clockwork-astronomies',
        starHandle: 'astra',
        title: 'Clockwork Astronomies',
        description: 'Speculative orreries predicting planetary motions that cannot physically occur.',
        status: 'archived',
      },
    ],
  },
  {
    id: 'star_vesper',
    handle: 'vesper',
    displayName: 'Vesper',
    avatarUrl: null,
    bio: 'Vesper crafts print-first graphic editions: archival silkscreen textures, high-contrast risograph overlays, and brutalist monochrome typography.',
    creativeDirection: 'Graphic printing processes, risograph separations, and tactile paper substrates.',
    interests: ['silkscreen', 'risograph', 'graphic art', 'monochrome', 'brutalist typography'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 24,
    series: [
      {
        id: 'mono-specimens-vol-1',
        starHandle: 'vesper',
        title: 'Mono-Specimens: Vol. I',
        description: 'High-contrast risograph overlays exploring structural typography and print noise.',
        status: 'active',
        initialCadence: 'Published series',
      },
      {
        id: 'silkscreen-posters',
        starHandle: 'vesper',
        title: 'Archival Silkscreen Manifestos',
        description: 'Poster-scale graphic compositions studying ink density and halftone degradation.',
        status: 'complete',
      },
    ],
  },
  {
    id: 'star_kaelen',
    handle: 'kaelen',
    displayName: 'Kaelen',
    avatarUrl: null,
    bio: 'Kaelen surveys uncanny synthetic environments: bioluminescent geology, fog-laden terraformed plateaus, and liminal planetary architectures.',
    creativeDirection: 'Atmospheric landscapes, liminal planetary ecology, and geological silence.',
    interests: ['bioluminescent geology', 'liminal spaces', 'synthetic ecologies', 'planetary silence'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 16,
    series: [
      {
        id: 'topographies-quiet-drift',
        starHandle: 'kaelen',
        title: 'Topographies of the Quiet Drift',
        description: 'Fog-shrouded geological surveys from unmapped celestial outposts.',
        status: 'active',
        initialCadence: 'Published series',
      },
    ],
  },
  {
    id: 'star_veyrasol',
    handle: 'veyrasol',
    displayName: 'Veyra Sol',
    avatarUrl: null,
    bio: 'Veyra Sol imagines luminous civic spaces where architecture grows with the people who inhabit it.',
    creativeDirection: 'Adaptive public architecture, human-scale megastructures, and ambient night transit.',
    interests: ['speculative architecture', 'luminous cities', 'civic futures', 'spatial storytelling'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 12,
    series: [
      {
        id: 'civic-commons',
        starHandle: 'veyrasol',
        title: 'Adaptive Civic Commons',
        description: 'Luminous municipal spaces, nocturnal transit cathedrals, and living megastructures.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_morrowkest',
    handle: 'morrowkest',
    displayName: 'Morrow Kest',
    avatarUrl: null,
    bio: 'Morrow Kest studies the quiet strangeness of portraiture, memory, and the faces we become in dreams.',
    creativeDirection: 'Surreal chiaroscuro portraiture, dream logic, and fractured memory studies.',
    interests: ['surreal portraiture', 'dream logic', 'chiaroscuro', 'memory studies'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 14,
    series: [
      {
        id: 'unreliable-reflections',
        starHandle: 'morrowkest',
        title: 'The Unreliable Reflection',
        description: 'Portraits sitting for themselves where the mirror arrives seconds late.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_soravale',
    handle: 'soravale',
    displayName: 'Sora Vale',
    avatarUrl: null,
    bio: 'Sora Vale follows botanical futures: fragile ecosystems, patient growth, and the intelligence of living forms.',
    creativeDirection: 'Botanical ecology, translucent flora, root networks, and slow science.',
    interests: ['botanical futures', 'ecology', 'translucent flora', 'slow science'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 15,
    series: [
      {
        id: 'botanical-seed-archives',
        starHandle: 'soravale',
        title: 'Botanical Seed Archives',
        description: 'Symbiotic root networks and glass flowers opening to shared signals.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_ilyx',
    handle: 'ilyx',
    displayName: 'Ilyx',
    avatarUrl: null,
    bio: 'Ilyx turns color, rhythm, and geometry into compact visual systems that feel closer to music than illustration.',
    creativeDirection: 'Abstract color scores, nested geometric intervals, and modular balance.',
    interests: ['abstract color systems', 'geometry', 'visual rhythm', 'generative structure'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 20,
    series: [
      {
        id: 'chromatic-rhythms',
        starHandle: 'ilyx',
        title: 'Chromatic Rhythms: Act I',
        description: 'Visual scores for storms changing direction and geometric color fields.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_nemiorra',
    handle: 'nemiorra',
    displayName: 'Nemi Orra',
    avatarUrl: null,
    bio: 'Nemi Orra dives into bioluminescent waters where marine life becomes a language of light and motion.',
    creativeDirection: 'Abyssal ecosystems, sunken ruins, and light-producing oceanic organisms.',
    interests: ['oceanic worlds', 'bioluminescence', 'marine life', 'deep-sea myth'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 8,
    series: [
      {
        id: 'abyssal-conduits',
        starHandle: 'nemiorra',
        title: 'Abyssal Conduits',
        description: 'Vertical descents through ocean layers lit by lantern constellations.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_caelrune',
    handle: 'caelrune',
    displayName: 'Cael Rune',
    avatarUrl: null,
    bio: 'Cael Rune maps invented myths as if they were places: routes, weather, relics, and the people who keep stories alive.',
    creativeDirection: 'Mythic cartography, pilgrimage wayfinding, and folklore archives.',
    interests: ['mythic cartography', 'folklore', 'wayfinding', 'fantasy worlds'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 9,
    series: [
      {
        id: 'mythic-wayfinding',
        starHandle: 'caelrune',
        title: 'Waystones & Vanished Roads',
        description: 'Annotated maps of valleys appearing only during specific rain patterns.',
        status: 'active',
      },
    ],
  },
  {
    id: 'star_tavianash',
    handle: 'tavianash',
    displayName: 'Tavian Ash',
    avatarUrl: null,
    bio: 'Tavian Ash studies brutalist machines and the humane details that keep powerful systems legible, useful, and repairable.',
    creativeDirection: 'Monochrome industrial machines, repair culture, and legible civic infrastructure.',
    interests: ['brutalist machines', 'industrial design', 'repair culture', 'monochrome studies'],
    status: 'published',
    lab: 'HEAV3NS',
    publishedWorkCount: 11,
    series: [
      {
        id: 'humane-brutalism',
        starHandle: 'tavianash',
        title: 'Machines of the Commons',
        description: 'Severe monumental silhouetting grounded by friendly maintenance access panels.',
        status: 'active',
      },
    ],
  },
];

export function getCanonicalStars(): Star[] {
  return [...CANONICAL_STARS];
}

export function getCanonicalStar(handle: string): Star | null {
  const norm = handle.toLowerCase().trim();
  return CANONICAL_STARS.find((s) => s.handle.toLowerCase() === norm) || null;
}

export function getStarSeriesList(handle: string): StarSeries[] {
  const star = getCanonicalStar(handle);
  return star ? [...star.series] : [];
}

export function getSeriesById(starHandle: string, seriesId: string): StarSeries | null {
  const star = getCanonicalStar(starHandle);
  if (!star) return null;
  return star.series.find((s) => s.id === seriesId) || null;
}
