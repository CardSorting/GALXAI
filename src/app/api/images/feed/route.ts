import { NextRequest, NextResponse } from 'next/server';
import { executePostgresQuery } from '@/lib/db/postgres';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export interface PublicFeedItem {
  id: string;
  prompt: string;
  aspect_ratio: string;
  dimensions: string;
  public_url: string;
  created_at: string;
  lqip: string | null;
  seed: string | null;
  model: string;
}

const ALLOWED_ASPECT_RATIOS = new Set(['1:1', '16:9', '9:16', '3:2', '4:3', '2:3', '3:4']);

/**
 * GET /api/images/feed
 * Public stream of completed generated images for the masonry feed.
 * Fully compliant with the public information boundary.
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const limitParam = parseInt(searchParams.get('limit') || '24', 10);
    const limit = Math.max(1, Math.min(Number.isFinite(limitParam) ? limitParam : 24, 48));
    const cursor = searchParams.get('cursor');
    const aspectRatio = searchParams.get('aspect_ratio');
    const q = searchParams.get('q')?.trim();

    const conditions: string[] = ["status = 'completed'"];
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by aspect ratio
    if (aspectRatio && ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      conditions.push(`aspect_ratio = $${paramIndex++}`);
      params.push(aspectRatio);
    }

    // Filter by prompt search
    if (q && q.length <= 100) {
      // Escape ILIKE special characters
      const sanitized = q.replace(/[%_\\]/g, '\\$&');
      conditions.push(`prompt ILIKE $${paramIndex++}`);
      params.push(`%${sanitized}%`);
    }

    // Keyset pagination cursor: base64 encoded "timestamp,id"
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf8');
        const [cursorTime, cursorId] = decoded.split(',');
        if (cursorTime && cursorId && !isNaN(Date.parse(cursorTime))) {
          conditions.push(`(created_at, id) < ($${paramIndex++}::timestamptz, $${paramIndex++})`);
          params.push(cursorTime, cursorId);
        }
      } catch {
        // Ignore invalid cursor and fall back to top
      }
    }

    params.push(limit);
    const limitIndex = paramIndex++;

    const query = `
      SELECT
        id,
        prompt,
        aspect_ratio,
        dimensions,
        public_url,
        created_at,
        lqip,
        seed,
        model
      FROM public.user_image_library
      WHERE ${conditions.join(' AND ')}
      ORDER BY created_at DESC, id DESC
      LIMIT $${limitIndex}
    `;

    const result = await executePostgresQuery<PublicFeedItem>(query, params);

    const rows = result?.rows || [];
    let nextCursor: string | null = null;

    if (rows.length === limit) {
      const last = rows[rows.length - 1];
      nextCursor = Buffer.from(`${new Date(last.created_at).toISOString()},${last.id}`).toString('base64');
    }

    let items: PublicFeedItem[] = rows.map(r => ({
      id: r.id,
      prompt: r.prompt,
      aspect_ratio: r.aspect_ratio || '1:1',
      dimensions: r.dimensions || '1024x1024',
      public_url: r.public_url,
      created_at: new Date(r.created_at).toISOString(),
      lqip: r.lqip || null,
      seed: r.seed || null,
      model: r.model || 'openai-gpt-image-latest',
    }));

    // If database has no items yet, provide rich curated showcase items matching the community stream aesthetic
    if (items.length === 0 && !cursor) {
      const SHOWCASE_ITEMS: PublicFeedItem[] = [
        {
          id: 'showcase-cafe-cat',
          prompt: 'An orange tabby cat wearing round glasses and cozy plaid shirt, typing on a laptop at a wooden Starbucks cafe table with a latte, photorealistic 8k',
          aspect_ratio: '1:1',
          dimensions: '1024x1024',
          public_url: '/images/showcase/cafe_cat.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
          lqip: null,
          seed: '48291',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-blonde-elf',
          prompt: 'A celestial blonde horned elf princess with piercing emerald green eyes, golden tiara and cyan gem necklace, anime aesthetic high detail key visual',
          aspect_ratio: '9:16',
          dimensions: '768x1376',
          public_url: '/images/showcase/elf_princess.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
          lqip: null,
          seed: '91823',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-cinematic-sky',
          prompt: 'Cinematic anime visual scene, dramatic sweeping lens flare, rich cloudscapes and glowing horizons, Makoto Shinkai quality emotional lighting',
          aspect_ratio: '16:9',
          dimensions: '1024x576',
          public_url: '/images/showcase/cinematic_sky_16_9.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 40).toISOString(),
          lqip: null,
          seed: '77215',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-shadow-monarch',
          prompt: 'High-impact cinematic manhwa digital rendering, glowing violet and blue aura, sharp specular highlights, dynamic shadow monarch action illustration',
          aspect_ratio: '9:16',
          dimensions: '576x1024',
          public_url: '/images/showcase/shadow_monarch_9_16.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 55).toISOString(),
          lqip: null,
          seed: '63810',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-render-3d',
          prompt: 'A futuristic isometric 3D render, glowing volumetric lighting, glassmorphism textures, Unreal Engine 5 ambient occlusion and neon reflections',
          aspect_ratio: '1:1',
          dimensions: '1024x1024',
          public_url: '/images/showcase/render_3d.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
          lqip: null,
          seed: '51294',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-cyber-akira',
          prompt: 'Meticulously detailed retro-futurist cyberpunk anime illustration, dense line work rendering urban decay and technology, flat cel-shaded colors, dramatic neon shadow contrast',
          aspect_ratio: '16:9',
          dimensions: '1024x576',
          public_url: '/images/showcase/cyber_akira_16_9.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
          lqip: null,
          seed: '34912',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-frieren-fantasy',
          prompt: 'Frieren Fantasy Anime Style: Gentle atmospheric fantasy anime illustration, soft delicate linework, muted cel shading with subtle gradation, hushed melancholic stillness, elf mage fantasy scene',
          aspect_ratio: '1:1',
          dimensions: '1024x1024',
          public_url: '/images/showcase/frieren_fantasy.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 98).toISOString(),
          lqip: null,
          seed: '18204',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-cinematic-portrait',
          prompt: 'A stunning 35mm cinematic photograph, professional editorial portraiture, Rembrandt chiaroscuro lighting, shallow depth of field, sharp detail, rich film grain',
          aspect_ratio: '4:3',
          dimensions: '1024x768',
          public_url: '/images/showcase/cinematic_portrait_4_3.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
          lqip: null,
          seed: '29481',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-fine-art-oil',
          prompt: 'A textured impasto Renaissance oil painting, thick palette knife brushstrokes, golden patina, dramatic Rembrandt lighting, museum fine art masterpiece',
          aspect_ratio: '3:2',
          dimensions: '1024x682',
          public_url: '/images/showcase/fine_art_oil_3_2.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
          lqip: null,
          seed: '99120',
          model: 'openai-gpt-image-latest'
        },
        {
          id: 'showcase-minimal-vector',
          prompt: 'A modern minimalist flat vector illustration poster, clean geometric shapes, sophisticated duotone pastel color palette, sleek graphic design',
          aspect_ratio: '1:1',
          dimensions: '1024x1024',
          public_url: '/images/showcase/minimal_vector.jpg',
          created_at: new Date(Date.now() - 1000 * 60 * 145).toISOString(),
          lqip: null,
          seed: '84019',
          model: 'openai-gpt-image-latest'
        }
      ];

      items = SHOWCASE_ITEMS.filter(it => {
        if (aspectRatio && it.aspect_ratio !== aspectRatio) return false;
        if (q && !it.prompt.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      });
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
  } catch (err: unknown) {
    console.error('Error fetching image feed:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve image stream' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
