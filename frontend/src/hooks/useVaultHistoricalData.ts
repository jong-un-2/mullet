/**
 * useVaultHistoricalData Hook
 * 获取 Vault 的历史 APY 和 TVL 数据，用于显示趋势图表
 */

import { useState, useEffect, useCallback } from 'react';
import { marsApiService, type VaultHistoricalData } from '../services/marsApiService';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface VaultHistoricalDataResponse {
  vaultAddress: string;
  days: number;
  dataPoints: number;
  historical: VaultHistoricalData[];
}

/**
 * Hook to fetch vault historical APY and TVL data
 */
export const useVaultHistoricalData = (vaultAddress?: string, days: number = 30) => {
  const [state, setState] = useState<ApiState<VaultHistoricalDataResponse>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchHistoricalData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getVaultHistoricalData(vaultAddress, days);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch historical data',
      });
    }
  }, [vaultAddress, days]);

  useEffect(() => {
    fetchHistoricalData();
  }, [fetchHistoricalData]);

  return {
    ...state,
    refetch: fetchHistoricalData,
  };
};
