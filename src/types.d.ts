export {};

declare global {
  interface D1Result<T = unknown> {
    results?: T[];
  }

  interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run<T = unknown>(): Promise<T>;
  }

  interface D1Database {
    prepare(query: string): D1PreparedStatement;
  }

  interface R2HTTPMetadata {
    contentType?: string;
  }

  interface R2Object {
    body: ReadableStream | null;
    size: number;
    httpMetadata?: R2HTTPMetadata;
  }

  interface R2PutOptions {
    httpMetadata?: R2HTTPMetadata;
  }

  interface R2Bucket {
    put(
      key: string,
      value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
      options?: R2PutOptions
    ): Promise<void>;
    get(key: string): Promise<R2Object | null>;
  }

  interface ExecutionContext {
    waitUntil(promise: Promise<unknown>): void;
    passThroughOnException(): void;
  }
}
