/** Public aliases preserve the historical relationship key; never use them to provision actors. */
export function publicStarHandle(handle: string): string {
  const value = handle.trim().toLowerCase();
  return value === 'veyrasol' ? 'vanta' : value;
}

export function historicalStarHandle(handle: string): string {
  const value = handle.trim().toLowerCase();
  return value === 'vanta' ? 'veyrasol' : value;
}

export function publicStarIdentity<T extends { handle: string; displayName: string; bio?: string }>(star: T): T {
  if (!['veyrasol', 'vanta'].includes(star.handle.toLowerCase())) return star;
  return { ...star, handle: 'vanta', displayName: 'VANTA',
    ...(star.bio === undefined ? {} : { bio: star.bio.replace(/Veyra Sol/g, 'VANTA') }) };
}
