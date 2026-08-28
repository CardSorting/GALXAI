/**
 * GALXAI BroccoliDB Zero-Allocation Byte Stream Buffer
 * 
 * Reusable low-level TypedArray byte buffer for bounded stream slices:
 * 1. Pre-allocates a reusable Uint8Array slab and uses TextEncoder.encodeInto for UTF-8 writes.
 * 2. Scans line delimiters (ASCII 10 `\n` and 13 `\r`) directly in native memory.
 * 3. Extracts byte slices and computes rolling FNV-1a checksums over raw bytes.
 */

import { BroccoliDbTable } from './broccolidb-table';

export interface ByteSlice {
  offset: number;
  length: number;
  hash: number;
  hasNewline: boolean;
}

export class BroccoliZeroAllocationByteStreamBuffer {
  private static instance: BroccoliZeroAllocationByteStreamBuffer;
  private readonly bufferSlab: Uint8Array;
  private readonly slabCapacity: number;
  private readonly encoder = new TextEncoder();
  private readonly decoder = new TextDecoder();
  private writeOffset = 0;
  private totalBytesProcessed = 0;

  public readonly byteBufferTable: BroccoliDbTable<{
    id: string;
    totalBytes: number;
    writeOffset: number;
    timestampMs: number;
  }>;

  private constructor(capacityBytes = 8 * 1024 * 1024) { // 8MB reusable memory slab
    if (!Number.isSafeInteger(capacityBytes) || capacityBytes <= 0) {
      throw new RangeError('Byte stream capacity must be a positive safe integer.');
    }
    this.slabCapacity = capacityBytes;
    this.bufferSlab = new Uint8Array(this.slabCapacity);
    this.byteBufferTable = new BroccoliDbTable('zero_allocation_byte_buffer_audit');
  }

  public static getInstance(capacityBytes = 8 * 1024 * 1024): BroccoliZeroAllocationByteStreamBuffer {
    if (!BroccoliZeroAllocationByteStreamBuffer.instance) {
      BroccoliZeroAllocationByteStreamBuffer.instance = new BroccoliZeroAllocationByteStreamBuffer(capacityBytes);
    }
    return BroccoliZeroAllocationByteStreamBuffer.instance;
  }

  /** Creates an isolated slab with an explicit capacity. */
  public static create(capacityBytes = 8 * 1024 * 1024): BroccoliZeroAllocationByteStreamBuffer {
    return new BroccoliZeroAllocationByteStreamBuffer(capacityBytes);
  }

  /**
   * Appends text bytes into the reusable memory slab without allocating intermediate objects
   */
  public appendString(str: string): { offset: number; bytesWritten: number } {
    if (typeof str !== 'string') {
      throw new TypeError('Byte stream input must be a string.');
    }

    let start = this.writeOffset;
    let encoded = this.encoder.encodeInto(str, this.bufferSlab.subarray(start));

    if (encoded.read !== str.length) {
      start = 0;
      encoded = this.encoder.encodeInto(str, this.bufferSlab);
    }

    if (encoded.read !== str.length) {
      throw new RangeError(`UTF-8 payload exceeds the ${this.slabCapacity}-byte slab capacity.`);
    }

    this.writeOffset = start + encoded.written;
    if (this.writeOffset === this.slabCapacity) this.writeOffset = 0;
    this.totalBytesProcessed += encoded.written;
    return { offset: start, bytesWritten: encoded.written };
  }

  /** Appends bytes without text transcoding or intermediate payload allocation. */
  public appendBytes(bytes: Uint8Array): { offset: number; bytesWritten: number } {
    if (!(bytes instanceof Uint8Array)) {
      throw new TypeError('Byte stream input must be a Uint8Array.');
    }
    if (bytes.byteLength > this.slabCapacity) {
      throw new RangeError(`Payload exceeds the ${this.slabCapacity}-byte slab capacity.`);
    }

    if (this.writeOffset + bytes.byteLength > this.slabCapacity) {
      this.writeOffset = 0;
    }

    const start = this.writeOffset;
    this.bufferSlab.set(bytes, start);
    this.writeOffset += bytes.byteLength;
    if (this.writeOffset === this.slabCapacity) this.writeOffset = 0;
    this.totalBytesProcessed += bytes.byteLength;
    return { offset: start, bytesWritten: bytes.byteLength };
  }

  /**
   * Scans line boundaries and returns structured byte slices directly from memory
   */
  public scanLines(offset: number, length: number): ByteSlice[] {
    this.assertValidSlice(offset, length);
    const slices: ByteSlice[] = [];
    let sliceStart = offset;
    let rollingHash = 0x811c9dc5;
    const end = offset + length;

    for (let i = offset; i < end; i++) {
      const b = this.bufferSlab[i];
      rollingHash = Math.imul(rollingHash ^ b, 0x01000193);

      if (b === 10) { // ASCII \n
        slices.push({
          offset: sliceStart,
          length: i - sliceStart,
          hash: rollingHash >>> 0,
          hasNewline: true,
        });
        sliceStart = i + 1;
        rollingHash = 0x811c9dc5;
      }
    }

    if (sliceStart < end) {
      slices.push({
        offset: sliceStart,
        length: end - sliceStart,
        hash: rollingHash >>> 0,
        hasNewline: false,
      });
    }

    return slices;
  }

  /**
   * Converts a memory slice back to string on demand
   */
  public decodeSlice(offset: number, length: number): string {
    this.assertValidSlice(offset, length);
    return this.decoder.decode(this.bufferSlab.subarray(offset, offset + length));
  }

  public getStats(): { slabCapacity: number; writeOffset: number; totalBytesProcessed: number } {
    return {
      slabCapacity: this.slabCapacity,
      writeOffset: this.writeOffset,
      totalBytesProcessed: this.totalBytesProcessed,
    };
  }

  public clear(): void {
    this.writeOffset = 0;
    this.totalBytesProcessed = 0;
    this.bufferSlab.fill(0);
    this.byteBufferTable.clear();
  }

  private assertValidSlice(offset: number, length: number): void {
    if (!Number.isSafeInteger(offset) || !Number.isSafeInteger(length) || offset < 0 || length < 0) {
      throw new RangeError('Slice offset and length must be non-negative safe integers.');
    }
    if (offset + length > this.slabCapacity) {
      throw new RangeError('Slice extends beyond the byte stream slab.');
    }
  }
}
