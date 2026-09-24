export const DESKTOP_PROFILES = {
  'one-desktop': { maxDesktops: 1, maxRunning: 1, hostVcpus: 4, hostMemoryGiB: 8, hostDiskGiB: 160, digitalOceanSize: 's-4vcpu-8gb-amd' },
  'three-desktop': { maxDesktops: 3, maxRunning: 3, hostVcpus: 8, hostMemoryGiB: 16, hostDiskGiB: 320, digitalOceanSize: 's-8vcpu-16gb-amd' },
} as const;

export type DesktopProfile = keyof typeof DESKTOP_PROFILES;
export type DesktopCapacity = { profile: DesktopProfile; maxDesktops: number; maxRunning: number };

export function parseDesktopProfile(value: unknown): DesktopProfile {
  if (typeof value !== 'string' || !Object.hasOwn(DESKTOP_PROFILES, value)) throw Error('Invalid desktop profile.');
  return value as DesktopProfile;
}

/** Resolve host-selected capacity into limits the monitor is allowed to use. */
export function resolveDesktopCapacity(profile: unknown, supplied?: unknown): DesktopCapacity {
  const name = parseDesktopProfile(profile);
  const selected = DESKTOP_PROFILES[name];
  if (supplied !== undefined) {
    if (!supplied || typeof supplied !== 'object') throw Error('Invalid desktop capacity.');
    const limits = supplied as Record<string, unknown>;
    if (limits.maxDesktops !== selected.maxDesktops || limits.maxRunning !== selected.maxRunning) throw Error('Desktop capacity does not match its profile.');
  }
  return { profile: name, maxDesktops: selected.maxDesktops, maxRunning: selected.maxRunning };
}
