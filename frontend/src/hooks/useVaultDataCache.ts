/**
 * Vault Data Cache
 * 缓存 Vault 数据，避免频繁请求
 * 
 * 缓存策略：
 * - 缓存时效：60 秒
 * - 按用户地址分别缓存
 * - 支持手动刷新
 */

import { useState, useCallback } from 'react';
import { UserVaultPosition } from './useUserVaultPosition';

interface CacheEntry {
  data: UserVaultPosition;
  timestamp: number;
}

// 全局缓存 Map
const cache = new Map<string, CacheEntry>();

// 缓存时效：60 秒
const CACHE_TTL = 60 * 1000;

/**
 * 生成缓存 key
 */
const getCacheKey = (userAddress: string | null): string => {
  return userAddress || 'no-user';
};

/**
 * 检查缓存是否有效
 */
const isCacheValid = (entry: CacheEntry | undefined): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_TTL;
};

/**
 * 获取缓存数据
 */
export const getCachedData = (userAddress: string | null): UserVaultPosition | null => {
  const key = getCacheKey(userAddress);
  const entry = cache.get(key);
  
  if (isCacheValid(entry)) {
    console.log('✅ [Cache] Hit:', key);
    return entry!.data;
  }
  
  console.log('❌ [Cache] Miss:', key);
  return null;
};

/**
 * 设置缓存数据
 */
export const setCachedData = (userAddress: string | null, data: UserVaultPosition): void => {
  const key = getCacheKey(userAddress);
  cache.set(key, {
    data,
    timestamp: Date.now(),
  });
  console.log('💾 [Cache] Set:', key);
};

/**
 * 清除指定用户的缓存
 */
export const clearCache = (userAddress: string | null): void => {
  const key = getCacheKey(userAddress);
  cache.delete(key);
  console.log('🗑️ [Cache] Clear:', key);
};

/**
 * 清除所有缓存
 */
export const clearAllCache = (): void => {
  cache.clear();
  console.log('🗑️ [Cache] Clear all');
};

/**
 * Hook: 使用缓存的 Vault 数据
 */
export const useVaultDataCache = () => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  
  // 手动刷新缓存
  const refresh = useCallback((userAddress: string | null) => {
    clearCache(userAddress);
    setLastUpdate(Date.now());
  }, []);
  
  // 刷新所有缓存
  const refreshAll = useCallback(() => {
    clearAllCache();
    setLastUpdate(Date.now());
  }, []);
  
  return {
    getCachedData,
    setCachedData,
    refresh,
    refreshAll,
    lastUpdate,
  };
};
