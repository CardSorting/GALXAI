declare module 'ws' {
  import { EventEmitter } from 'events';
  import type { IncomingMessage } from 'node:http';
  import type { Duplex } from 'node:stream';

  export interface ClientOptions {
    headers?: Record<string, string>;
    [key: string]: any;
  }

  export class WebSocket extends EventEmitter {
    constructor(address: string, options?: ClientOptions);
    send(data: any, cb?: (err?: Error) => void): void;
    send(data: any, options: { binary?: boolean }, cb?: (err?: Error) => void): void;
    pause(): void;
    resume(): void;
    close(code?: number, data?: string): void;
    terminate(): void;
    readyState: number;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;
  }

  export class WebSocketServer extends EventEmitter {
    constructor(options: { noServer: boolean; maxPayload?: number; perMessageDeflate?: boolean });
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (socket: WebSocket) => void): void;
    close(callback?: (error?: Error) => void): void;
  }

  export default WebSocket;
}
