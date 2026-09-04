/**
 * @file RingBufferDeque.ts
 * @description High-performance zero-allocation circular Ring Buffer Deque.
 * Provides true O(1) pushTail, popHead (FIFO), popTail (LIFO), and peek without Array shifts.
 */

export class RingBufferDeque<T> {
  private buffer: (T | undefined)[];
  private head = 0;
  private tail = 0;
  private count = 0;
  private mask: number;
  private readonly maxCapacity: number;

  constructor(initialCapacity = 256, maxCapacity = 65536) {
    let cap = 1;
    while (cap < initialCapacity) cap <<= 1;
    this.buffer = new Array(cap);
    this.mask = cap - 1;
    this.maxCapacity = maxCapacity;
  }

  public get size(): number {
    return this.count;
  }

  public get isEmpty(): boolean {
    return this.count === 0;
  }

  public get isFull(): boolean {
    return this.count >= this.maxCapacity;
  }

  /**
   * Push an item to the back of the queue (tail).
   */
  public pushTail(item: T): boolean {
    if (this.count >= this.maxCapacity) {
      return false; // Saturated
    }

    if (this.count === this.buffer.length) {
      this.grow();
    }

    this.buffer[this.tail] = item;
    this.tail = (this.tail + 1) & this.mask;
    this.count++;
    return true;
  }

  /**
   * FIFO: Pop an item from the front of the queue (head).
   */
  public popHead(): T | undefined {
    if (this.count === 0) return undefined;

    const item = this.buffer[this.head];
    this.buffer[this.head] = undefined; // Avoid memory leaks
    this.head = (this.head + 1) & this.mask;
    this.count--;
    return item;
  }

  /**
   * LIFO (Overload mode): Pop the freshest item from the back of the queue (tail).
   */
  public popTail(): T | undefined {
    if (this.count === 0) return undefined;

    this.tail = (this.tail - 1 + this.buffer.length) & this.mask;
    const item = this.buffer[this.tail];
    this.buffer[this.tail] = undefined;
    this.count--;
    return item;
  }

  public peekHead(): T | undefined {
    if (this.count === 0) return undefined;
    return this.buffer[this.head];
  }

  public peekTail(): T | undefined {
    if (this.count === 0) return undefined;
    const idx = (this.tail - 1 + this.buffer.length) & this.mask;
    return this.buffer[idx];
  }

  public clear(): void {
    this.buffer = new Array(this.buffer.length);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
  }

  private grow(): void {
    const oldCap = this.buffer.length;
    const newCap = Math.min(this.maxCapacity, oldCap << 1);
    if (newCap <= oldCap) return;

    const newBuffer = new Array(newCap);
    for (let i = 0; i < this.count; i++) {
      newBuffer[i] = this.buffer[(this.head + i) & this.mask];
    }

    this.buffer = newBuffer;
    this.head = 0;
    this.tail = this.count;
    this.mask = newCap - 1;
  }
}
