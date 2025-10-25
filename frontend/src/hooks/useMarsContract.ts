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
  createClaimRewardsTransaction,
  checkPyusdBalance,
  checkSolBalance,
} from '../services/marsContract';
import { KaminoSDKHelper } from '../services/kaminoSdkHelper';

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

      // 检查 SOL 余额
      const solBalance = await checkSolBalance(publicKey, connection);
      console.log('🟢 [useMarsContract] SOL Balance:', solBalance);
      if (solBalance < 0.025) {
        throw new Error(`Insufficient SOL balance! Need at least 0.025 SOL for transaction fees and account rent, but only have ${solBalance.toFixed(4)} SOL. Please deposit more SOL first.`);
      }

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

      console.log(`📦 准备发送 ${transactions.length} 个交易`);
      
      const signatures: string[] = [];
      
      // 依次发送所有交易
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const stepNum = i + 1;
        const stepName = i === 0 && transactions.length > 1 
          ? 'Claim Rewards' 
          : 'Unstake & Withdraw';

        if (onStepChange) {
          onStepChange(stepNum, stepName);
        }

        console.log(`📤 发送交易 ${stepNum}/${transactions.length}: ${stepName}`);
        setStatus('signing');
        
        setStatus('sending');
        const signature = await sendTransaction(tx, connection);
        setCurrentSignature(signature);
        console.log(`✅ 交易 ${stepNum} 已发送:`, signature);

        setStatus('confirming');
        console.log(`⏳ 等待交易 ${stepNum} 确认...`);
        await connection.confirmTransaction(signature, 'confirmed');
        console.log(`✅ 交易 ${stepNum} 确认成功!`);
        
        signatures.push(signature);
      }

      setStatus('success');
      console.log('✅ 取款流程完成!');
      console.log('所有交易签名:', signatures);

      return signatures;
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

  /**
   * 领取奖励
   */
  const claimRewards = useCallback(async (): Promise<string | undefined> => {
    if (!publicKey || !sendTransaction) {
      throw new Error('钱包未连接');
    }

    setIsProcessing(true);
    setStatus('building');
    setError(undefined);

    try {
      console.log('🎁 开始领取奖励...');

      // 初始化 Kamino SDK Helper
      const RPC_URL = import.meta.env.VITE_SOLANA_MAINNET_RPC || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
      const sdkHelper = new KaminoSDKHelper(RPC_URL, publicKey);
      await sdkHelper.initialize();

      // 创建 claim rewards 交易
      const claimTx = await createClaimRewardsTransaction(publicKey, connection, sdkHelper);
      
      if (!claimTx) {
        throw new Error('没有可领取的奖励');
      }

      console.log('📝 交易构建完成，准备签名并发送...');
      setStatus('signing');

      // 发送交易
      console.log('📤 发送交易...');
      setStatus('sending');
      const signature = await sendTransaction(claimTx, connection);
      setCurrentSignature(signature);
      console.log(`✅ 交易已发送: ${signature}`);

      // 等待确认
      console.log('⏳ 等待交易确认...');
      setStatus('confirming');
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      console.log('📋 交易确认结果:', confirmation);
      
      if (confirmation.value.err) {
        throw new Error(`交易失败: ${JSON.stringify(confirmation.value.err)}`);
      }

      // 获取交易详情以验证
      try {
        const txDetails = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed'
        });
        console.log('📄 交易详情:', txDetails);
        
        if (txDetails?.meta?.err) {
          throw new Error(`交易执行失败: ${JSON.stringify(txDetails.meta.err)}`);
        }
        
        console.log('✅ 交易成功执行');
        console.log('💰 Post Token Balances:', txDetails?.meta?.postTokenBalances);
        
        // 打印详细的余额变化
        if (txDetails?.meta?.postTokenBalances) {
          console.log('\n📊 Token 余额详情:');
          txDetails.meta.postTokenBalances.forEach((balance, index) => {
            console.log(`  账户 ${index + 1}:`, {
              accountIndex: balance.accountIndex,
              owner: balance.owner,
              mint: balance.mint,
              amount: balance.uiTokenAmount?.uiAmountString || balance.uiTokenAmount?.uiAmount || '未知',
              decimals: balance.uiTokenAmount?.decimals
            });
          });
        }
        
        // 检查你的钱包地址是否收到了奖励
        const yourAddress = publicKey?.toBase58();
        if (yourAddress && txDetails?.meta?.postTokenBalances) {
          const yourBalance = txDetails.meta.postTokenBalances.find(
            (b: any) => b.owner === yourAddress
          );
          if (yourBalance) {
            console.log(`\n💎 你的钱包余额: ${yourBalance.uiTokenAmount?.uiAmountString || yourBalance.uiTokenAmount?.uiAmount}`);
          }
        }
      } catch (detailErr) {
        console.warn('⚠️ 无法获取交易详情:', detailErr);
      }

      setStatus('success');
      console.log('✅ 奖励领取完成!');
      console.log('🔗 查看交易: https://solscan.io/tx/' + signature);

      return signature;
    } catch (err: any) {
      const errorMessage = err.message || '领取奖励失败';
      console.error('❌ 领取奖励失败:', err);
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
    claimRewards,
    status,
    currentSignature,
    error,
    isProcessing,
  };
};
