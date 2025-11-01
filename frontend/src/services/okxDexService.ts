/**
 * OKX DEX API 集成服务
 * 支持 TRON 跨链桥接和原生代币交换
 * 
 * 功能：
 * 1. TRON ↔ Solana 跨链桥接
 * 2. TRON 原生代币交换（USDT → TRX）
 * 3. TRX 余额不足时自动补充（从 USDT 交换 20 TRX）
 * 
 * API 文档：https://www.okx.com/web3/build/docs/waas/dex-aggregator-api
 */

import { TRON_TOKENS } from '../constants/tronConstants';

// OKX DEX API 配置
const OKX_DEX_API_BASE_URL = 'https://www.okx.com/api/v5/dex/aggregator';

// 支持的链 ID（OKX DEX 格式）
export const OKX_CHAIN_IDS = {
  TRON: '195', // TRON Mainnet
  SOLANA: '501', // Solana Mainnet
  ETHEREUM: '1',
  BSC: '56',
  POLYGON: '137',
} as const;

// TRON 原生代币最小余额（TRX）
const MIN_TRX_BALANCE = 20; // TRX 低于 20 时触发自动补充
const TRX_SWAP_AMOUNT = 20; // 每次补充 20 TRX

// API 请求头
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'OK-ACCESS-KEY': import.meta.env.VITE_OKX_API_KEY || '',
});

/**
 * 交换参数接口
 */
export interface SwapParams {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  userWalletAddress: string;
  slippage?: number; // 滑点容忍度，默认 0.5%
}

/**
 * 跨链桥接参数接口
 */
export interface BridgeParams {
  fromChainId: string;
  toChainId: string;
  fromTokenAddress: string;
  toTokenAddress: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  slippage?: number;
}

/**
 * OKX DEX Quote 响应接口
 */
export interface OKXQuote {
  code: string;
  msg: string;
  data: Array<{
    routerList: Array<{
      dexProtocol: string;
      percentage: string;
    }>;
    estimateGasFee: string;
    fromToken: {
      tokenAddress: string;
      symbol: string;
      decimals: number;
    };
    toToken: {
      tokenAddress: string;
      symbol: string;
      decimals: number;
    };
    fromTokenAmount: string;
    toTokenAmount: string;
    minToTokenAmount: string;
  }>;
}

/**
 * OKX DEX Swap 响应接口
 */
export interface OKXSwapResponse {
  code: string;
  msg: string;
  data: Array<{
    tx: {
      from: string;
      to: string;
      data: string;
      value: string;
      gas: string;
      gasPrice: string;
    };
    routerList: Array<{
      dexProtocol: string;
      percentage: string;
    }>;
  }>;
}

/**
 * 获取交换报价
 */
export async function getSwapQuote(params: SwapParams): Promise<OKXQuote> {
  const {
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    amount,
    userWalletAddress,
    slippage = 0.5,
  } = params;

  const url = new URL(`${OKX_DEX_API_BASE_URL}/quote`);
  url.searchParams.append('chainId', fromChainId);
  url.searchParams.append('fromTokenAddress', fromTokenAddress);
  url.searchParams.append('toTokenAddress', toTokenAddress);
  url.searchParams.append('amount', amount);
  url.searchParams.append('userWalletAddress', userWalletAddress);
  url.searchParams.append('slippage', slippage.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`OKX DEX API error: ${response.statusText}`);
  }

  const result: OKXQuote = await response.json();

  if (result.code !== '0') {
    throw new Error(`OKX DEX error: ${result.msg}`);
  }

  return result;
}

/**
 * 执行交换
 */
export async function executeSwap(params: SwapParams): Promise<OKXSwapResponse> {
  const {
    fromChainId,
    fromTokenAddress,
    toTokenAddress,
    amount,
    userWalletAddress,
    slippage = 0.5,
  } = params;

  const url = new URL(`${OKX_DEX_API_BASE_URL}/swap`);
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      chainId: fromChainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      userWalletAddress,
      slippage,
    }),
  });

  if (!response.ok) {
    throw new Error(`OKX DEX API error: ${response.statusText}`);
  }

  const result: OKXSwapResponse = await response.json();

  if (result.code !== '0') {
    throw new Error(`OKX DEX error: ${result.msg}`);
  }

  return result;
}

/**
 * 获取跨链桥接报价
 */
export async function getBridgeQuote(params: BridgeParams): Promise<OKXQuote> {
  const {
    fromChainId,
    toChainId,
    fromTokenAddress,
    toTokenAddress,
    amount,
    fromAddress,
    toAddress,
    slippage = 0.5,
  } = params;

  const url = new URL(`${OKX_DEX_API_BASE_URL}/cross-chain-quote`);
  url.searchParams.append('fromChainId', fromChainId);
  url.searchParams.append('toChainId', toChainId);
  url.searchParams.append('fromTokenAddress', fromTokenAddress);
  url.searchParams.append('toTokenAddress', toTokenAddress);
  url.searchParams.append('amount', amount);
  url.searchParams.append('fromAddress', fromAddress);
  url.searchParams.append('toAddress', toAddress);
  url.searchParams.append('slippage', slippage.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`OKX DEX API error: ${response.statusText}`);
  }

  const result: OKXQuote = await response.json();

  if (result.code !== '0') {
    throw new Error(`OKX DEX error: ${result.msg}`);
  }

  return result;
}

/**
 * 执行跨链桥接
 */
export async function executeBridge(params: BridgeParams): Promise<OKXSwapResponse> {
  const {
    fromChainId,
    fromTokenAddress,
    toTokenAddress,
    amount,
    fromAddress,
    toAddress,
    slippage = 0.5,
  } = params;

  const url = new URL(`${OKX_DEX_API_BASE_URL}/cross-chain-swap`);
  
  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      fromChainId,
      toChainId: params.toChainId,
      fromTokenAddress,
      toTokenAddress,
      amount,
      fromAddress,
      toAddress,
      slippage,
    }),
  });

  if (!response.ok) {
    throw new Error(`OKX DEX API error: ${response.statusText}`);
  }

  const result: OKXSwapResponse = await response.json();

  if (result.code !== '0') {
    throw new Error(`OKX DEX error: ${result.msg}`);
  }

  return result;
}

/**
 * 检查 TRX 余额并自动补充
 * 如果 TRX 余额低于 MIN_TRX_BALANCE，则从 USDT 交换 TRX_SWAP_AMOUNT TRX
 * 
 * @param tronAddress TRON 钱包地址
 * @param currentTrxBalance 当前 TRX 余额
 * @param tronWeb TronWeb 实例
 * @returns 是否执行了补充操作
 */
export async function checkAndRefillTrx(
  tronAddress: string,
  currentTrxBalance: number,
  tronWeb: any
): Promise<boolean> {
  console.log(`[OKX DEX] 检查 TRX 余额: ${currentTrxBalance} TRX`);

  if (currentTrxBalance >= MIN_TRX_BALANCE) {
    console.log(`[OKX DEX] TRX 余额充足，无需补充`);
    return false;
  }

  console.log(`[OKX DEX] TRX 余额不足 ${MIN_TRX_BALANCE}，开始从 USDT 交换 ${TRX_SWAP_AMOUNT} TRX...`);

  try {
    // 计算需要的 USDT 数量（获取报价）
    const quoteParams: SwapParams = {
      fromChainId: OKX_CHAIN_IDS.TRON,
      toChainId: OKX_CHAIN_IDS.TRON,
      fromTokenAddress: TRON_TOKENS.USDT,
      toTokenAddress: TRON_TOKENS.TRX, // TRX 使用空字符串表示原生代币
      amount: (TRX_SWAP_AMOUNT * 1e6).toString(), // TRX 有 6 位小数
      userWalletAddress: tronAddress,
      slippage: 1.0, // 1% 滑点
    };

    const quote = await getSwapQuote(quoteParams);
    console.log(`[OKX DEX] 报价获取成功:`, quote.data[0]);

    // 执行交换
    const swapResult = await executeSwap(quoteParams);
    console.log(`[OKX DEX] 交换交易已创建:`, swapResult.data[0]);

    // 使用 TronWeb 签名并发送交易
    const txData = swapResult.data[0].tx;
    const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
      txData.to,
      txData.data,
      {
        feeLimit: Number(txData.gas) * Number(txData.gasPrice),
        callValue: Number(txData.value),
      },
      [],
      tronAddress
    );

    const signedTx = await tronWeb.trx.sign(transaction.transaction);
    const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);

    if (broadcast.result) {
      console.log(`[OKX DEX] ✅ TRX 补充成功，交易哈希: ${broadcast.txid}`);
      return true;
    } else {
      throw new Error(`交易广播失败: ${JSON.stringify(broadcast)}`);
    }
  } catch (error) {
    console.error('[OKX DEX] TRX 补充失败:', error);
    throw error;
  }
}

/**
 * TRON → Solana 跨链桥接
 * 
 * @param fromToken TRON 代币地址
 * @param toToken Solana 代币地址
 * @param amount 金额（最小单位）
 * @param tronAddress TRON 钱包地址
 * @param solanaAddress Solana 钱包地址
 * @param tronWeb TronWeb 实例
 */
export async function bridgeTronToSolana(
  fromToken: string,
  toToken: string,
  amount: string,
  tronAddress: string,
  solanaAddress: string,
  tronWeb: any
): Promise<string> {
  console.log(`[OKX DEX] 开始 TRON → Solana 跨链桥接...`);
  console.log(`[OKX DEX] From: ${fromToken} (${tronAddress})`);
  console.log(`[OKX DEX] To: ${toToken} (${solanaAddress})`);
  console.log(`[OKX DEX] Amount: ${amount}`);

  try {
    // 1. 获取跨链报价
    const bridgeParams: BridgeParams = {
      fromChainId: OKX_CHAIN_IDS.TRON,
      toChainId: OKX_CHAIN_IDS.SOLANA,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      fromAddress: tronAddress,
      toAddress: solanaAddress,
      slippage: 1.0, // 1% 滑点
    };

    const quote = await getBridgeQuote(bridgeParams);
    console.log(`[OKX DEX] 跨链报价获取成功:`, quote.data[0]);

    // 2. 执行跨链桥接
    const bridgeResult = await executeBridge(bridgeParams);
    console.log(`[OKX DEX] 跨链交易已创建:`, bridgeResult.data[0]);

    // 3. 使用 TronWeb 签名并发送交易
    const txData = bridgeResult.data[0].tx;
    const transaction = await tronWeb.transactionBuilder.triggerSmartContract(
      txData.to,
      txData.data,
      {
        feeLimit: Number(txData.gas) * Number(txData.gasPrice),
        callValue: Number(txData.value),
      },
      [],
      tronAddress
    );

    const signedTx = await tronWeb.trx.sign(transaction.transaction);
    const broadcast = await tronWeb.trx.sendRawTransaction(signedTx);

    if (broadcast.result) {
      console.log(`[OKX DEX] ✅ 跨链桥接成功，交易哈希: ${broadcast.txid}`);
      return broadcast.txid;
    } else {
      throw new Error(`交易广播失败: ${JSON.stringify(broadcast)}`);
    }
  } catch (error) {
    console.error('[OKX DEX] 跨链桥接失败:', error);
    throw error;
  }
}

/**
 * Solana → TRON 跨链桥接
 * 
 * @param fromToken Solana 代币地址
 * @param toToken TRON 代币地址
 * @param amount 金额（最小单位）
 * @param solanaAddress Solana 钱包地址
 * @param tronAddress TRON 钱包地址
 * @param solanaWallet Solana 钱包实例
 */
export async function bridgeSolanaToTron(
  fromToken: string,
  toToken: string,
  amount: string,
  solanaAddress: string,
  tronAddress: string,
  _solanaWallet: any // 未来使用，标记为私有避免 lint 警告
): Promise<string> {
  console.log(`[OKX DEX] 开始 Solana → TRON 跨链桥接...`);
  console.log(`[OKX DEX] From: ${fromToken} (${solanaAddress})`);
  console.log(`[OKX DEX] To: ${toToken} (${tronAddress})`);
  console.log(`[OKX DEX] Amount: ${amount}`);

  try {
    // 1. 获取跨链报价
    const bridgeParams: BridgeParams = {
      fromChainId: OKX_CHAIN_IDS.SOLANA,
      toChainId: OKX_CHAIN_IDS.TRON,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      amount,
      fromAddress: solanaAddress,
      toAddress: tronAddress,
      slippage: 1.0, // 1% 滑点
    };

    const quote = await getBridgeQuote(bridgeParams);
    console.log(`[OKX DEX] 跨链报价获取成功:`, quote.data[0]);

    // 2. 执行跨链桥接
    const bridgeResult = await executeBridge(bridgeParams);
    console.log(`[OKX DEX] 跨链交易已创建:`, bridgeResult.data[0]);

    // 3. 使用 Solana 钱包签名并发送交易
    // 注意：OKX DEX 返回的交易数据格式可能需要转换
    console.log('[OKX DEX] 发送 Solana 交易...');
    console.log('[OKX DEX] 交易数据:', bridgeResult.data[0].tx);
    
    // TODO: 实现 Solana 交易签名和发送逻辑
    // const signature = await solanaWallet.signAndSendTransaction(transaction);
    
    throw new Error('Solana → TRON 跨链桥接功能待实现');
  } catch (error) {
    console.error('[OKX DEX] 跨链桥接失败:', error);
    throw error;
  }
}

// 导出常量
export { TRON_TOKENS, MIN_TRX_BALANCE, TRX_SWAP_AMOUNT };
