import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  Container,
  Grid,
  TextField,
  Typography,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import Navigation from '../components/Navigation';
import { FaInfoCircle } from 'react-icons/fa';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useWallets } from '@privy-io/react-auth/solana';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, PublicKey, TransactionInstruction, ComputeBudgetProgram } from '@solana/web3.js';
// Solana web3 imports for future transaction building
import { useMarsOpportunities, useMarsDeposit, useMarsWithdraw, getUserWalletAddress, formatCurrency, formatPercentage } from '../hooks/useMarsApi';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import { useMarsProtocolData } from '../hooks/useMarsData';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Build transaction based on protocol parameters using Jupiter Lend API
const buildProtocolTransaction = async (
  txParams: any, 
  userPublicKey: PublicKey
): Promise<Transaction | null> => {
  try {
    console.log('🔧 Building transaction:', txParams.type, txParams.protocol);
    
    if (!txParams.type) {
      console.error('❌ Transaction type is missing!');
      throw new Error('Transaction type is required');
    }
    
    // Get token mint address for the asset
    const tokenMintMap: { [key: string]: string } = {
      'SOL': 'So11111111111111111111111111111111111111112',
      'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
    };
    
    const assetMint = tokenMintMap[txParams.asset] || tokenMintMap['USDC'];
    
    // Convert amount to proper decimals (assuming 6 decimals for USDC/USDT, 9 for SOL)
    const decimals = txParams.asset === 'SOL' ? 9 : 6;
    const amountInBaseUnits = Math.floor(txParams.amount * Math.pow(10, decimals)).toString();
    
    // Use Jupiter Lend API for Jupiter protocol
    if (txParams.protocol === 'jupiter') {
        const apiUrl = txParams.type === 'deposit' 
        ? 'https://lite-api.jup.ag/lend/v1/earn/deposit'
        : 'https://lite-api.jup.ag/lend/v1/earn/withdraw';
      
      console.log('🪐 Jupiter API:', txParams.type, apiUrl);
      
      // Call Jupiter Lend API to get transaction
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          asset: assetMint,
          amount: amountInBaseUnits,
          signer: userPublicKey.toBase58(),
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Jupiter API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ Jupiter API success');
      
      // Deserialize the transaction from base64
      if (data.transaction) {
        const transaction = Transaction.from(Buffer.from(data.transaction, 'base64'));
        
        // Add compute budget instructions at the beginning
        const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
          units: 1_400_000, // 设置计算单元上限为 1.4M (最大限制)
        });
        
        // Add compute unit price instruction for higher priority
        const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: 50_000, // 0.05 lamports per compute unit
        });
        
        // Add compute budget instructions as the first instructions
        const instructionsWithBudget = [
          computeBudgetInstruction, 
          computePriceInstruction, 
          ...transaction.instructions
        ];
        
        // Create new transaction with budget instruction
        const budgetTransaction = new Transaction();
        budgetTransaction.add(...instructionsWithBudget);
        
        // Copy other transaction properties
        budgetTransaction.feePayer = transaction.feePayer;
        budgetTransaction.recentBlockhash = transaction.recentBlockhash;
        
        console.log('✅ Transaction built with compute budget');
        return budgetTransaction;
      } else {
        throw new Error('No transaction returned from Jupiter API');
      }
    }
    
    // Fallback for other protocols
    console.log('⚠️ Fallback memo transaction');
    const transaction = new Transaction();
    
    // Add compute budget instructions
    const computeBudgetInstruction = ComputeBudgetProgram.setComputeUnitLimit({
      units: 1_400_000, // 设置计算单元上限为 1.4M (最大限制)
    });
    
    const computePriceInstruction = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: 50_000, // 0.05 lamports per compute unit
    });
    
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`Mars ${txParams.protocol} ${txParams.type}: ${txParams.amount} ${txParams.asset}`)
    });
    
    transaction.add(computeBudgetInstruction);
    transaction.add(computePriceInstruction);
    transaction.add(memoInstruction);
    return transaction;
    
  } catch (error) {
    console.error('❌ Failed to build transaction:', error);
    console.error('Error details:', error);
    return null;
  }
};

const XFundPage = () => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [chartView, setChartView] = useState<'TVL' | 'APY'>('APY');
  const [activeTab, setActiveTab] = useState(0); // 0 = Deposit, 1 = Withdraw (default to Deposit)
  const [historyView, setHistoryView] = useState<'earning' | 'history'>('earning');
  
  // Calendar state management
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedMonth, setSelectedMonth] = useState('09');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Calendar helper functions
  const getMonthName = (monthNum: string) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[parseInt(monthNum) - 1];
  };

  const getDaysInMonth = (year: string, month: string) => {
    return new Date(parseInt(year), parseInt(month), 0).getDate();
  };

  const getFirstDayOfMonth = (year: string, month: string) => {
    return new Date(parseInt(year), parseInt(month) - 1, 1).getDay();
  };

  // Note: Day earnings are now handled directly in the calendar rendering
  
  // Transaction status tracking
  const [transactionStatus, setTransactionStatus] = useState<{
    hash?: string;
    status: 'idle' | 'building' | 'signing' | 'sending' | 'pending' | 'confirmed' | 'failed';
    error?: string;
  }>({ status: 'idle' });
  
  const [isProcessing, setIsProcessing] = useState(false);

  // Transaction status tracking function
  const updateTransactionStatus = (status: string, hash?: string, error?: string) => {
    console.log(`🔄 Transaction status: ${status}`, { hash, error });
    setTransactionStatus({ status: status as any, hash, error });
  };

  // Monitor transaction confirmation
  const waitForConfirmation = async (signature: string, connection: any) => {
    try {
      updateTransactionStatus('pending', signature);
      
      console.log('⏳ Waiting for transaction confirmation...', signature);
      
      // Wait for confirmation with timeout
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }
      
      updateTransactionStatus('confirmed', signature);
      console.log('✅ Transaction confirmed:', signature);
      
      // Show success message or redirect
      return true;
      
    } catch (error) {
      console.error('❌ Transaction confirmation failed:', error);
      updateTransactionStatus('failed', signature, error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  // Wallet connection states  
  const { authenticated, user } = usePrivy();
  const { isConnected: ethConnected, address: ethAddress } = useAccount();
  const { wallets: solanaWallets } = useWallets();
  // Safely get Solana wallet adapter context
  let sendTransaction: any = null;
  let solanaPublicKey: any = null;
  let directSolanaConnected = false;
  let connection: any = null;
  
  try {
    const walletContext = useWallet();
    const connectionContext = useConnection();
    
    sendTransaction = walletContext.sendTransaction;
    solanaPublicKey = walletContext.publicKey;
    directSolanaConnected = walletContext.connected;
    connection = connectionContext.connection;
  } catch (error) {
    console.warn('⚠️ Solana wallet adapter not available:', error);
  }
  
  // Check Solana wallet connection (both Privy and direct)
  const solConnected = solanaWallets.length > 0 || directSolanaConnected;
  
  // Check if ANY wallet is connected (Privy auth, ETH external, or Solana external)
  const isWalletConnected = authenticated || ethConnected || solConnected;
  
  // Get user wallet address for Mars API (prioritize direct Solana connection)
  const userWalletAddress = getUserWalletAddress(ethAddress, solanaWallets, authenticated, user, solanaPublicKey);

  // Wallet connection check
  if (!isWalletConnected && process.env.NODE_ENV === 'development') {
    console.log('⚠️ No wallet connected');
  }
  
  // Mars API hooks
  const { opportunities, loading: opportunitiesLoading } = useMarsOpportunities();
  const { deposit, loading: depositLoading, error: depositError } = useMarsDeposit();
  const { withdraw } = useMarsWithdraw();
  
  // Mars Data hooks - 新的数据API集成
  const {
    tvl: marsTvlData,
    apy: marsApyData,
    userEarnings: marsUserEarnings,
    performance: marsPerformanceData,
    transactions: marsTransactionsData,
    loading: marsDataLoading,
  } = useMarsProtocolData(userWalletAddress, selectedToken);
  
  // Calendar data for earnings - TODO: integrate with calendar rendering
  // const { 
  //   data: calendarData 
  // } = useMarsUserCalendar(
  //   userWalletAddress,
  //   parseInt(selectedYear),
  //   parseInt(selectedMonth)
  // );



  // Get real Mars opportunities data
  const getCurrentOpportunity = () => {
    if (opportunitiesLoading || !opportunities || opportunities.length === 0) {
      return null;
    }
    
    // Find opportunity for selected token
    return opportunities.find(opp => opp.asset === selectedToken) || opportunities[0];
  };

  const currentOpportunity = getCurrentOpportunity();

  // Get real Solana wallet balances
  const { getBalance: getSolanaBalance, loading: balanceLoading } = useSolanaBalance(userWalletAddress);
  

  
  // Get real wallet balance for selected token
  const getWalletBalance = (token: string) => {
    if (!isWalletConnected) return '0';
    return getSolanaBalance(token) || '0';
  };

  // Handle deposit action
  const handleDeposit = async () => {
    if (!isWalletConnected || !userWalletAddress || !depositAmount || !currentOpportunity) {
      console.error('❌ Missing data for deposit');
      return;
    }

    try {
      const depositRequest = {
        userAddress: userWalletAddress,
        asset: selectedToken,
        amount: parseFloat(depositAmount),
        riskProfile: 'moderate' as const
      };

      console.log('🚀 Creating deposit:', depositRequest);
      
      const result = await deposit(depositRequest);
      
      if (result) {
        console.log('✅ Deposit result received');
        
        // Handle transaction signing and sending  
        try {
          if (result.transaction?.serializedTx) {
            
            // Check wallet connection status
            
            if (!sendTransaction) {
              console.error('❌ No sendTransaction function available');
              alert('请先连接 Solana 钱包！');
              return;
            }
            
            // Check if we have Solana wallet via Privy or direct connection
            if (!solanaPublicKey && solanaWallets.length === 0) {
              console.error('❌ No Solana wallet connected');
              alert('请先连接 Solana 钱包！');
              return;
            }
            
            // Decode transaction parameters from backend
            const txParams = JSON.parse(atob(result.transaction.serializedTx));
            
            // Add user address and ensure type is deposit
            txParams.userAddress = userWalletAddress;
            txParams.type = 'deposit';  // Force set to deposit for deposit flow
            
            
            // Build actual transaction based on protocol
            const userPubKey = solanaPublicKey || new PublicKey(userWalletAddress);
            const transaction = await buildProtocolTransaction(txParams, userPubKey);
            
            if (transaction) {
              setIsProcessing(true);
              updateTransactionStatus('building');
              
              try {
                updateTransactionStatus('signing');
                
                // Use Privy Solana wallet if available, otherwise use direct wallet
                let signature;
                if (solanaWallets.length > 0) {
                  const privySolanaWallet = solanaWallets[0];
                  
                  // Get recent blockhash for the transaction
                  const { blockhash } = await connection.getLatestBlockhash();
                  transaction.recentBlockhash = blockhash;
                  transaction.feePayer = new PublicKey(userWalletAddress);
                  
                  // Sign and send transaction with Privy wallet
                  const txBytes = transaction.serialize({ requireAllSignatures: false });
                  const signedTx = await privySolanaWallet.signTransaction({
                    transaction: txBytes
                  });
                  
                  updateTransactionStatus('sending');
                  signature = await connection.sendRawTransaction(signedTx.signedTransaction);
                  
                } else if (sendTransaction) {
                  updateTransactionStatus('sending');
                  signature = await sendTransaction(transaction, connection);
                } else {
                  console.error('❌ No wallet available for signing');
                  updateTransactionStatus('failed', undefined, 'No wallet available for signing');
                  setIsProcessing(false);
                  return;
                }
                
                
                // Wait for confirmation
                const confirmed = await waitForConfirmation(signature, connection);
                
                if (confirmed) {
                  // Clear form on success
                  setDepositAmount('');
                }
                
              } catch (error) {
                console.error('❌ Transaction processing error:', error);
                updateTransactionStatus('failed', undefined, error instanceof Error ? error.message : 'Transaction failed');
              } finally {
                setIsProcessing(false);
              }
            } else {
              console.error('❌ Failed to build transaction');
            }
            
          } else if (!result.transaction?.serializedTx) {
          } else {
            console.warn('⚠️ Wallet not available for transaction signing');
          }
        } catch (txError) {
          console.error('❌ Transaction processing failed:', txError);
        }
      }
    } catch (error) {
      console.error('❌ Deposit failed:', error);
    }
  };

  // Handle withdraw action
  const handleWithdraw = async () => {
    if (!isWalletConnected || !userWalletAddress || !withdrawAmount || !currentOpportunity) {
      console.error('Missing required data for withdrawal:', {
        isWalletConnected,
        userWalletAddress,
        withdrawAmount,
        currentOpportunity: !!currentOpportunity
      });
      return;
    }

    try {
      const withdrawRequest = {
        userAddress: userWalletAddress,
        asset: selectedToken,
        amount: parseFloat(withdrawAmount) // Use specific amount or support 'max' later
      };

      console.log('🚀 Creating withdrawal with Mars API:', withdrawRequest);
      
      const result = await withdraw(withdrawRequest);
      
      if (result) {
        console.log('✅ Withdrawal created successfully:', result);
        console.log('🔍 Debug - serializedTx exists:', !!result.transaction?.serializedTx);
        
        // Handle transaction signing and sending  
        try {
          if (result.transaction?.serializedTx) {
            console.log('📝 Processing withdraw transaction from backend...');
            
            // Check wallet connection status
            
            if (!sendTransaction) {
              console.error('❌ No sendTransaction function available');
              alert('请先连接 Solana 钱包！');
              return;
            }
            
            // Check if we have Solana wallet via Privy or direct connection
            if (!solanaPublicKey && solanaWallets.length === 0) {
              console.error('❌ No Solana wallet connected');
              alert('请先连接 Solana 钱包！');
              return;
            }
            
            // Decode transaction parameters from backend
            const txParams = JSON.parse(atob(result.transaction.serializedTx));
            console.log('� Backend withdrawal transaction params:', txParams);
            console.log('🔄 Transaction type:', txParams.type);
            
            // Add user address and ensure type is withdraw
            txParams.userAddress = userWalletAddress;
            txParams.type = 'withdraw';
            
            // Build actual transaction based on protocol
            const userPubKey = solanaPublicKey || new PublicKey(userWalletAddress);
            const transaction = await buildProtocolTransaction(txParams, userPubKey);
            
            if (transaction) {
              console.log('📋 Withdraw transaction built, requesting signature...');
              setIsProcessing(true);
              updateTransactionStatus('building');
              
              try {
                updateTransactionStatus('signing');
                
                // Use Privy Solana wallet if available, otherwise use direct wallet
                let signature;
                if (solanaWallets.length > 0) {
                  console.log('🔗 Using Privy Solana wallet for withdraw signing...');
                  const privySolanaWallet = solanaWallets[0];
                  
                  // Get recent blockhash for the transaction
                  const { blockhash } = await connection.getLatestBlockhash();
                  transaction.recentBlockhash = blockhash;
                  transaction.feePayer = new PublicKey(userWalletAddress);
                  
                  // Sign and send transaction with Privy wallet
                  const txBytes = transaction.serialize({ requireAllSignatures: false });
                  const signedTx = await privySolanaWallet.signTransaction({
                    transaction: txBytes
                  });
                  
                  updateTransactionStatus('sending');
                  signature = await connection.sendRawTransaction(signedTx.signedTransaction);
                  
                } else if (sendTransaction) {
                  console.log('🔗 Using direct Solana wallet for withdraw signing...');
                  updateTransactionStatus('sending');
                  signature = await sendTransaction(transaction, connection);
                } else {
                  console.error('❌ No wallet available for signing');
                  updateTransactionStatus('failed', undefined, 'No wallet available for signing');
                  setIsProcessing(false);
                  return;
                }
                
                console.log('🎉 Withdraw transaction signed and sent:', signature);
                
                // Wait for confirmation
                const confirmed = await waitForConfirmation(signature, connection);
                
                if (confirmed) {
                  // Clear form on success
                  setWithdrawAmount('');
                  console.log('✅ Withdrawal completed successfully!');
                }
                
              } catch (error) {
                console.error('❌ Withdraw transaction processing error:', error);
                updateTransactionStatus('failed', undefined, error instanceof Error ? error.message : 'Transaction failed');
              } finally {
                setIsProcessing(false);
              }
            } else {
              console.error('❌ Failed to build withdraw transaction');
            }
            
          } else if (!result.transaction?.serializedTx) {
            console.log('ℹ️ Withdraw preview created, no transaction to sign');
          } else {
            console.warn('⚠️ Wallet not available for transaction signing');
          }
        } catch (txError) {
          console.error('❌ Withdraw transaction processing failed:', txError);
        }
      }
    } catch (error) {
      console.error('❌ Withdrawal failed:', error);
      alert(`Withdrawal failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const tokenConfigs = {
    USDC: { symbol: 'USDC', name: 'USD Coin', color: '#2775ca' },
    USDT: { symbol: 'USDT', name: 'Tether USD', color: '#26a17b' },
    DAI: { symbol: 'DAI', name: 'DAI Stablecoin', color: '#f4b731' },
    BUSD: { symbol: 'BUSD', name: 'Binance USD', color: '#f0b90b' },
    FRAX: { symbol: 'FRAX', name: 'Frax', color: '#000000' }
  };

  const getCurrentToken = () => tokenConfigs[selectedToken as keyof typeof tokenConfigs];

  // Chart data from Mars API or fallback to mock data
  const getChartData = () => {
    if (marsPerformanceData && marsPerformanceData.length > 0) {
      const labels = marsPerformanceData.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });
      
      return {
        apy: {
          labels,
          datasets: [{
            label: 'APY (%)',
            data: marsPerformanceData.map(item => item.apy),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#60a5fa',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          }],
        },
        tvl: {
          labels,
          datasets: [{
            label: 'TVL (M)',
            data: marsPerformanceData.map(item => item.tvl / 1_000_000),
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#ffffff',
            pointBorderWidth: 2,
          }],
        }
      };
    }
    
    // Fallback mock data
    return {
      apy: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'APY (%)',
          data: [7.5, 8.2, 7.8, 8.5, 8.8, 8.6],
          borderColor: '#60a5fa',
          backgroundColor: 'rgba(96, 165, 250, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#60a5fa',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }],
      },
      tvl: {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [{
          label: 'TVL (M)',
          data: [120, 125, 128, 130, 125, 125],
          borderColor: '#34d399',
          backgroundColor: 'rgba(52, 211, 153, 0.1)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#34d399',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        }],
      }
    };
  };

  const chartDataSets = getChartData();

  const currentChartData = chartView === 'APY' ? chartDataSets.apy : chartDataSets.tvl;

  // Transaction history from Mars API or fallback to mock data
  const getTransactionHistory = () => {
    if (marsTransactionsData?.transactions && marsTransactionsData.transactions.length > 0) {
      return marsTransactionsData.transactions.map(tx => ({
        date: tx.date,
        type: tx.type,
        tokens: `${tx.asset} ${tx.amount}`,
        value: formatCurrency(tx.amountUsd, 'USD').replace('$', '') + 'K'
      }));
    }
    
    // Fallback mock data
    return [
      {
        date: 'Sep 29, 14:32',
        type: 'deposit',
        tokens: 'USDC 20.12K',
        value: '20.12K'
      }
    ];
  };

  const transactionHistory = getTransactionHistory();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since we have toggle buttons
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#cbd5e1',
        borderColor: chartView === 'APY' ? '#60a5fa' : '#34d399',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            const suffix = chartView === 'APY' ? '%' : 'M';
            return `${context.dataset.label}: ${context.parsed.y}${suffix}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
          callback: function(value: any) {
            const suffix = chartView === 'APY' ? '%' : 'M';
            return `${value}${suffix}`;
          }
        },
      },
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: chartView === 'APY' ? '#60a5fa' : '#34d399',
        hoverBorderColor: '#ffffff',
      }
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Tech background pattern */}
      <Box sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 75% 75%, rgba(168, 85, 247, 0.1) 0%, transparent 50%),
          linear-gradient(45deg, transparent 40%, rgba(59, 130, 246, 0.05) 50%, transparent 60%)
        `,
        zIndex: 0,
      }} />
      
      <Box sx={{ position: 'relative', zIndex: 1 }}>
        <Navigation />
        
        <Container maxWidth="lg" sx={{ py: 3 }}>
          {/* Tech-styled Header */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <Box sx={{
                width: 32,
                height: 32,
                backgroundColor: '#3b82f6',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
              }}>
                <Box sx={{
                  width: 16,
                  height: 3,
                  backgroundColor: '#ffffff',
                  borderRadius: '1.5px',
                  transform: 'rotate(45deg)',
                }} />
              </Box>
              <Typography variant="h3" component="h1" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                X Fund
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ mb: 1, color: '#94a3b8' }}>
              Earn automated yield from curated lending vaults.{' '}
              <Button 
                variant="text" 
                sx={{ 
                  textDecoration: 'underline', 
                  fontSize: '0.875rem',
                  color: '#3b82f6',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#60a5fa',
                    backgroundColor: 'transparent'
                  }
                }}
              >
                How it works
              </Button>
            </Typography>
          </Box>

        <Grid container spacing={3}>
          {/* Left Side - Stats Cards */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 2, 
              maxWidth: 420,
              mx: 'auto'
            }}>
              {/* TVL Card */}
              <Card sx={{ 
                p: 2, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: chartView === 'TVL' 
                  ? 'rgba(52, 211, 153, 0.15)' 
                  : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: chartView === 'TVL'
                  ? '1px solid rgba(52, 211, 153, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                boxShadow: chartView === 'TVL'
                  ? '0 8px 32px rgba(52, 211, 153, 0.2)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)',
                aspectRatio: '1.2 / 1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: chartView === 'TVL'
                    ? '0 12px 40px rgba(52, 211, 153, 0.3)'
                    : '0 12px 40px rgba(255, 255, 255, 0.1)',
                }
              }}
              onClick={() => setChartView('TVL')}
              >
                <Typography variant="h4" fontWeight={700} sx={{ 
                  mb: 0.5, 
                  color: chartView === 'TVL' ? '#34d399' : 'white',
                  transition: 'color 0.3s ease'
                }}>
                  {marsDataLoading ? (
                    <CircularProgress size={24} sx={{ color: '#34d399' }} />
                  ) : marsTvlData?.totalTvlUsd ? (
                    formatCurrency(marsTvlData.totalTvlUsd / 1_000_000, 'USD').replace('$', '$') + 'M'
                  ) : (
                    '$125M'
                  )}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: chartView === 'TVL' ? '#34d399' : '#94a3b8',
                  transition: 'color 0.3s ease'
                }}>
                  TVL
                </Typography>
              </Card>

              {/* Interest Earned Card */}
              <Card sx={{ 
                p: 2, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                aspectRatio: '1.2 / 1',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(255, 255, 255, 0.1)',
                }
              }}>
                <Typography variant="h4" fontWeight={700} sx={{ 
                  mb: 0.5, 
                  color: '#34d399',
                  transition: 'color 0.3s ease'
                }}>
                  {marsDataLoading ? (
                    <CircularProgress size={24} sx={{ color: '#34d399' }} />
                  ) : marsUserEarnings?.totalEarningsUsd ? (
                    formatCurrency(marsUserEarnings.totalEarningsUsd, 'USD')
                  ) : (
                    '$1.32'
                  )}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#94a3b8',
                  transition: 'color 0.3s ease'
                }}>
                  Interest Earned
                </Typography>
              </Card>

              {/* APY Card */}
              <Card sx={{ 
                p: 2, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: chartView === 'APY' 
                  ? 'rgba(96, 165, 250, 0.15)' 
                  : 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: chartView === 'APY'
                  ? '1px solid rgba(96, 165, 250, 0.3)'
                  : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                boxShadow: chartView === 'APY'
                  ? '0 8px 32px rgba(96, 165, 250, 0.2)'
                  : '0 8px 32px rgba(0, 0, 0, 0.3)',
                aspectRatio: '1.2 / 1',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: chartView === 'APY'
                    ? '0 12px 40px rgba(96, 165, 250, 0.3)'
                    : '0 12px 40px rgba(255, 255, 255, 0.1)',
                }
              }}
              onClick={() => setChartView('APY')}
              >
                <Typography variant="h4" fontWeight={700} sx={{ 
                  mb: 0.5, 
                  color: chartView === 'APY' ? '#60a5fa' : 'white',
                  transition: 'color 0.3s ease'
                }}>
                  {marsDataLoading ? (
                    <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
                  ) : marsApyData?.bestApy ? (
                    formatPercentage(marsApyData.bestApy / 100)
                  ) : currentOpportunity ? (
                    formatPercentage(currentOpportunity.apy)
                  ) : (
                    '8.5%'
                  )}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: chartView === 'APY' ? '#60a5fa' : '#94a3b8',
                  transition: 'color 0.3s ease'
                }}>
                  APY
                </Typography>
              </Card>

              {/* Daily Interest Card */}
              <Card sx={{ 
                p: 2, 
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                background: 'rgba(96, 165, 250, 0.15)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(96, 165, 250, 0.3)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(96, 165, 250, 0.2)',
                aspectRatio: '1.2 / 1',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 40px rgba(96, 165, 250, 0.3)',
                }
              }}>
                <Typography variant="h4" fontWeight={700} sx={{ 
                  mb: 0.5, 
                  color: '#60a5fa',
                  transition: 'color 0.3s ease'
                }}>
                  {marsDataLoading ? (
                    <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
                  ) : marsUserEarnings?.dailyEarnings ? (
                    formatCurrency(marsUserEarnings.dailyEarnings, 'USD')
                  ) : (
                    '$0.42'
                  )}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#60a5fa',
                  transition: 'color 0.3s ease'
                }}>
                  Daily Interest
                </Typography>
              </Card>
            </Box>
          </Grid>

          {/* Right Side - Deposit/Withdraw Card */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ 
              p: 2, 
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              {/* Tabs for Deposit/Withdraw */}
              <Box sx={{ display: 'flex', mb: 1.5, borderRadius: 2, p: 0.25, backgroundColor: 'rgba(255, 255, 255, 0.1)' }}>
                <Button
                  onClick={() => setActiveTab(0)}
                  sx={{
                    flex: 1,
                    py: 0.75,
                    px: 1,
                    borderRadius: 1.5,
                    backgroundColor: activeTab === 0 ? '#60a5fa' : 'transparent',
                    color: activeTab === 0 ? 'white' : '#94a3b8',
                    '&:hover': {
                      backgroundColor: activeTab === 0 ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 'auto',
                    '& .MuiButton-startIcon': {
                      marginRight: '6px',
                      marginLeft: 0,
                    }
                  }}
                  startIcon={
                    <Box sx={{ 
                      fontSize: '14px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      lineHeight: 1
                    }}>
                      🏠
                    </Box>
                  }
                >
                  Deposit
                </Button>
                <Button
                  onClick={() => setActiveTab(1)}
                  sx={{
                    flex: 1,
                    py: 0.75,
                    px: 1,
                    borderRadius: 1.5,
                    backgroundColor: activeTab === 1 ? '#60a5fa' : 'transparent',
                    color: activeTab === 1 ? 'white' : '#94a3b8',
                    '&:hover': {
                      backgroundColor: activeTab === 1 ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
                    },
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    minHeight: 'auto',
                    '& .MuiButton-startIcon': {
                      marginRight: '6px',
                      marginLeft: 0,
                    }
                  }}
                  startIcon={
                    <Box sx={{ 
                      fontSize: '14px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      lineHeight: 1
                    }}>
                      📤
                    </Box>
                  }
                >
                  Withdraw
                </Button>
              </Box>

              {/* Tab Content */}
              <Box sx={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)', 
                borderRadius: 2, 
                p: 1.5, 
                mb: 1.5,
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>
                    You Deposit
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    ~$0.00
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                  <FormControl size="small" sx={{ minWidth: 110 }}>
                    <Select
                      value={selectedToken}
                      onChange={(e: any) => setSelectedToken(e.target.value)}
                      renderValue={() => {
                        const token = getCurrentToken();
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '6px',
                                bgcolor: token.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            >
                              {token.symbol[0]}
                            </Box>
                            <Typography sx={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>
                              {token.symbol}
                            </Typography>
                          </Box>
                        );
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 1.5,
                        minHeight: 36,
                        '& .MuiOutlinedInput-notchedOutline': {
                          border: 'none',
                        },
                        '& .MuiSelect-select': {
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.75,
                          color: 'white',
                          py: 0.5,
                          px: 1,
                        },
                        '& .MuiSelect-icon': {
                          color: 'white',
                        },
                      }}
                      MenuProps={{
                        PaperProps: {
                          sx: {
                            backgroundColor: 'rgba(30, 41, 59, 0.95)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: 2,
                          },
                        },
                      }}
                    >
                      {Object.entries(tokenConfigs).map(([key, config]) => (
                        <MenuItem key={key} value={key} sx={{ color: 'white' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: '4px',
                                bgcolor: config.color,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                color: 'white',
                                fontWeight: 'bold',
                              }}
                            >
                              {config.symbol[0]}
                            </Box>
                            {config.symbol}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ flex: 1 }} />
                  <TextField
                    value={activeTab === 0 ? depositAmount : withdrawAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      activeTab === 0 ? setDepositAmount(e.target.value) : setWithdrawAmount(e.target.value)
                    }
                    placeholder="0"
                    size="small"
                    sx={{
                      width: 90,
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        borderRadius: 1.5,
                        minHeight: 36,
                        '& fieldset': { border: 'none' },
                      },
                      '& .MuiOutlinedInput-input': { 
                        color: '#000', 
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '0.9rem',
                        py: 0.5
                      },
                    }}
                  />
                </Box>
                
                <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1.5, fontSize: '0.85rem' }}>
                  Available: {isWalletConnected ? 
                    balanceLoading ? 
                      'Loading...' : 
                      `${getWalletBalance(selectedToken)} ${selectedToken}` 
                    : '0'}
                </Typography>

                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!isWalletConnected}
                    onClick={() => {
                      if (isWalletConnected) {
                        const balance = parseFloat(getWalletBalance(selectedToken).replace(',', ''));
                        setDepositAmount((balance / 2).toString());
                      }
                    }}
                    sx={{
                      flex: 1,
                      py: 0.5,
                      fontSize: '0.8rem',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: '#94a3b8',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 1.5,
                      minHeight: 32,
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                        color: '#64748b',
                      }
                    }}
                  >
                    Half
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!isWalletConnected}
                    onClick={() => {
                      if (isWalletConnected) {
                        const balance = getWalletBalance(selectedToken).replace(',', '');
                        setDepositAmount(balance);
                      }
                    }}
                    sx={{
                      flex: 1,
                      py: 0.5,
                      fontSize: '0.8rem',
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                      color: '#94a3b8',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: 1.5,
                      minHeight: 32,
                      '&:hover': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:disabled': {
                        opacity: 0.5,
                        color: '#64748b',
                      }
                    }}
                  >
                    Max
                  </Button>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="contained"
                disabled={
                  !isWalletConnected || 
                  isProcessing || 
                  (activeTab === 0 ? !depositAmount : !withdrawAmount)
                }
                onClick={activeTab === 0 ? handleDeposit : handleWithdraw}
                sx={{
                  backgroundColor: isWalletConnected ? '#22c55e' : 'rgba(255, 255, 255, 0.1)',
                  color: isWalletConnected ? 'white' : '#94a3b8',
                  fontWeight: 600,
                  py: 1.2,
                  fontSize: '0.9rem',
                  borderRadius: 2,
                  '&:hover': {
                    backgroundColor: isWalletConnected ? '#16a34a' : 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:disabled': {
                    color: '#64748b',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  }
                }}
              >
                {isProcessing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    <span>
                      {transactionStatus.status === 'building' && 'Building Transaction...'}
                      {transactionStatus.status === 'signing' && 'Signing Transaction...'}
                      {transactionStatus.status === 'sending' && 'Sending Transaction...'}
                      {transactionStatus.status === 'pending' && 'Confirming...'}
                    </span>
                  </Box>
                ) : !isWalletConnected ? (
                  'Connect Wallet'
                ) : activeTab === 0 ? (
                  'Deposit'
                ) : (
                  'Withdraw'
                )}
              </Button>

              {/* Transaction Status Display */}
              {transactionStatus.hash && (
                <Alert 
                  severity={
                    transactionStatus.status === 'confirmed' ? 'success' :
                    transactionStatus.status === 'failed' ? 'error' : 'info'
                  }
                  sx={{ 
                    mt: 2, 
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& .MuiAlert-message': { color: 'white' }
                  }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {transactionStatus.status === 'confirmed' && '✅ Transaction Confirmed!'}
                      {transactionStatus.status === 'pending' && '⏳ Transaction Pending...'}
                      {transactionStatus.status === 'failed' && `❌ Transaction Failed: ${transactionStatus.error}`}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      component="a"
                      href={`https://solscan.io/tx/${transactionStatus.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: '#22c55e', 
                        textDecoration: 'underline',
                        '&:hover': { color: '#16a34a' }
                      }}
                    >
                      View on Solscan: {transactionStatus.hash.slice(0, 8)}...{transactionStatus.hash.slice(-8)}
                    </Typography>
                  </Box>
                </Alert>
              )}

              {/* Old deposit form - keeping for reference but hiding */}
              <Box sx={{ display: 'none' }}>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
                  Your Deposit (Legacy)
                </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#94a3b8' }}>
                  Amount
                </Typography>
                <TextField
                  fullWidth
                  value={depositAmount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
                  placeholder="$0.00"
                  variant="outlined"
                  size="small"
                  sx={{ 
                    mb: 1.5,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                      },
                    },
                    '& .MuiOutlinedInput-input': {
                      color: 'white',
                      '&::placeholder': {
                        color: '#94a3b8',
                        opacity: 1,
                      },
                    },
                  }}
                />
                
                <FormControl fullWidth size="small">
                  <Select
                    value={selectedToken}
                    onChange={(e: any) => setSelectedToken(e.target.value)}
                    renderValue={() => {
                      const token = getCurrentToken();
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              bgcolor: token.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              color: 'white',
                              fontWeight: 'bold',
                            }}
                          >
                            {token.symbol[0]}
                          </Box>
                          {token.symbol}
                        </Box>
                      );
                    }}
                    sx={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                      '& .MuiSelect-select': {
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        color: 'white',
                      },
                      '& .MuiSelect-icon': {
                        color: '#94a3b8',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        sx: {
                          backgroundColor: 'rgba(30, 41, 59, 0.95)',
                          backdropFilter: 'blur(10px)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                        },
                      },
                    }}
                  >
                    {Object.entries(tokenConfigs).map(([key, config]) => (
                      <MenuItem key={key} value={key} sx={{ color: 'white' }}>
                        {config.symbol}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Typography variant="body2" sx={{ mb: 0.5, color: '#94a3b8' }}>
                Wallet: {isWalletConnected ? `${getWalletBalance(selectedToken)} ${selectedToken}` : 'Not Connected'}
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1, 
                mb: 2,
              }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  disabled={!isWalletConnected}
                  onClick={() => {
                    if (isWalletConnected) {
                      const balance = parseFloat(getWalletBalance(selectedToken).replace(',', ''));
                      setDepositAmount((balance / 2).toString());
                    }
                  }}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1.5, 
                    py: 0.5, 
                    fontSize: '0.75rem',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#94a3b8',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    }
                  }}
                >
                  Half
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  disabled={!isWalletConnected}
                  onClick={() => {
                    if (isWalletConnected) {
                      const balance = getWalletBalance(selectedToken).replace(',', '');
                      setDepositAmount(balance);
                    }
                  }}
                  sx={{ 
                    minWidth: 'auto', 
                    px: 1.5, 
                    py: 0.5, 
                    fontSize: '0.75rem',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#94a3b8',
                    '&:hover': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    }
                  }}
                >
                  Max
                </Button>
              </Box>



              {/* Error Display */}
              {depositError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {depositError}
                </Alert>
              )}

              {/* Deposit Button */}
              <Button
                fullWidth
                variant="contained"
                disabled={!isWalletConnected || !depositAmount || depositLoading || !currentOpportunity}
                sx={{
                  mt: 2,
                  py: 1.5,
                  background: isWalletConnected 
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    : 'rgba(255, 255, 255, 0.1)',
                  color: isWalletConnected ? 'white' : '#94a3b8',
                  fontWeight: 600,
                  '&:hover': {
                    background: isWalletConnected 
                      ? 'linear-gradient(135deg, #2563eb, #1e40af)'
                      : 'rgba(255, 255, 255, 0.1)',
                  },
                  '&:disabled': {
                    color: '#64748b',
                  },
                }}
                onClick={handleDeposit}
              >
                {depositLoading ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                    Creating Deposit...
                  </>
                ) : (
                  'Deposit'
                )}
              </Button>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {/* Strategy Overview Section */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" fontWeight={600} sx={{ mb: 2, color: 'white' }}>
            Strategy Overview
          </Typography>
          
          <Card sx={{ 
            p: 3, 
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6, color: '#cbd5e1' }}>
              X Fund is a cross-chain, multi-ecosystem automated lending/collateral yield strategy. With
              capital safety and risk control as first priorities, it continuously tracks real-time APY's across top
              collateral markets on major chains (e.g., Solana, Cosmos, and Ethereum L2s) and automatically
              routes funds to the target pools with the best risk-adjusted return at any given moment—aiming
              to deliver stable, maximized risk-adjusted yields.
            </Typography>

            {/* Tech-styled Chart Section */}
            <Box sx={{ 
              p: 2.5, 
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(5px)',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
                    Performance
                  </Typography>
                  <IconButton size="small" sx={{ color: '#94a3b8' }}>
                    <FaInfoCircle />
                  </IconButton>
                </Box>
                
                {/* Chart View Toggle Buttons */}
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={chartView === 'APY' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setChartView('APY')}
                    sx={{
                      minWidth: '60px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      ...(chartView === 'APY' ? {
                        background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(96, 165, 250, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        }
                      } : {
                        borderColor: 'rgba(96, 165, 250, 0.5)',
                        color: '#60a5fa',
                        backgroundColor: 'rgba(96, 165, 250, 0.1)',
                        '&:hover': {
                          borderColor: '#60a5fa',
                          backgroundColor: 'rgba(96, 165, 250, 0.2)',
                        }
                      }),
                    }}
                  >
                    APY
                  </Button>
                  <Button
                    variant={chartView === 'TVL' ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setChartView('TVL')}
                    sx={{
                      minWidth: '60px',
                      py: 0.5,
                      px: 2,
                      borderRadius: 2,
                      textTransform: 'none',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      ...(chartView === 'TVL' ? {
                        background: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(52, 211, 153, 0.4)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        }
                      } : {
                        borderColor: 'rgba(52, 211, 153, 0.5)',
                        color: '#34d399',
                        backgroundColor: 'rgba(52, 211, 153, 0.1)',
                        '&:hover': {
                          borderColor: '#34d399',
                          backgroundColor: 'rgba(52, 211, 153, 0.2)',
                        }
                      }),
                    }}
                  >
                    TVL
                  </Button>
                </Box>
              </Box>
              
              <Box sx={{ height: 250 }}>
                <Line data={currentChartData} options={chartOptions} />
              </Box>
              
              {/* Current Value Display */}
              <Box sx={{ 
                mt: 3, 
                p: 2, 
                background: chartView === 'APY' 
                  ? 'rgba(96, 165, 250, 0.1)' 
                  : 'rgba(52, 211, 153, 0.1)',
                borderRadius: 2,
                border: chartView === 'APY'
                  ? '1px solid rgba(96, 165, 250, 0.2)'
                  : '1px solid rgba(52, 211, 153, 0.2)',
                textAlign: 'center'
              }}>
                <Typography variant="body2" sx={{ 
                  color: '#94a3b8', 
                  mb: 0.5,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em'
                }}>
                  Current {chartView}
                </Typography>
                <Typography variant="h3" fontWeight={700} sx={{ 
                  color: chartView === 'APY' ? '#60a5fa' : '#34d399',
                  mb: 0.5
                }}>
                  {chartView === 'APY' ? '48%' : '$200.45M'}
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  {chartView === 'APY' 
                    ? '↑ +2.3% from last month' 
                    : '↑ +$8.2M from last month'
                  }
                </Typography>
              </Box>
            </Box>
          </Card>

          {/* Transaction History Section */}
          <Card sx={{
            mt: 3,
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 3 }}>
              {/* Header with Tabs */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 3,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                pb: 2
              }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setHistoryView('earning')}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      ...(historyView === 'earning' ? {
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: '#3b82f6',
                        '&:hover': {
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        }
                      } : {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: '#cbd5e1',
                        '&:hover': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }
                      })
                    }}
                  >
                    Earning Details
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setHistoryView('history')}
                    sx={{
                      minWidth: 'auto',
                      px: 2,
                      py: 0.5,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: 2,
                      textTransform: 'none',
                      ...(historyView === 'history' ? {
                        background: 'rgba(59, 130, 246, 0.1)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: '#3b82f6',
                        '&:hover': {
                          borderColor: '#3b82f6',
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        }
                      } : {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                        color: '#cbd5e1',
                        '&:hover': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        }
                      })
                    }}
                  >
                    Transaction History
                  </Button>
                </Box>
              </Box>

              {/* Earnings Calendar - Only show for Earning Details */}
              {historyView === 'earning' && (
                <Box sx={{
                  mb: 3,
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 2,
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden'
                }}>
                  {/* Calendar Header */}
                  <Box sx={{ 
                    p: 2, 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <Typography variant="h6" fontWeight={600} sx={{ color: '#f1f5f9' }}>
                      Earnings Calendar
                    </Typography>
                    
                    {/* Date Selector */}
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        size="small"
                        sx={{
                          color: '#f1f5f9',
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.3)'
                          },
                          '.MuiSvgIcon-root': {
                            color: '#f1f5f9'
                          }
                        }}
                      >
                        <MenuItem value="2024">2024</MenuItem>
                        <MenuItem value="2025">2025</MenuItem>
                        <MenuItem value="2026">2026</MenuItem>
                      </Select>
                      <Select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        size="small"
                        sx={{
                          color: '#f1f5f9',
                          '.MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(255, 255, 255, 0.3)'
                          },
                          '.MuiSvgIcon-root': {
                            color: '#f1f5f9'
                          }
                        }}
                      >
                        <MenuItem value="01">January</MenuItem>
                        <MenuItem value="02">February</MenuItem>
                        <MenuItem value="03">March</MenuItem>
                        <MenuItem value="04">April</MenuItem>
                        <MenuItem value="05">May</MenuItem>
                        <MenuItem value="06">June</MenuItem>
                        <MenuItem value="07">July</MenuItem>
                        <MenuItem value="08">August</MenuItem>
                        <MenuItem value="09">September</MenuItem>
                        <MenuItem value="10">October</MenuItem>
                        <MenuItem value="11">November</MenuItem>
                        <MenuItem value="12">December</MenuItem>
                      </Select>
                    </Box>
                  </Box>

                  {/* Monthly Summary */}
                  <Box sx={{ 
                    p: 3, 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(255, 255, 255, 0.02)'
                  }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>
                        {getMonthName(selectedMonth)} {selectedYear} Total Earnings
                      </Typography>
                      <Typography variant="h4" fontWeight={700} sx={{ color: '#34d399' }}>
                        +$1.32
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>
                        Active Days
                      </Typography>
                      <Typography variant="h5" fontWeight={600} sx={{ color: '#60a5fa' }}>
                        3 days
                      </Typography>
                    </Box>
                  </Box>
                  
                  {/* Calendar Grid */}
                  <Box sx={{ p: 2 }}>
                    {/* Calendar Header - Days of Week */}
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 1,
                      mb: 1
                    }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <Typography 
                          key={day}
                          variant="body2" 
                          sx={{ 
                            color: '#94a3b8', 
                            fontSize: '0.75rem', 
                            fontWeight: 600,
                            textAlign: 'center',
                            p: 1
                          }}
                        >
                          {day}
                        </Typography>
                      ))}
                    </Box>

                    {/* Calendar Days */}
                    <Box sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(7, 1fr)',
                      gap: 1
                    }}>
                      {/* Generate calendar days */}
                      {(() => {
                        const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
                        const firstDay = getFirstDayOfMonth(selectedYear, selectedMonth);
                        const calendarDays = [];
                        
                        // Add empty cells for days before the first day of the month
                        for (let i = 0; i < firstDay; i++) {
                          calendarDays.push(
                            <Box key={`empty-${i}`} sx={{ minHeight: 60 }}></Box>
                          );
                        }
                        
                        // Add actual days of the month
                        for (let day = 1; day <= daysInMonth; day++) {
                          // Sample earning data (only for September 2025)
                          const hasEarning = selectedYear === '2025' && selectedMonth === '09' && [27, 28, 29].includes(day);
                          const earnings = hasEarning ? 
                            (day === 27 ? '+$0.52' : day === 28 ? '+$0.38' : '+$0.42') : null;
                          const isSelected = selectedDay === day;
                          
                          calendarDays.push(
                            <Box
                              key={day}
                              onClick={() => setSelectedDay(selectedDay === day ? null : day)}
                              sx={{
                                minHeight: 60,
                                p: 1,
                                border: `1px solid ${isSelected ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)'}`,
                                borderRadius: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                backgroundColor: isSelected 
                                  ? 'rgba(96, 165, 250, 0.2)' 
                                  : hasEarning 
                                  ? 'rgba(52, 211, 153, 0.1)' 
                                  : 'transparent',
                                '&:hover': {
                                  background: isSelected 
                                    ? 'rgba(96, 165, 250, 0.3)'
                                    : hasEarning 
                                    ? 'rgba(52, 211, 153, 0.2)' 
                                    : 'rgba(255, 255, 255, 0.05)'
                                }
                              }}
                            >
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: isSelected 
                                    ? '#60a5fa' 
                                    : hasEarning 
                                    ? '#34d399' 
                                    : '#f1f5f9',
                                  fontSize: '0.875rem',
                                  fontWeight: isSelected || hasEarning ? 600 : 400,
                                  mb: hasEarning ? 0.5 : 0
                                }}
                              >
                                {day}
                              </Typography>
                              {hasEarning && (
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    color: '#34d399',
                                    fontSize: '0.625rem',
                                    fontWeight: 600
                                  }}
                                >
                                  {earnings}
                                </Typography>
                              )}
                            </Box>
                          );
                        }
                        
                        return calendarDays;
                      })()}
                    </Box>
                  </Box>
                </Box>
              )}

              {/* Transaction History Table - Only show for Transaction History tab */}
              {historyView === 'history' && (
                <Box sx={{
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}>
                  {/* Table Header */}
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr',
                    gap: 2,
                    p: 2,
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Date
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Type
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Tokens
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      color: '#94a3b8',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em'
                    }}>
                      Value
                    </Typography>
                  </Box>

                  {/* Transaction Rows */}
                  {transactionHistory.map((transaction, index) => (
                    <Box key={index} sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr 1fr 1fr',
                      gap: 2,
                      p: 2,
                      borderBottom: index < transactionHistory.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.05)'
                      }
                    }}>
                      <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '0.875rem' }}>
                        {transaction.date}
                      </Typography>
                      <Typography variant="body2" sx={{ 
                        color: transaction.type === 'deposit' ? '#34d399' : '#ef4444', 
                        fontSize: '0.875rem', 
                        fontWeight: 600,
                        textTransform: 'capitalize'
                      }}>
                        {transaction.type}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '0.875rem' }}>
                        {transaction.tokens}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#f1f5f9', fontSize: '0.875rem' }}>
                        {transaction.value}
                      </Typography>
                    </Box>
                  ))}
                  
                  {/* Empty state if no transactions */}
                  {transactionHistory.length === 0 && (
                    <Box sx={{
                      p: 4,
                      textAlign: 'center'
                    }}>
                      <Typography variant="body2" sx={{ color: '#cbd5e1', fontSize: '0.875rem' }}>
                        No transaction history found
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

            </Box>
          </Card>
        </Box>
      </Container>
    </Box>
  </Box>
  );
};

export default XFundPage;