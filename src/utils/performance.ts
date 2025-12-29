/**
 * Performance optimization utilities for Digital Attention Rescue
 */

/**
 * Memory-efficient queue for batch processing
 */
export class BatchQueue<T> {
  private queue: T[] = [];
  private processing = false;
  private readonly batchSize: number;
  private readonly processDelay: number;
  private readonly processor: (items: T[]) => Promise<void>;

  constructor(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 10,
    processDelay: number = 1000
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.processDelay = processDelay;
  }

  /**
   * Add item to queue
   */
  public enqueue(item: T): void {
    this.queue.push(item);
    this.scheduleProcess();
  }

  /**
   * Add multiple items to queue
   */
  public enqueueAll(items: T[]): void {
    this.queue.push(...items);
    this.scheduleProcess();
  }

  /**
   * Schedule batch processing
   */
  private scheduleProcess(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    if (this.queue.length >= this.batchSize) {
      // Process immediately if batch is full
      this.process();
    } else {
      // Delay processing for smaller batches
      setTimeout(() => this.process(), this.processDelay);
    }
  }

  /**
   * Process queued items
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, this.batchSize);
        await this.processor(batch);
      }
    } catch (error) {
      console.error('Batch processing error:', error);
    } finally {
      this.processing = false;
    }
  }

  /**
   * Get current queue size
   */
  public size(): number {
    return this.queue.length;
  }

  /**
   * Clear the queue
   */
  public clear(): void {
    this.queue = [];
  }
}

/**
 * LRU Cache for frequently accessed data
 */
export class LRUCache<K, V> {
  private cache: Map<K, V>;
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get value from cache
   */
  public get(key: K): V | undefined {
    const value = this.cache.get(key);
    
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    
    return value;
  }

  /**
   * Set value in cache
   */
  public set(key: K, value: V): void {
    // Remove if exists to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    
    this.cache.set(key, value);
  }

  /**
   * Check if key exists
   */
  public has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key from cache
   */
  public delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear the cache
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  public size(): number {
    return this.cache.size;
  }
}

/**
 * Lazy loader for deferred initialization
 */
export class LazyLoader<T> {
  private value: T | undefined;
  private initialized = false;
  private initializing = false;
  private readonly factory: () => Promise<T>;
  private waiters: Array<{
    resolve: (value: T) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(factory: () => Promise<T>) {
    this.factory = factory;
  }

  /**
   * Get the value, initializing if necessary
   */
  public async get(): Promise<T> {
    if (this.initialized) {
      return this.value!;
    }

    if (this.initializing) {
      // Wait for initialization to complete
      return new Promise((resolve, reject) => {
        this.waiters.push({ resolve, reject });
      });
    }

    this.initializing = true;

    try {
      this.value = await this.factory();
      this.initialized = true;
      
      // Resolve all waiters
      for (const waiter of this.waiters) {
        waiter.resolve(this.value);
      }
      this.waiters = [];
      
      return this.value;
    } catch (error) {
      this.initializing = false;
      
      // Reject all waiters
      for (const waiter of this.waiters) {
        waiter.reject(error as Error);
      }
      this.waiters = [];
      
      throw error;
    }
  }

  /**
   * Check if initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Reset to uninitialized state
   */
  public reset(): void {
    this.value = undefined;
    this.initialized = false;
    this.initializing = false;
  }
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(maxTokens: number = 10, refillRate: number = 1000) {
    this.maxTokens = maxTokens;
    this.tokens = maxTokens;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire a token
   */
  public tryAcquire(): boolean {
    this.refill();
    
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    
    return false;
  }

  /**
   * Wait until a token is available
   */
  public async acquire(): Promise<void> {
    while (!this.tryAcquire()) {
      await new Promise(resolve => setTimeout(resolve, this.refillRate / this.maxTokens));
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor(elapsed / this.refillRate) * this.maxTokens;
    
    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Get current token count
   */
  public available(): number {
    this.refill();
    return this.tokens;
  }
}

/**
 * Memory usage tracker
 */
export class MemoryTracker {
  private static instance: MemoryTracker;
  private readonly warningThresholdMB: number = 50;

  private constructor() {}

  public static getInstance(): MemoryTracker {
    if (!MemoryTracker.instance) {
      MemoryTracker.instance = new MemoryTracker();
    }
    return MemoryTracker.instance;
  }

  /**
   * Get estimated memory usage
   */
  public async getMemoryUsage(): Promise<{ usedJSHeapSize: number; totalJSHeapSize: number } | null> {
    // performance.memory is only available in Chrome
    const perf = performance as any;
    if (perf.memory) {
      return {
        usedJSHeapSize: perf.memory.usedJSHeapSize,
        totalJSHeapSize: perf.memory.totalJSHeapSize
      };
    }
    return null;
  }

  /**
   * Check if memory usage is high
   */
  public async isMemoryHigh(): Promise<boolean> {
    const usage = await this.getMemoryUsage();
    if (!usage) return false;
    
    const usedMB = usage.usedJSHeapSize / (1024 * 1024);
    return usedMB > this.warningThresholdMB;
  }

  /**
   * Suggest garbage collection (for debugging)
   */
  public async suggestGC(): Promise<void> {
    // Cannot force GC in browser, but can null out references
    console.log('Memory cleanup suggested');
  }
}

// Export singleton instance
export const memoryTracker = MemoryTracker.getInstance();

/**
 * Efficient string builder for large content
 */
export class StringBuilder {
  private parts: string[] = [];

  public append(str: string): this {
    this.parts.push(str);
    return this;
  }

  public appendLine(str: string = ''): this {
    this.parts.push(str + '\n');
    return this;
  }

  public toString(): string {
    return this.parts.join('');
  }

  public clear(): void {
    this.parts = [];
  }

  public get length(): number {
    return this.parts.reduce((sum, part) => sum + part.length, 0);
  }
}
