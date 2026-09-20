import { NextRequest } from 'next/server';
import { handleExploreHideMutation } from '@/lib/images/explore-hide';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/images/moderate
 *
 * Compatibility path for the Explore card action. Despite the historical
 * route name, this is now a private account preference: it can hide or undo a
 * creation only for the signed-in viewer and never changes creator visibility.
 */
export async function POST(req: NextRequest) {
  return handleExploreHideMutation(req);
}
