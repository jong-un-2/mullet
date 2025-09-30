/**
 * Mars Protocol Data Hooks
 * React hooks for fetching Mars protocol data
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  marsApiService, 
  type MarsTvlData, 
  type MarsApyData,
  type MarsUserEarnings,
  type MarsCalendarData,
  type MarsPerformanceData,
  type MarsTransactionHistory
} from '../services/marsApiService';

// 通用状态管理接口
interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// TVL数据hook
export const useMarsTV = () => {
  const [state, setState] = useState<ApiState<MarsTvlData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchTvlData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getTvlData();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch TVL data' 
      });
    }
  }, []);

  useEffect(() => {
    fetchTvlData();
  }, [fetchTvlData]);

  return {
    ...state,
    refetch: fetchTvlData,
  };
};

// APY数据hook
export const useMarsAPY = (asset?: string) => {
  const [state, setState] = useState<ApiState<MarsApyData>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchApyData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getApyData(asset);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch APY data' 
      });
    }
  }, [asset]);

  useEffect(() => {
    fetchApyData();
  }, [fetchApyData]);

  return {
    ...state,
    refetch: fetchApyData,
  };
};

// 用户收益数据hook
export const useMarsUserEarnings = (userAddress?: string) => {
  const [state, setState] = useState<ApiState<MarsUserEarnings>>({
    data: null,
    loading: false,
    error: null,
  });

  const fetchUserEarnings = useCallback(async () => {
    if (!userAddress) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getUserEarnings(userAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch user earnings' 
      });
    }
  }, [userAddress]);

  useEffect(() => {
    if (userAddress) {
      fetchUserEarnings();
    }
  }, [fetchUserEarnings, userAddress]);

  return {
    ...state,
    refetch: fetchUserEarnings,
  };
};

// 用户日历数据hook
export const useMarsUserCalendar = (
  userAddress?: string, 
  year?: number, 
  month?: number
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
      const data = await marsApiService.getUserCalendar(userAddress, year, month);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch calendar data' 
      });
    }
  }, [userAddress, year, month]);

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

// 性能图表数据hook
export const useMarsPerformance = (
  protocol?: string, 
  asset: string = 'USDC', 
  days: number = 30
) => {
  const [state, setState] = useState<ApiState<MarsPerformanceData[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchPerformanceData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await marsApiService.getPerformanceData(protocol, asset, days);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch performance data' 
      });
    }
  }, [protocol, asset, days]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  return {
    ...state,
    refetch: fetchPerformanceData,
  };
};

// 用户交易历史hook
export const useMarsUserTransactions = (userAddress?: string) => {
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
      const data = await marsApiService.getUserTransactions(userAddress);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ 
        data: null, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch transactions' 
      });
    }
  }, [userAddress]);

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

// 组合hook - 获取所有Mars数据
export const useMarsProtocolData = (userAddress?: string, selectedAsset: string = 'USDC') => {
  const tvl = useMarsTV();
  const apy = useMarsAPY(selectedAsset);
  const userEarnings = useMarsUserEarnings(userAddress);
  const performance = useMarsPerformance(undefined, selectedAsset, 30);
  const transactions = useMarsUserTransactions(userAddress);

  const loading = tvl.loading || apy.loading || userEarnings.loading || performance.loading;
  const hasError = !!(tvl.error || apy.error || userEarnings.error || performance.error);

  return {
    tvl: tvl.data,
    apy: apy.data,
    userEarnings: userEarnings.data,
    performance: performance.data,
    transactions: transactions.data,
    loading,
    hasError,
    refetchAll: () => {
      tvl.refetch();
      apy.refetch();
      userEarnings.refetch();
      performance.refetch();
      transactions.refetch();
    },
  };
};