/**
 * GALXAI: BroccoliConsistentHashRing (Zenith Tier)
 *
 * Distributed Consistent Hash Ring with Virtual Nodes (vnodes).
 * Ensures uniform partition distribution across the [0, 2^32-1] token space
 * and minimizes data redistribution upon node join/leave events (K/N rebalancing guarantee).
 */

import type {
  HashRingNode,
  IBroccoliConsistentHashRing,
} from "./broccolidb.contracts";

export class BroccoliConsistentHashRing implements IBroccoliConsistentHashRing {
  private readonly vnodesPerNode: number;
  private readonly ring = new Map<number, HashRingNode>(); // token -> node
  private sortedTokens: number[] = [];
  private readonly nodes = new Map<string, HashRingNode>();

  constructor(vnodesPerNode = 128) {
    if (!Number.isSafeInteger(vnodesPerNode) || vnodesPerNode <= 0) {
      throw new RangeError("vnodesPerNode must be a positive integer");
    }
    this.vnodesPerNode = vnodesPerNode;
  }

  public addNode(node: HashRingNode): void {
    if (!node.nodeId.trim()) throw new TypeError("nodeId must be non-empty");
    const weight = node.weight ?? 1.0;
    if (!Number.isFinite(weight) || weight <= 0) throw new RangeError("node weight must be positive");
    if (this.nodes.has(node.nodeId)) this.removeNode(node.nodeId);
    const storedNode: HashRingNode = {
      ...node,
      metadata: node.metadata ? { ...node.metadata } : undefined,
    };
    this.nodes.set(node.nodeId, storedNode);
    const count = Math.max(1, Math.floor(this.vnodesPerNode * weight));

    for (let i = 0; i < count; i++) {
      const vnodeKey = `${node.nodeId}#vnode_${i}`;
      const token = this.hash(vnodeKey);
      this.ring.set(token, storedNode);
    }

    this.rebuildSortedTokens();
  }

  public removeNode(nodeId: string): boolean {
    if (!this.nodes.has(nodeId)) return false;
    this.nodes.delete(nodeId);

    for (const [token, node] of Array.from(this.ring.entries())) {
      if (node.nodeId === nodeId) {
        this.ring.delete(token);
      }
    }

    this.rebuildSortedTokens();
    return true;
  }

  public getNode(key: string): HashRingNode | undefined {
    if (this.sortedTokens.length === 0) return undefined;

    const token = this.hash(key);
    // Binary search for the first token >= key token (clockwise on the ring)
    let low = 0;
    let high = this.sortedTokens.length - 1;

    if (token > this.sortedTokens[high]) {
      // Wrap around ring to token 0
      const node = this.ring.get(this.sortedTokens[0]);
      return node ? this.cloneNode(node) : undefined;
    }

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedTokens[mid] >= token) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    const matchedToken = this.sortedTokens[low];
    const node = this.ring.get(matchedToken);
    return node ? this.cloneNode(node) : undefined;
  }

  public getNodesForKey(key: string, replicaCount = 3): readonly HashRingNode[] {
    if (!Number.isSafeInteger(replicaCount) || replicaCount < 0) {
      throw new RangeError("replicaCount must be a non-negative integer");
    }
    if (replicaCount === 0) return [];
    if (this.nodes.size === 0) return [];
    if (replicaCount >= this.nodes.size) {
      return Array.from(this.nodes.values(), (node) => this.cloneNode(node));
    }

    const token = this.hash(key);
    const matchedNodes: HashRingNode[] = [];
    const seenNodeIds = new Set<string>();

    let idx = this.findTokenIndex(token);

    for (let i = 0; i < this.sortedTokens.length; i++) {
      const ringIdx = (idx + i) % this.sortedTokens.length;
      const node = this.ring.get(this.sortedTokens[ringIdx]);
      if (node && !seenNodeIds.has(node.nodeId)) {
        seenNodeIds.add(node.nodeId);
        matchedNodes.push(this.cloneNode(node));
        if (matchedNodes.length >= replicaCount) {
          break;
        }
      }
    }

    return matchedNodes;
  }

  public getAllNodes(): readonly HashRingNode[] {
    return Array.from(this.nodes.values(), (node) => this.cloneNode(node));
  }

  public getVirtualNodeCount(): number {
    return this.ring.size;
  }

  private findTokenIndex(token: number): number {
    let low = 0;
    let high = this.sortedTokens.length - 1;

    if (token > this.sortedTokens[high]) {
      return 0;
    }

    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedTokens[mid] >= token) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }

    return low;
  }

  private rebuildSortedTokens(): void {
    this.sortedTokens = Array.from(this.ring.keys()).sort((a, b) => a - b);
  }

  /**
   * Murmur-inspired 32-bit integer hash function
   */
  private hash(key: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < key.length; i++) {
      h ^= key.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return h >>> 0; // Unsigned 32-bit integer
  }

  private cloneNode(node: HashRingNode): HashRingNode {
    return { ...node, metadata: node.metadata ? { ...node.metadata } : undefined };
  }
}
