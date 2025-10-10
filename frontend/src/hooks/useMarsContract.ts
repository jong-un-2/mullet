/**
 * useMarsContract Hook
 * 提供 Mars 合约的存款和取款功能
 */

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey } from '@solana/web3.js';
import {
  createDepositAndStakeTransaction,
  createUnstakeAndWithdrawTransactions,
  checkPyusdBalance,
} from '../services/marsContract';

export interface TransactionStatus {
  status: 'idle' | 'building' | 'signing' | 'sending' | 'confirming' | 'success' | 'error';
  currentSignature?: string;
  error?: string;
  isProcessing: boolean;
}

export const useMarsContract = () => {
  const { connection } = useConnection();
  const walletAdapter = useWallet();
  const { wallets: privyWallets } = useWallets();
  
  // Try to get publicKey from either source
  let publicKey = walletAdapter.publicKey;
  let sendTransaction = walletAdapter.sendTransaction;
  
  // If wallet adapter doesn't have publicKey, try Privy
  if (!publicKey && privyWallets.length > 0) {
    const privyWallet = privyWallets[0];
    try {
      publicKey = new PublicKey(privyWallet.address);
      // Use Privy's signTransaction + connection.sendRawTransaction
      sendTransaction = async (transaction: any, conn: any) => {
        // Sign the transaction
        const signedResult = await privyWallet.signTransaction(transaction);
        // Send the signed transaction (signedResult.signedTransaction is a Uint8Array)
        const signature = await conn.sendRawTransaction(signedResult.signedTransaction);
        return signature;
      };
    } catch (error) {
      console.error('Failed to get publicKey from Privy wallet:', error);
    }
  }
  
  const [status, setStatus] = useState<TransactionStatus['status']>('idle');
  const [currentSignature, setCurrentSignature] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);

  const deposit = useCallback(async (amount: number): Promise<string | undefined> => {
    console.log('🔵 [useMarsContract] deposit 函数被调用, amount:', amount);
    console.log('🔵 [useMarsContract] publicKey:', publicKey?.toString());
    console.log('🔵 [useMarsContract] sendTransaction:', typeof sendTransaction);
    
    if (!publicKey || !sendTransaction) {
      const errorMsg = '请先连接钱包';
      console.error('❌ [useMarsContract]', errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      console.log('🟢 [useMarsContract] 开始存款流程...');
      setIsProcessing(true);
      setError(undefined);
      setStatus('building');

      console.log('🟢 [useMarsContract] 构建存款交易...', { amount, wallet: publicKey.toString() });

      const balance = await checkPyusdBalance(publicKey, connection);
      console.log('🟢 [useMarsContract] PYUSD 余额:', balance);

      if (balance < amount) {
        throw new Error(`PYUSD 余额不足。当前: ${balance}, 需要: ${amount}`);
      }

      console.log('🟢 [useMarsContract] 调用 createDepositAndStakeTransaction...');
      const transaction = await createDepositAndStakeTransaction(
        publicKey,
        amount,
        connection
      );
      console.log('🟢 [useMarsContract] 交易构建完成:', transaction);

      setStatus('signing');
      console.log('🟡 [useMarsContract] 等待用户签名...');
      console.log('🟡 [useMarsContract] 即将调用 sendTransaction...');

      setStatus('sending');
      const signature = await sendTransaction(transaction, connection);
      setCurrentSignature(signature);
      console.log('🟢 [useMarsContract] 交易已发送:', signature);

      setStatus('confirming');
      console.log('等待确认...');
      
      await connection.confirmTransaction(signature, 'confirmed');

      setStatus('success');
      console.log('存款成功!');
      
      return signature;

    } catch (err: any) {
      console.error('存款失败:', err);
      setStatus('error');
      setError(err.message || '存款失败');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection]);

  const withdraw = useCallback(async (
    amount: number, 
    onStepChange?: (step: number, txName: string) => void
  ): Promise<string[] | undefined> => {
    if (!publicKey || !sendTransaction) {
      setError('请先连接钱包');
      return;
    }

    try {
      setIsProcessing(true);
      setError(undefined);
      setStatus('building');

      console.log('构建取款交易...', { amount, wallet: publicKey.toString() });

      const transactions = await createUnstakeAndWithdrawTransactions(
        publicKey,
        amount,
        connection
      );

      const signatures: string[] = [];
      const errors: string[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const txName = ['Start Unstake', 'Unstake', 'Withdraw'][i];
        console.log(`第 ${i + 1}/3 步: ${txName}`);

        try {
          // 通知进度更新
          if (onStepChange) {
            onStepChange(i + 1, txName);
          }

          setStatus('signing');
          console.log('等待签名...');

          setStatus('sending');
          const signature = await sendTransaction(transactions[i], connection);
          signatures.push(signature);
          setCurrentSignature(signature);
          console.log(`${txName} 交易已发送:`, signature);

          setStatus('confirming');
          console.log('等待确认...');
          await connection.confirmTransaction(signature, 'confirmed');
          console.log(`${txName} 确认成功!`);

          if (i < 2) {
            console.log('等待 5 秒后继续...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (stepError: any) {
          // 记录错误但继续执行下一步
          const errorMsg = `第 ${i + 1} 步 (${txName}) 失败: ${stepError.message || '未知错误'}`;
          console.error(`❌ ${errorMsg}`);
          errors.push(errorMsg);
          
          // 即使失败也要等待，避免太快
          if (i < 2) {
            console.log('⚠️ 步骤失败，等待 5 秒后继续下一步...');
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      }

      // 检查是否有成功的交易
      if (signatures.length > 0) {
        setStatus('success');
        console.log('取款流程完成!');
        console.log(`✅ 成功: ${signatures.length}/3 步`);
        console.log('成功的交易:', signatures);
        
        if (errors.length > 0) {
          console.warn('⚠️ 部分步骤失败:', errors);
        }
      } else {
        setStatus('error');
        const errorMessage = '所有步骤都失败了:\n' + errors.join('\n');
        setError(errorMessage);
        throw new Error(errorMessage);
      }
      
      return signatures;

    } catch (err: any) {
      console.error('取款失败:', err);
      setStatus('error');
      setError(err.message || '取款失败');
      throw err;
    } finally {
      setIsProcessing(false);
    }
  }, [publicKey, sendTransaction, connection]);

  return {
    deposit,
    withdraw,
    status,
    currentSignature,
    error,
    isProcessing,
  };
};
