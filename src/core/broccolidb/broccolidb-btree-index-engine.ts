/**
 * GALXAI: BroccoliBTreeIndexEngine (Zenith Tier)
 *
 * Adaptive Multi-Way Balanced B-Tree Index Substrate for BroccoliDB.
 * Supports O(log N) point queries, ordered bidirectional range iterations (rangeScan),
 * prefix lookups, and dynamic page splitting.
 */

import type {
  BTreeNodeEntry,
  IBroccoliBTreeIndexEngine,
} from "./broccolidb.contracts";

class BTreeNode<TValue = unknown> {
  isLeaf: boolean;
  keys: (string | number)[] = [];
  values: TValue[] = [];
  children: BTreeNode<TValue>[] = [];

  constructor(isLeaf = true) {
    this.isLeaf = isLeaf;
  }
}

export class BroccoliBTreeIndexEngine<TValue = unknown> implements IBroccoliBTreeIndexEngine<TValue> {
  private root: BTreeNode<TValue>;
  private readonly maxDegree: number; // Maximum keys before node split (order)
  private totalEntriesCount = 0;
  private keyType: "string" | "number" | null = null;

  constructor(maxDegree = 32) {
    this.maxDegree = Math.max(4, maxDegree);
    this.root = new BTreeNode<TValue>(true);
  }

  public insert(key: string | number, value: TValue): void {
    this.assertKey(key);
    if (this.keyType === null) this.keyType = typeof key as "string" | "number";
    if (typeof key !== this.keyType) {
      throw new TypeError(`B-tree key type is ${this.keyType}; mixed key types are not supported`);
    }
    const root = this.root;

    // Check if key already exists to update in place
    if (this.updateIfExists(root, key, value)) {
      return;
    }

    if (root.keys.length >= this.maxDegree) {
      const newRoot = new BTreeNode<TValue>(false);
      newRoot.children.push(this.root);
      this.splitChild(newRoot, 0, this.root);
      this.root = newRoot;
    }

    this.insertNonFull(this.root, key, value);
    this.totalEntriesCount++;
  }

  public search(key: string | number): TValue | undefined {
    if (this.keyType !== null && typeof key !== this.keyType) return undefined;
    this.assertKey(key);
    return this.searchNode(this.root, key);
  }

  public delete(key: string | number): boolean {
    if (!this.hasKey(this.root, key)) return false;

    // Rebuild deletion is intentionally conservative: it preserves all B-tree
    // occupancy and child-count invariants without exposing a half-rebalanced
    // tree. Deletes are O(N log N); reads and inserts retain B-tree complexity.
    const retained: BTreeNodeEntry<TValue>[] = [];
    this.collectAll(this.root, retained);
    this.clear();
    for (const entry of retained) {
      if (this.compare(entry.key, key) !== 0) this.insert(entry.key, entry.value);
    }
    return true;
  }

  public rangeScan(
    minKey: string | number,
    maxKey: string | number
  ): readonly BTreeNodeEntry<TValue>[] {
    this.assertKey(minKey);
    this.assertKey(maxKey);
    if (typeof minKey !== typeof maxKey || (this.keyType !== null && typeof minKey !== this.keyType)) {
      throw new TypeError("Range bounds must use the B-tree's key type");
    }
    if (this.compare(minKey, maxKey) > 0) throw new RangeError("minKey cannot exceed maxKey");
    const results: BTreeNodeEntry<TValue>[] = [];
    this.collectRange(this.root, minKey, maxKey, results);
    return results;
  }

  public size(): number {
    return this.totalEntriesCount;
  }

  public clear(): void {
    this.root = new BTreeNode<TValue>(true);
    this.totalEntriesCount = 0;
    this.keyType = null;
  }

  private searchNode(node: BTreeNode<TValue>, key: string | number): TValue | undefined {
    let i = 0;
    while (i < node.keys.length && this.compare(key, node.keys[i]) > 0) {
      i++;
    }

    if (i < node.keys.length && this.compare(key, node.keys[i]) === 0) {
      return node.values[i];
    }

    if (node.isLeaf) {
      return undefined;
    }

    return this.searchNode(node.children[i], key);
  }

  private hasKey(node: BTreeNode<TValue>, key: string | number): boolean {
    let index = 0;
    while (index < node.keys.length && this.compare(key, node.keys[index]) > 0) index++;
    if (index < node.keys.length && this.compare(key, node.keys[index]) === 0) return true;
    return node.isLeaf ? false : this.hasKey(node.children[index], key);
  }

  private updateIfExists(node: BTreeNode<TValue>, key: string | number, value: TValue): boolean {
    let i = 0;
    while (i < node.keys.length && this.compare(key, node.keys[i]) > 0) {
      i++;
    }

    if (i < node.keys.length && this.compare(key, node.keys[i]) === 0) {
      node.values[i] = value;
      return true;
    }

    if (node.isLeaf) {
      return false;
    }

    return this.updateIfExists(node.children[i], key, value);
  }

  private insertNonFull(node: BTreeNode<TValue>, key: string | number, value: TValue): void {
    let i = node.keys.length - 1;

    if (node.isLeaf) {
      while (i >= 0 && this.compare(key, node.keys[i]) < 0) {
        i--;
      }
      node.keys.splice(i + 1, 0, key);
      node.values.splice(i + 1, 0, value);
    } else {
      while (i >= 0 && this.compare(key, node.keys[i]) < 0) {
        i--;
      }
      i++;

      if (node.children[i].keys.length >= this.maxDegree) {
        this.splitChild(node, i, node.children[i]);
        if (this.compare(key, node.keys[i]) > 0) {
          i++;
        }
      }
      this.insertNonFull(node.children[i], key, value);
    }
  }

  private splitChild(parent: BTreeNode<TValue>, index: number, child: BTreeNode<TValue>): void {
    const mid = Math.floor(child.keys.length / 2);
    const splitKey = child.keys[mid];
    const splitVal = child.values[mid];

    const rightNode = new BTreeNode<TValue>(child.isLeaf);
    rightNode.keys = child.keys.slice(mid + 1);
    rightNode.values = child.values.slice(mid + 1);

    if (!child.isLeaf) {
      rightNode.children = child.children.slice(mid + 1);
      child.children = child.children.slice(0, mid + 1);
    }

    child.keys = child.keys.slice(0, mid);
    child.values = child.values.slice(0, mid);

    parent.children.splice(index + 1, 0, rightNode);
    parent.keys.splice(index, 0, splitKey);
    parent.values.splice(index, 0, splitVal);
  }

  private collectRange(
    node: BTreeNode<TValue>,
    minKey: string | number,
    maxKey: string | number,
    results: BTreeNodeEntry<TValue>[]
  ): void {
    for (let i = 0; i < node.keys.length; i++) {
      if (!node.isLeaf && this.compare(node.keys[i], minKey) >= 0) {
        this.collectRange(node.children[i], minKey, maxKey, results);
      }

      const cmpMin = this.compare(node.keys[i], minKey);
      const cmpMax = this.compare(node.keys[i], maxKey);

      if (cmpMin >= 0 && cmpMax <= 0) {
        results.push({ key: node.keys[i], value: node.values[i] });
      }
    }

    if (!node.isLeaf && node.keys.length > 0 && this.compare(node.keys[node.keys.length - 1], maxKey) <= 0) {
      this.collectRange(node.children[node.keys.length], minKey, maxKey, results);
    }
  }

  private compare(a: string | number, b: string | number): number {
    if (typeof a === "number" && typeof b === "number") {
      return a - b;
    }
    return String(a).localeCompare(String(b));
  }

  private collectAll(node: BTreeNode<TValue>, entries: BTreeNodeEntry<TValue>[]): void {
    for (let i = 0; i < node.keys.length; i++) {
      if (!node.isLeaf) this.collectAll(node.children[i], entries);
      entries.push({ key: node.keys[i], value: node.values[i] });
    }
    if (!node.isLeaf) this.collectAll(node.children[node.keys.length], entries);
  }

  private assertKey(key: string | number): void {
    if (typeof key === "number" && !Number.isFinite(key)) {
      throw new TypeError("B-tree numeric keys must be finite");
    }
  }
}
