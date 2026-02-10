// Type declarations for opossum circuit breaker library
declare module "opossum" {
  interface CircuitBreakerOptions {
    timeout?: number;
    errorThresholdPercentage?: number;
    resetTimeout?: number;
    volumeThreshold?: number;
    rollingCountTimeout?: number;
    rollingCountBuckets?: number;
    name?: string;
  }

  interface CircuitBreakerStats {
    failures: number;
    fallbacks: number;
    successes: number;
    rejects: number;
    fires: number;
    timeouts: number;
    cacheHits: number;
    cacheMisses: number;
    semaphoreRejections: number;
    percentiles: Record<string, number>;
    latencyTimes: number[];
    latencyMean: number;
  }

  class CircuitBreaker<T = any> {
    constructor(
      action: (...args: any[]) => Promise<T>,
      options?: CircuitBreakerOptions,
    );

    fire(...args: any[]): Promise<T>;

    opened: boolean;
    closed: boolean;
    halfOpen: boolean;
    stats: CircuitBreakerStats;

    on(event: "success", callback: (result: T) => void): this;
    on(event: "timeout", callback: () => void): this;
    on(event: "reject", callback: () => void): this;
    on(event: "open", callback: () => void): this;
    on(event: "halfOpen", callback: () => void): this;
    on(event: "close", callback: () => void): this;
    on(event: "fallback", callback: (result: T) => void): this;

    fallback(func: (...args: any[]) => T | Promise<T>): this;
  }

  export = CircuitBreaker;
}
