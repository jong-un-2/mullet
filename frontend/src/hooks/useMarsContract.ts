/**
 * useMarsContract Hook
 * 提供 Mars 合约的存款和取款功能
 */

import { useState, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
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
        console.log('🔵 [Privy sendTransaction] 开始使用 Privy 签名...');
        console.log('🔵 [Privy sendTransaction] Transaction type:', transaction.constructor.name);
        
        // Transaction should already have blockhash from marsContract
        // Just ensure feePayer is set
        if (!transaction.feePayer) {
          transaction.feePayer = publicKey;
        }
        
        console.log('🔵 [Privy sendTransaction] 转换为 VersionedTransaction...');
        // Convert legacy Transaction to VersionedTransaction
        const message = TransactionMessage.decompile(transaction.compileMessage());
        const versionedTx = new VersionedTransaction(message.compileToV0Message());
        
        console.log('🔵 [Privy sendTransaction] 序列化交易...');
        // Serialize to bytes - Privy expects { transaction: Uint8Array }
        const serializedTx = versionedTx.serialize();
        
        console.log('🔵 [Privy sendTransaction] 调用 Privy signTransaction...');
        const signedResult = await privyWallet.signTransaction({ transaction: serializedTx });
        
        console.log('🔵 [Privy sendTransaction] 签名成功！');
        console.log('🔵 [Privy sendTransaction] 发送已签名交易...');
        
        // signedResult.signedTransaction is already a Uint8Array
        const signature = await conn.sendRawTransaction(signedResult.signedTransaction, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });
        
        console.log('🔵 [Privy sendTransaction] 交易已发送:', signature);
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

      console.log('构建批量取款交易...', { amount, wallet: publicKey.toString() });

      const transactions = await createUnstakeAndWithdrawTransactions(
        publicKey,
        amount,
        connection
      );

      // 现在只有一个批量交易
      console.log('📦 批量交易（包含 3 个指令）');

      if (onStepChange) {
        onStepChange(1, 'Start Unstake + Unstake + Withdraw');
      }

      setStatus('signing');
      console.log('等待签名...');

      setStatus('sending');
      const signature = await sendTransaction(transactions[0], connection);
      setCurrentSignature(signature);
      console.log('批量交易已发送:', signature);

      setStatus('confirming');
      console.log('等待确认...');
      await connection.confirmTransaction(signature, 'confirmed');
      console.log('批量交易确认成功!');

      setStatus('success');
      console.log('取款流程完成!');
      console.log('成功的交易:', [signature]);

      return [signature];
    } catch (err: any) {
      const errorMessage = err.message || '取款失败';
      console.error('❌ 取款失败:', err);
      setError(errorMessage);
      setStatus('error');
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
