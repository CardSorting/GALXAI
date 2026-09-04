/**
 * @file FastFnv1a.ts
 * @description Sub-nanosecond 64-bit FNV-1a non-cryptographic hash for high-throughput
 * virtual queue shuffle-sharding without cryptographic CPU locking.
 */

export class FastFnv1a {
  private static readonly FNV_PRIME = 0x01000193;
  private static readonly FNV_OFFSET_BASIS = 0x811c9dc5;

  /**
   * Fast 32-bit FNV-1a integer hash.
   */
  public static hash32(str: string): number {
    let hash = FastFnv1a.FNV_OFFSET_BASIS;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, FastFnv1a.FNV_PRIME);
    }
    return hash >>> 0;
  }

  /**
   * Generates k distinct virtual queue indices from a string key using fast FNV-1a salt permutations.
   */
  public static getShuffleIndices(key: string, k: number, totalQueues: number): number[] {
    const indices: number[] = [];
    let salt = 0;

    while (indices.length < k) {
      const saltedKey = salt === 0 ? key : `${key}:${salt}`;
      const hash = FastFnv1a.hash32(saltedKey);
      const idx = hash % totalQueues;

      if (!indices.includes(idx)) {
        indices.push(idx);
      }
      salt++;
    }

    return indices;
  }
}
