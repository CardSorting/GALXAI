import { NextRequest, NextResponse } from 'next/server';
import { executePostgresQuery } from '@/lib/db/postgres';
import { GalxCryptoVault } from '@/core/vault/GalxCryptoVault';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface PublicFeedItem {
  id: string;
  prompt: string;
  aspect_ratio: string;
  dimensions: string;
  public_url: string;
  thumbnail_url?: string;
  created_at: string;
  lqip: string | null;
  seed: string | null;
  model: string;
  likes_count?: number;
  remix_count?: number;
  views_count?: number;
  tags?: string[];
}

const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '3:2', '4:3', '2:3', '3:4']);

const SHOWCASE_ITEMS: PublicFeedItem[] = [
  {
    id: 'showcase-cafe-cat',
    prompt: 'An orange tabby cat wearing round glasses and cozy plaid shirt, typing on a laptop at a wooden Starbucks cafe table with a latte, photorealistic 8k',
    aspect_ratio: '1:1',
    dimensions: '1024x1024',
    public_url: '/images/showcase/cafe_cat.jpg',
    thumbnail_url: '/images/showcase/cafe_cat_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    lqip: null,
    seed: '48291',
    model: 'openai-gpt-image-latest',
    likes_count: 384,
    remix_count: 62,
    views_count: 2190,
    tags: ['photorealistic', 'animals']
  },
  {
    id: 'showcase-blonde-elf',
    prompt: 'A celestial blonde horned elf princess with piercing emerald green eyes, golden tiara and cyan gem necklace, anime aesthetic high detail key visual',
    aspect_ratio: '9:16',
    dimensions: '768x1376',
    public_url: '/images/showcase/elf_princess.jpg',
    thumbnail_url: '/images/showcase/elf_princess_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    lqip: null,
    seed: '91823',
    model: 'openai-gpt-image-latest',
    likes_count: 512,
    remix_count: 94,
    views_count: 3410,
    tags: ['anime', 'fantasy']
  },
  {
    id: 'showcase-cinematic-sky',
    prompt: 'Cinematic anime visual scene, dramatic sweeping lens flare, rich cloudscapes and glowing horizons, Makoto Shinkai quality emotional lighting',
    aspect_ratio: '16:9',
    dimensions: '1024x576',
    public_url: '/images/showcase/cinematic_sky_16_9.jpg',
    thumbnail_url: '/images/showcase/cinematic_sky_16_9_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
    lqip: null,
    seed: '77215',
    model: 'openai-gpt-image-latest',
    likes_count: 279,
    remix_count: 41,
    views_count: 1840,
    tags: ['cinematic', 'anime']
  },
  {
    id: 'showcase-shadow-monarch',
    prompt: 'High-impact cinematic manhwa digital rendering, glowing violet and blue aura, sharp specular highlights, dynamic shadow monarch action illustration',
    aspect_ratio: '9:16',
    dimensions: '576x1024',
    public_url: '/images/showcase/shadow_monarch_9_16.jpg',
    thumbnail_url: '/images/showcase/shadow_monarch_9_16_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
    lqip: null,
    seed: '63810',
    model: 'openai-gpt-image-latest',
    likes_count: 420,
    remix_count: 87,
    views_count: 2950,
    tags: ['anime', 'action']
  },
  {
    id: 'showcase-render-3d',
    prompt: 'A futuristic isometric 3D render, glowing volumetric lighting, glassmorphism textures, Unreal Engine 5 ambient occlusion and neon reflections',
    aspect_ratio: '1:1',
    dimensions: '1024x1024',
    public_url: '/images/showcase/render_3d.jpg',
    thumbnail_url: '/images/showcase/render_3d_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    lqip: null,
    seed: '51294',
    model: 'openai-gpt-image-latest',
    likes_count: 195,
    remix_count: 29,
    views_count: 1320,
    tags: ['3d', 'cyberpunk']
  },
  {
    id: 'showcase-cyber-akira',
    prompt: 'Meticulously detailed retro-futurist cyberpunk anime illustration, dense line work rendering urban decay and technology, flat cel-shaded colors, dramatic neon shadow contrast',
    aspect_ratio: '16:9',
    dimensions: '1024x576',
    public_url: '/images/showcase/cyber_akira_16_9.jpg',
    thumbnail_url: '/images/showcase/cyber_akira_16_9_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    lqip: null,
    seed: '34912',
    model: 'openai-gpt-image-latest',
    likes_count: 641,
    remix_count: 112,
    views_count: 4290,
    tags: ['cyberpunk', 'anime']
  },
  {
    id: 'showcase-frieren-fantasy',
    prompt: 'Frieren Fantasy Anime Style: Gentle atmospheric fantasy anime illustration, soft delicate linework, muted cel shading with subtle gradation, hushed melancholic stillness, elf mage fantasy scene',
    aspect_ratio: '1:1',
    dimensions: '1024x1024',
    public_url: '/images/showcase/frieren_fantasy.jpg',
    thumbnail_url: '/images/showcase/frieren_fantasy_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 98).toISOString(),
    lqip: null,
    seed: '18204',
    model: 'openai-gpt-image-latest',
    likes_count: 388,
    remix_count: 53,
    views_count: 2470,
    tags: ['fantasy', 'anime']
  },
  {
    id: 'showcase-cinematic-portrait',
    prompt: 'A stunning 35mm cinematic photograph, professional editorial portraiture, Rembrandt chiaroscuro lighting, shallow depth of field, sharp detail, rich film grain',
    aspect_ratio: '4:3',
    dimensions: '1024x768',
    public_url: '/images/showcase/cinematic_portrait_4_3.jpg',
    thumbnail_url: '/images/showcase/cinematic_portrait_4_3_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
    lqip: null,
    seed: '29481',
    model: 'openai-gpt-image-latest',
    likes_count: 310,
    remix_count: 38,
    views_count: 1980,
    tags: ['photorealistic', 'cinematic']
  },
  {
    id: 'showcase-fine-art-oil',
    prompt: 'A textured impasto Renaissance oil painting, thick palette knife brushstrokes, golden patina, dramatic Rembrandt lighting, museum fine art masterpiece',
    aspect_ratio: '3:2',
    dimensions: '1024x682',
    public_url: '/images/showcase/fine_art_oil_3_2.jpg',
    thumbnail_url: '/images/showcase/fine_art_oil_3_2_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    lqip: null,
    seed: '99120',
    model: 'openai-gpt-image-latest',
    likes_count: 247,
    remix_count: 31,
    views_count: 1620,
    tags: ['fantasy', 'art']
  },
  {
    id: 'showcase-minimal-vector',
    prompt: 'A modern minimalist flat vector illustration poster, clean geometric shapes, sophisticated duotone pastel color palette, sleek graphic design',
    aspect_ratio: '1:1',
    dimensions: '1024x1024',
    public_url: '/images/showcase/minimal_vector.jpg',
    thumbnail_url: '/images/showcase/minimal_vector_thumb.jpg',
    created_at: new Date(Date.now() - 1000 * 60 * 145).toISOString(),
    lqip: null,
    seed: '84019',
    model: 'openai-gpt-image-latest',
    likes_count: 182,
    remix_count: 22,
    views_count: 1190,
    tags: ['minimalist']
  }
];

/**
 * GET /api/images/feed
 * High-concurrency anti-locking public stream of completed generated images.
 * Queries user_image_library joined with HOT user_image_stats.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const limitParam = parseInt(searchParams.get('limit') || '24', 10);
  const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 24, 48));
  const cursor = searchParams.get('cursor');
  const aspectRatio = searchParams.get('aspect_ratio');
  const q = searchParams.get('q')?.trim();
  const sort = searchParams.get('sort') || 'recent';
  const tag = searchParams.get('tag')?.toLowerCase().trim();

  let items: PublicFeedItem[] = [];
  let nextCursor: string | null = null;

  try {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by aspect ratio
    if (aspectRatio && ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      conditions.push(`aspect_ratio = $${paramIndex++}`);
      params.push(aspectRatio);
    }

    // Filter by prompt search
    if (q && q.length <= 100) {
      const sanitized = q.replace(/[%_\\]/g, '\\$&');
      conditions.push(`prompt ILIKE $${paramIndex++}`);
      params.push(`%${sanitized}%`);
    }

    // Filter by style tag
    if (tag && tag !== 'all') {
      const sanitizedTag = tag.replace(/[%_\\]/g, '\\$&');
      conditions.push(`prompt ILIKE $${paramIndex++}`);
      params.push(`%${sanitizedTag}%`);
    }

    // Keyset pagination cursor
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const [cursorTime, cursorId] = decoded.split(',');
        if (cursorTime && cursorId && !isNaN(Date.parse(cursorTime))) {
          conditions.push(`(created_at, id) < ($${paramIndex++}::timestamptz, $${paramIndex++})`);
          params.push(cursorTime, cursorId);
        }
      } catch {
        // Ignore malformed cursor
      }
    }

    params.push(limit);
    const limitIndex = paramIndex++;

    const orderBy = sort === 'trending'
      ? 'likes_count DESC, created_at DESC, id DESC'
      : 'created_at DESC, id DESC';

    const query = `
      SELECT
        id,
        user_id,
        prompt,
        aspect_ratio,
        dimensions,
        public_url,
        created_at,
        lqip,
        seed,
        model,
        likes_count,
        remix_count,
        views_count
      FROM public.community_creations_feed
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT $${limitIndex}
    `;

    const result = await executePostgresQuery<any>(query, params);
    const rows = result?.rows || [];

    if (rows.length === limit) {
      const last = rows[rows.length - 1];
      nextCursor = Buffer.from(`${new Date(last.created_at).toISOString()},${last.id}`).toString('base64');
    }

    items = rows.map((r: any) => {
      let publicUrl = r.public_url;
      let thumbnailUrl = r.public_url;

      if (r.user_id && r.id) {
        try {
          const token = GalxCryptoVault.sealImageDownload(r.user_id, r.id);
          publicUrl = `/v1/images/assets/${token}`;
          thumbnailUrl = `/v1/images/assets/${token}/thumbnail`;
        } catch {
          // Keep original
        }
      }

      return {
        id: r.id,
        prompt: r.prompt,
        aspect_ratio: r.aspect_ratio || '1:1',
        dimensions: r.dimensions || '1024x1024',
        public_url: publicUrl,
        thumbnail_url: thumbnailUrl,
        created_at: new Date(r.created_at).toISOString(),
        lqip: r.lqip || null,
        seed: r.seed || null,
        model: r.model || 'openai-gpt-image-latest',
        likes_count: Number(r.likes_count || 0),
        remix_count: Number(r.remix_count || 0),
        views_count: Number(r.views_count || 0),
      };
    });
  } catch {
    // Database connection or table not yet populated; proceed gracefully to showcase fallback
  }

  // On first page, combine live community creations with curated showcase items
  if (!cursor) {
    let filteredShowcase = SHOWCASE_ITEMS.filter(it => {
      if (aspectRatio && it.aspect_ratio !== aspectRatio) return false;
      if (q && !it.prompt.toLowerCase().includes(q.toLowerCase())) return false;
      if (tag && tag !== 'all') {
        const matchesTag = it.tags?.some(t => t.toLowerCase() === tag) || it.prompt.toLowerCase().includes(tag);
        if (!matchesTag) return false;
      }
      return true;
    });

    if (sort === 'trending') {
      filteredShowcase = [...filteredShowcase].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    }

    const existingPrompts = new Set(items.map(it => it.prompt.trim().toLowerCase()));
    const additionalShowcase = filteredShowcase.filter(it => !existingPrompts.has(it.prompt.trim().toLowerCase()));

    if (sort === 'trending') {
      items = [...items, ...additionalShowcase].sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0));
    } else {
      items = [...items, ...additionalShowcase];
    }
  }

  return NextResponse.json(
    {
      success: true,
      items,
      nextCursor,
      count: items.length,
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59',
      },
    }
  );
}

/**
 * POST /api/images/feed
 * Non-blocking interaction dispatching with HOT-update buffering and ledgering
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, imageId, increment = true, sessionHash: rawHash, imageIds } = body || {};

    const sessionHash = String(
      rawHash ||
      req.headers.get('x-session-id') ||
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      'anon-client'
    ).slice(0, 160);

    if (action === 'like') {
      if (!imageId || typeof imageId !== 'string') {
        return NextResponse.json({ success: false, error: 'Invalid image identifier' }, { status: 400 });
      }

      try {
        const query = `SELECT public.fn_record_image_like($1, $2, $3) AS result;`;
        const result = await executePostgresQuery<{ result: { likes_count: number; is_liked: boolean } }>(query, [
          imageId,
          sessionHash,
          Boolean(increment)
        ]);
        const data = result?.rows?.[0]?.result;
        return NextResponse.json({
          success: true,
          likes: data?.likes_count ?? null,
          isLiked: data?.is_liked ?? Boolean(increment)
        });
      } catch {
        // Fallback for showcase or offline items
        return NextResponse.json({ success: true, likes: null, isLiked: Boolean(increment) });
      }
    }

    if (action === 'view_batch') {
      const ids = Array.isArray(imageIds)
        ? imageIds.filter((id): id is string => typeof id === 'string' && id.length > 0).slice(0, 50)
        : [];

      if (ids.length > 0) {
        try {
          const query = `SELECT public.fn_record_image_view_batch($1, $2) AS count;`;
          await executePostgresQuery(query, [ids, sessionHash]);
        } catch {
          // Ignore offline errors for view telemetry
        }
      }
      return NextResponse.json({ success: true });
    }

    if (action === 'remix') {
      if (imageId && typeof imageId === 'string') {
        try {
          const query = `SELECT public.fn_increment_image_remix($1);`;
          await executePostgresQuery(query, [imageId]);
        } catch {
          // Ignore offline errors for remix telemetry
        }
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Unsupported interaction action' }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false, error: 'Malformed request' }, { status: 400 });
  }
}
