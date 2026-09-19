import { permanentRedirect } from 'next/navigation';

/**
 * Retired public content must not keep its historical claims in route bundles.
 * The destination is intentionally explicit at each call site so a retired
 * route cannot silently become a new product surface.
 */
export function redirectRetiredSurface(destination: string): never {
  permanentRedirect(destination);
}
