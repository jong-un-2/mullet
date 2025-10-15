/**
 * Mars Vault Data Hooks - Reading from Neon PostgreSQL
 * 从 Neon 数据库读取真实的 vault 数据
 */

import { useState, useEffect, useCallback } from 'react';
import { marsApiService, type MarsTransactionHistory, type MarsCalendarData, type MarsUserEarnings, type MarsEarningDetail } from '../services/marsApiService';

// 通用状态管理接口
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/**
 * 从 Neon 数据库获取用户的交易历史
 */
export const useVaultTransactions = (userAddress?: string, vaultAddress?: string) => {
  const [state, setState] = useState<ApiState<{
    transactions: MarsTransactionHistory[];
    total: number;
    page: number;
    limit: number;
  }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchTransactions = useCallback(async () => {
    if (!userAddress) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getVaultTransactions(userAddress, vaultAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vault transactions' 
      });
    }
  }, [userAddress, vaultAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchTransactions();
    }
  }, [fetchTransactions, userAddress]);

  return {
    ...state,
    refetch: fetchTransactions,
  };
};

/**
 * 从 Neon 数据库获取用户的月度收益日历
 */
export const useVaultCalendar = (
  userAddress?: string, 
  year?: number, 
  month?: number,
  vaultAddress?: string
) => {
  const [state, setState] = useState<ApiState<MarsCalendarData>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchCalendarData = useCallback(async () => {
    if (!userAddress || !year || !month) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getVaultCalendar(userAddress, year, month, vaultAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vault calendar' 
      });
    }
  }, [userAddress, year, month, vaultAddress]);

  useEffect(() => {
    if (userAddress && year && month) {
      fetchCalendarData();
    }
  }, [fetchCalendarData, userAddress, year, month]);

  return {
    ...state,
    refetch: fetchCalendarData,
  };
};

/**
 * 从 Neon 数据库获取用户的收益统计
 */
export const useVaultEarnings = (userAddress?: string, vaultAddress?: string) => {
  const [state, setState] = useState<ApiState<MarsUserEarnings>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchEarnings = useCallback(async () => {
    if (!userAddress) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getVaultEarnings(userAddress, vaultAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch vault earnings' 
      });
    }
  }, [userAddress, vaultAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchEarnings();
    }
  }, [fetchEarnings, userAddress]);

  return {
    ...state,
    refetch: fetchEarnings,
  };
};

/**
 * 从 Neon 数据库获取用户的收益明细历史
 */
export const useVaultEarningDetails = (userAddress?: string, vaultAddress?: string) => {
  const [state, setState] = useState<ApiState<{
    earningDetails: MarsEarningDetail[];
    total: number;
    page: number;
    limit: number;
  }>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchEarningDetails = useCallback(async () => {
    if (!userAddress) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getVaultEarningDetails(userAddress, vaultAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch earning details' 
      });
    }
  }, [userAddress, vaultAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchEarningDetails();
    }
  }, [fetchEarningDetails, userAddress]);

  return {
    ...state,
    refetch: fetchEarningDetails,
  };
};
