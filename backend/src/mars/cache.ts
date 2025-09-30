/**
 * Mars Data Cache - 智能缓存管理器
 * 多层缓存架构：内存 → KV → API 调用
 */

import type { CacheEntry, MarsCacheKeys } from './types';

export class MarsDataCache {
  private memoryCache: Map<string, any> = new Map();

  // Mars 专用缓存键
  static readonly CACHE_KEYS: MarsCacheKeys = {
    JUPITER_RATES: 'mars:jupiter:rates',
    KAMINO_MARKETS: 'mars:kamino:markets',
    STRATEGIES: 'mars:strategies',
    USER_POSITIONS: 'mars:positions:user',
    OPTIMIZATION: 'mars:optimization:result',
    WITHDRAW_PATHS: 'mars:withdraw:paths',
    FEES_ESTIMATE: 'mars:fees:estimate'
  };

  // TTL 配置 (秒)
  static readonly TTL = {
    JUPITER_RATES: 300,      // 5分钟
    KAMINO_MARKETS: 600,     // 10分钟  
    STRATEGIES: 1800,        // 30分钟
    USER_POSITIONS: 60,      // 1分钟
    OPTIMIZATION: 120,       // 2分钟
    WITHDRAW_PATHS: 900,     // 15分钟
    FEES_ESTIMATE: 180       // 3分钟
  };

  constructor(
    private kvStore: any, // 使用 any 避免类型问题
    private defaultTTL: number = 300
  ) {}

  /**
   * 获取或获取数据 - 三层缓存策略
   * 1. 内存缓存 (最快)
   * 2. KV 存储 (中等)
   * 3. API 调用 (最慢)
   */
  async getOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds: number = this.defaultTTL
  ): Promise<T> {
    try {
      // 1. 检查内存缓存
      const memoryValue = this.memoryCache.get(key);
      if (memoryValue && this.isValid(memoryValue)) {
        console.log(`Cache HIT (memory): ${key}`);
        return memoryValue.data;
      }

      // 2. 检查 KV 缓存
      const kvValue = await this.kvStore.get(key);
      if (kvValue) {
        const parsed = JSON.parse(kvValue) as CacheEntry<T>;
        if (this.isValid(parsed)) {
          console.log(`Cache HIT (KV): ${key}`);
          // 更新内存缓存
          this.memoryCache.set(key, parsed);
          return parsed.data;
        }
      }

      // 3. 执行 API 调用
      console.log(`Cache MISS: ${key} - fetching fresh data`);
      const freshData = await fetchFn();
      
      // 缓存新数据
      await this.set(key, freshData, ttlSeconds);
      
      return freshData;

    } catch (error) {
      console.error(`Cache error for key ${key}:`, error);
      
      // 降级策略：尝试返回过期缓存
      const staleData = await this.getStale<T>(key);
      if (staleData) {
        console.warn(`Returning stale data for key: ${key}`);
        return staleData;
      }
      
      throw error;
    }
  }

  /**
   * 设置缓存数据
   */
  async set<T>(key: string, data: T, ttlSeconds: number = this.defaultTTL): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    };

    // 同时更新内存和 KV
    this.memoryCache.set(key, entry);
    await this.kvStore.put(key, JSON.stringify(entry), {
      expirationTtl: ttlSeconds
    });

    console.log(`Cached data for key: ${key} (TTL: ${ttlSeconds}s)`);
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);
    await this.kvStore.delete(key);
    console.log(`Deleted cache for key: ${key}`);
  }

  /**
   * 清空特定前缀的缓存
   */
  async clearPrefix(prefix: string): Promise<void> {
    // 清除内存缓存
    for (const [key] of this.memoryCache) {
      if (key.startsWith(prefix)) {
        this.memoryCache.delete(key);
      }
    }

    // 清除 KV 缓存 (需要列举并删除)
    const { keys } = await this.kvStore.list({ prefix });
    for (const key of keys) {
      await this.kvStore.delete(key.name);
    }

    console.log(`Cleared cache with prefix: ${prefix}`);
  }

  /**
   * 检查缓存是否有效
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * 获取过期缓存 (降级策略)
   */
  private async getStale<T>(key: string): Promise<T | null> {
    try {
      const kvValue = await this.kvStore.get(key);
      if (kvValue) {
        const parsed = JSON.parse(kvValue) as CacheEntry<T>;
        return parsed.data;
      }
    } catch (error) {
      console.error(`Failed to get stale data for key ${key}:`, error);
    }
    return null;
  }

  /**
   * 批量预热缓存
   */
  async warmUp(operations: Array<{
    key: string;
    fetchFn: () => Promise<any>;
    ttl?: number;
  }>): Promise<void> {
    console.log(`Cache warm-up started: ${operations.length} operations`);
    
    const promises = operations.map(async ({ key, fetchFn, ttl }) => {
      try {
        await this.getOrFetch(key, fetchFn, ttl);
      } catch (error) {
        console.error(`Warm-up failed for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
    console.log('Cache warm-up completed');
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    return {
      memorySize: this.memoryCache.size,
      memoryKeys: Array.from(this.memoryCache.keys()),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 创建用户专用缓存键
   */
  static userKey(baseKey: string, userAddress: string): string {
    return `${baseKey}:${userAddress}`;
  }

  /**
   * 创建资产专用缓存键
   */
  static assetKey(baseKey: string, asset: string): string {
    return `${baseKey}:${asset.toLowerCase()}`;
  }

  /**
   * 创建组合缓存键
   */
  static compositeKey(baseKey: string, ...parts: string[]): string {
    return `${baseKey}:${parts.join(':')}`;
  }
}

/**
 * 缓存装饰器 - 自动缓存方法结果
 */
export function cached(ttlSeconds: number = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const cache = this.cache as MarsDataCache;
      if (!cache) {
        return method.apply(this, args);
      }

      const key = `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;
      return cache.getOrFetch(key, () => method.apply(this, args), ttlSeconds);
    };
  };
}