declare module 'ws' {
  import { EventEmitter } from 'events';

  export interface ClientOptions {
    headers?: Record<string, string>;
    [key: string]: any;
  }

  export class WebSocket extends EventEmitter {
    constructor(address: string, options?: ClientOptions);
    send(data: any, cb?: (err?: Error) => void): void;
    close(code?: number, data?: string): void;
    terminate(): void;
    readyState: number;
    static readonly CONNECTING: number;
    static readonly OPEN: number;
    static readonly CLOSING: number;
    static readonly CLOSED: number;
  }

  export default WebSocket;
}
