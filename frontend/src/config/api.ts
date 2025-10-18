/**
 * Mars API配置统一管理
 * 避免在多个文件中重复配置代码
 */

// 根据环境自动选择API地址
export const getApiBaseUrl = () => {
  // 优先使用环境变量中的配置
  if (import.meta.env.VITE_API_ENDPOINT) {
    return import.meta.env.VITE_API_ENDPOINT;
  }
  
  // 根据开发/生产环境自动选择
  if (import.meta.env.DEV) {
    return 'http://127.0.0.1:8787';  // 开发环境使用本地服务器
  }
  
  return 'https://api.marsliquidity.com';  // 生产环境
};

// API配置常量
export const API_CONFIG = {
  BASE_URL: getApiBaseUrl(),
  API_KEY: import.meta.env.VITE_API_KEY || '',
  ENDPOINTS: {
    MARS_API: '/v1/api/mars',
    DATA_API: '/v1/api/mars/data',
    WALLET_API: '/v1/api/mars/wallet',
  }
} as const;

// 通用请求头
export const getDefaultHeaders = (includeApiKey: boolean = true): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (includeApiKey && API_CONFIG.API_KEY) {
    headers['X-API-Key'] = API_CONFIG.API_KEY;
  }
  
  return headers;
};

// 通用错误处理
export class ApiError extends Error {
  constructor(
    message: string, 
    public status?: number, 
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 通用API响应接口
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  timestamp: string;
}