/**
 * 统一的余额检查服务
 * 支持 EVM 链和 Solana 链的余额查询
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { ethers } from 'ethers';
import { networkConfig } from '../config/networkConfig';
import { SOLANA_CHAIN_ID } from './marsLiFiService';

interface BalanceResult {
  balance: string;
  formatted: string;
  decimals: number;
}

/**
 * 获取 Solana RPC 连接（使用 Helius）
 */
const getSolanaConnection = (): Connection => {
  const rpcEndpoint = networkConfig.getCurrentSolanaNetwork().rpcUrl;
  console.log('🔗 Using Solana RPC:', rpcEndpoint);
  return new Connection(rpcEndpoint, 'confirmed');
};

/**
 * 检查 Solana 原生 SOL 余额
 */
const checkSolanaSOLBalance = async (walletAddress: string): Promise<BalanceResult> => {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(walletAddress);
    
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / 1e9; // 9 decimals
    
    console.log(`✅ SOL Balance: ${solBalance}`);
    
    return {
      balance: balance.toString(),
      formatted: solBalance.toFixed(4),
      decimals: 9
    };
  } catch (err) {
    console.error('❌ Failed to check SOL balance:', err);
    throw new Error(`Failed to get SOL balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 检查 Solana SPL Token 余额
 */
const checkSolanaSPLTokenBalance = async (
  tokenMintAddress: string,
  walletAddress: string,
  decimals: number = 6
): Promise<BalanceResult> => {
  try {
    const connection = getSolanaConnection();
    const publicKey = new PublicKey(walletAddress);
    const tokenMint = new PublicKey(tokenMintAddress);
    
    // 获取关联代币账户地址
    const tokenAccount = await getAssociatedTokenAddress(tokenMint, publicKey);
    
    // 尝试获取账户信息
    try {
      const accountInfo = await getAccount(connection, tokenAccount);
      const balance = Number(accountInfo.amount);
      const formattedBalance = balance / Math.pow(10, decimals);
      
      console.log(`✅ SPL Token (${tokenMintAddress.slice(0, 8)}...) Balance: ${formattedBalance}`);
      
      return {
        balance: balance.toString(),
        formatted: formattedBalance.toFixed(4),
        decimals
      };
    } catch (err) {
      // 账户不存在或余额为 0
      console.log('⚠️ Token account not found or has 0 balance');
      return {
        balance: '0',
        formatted: '0.0000',
        decimals
      };
    }
  } catch (err) {
    console.error('❌ Failed to check SPL token balance:', err);
    throw new Error(`Failed to get SPL token balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 检查 Solana 链余额（自动判断是 SOL 还是 SPL Token）
 */
const checkSolanaBalance = async (
  tokenAddress: string,
  walletAddress: string,
  decimals: number = 6
): Promise<BalanceResult> => {
  // 检查是否为原生 SOL
  if (tokenAddress === '0x0000000000000000000000000000000000000000' || tokenAddress === '') {
    return checkSolanaSOLBalance(walletAddress);
  }
  
  // SPL Token
  return checkSolanaSPLTokenBalance(tokenAddress, walletAddress, decimals);
};

/**
 * 获取 EVM RPC Provider（使用配置的 RPC endpoint）
 */
const getEVMProvider = (chainId: number): ethers.JsonRpcProvider => {
  let rpcUrl: string;
  
  switch (chainId) {
    case 1: // Ethereum Mainnet
      rpcUrl = import.meta.env.VITE_ETHEREUM_MAINNET_RPC || 'https://mainnet.infura.io/v3/402b910bd7e24d2a866ac48ab3741e75';
      break;
    case 56: // BSC Mainnet
      rpcUrl = import.meta.env.VITE_BSC_MAINNET_RPC || 'https://bsc-dataseed.binance.org';
      break;
    default:
      // 如果没有配置的 RPC，尝试使用钱包的 provider
      if (window.ethereum) {
        console.log(`⚠️ No RPC configured for chain ${chainId}, using wallet provider`);
        return new ethers.BrowserProvider(window.ethereum) as any;
      }
      throw new Error(`No RPC endpoint configured for chain ${chainId}`);
  }
  
  console.log(`🔗 Using EVM RPC for chain ${chainId}:`, rpcUrl);
  return new ethers.JsonRpcProvider(rpcUrl);
};

/**
 * 检查 EVM 链原生代币余额（ETH, BNB, etc.）
 */
const checkEVMNativeBalance = async (walletAddress: string, chainId: number): Promise<BalanceResult> => {
  try {
    const provider = getEVMProvider(chainId);
    
    const balance = await provider.getBalance(walletAddress);
    const ethBalance = parseFloat(ethers.formatEther(balance));
    
    console.log(`✅ Native token balance (Chain ${chainId}): ${ethBalance}`);
    
    return {
      balance: balance.toString(),
      formatted: ethBalance.toFixed(4),
      decimals: 18
    };
  } catch (err) {
    console.error('❌ Failed to check native token balance:', err);
    throw new Error(`Failed to get native token balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 检查 EVM 链 ERC20 代币余额
 */
const checkEVMERC20Balance = async (
  tokenAddress: string,
  walletAddress: string,
  chainId: number
): Promise<BalanceResult> => {
  try {
    const provider = getEVMProvider(chainId);
    
    const contract = new ethers.Contract(
      tokenAddress,
      [
        'function balanceOf(address) view returns (uint256)',
        'function decimals() view returns (uint8)'
      ],
      provider
    );
    
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals()
    ]);
    
    const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));
    
    console.log(`✅ ERC20 token (${tokenAddress.slice(0, 8)}...) balance: ${formattedBalance}`);
    
    return {
      balance: balance.toString(),
      formatted: formattedBalance.toFixed(4),
      decimals: Number(decimals)
    };
  } catch (err) {
    console.error('❌ Failed to check ERC20 token balance:', err);
    throw new Error(`Failed to get ERC20 token balance: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

/**
 * 检查 EVM 链余额（自动判断是原生代币还是 ERC20）
 */
const checkEVMBalance = async (
  tokenAddress: string,
  walletAddress: string,
  chainId: number
): Promise<BalanceResult> => {
  // 检查是否为原生代币
  if (tokenAddress === '0x0000000000000000000000000000000000000000' || tokenAddress === '') {
    return checkEVMNativeBalance(walletAddress, chainId);
  }
  
  // ERC20 Token
  return checkEVMERC20Balance(tokenAddress, walletAddress, chainId);
};

/**
 * 统一的余额检查接口
 * @param tokenAddress - 代币地址（原生代币使用 0x0000... 或空字符串）
 * @param chainId - 链 ID
 * @param walletAddress - 钱包地址
 * @param decimals - 代币精度（可选，Solana SPL token 需要）
 * @returns BalanceResult - 包含原始余额和格式化余额
 */
export const checkBalance = async (
  tokenAddress: string,
  chainId: number,
  walletAddress: string,
  decimals?: number
): Promise<BalanceResult> => {
  console.log('💰 Checking balance:', {
    tokenAddress: tokenAddress.slice(0, 20) + '...',
    chainId,
    walletAddress: walletAddress.slice(0, 10) + '...',
    decimals
  });
  
  try {
    // 判断是 Solana 链还是 EVM 链
    if (chainId === SOLANA_CHAIN_ID) {
      return await checkSolanaBalance(tokenAddress, walletAddress, decimals || 6);
    } else {
      return await checkEVMBalance(tokenAddress, walletAddress, chainId);
    }
  } catch (err) {
    console.error('❌ Balance check failed:', err);
    // 返回 0 余额而不是抛出错误
    return {
      balance: '0',
      formatted: '0.0000',
      decimals: decimals || 6
    };
  }
};

/**
 * 检查余额是否足够
 * @param tokenAddress - 代币地址
 * @param chainId - 链 ID
 * @param walletAddress - 钱包地址
 * @param requiredAmount - 需要的金额（格式化后的值，如 "1.5"）
 * @param decimals - 代币精度（可选）
 * @returns { sufficient: boolean, balance: string, required: string }
 */
export const checkSufficientBalance = async (
  tokenAddress: string,
  chainId: number,
  walletAddress: string,
  requiredAmount: string,
  decimals?: number
): Promise<{
  sufficient: boolean;
  balance: string;
  required: string;
  shortfall?: string;
}> => {
  const result = await checkBalance(tokenAddress, chainId, walletAddress, decimals);
  const balanceNum = parseFloat(result.formatted);
  const requiredNum = parseFloat(requiredAmount);
  
  const sufficient = balanceNum >= requiredNum;
  const shortfall = sufficient ? undefined : (requiredNum - balanceNum).toFixed(4);
  
  console.log(`💰 Balance check result:`, {
    balance: result.formatted,
    required: requiredAmount,
    sufficient,
    shortfall
  });
  
  return {
    sufficient,
    balance: result.formatted,
    required: requiredAmount,
    shortfall
  };
};

export default {
  checkBalance,
  checkSufficientBalance
};
