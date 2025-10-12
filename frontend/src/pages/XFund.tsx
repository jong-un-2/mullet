import { useState, useEffect } from 'react';
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
import { useWallet } from '@solana/wallet-adapter-react';
import { useMarsOpportunities, getUserWalletAddress, formatCurrency, formatPercentage } from '../hooks/useMarsApi';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import { useMarsProtocolData } from '../hooks/useMarsData';
import { useMarsContract } from '../hooks/useMarsContract';
import { useUserVaultPosition } from '../hooks/useUserVaultPosition';
import { TransactionProgress } from '../components/TransactionProgress';
import { createConfig, getRoutes, executeRoute, EVM, Solana } from '@lifi/sdk';
import type { RoutesRequest } from '@lifi/sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { useWallets as useEvmWallets } from '@privy-io/react-auth';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';

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

const XFundPage = () => {
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [chartView, setChartView] = useState<'TVL' | 'APY'>('APY');
  const [activeTab, setActiveTab] = useState(0); // 0 = Deposit, 1 = Withdraw (default to Deposit)
  const [historyView, setHistoryView] = useState<'earning' | 'history'>('earning');
  
  // Calendar state management - Default to today's date
  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((today.getMonth() + 1).toString().padStart(2, '0'));
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  // Transaction progress state
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [currentTxStep, setCurrentTxStep] = useState(0);
  const [totalTxSteps, setTotalTxSteps] = useState(0);
  const [txSignature, setTxSignature] = useState<string | undefined>();

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
  
  // Wallet connection states  
  const { authenticated, user } = usePrivy();
  const { isConnected: ethConnected, address: ethAddress } = useAccount();
  const { wallets: solanaWallets } = useWallets();
  const { wallets: evmWallets } = useEvmWallets(); // For LiFi cross-chain swaps
  
  // Safely get Solana wallet adapter context
  let solanaPublicKey: any = null;
  let directSolanaConnected = false;
  
  try {
    const walletContext = useWallet();
    solanaPublicKey = walletContext.publicKey;
    directSolanaConnected = walletContext.connected;
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
  
  // Mars API hooks (已弃用，现在使用 useMarsContract 直接与合约交互)
  const { opportunities, loading: opportunitiesLoading } = useMarsOpportunities();
  
  // Mars Contract Hook - 直接与 Mars 合约交互
  const marsContract = useMarsContract();
  
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



  // 监控交易状态并更新进度消息
  useEffect(() => {
    if (!showProgress) return;
    
    switch (marsContract.status) {
      case 'building':
        setProgressMessage('Building transaction...');
        break;
      case 'signing':
        setProgressMessage('Waiting for wallet confirmation...');
        break;
      case 'sending':
        setProgressMessage('Sending transaction to network...');
        break;
      case 'confirming':
        setProgressMessage('Confirming transaction...');
        break;
      case 'success':
        // 成功消息在 handler 中设置
        break;
      case 'error':
        setProgressMessage(marsContract.error || 'Transaction failed');
        setTimeout(() => setShowProgress(false), 6000);
        break;
    }
  }, [marsContract.status, marsContract.error, showProgress]);

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
  
  // Get user's vault position (Total Supplied)
  const userVaultPosition = useUserVaultPosition(userWalletAddress || null);
  
  // Get real wallet balance for selected token
  const getWalletBalance = (token: string) => {
    if (!isWalletConnected) return '0';
    return getSolanaBalance(token) || '0';
  };

  // Handle deposit action - 支持 USDT/USDC 自动兑换成 PYUSD
  const handleDeposit = async () => {
    if (!isWalletConnected || !userWalletAddress || !depositAmount) {
      console.error('❌ Missing data for deposit');
      setShowProgress(true);
      setProgressTitle('Validation Error');
      setProgressMessage('Please connect wallet and enter deposit amount');
      setTotalTxSteps(0);
      setTimeout(() => setShowProgress(false), 6000);
      return;
    }

    const amount = parseFloat(depositAmount);

    try {
      // 如果选择 PYUSD，直接存款
      if (selectedToken === 'PYUSD') {
        console.log('🚀 开始 PYUSD 存款并质押到 Farm...');
        
        setShowProgress(true);
        setProgressTitle(`Depositing ${amount} PYUSD`);
        setTotalTxSteps(1);
        setCurrentTxStep(1);
        setProgressMessage('Processing deposit...');
        
        const DEPOSIT_TIMEOUT = 60000;
        const depositPromise = marsContract.deposit(amount);
        const timeoutPromise = new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout after 60 seconds')), DEPOSIT_TIMEOUT)
        );
        
        const signature = await Promise.race([depositPromise, timeoutPromise]);
        
        if (signature) {
          console.log('✅ 存款成功!');
          setTxSignature(signature);
          setProgressMessage(`Transaction confirmed!`);
          setDepositAmount('');
          
          setTimeout(() => {
            setShowProgress(false);
            setTxSignature(undefined);
          }, 6000);
        }
        return;
      }

      // 如果选择 USDT/USDC，需要通过 LiFi 兑换成 PYUSD
      console.log(`� 开始 ${selectedToken} → PYUSD 兑换并存款...`);
      
      setShowProgress(true);
      setProgressTitle(`Depositing ${amount} ${selectedToken}`);
      setTotalTxSteps(2);
      setCurrentTxStep(1);
      setProgressMessage('Step 1: Getting swap quote...');

      // Token addresses
      const TOKEN_ADDRESSES: Record<string, { solana: string; ethereum: string; decimals: number }> = {
        USDC: {
          solana: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          ethereum: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          decimals: 6
        },
        USDT: {
          solana: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          ethereum: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
          decimals: 6
        },
        PYUSD: {
          solana: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
          ethereum: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
          decimals: 6
        }
      };

      // 优先使用 Solana，其次 Ethereum
      const useSolana = solanaWallets.length > 0;
      const fromChainId = useSolana ? 1151111081099710 : 1; // Solana or Ethereum
      const toChainId = 1151111081099710; // PYUSD on Solana
      
      const fromToken = useSolana ? TOKEN_ADDRESSES[selectedToken].solana : TOKEN_ADDRESSES[selectedToken].ethereum;
      const toToken = TOKEN_ADDRESSES.PYUSD.solana;
      const fromAmount = (amount * Math.pow(10, TOKEN_ADDRESSES[selectedToken].decimals)).toString();
      
      console.log(`� From: ${selectedToken} on ${useSolana ? 'Solana' : 'Ethereum'}`);
      console.log(`� To: PYUSD on Solana`);
      console.log(`� Amount: ${amount}`);

      // Get route from LiFi
      const routeRequest: RoutesRequest = {
        fromChainId: fromChainId,
        toChainId: toChainId,
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAmount: fromAmount,
        fromAddress: userWalletAddress,
        toAddress: userWalletAddress,
      };

      const routesResponse = await getRoutes(routeRequest);
      
      if (!routesResponse || !routesResponse.routes || routesResponse.routes.length === 0) {
        throw new Error('Failed to get swap route');
      }

      const route = routesResponse.routes[0]; // Use the best route
      console.log('✅ Got LiFi route:', route);
      setProgressMessage('Step 2: Executing swap...');
      setCurrentTxStep(2);

      // Configure LiFi SDK providers
      const providers: any[] = [];
      
      // Always add Solana provider if available (for receiving PYUSD)
      if (solanaWallets.length > 0) {
        const solanaWallet = solanaWallets[0];
        
        // Create a wrapper adapter that implements all required SignerWalletAdapter methods
        const walletAdapter = {
          publicKey: new PublicKey(solanaWallet.address),
          signTransaction: async (transaction: Transaction | VersionedTransaction) => {
            // Serialize transaction to bytes for Privy
            const serializedTx = transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            });
            
            // Sign with Privy wallet
            const result = await solanaWallet.signTransaction({ transaction: serializedTx });
            
            // Parse the signed transaction back
            if ('version' in transaction) {
              return VersionedTransaction.deserialize(new Uint8Array(result.signedTransaction));
            } else {
              return Transaction.from(new Uint8Array(result.signedTransaction));
            }
          },
          signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
            // Sign transactions one by one since Privy doesn't have signAllTransactions
            const signedTxs = await Promise.all(
              transactions.map(async (tx) => {
                const serializedTx = tx.serialize({
                  requireAllSignatures: false,
                  verifySignatures: false,
                });
                const result = await solanaWallet.signTransaction({ transaction: serializedTx });
                
                if ('version' in tx) {
                  return VersionedTransaction.deserialize(new Uint8Array(result.signedTransaction));
                } else {
                  return Transaction.from(new Uint8Array(result.signedTransaction));
                }
              })
            );
            return signedTxs;
          },
          signMessage: async (message: Uint8Array) => {
            const result = await solanaWallet.signMessage({ message });
            return result.signature;
          },
          // These properties are required by some wallet adapters
          toString: () => solanaWallet.address,
          toJSON: () => solanaWallet.address,
        };
        
        const solanaProvider = Solana({
          getWalletAdapter: async () => {
            return walletAdapter as any;
          }
        });
        
        providers.push(solanaProvider);
      }
      
      // Add EVM provider if using Ethereum
      if (!useSolana && evmWallets.length > 0) {
        const evmWallet = evmWallets[0];
        const provider = await evmWallet.getEthereumProvider();
        
        if (!provider) {
          throw new Error('Failed to get EVM wallet provider');
        }
        
        const walletClient = createWalletClient({
          account: evmWallet.address as `0x${string}`,
          chain: mainnet,
          transport: custom(provider)
        });
        
        const evmProvider = EVM({ 
          getWalletClient: async () => walletClient 
        });
        
        providers.push(evmProvider);
      }
      
      createConfig({
        integrator: 'MarsLiquid',
        apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
        providers: providers,
      });

      // Execute swap
      const result = await executeRoute(route, {
        updateRouteHook: () => {
          console.log('🔄 Swap in progress...');
        },
        executeInBackground: false,
      });

      console.log('✅ Swap completed:', result);
      
      // Now deposit the swapped PYUSD
      setProgressTitle('Depositing PYUSD');
      setProgressMessage('Processing deposit to vault...');
      
      const DEPOSIT_TIMEOUT = 60000;
      const depositPromise = marsContract.deposit(amount);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Deposit timeout after 60 seconds')), DEPOSIT_TIMEOUT)
      );
      
      const signature = await Promise.race([depositPromise, timeoutPromise]);
      
      if (signature) {
        console.log('✅ 存款成功!');
        setTxSignature(signature);
        setProgressMessage(`Transaction confirmed!`);
        setDepositAmount('');
        
        setTimeout(() => {
          setShowProgress(false);
          setTxSignature(undefined);
        }, 6000);
      }
      
    } catch (error) {
      console.error('❌ Deposit/Swap failed:', error);
      setProgressMessage(error instanceof Error ? error.message : '未知错误');
      
      setTimeout(() => {
        setShowProgress(false);
      }, 6000);
    }
  };

  // Handle withdraw action - 使用 Mars 合约直接取款
  const handleWithdraw = async () => {
    if (!isWalletConnected || !userWalletAddress || !withdrawAmount) {
      console.error('❌ Missing data for withdrawal');
      setShowProgress(true);
      setProgressTitle('Validation Error');
      setProgressMessage('Please connect wallet and enter withdrawal amount');
      setTotalTxSteps(0);
      setTimeout(() => setShowProgress(false), 6000);
      return;
    }

    try {
      const amount = parseFloat(withdrawAmount);
      const needsSwap = selectedToken !== 'PYUSD'; // 如果不是 PYUSD，需要 swap
      
      console.log('🚀 Starting withdrawal process...');
      if (needsSwap) {
        console.log(`  Withdraw PYUSD from vault → Swap to ${selectedToken}`);
      } else {
        console.log('  Withdraw PYUSD from vault (no swap needed)');
      }
      
      // Withdraw from vault has multiple steps
      setShowProgress(true);
      setProgressTitle(`Withdrawing ${amount} ${selectedToken}`);
      // Set initial steps based on whether we need swap
      const totalSteps = needsSwap ? 4 : 3; // vault steps (3) + optional swap step (1)
      setTotalTxSteps(totalSteps);
      setCurrentTxStep(1);
      setProgressMessage('Step 1: Preparing withdrawal from vault...');
      
      const WITHDRAW_TIMEOUT = 60000; // 60 seconds
      const withdrawPromise = marsContract.withdraw(amount, (step, txName) => {
        // Update progress as vault transaction progresses
        setCurrentTxStep(step);
        setProgressMessage(`Step ${step} of ${totalSteps}: ${txName}...`);
      });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Withdrawal timeout after 60 seconds')), WITHDRAW_TIMEOUT)
      );
      
      const signatures = await Promise.race([withdrawPromise, timeoutPromise]);
      
      if (!signatures || signatures.length === 0) {
        throw new Error('Withdrawal failed - no signatures received');
      }

      console.log('✅ PYUSD withdrawn from vault');
      console.log(`  Transaction: https://solscan.io/tx/${signatures[0]}`);
      setTxSignature(signatures[0]);
      
      // 如果选择的是 PYUSD，则不需要 swap，直接完成
      if (!needsSwap) {
        console.log('✅ Withdrawal completed (no swap needed)');
        setCurrentTxStep(totalSteps);
        setProgressMessage(`✅ Successfully withdrawn ${amount} PYUSD!`);
        
        // Clear form
        setWithdrawAmount('');
        
        // Hide progress after 6 seconds
        setTimeout(() => {
          setShowProgress(false);
          setTxSignature(undefined);
        }, 6000);
        
        return; // 提前返回，不执行 swap
      }
      
      // 需要 swap 的情况：继续执行 swap 逻辑
      const finalStep = 4; // Last step is the swap
      setCurrentTxStep(finalStep);
      setProgressMessage(`Step ${finalStep} of ${finalStep}: Swapping PYUSD to ${selectedToken}...`);
      
      // Token addresses on Solana
      const tokenAddresses = {
        PYUSD: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
        USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      };

      const fromToken = tokenAddresses.PYUSD;
      const toToken = tokenAddresses[selectedToken as 'USDC' | 'USDT'];
      
      // Request LiFi swap route
      const routesRequest: RoutesRequest = {
        fromChainId: 1151111081099710, // Solana
        toChainId: 1151111081099710,   // Solana
        fromTokenAddress: fromToken,
        toTokenAddress: toToken,
        fromAddress: solanaWallets[0].address,
        toAddress: solanaWallets[0].address,
        fromAmount: (amount * 1_000_000).toString(), // PYUSD uses 6 decimals
      };

      console.log('📡 Requesting LiFi swap route (PYUSD → ' + selectedToken + ')...');
      const routesResponse = await getRoutes(routesRequest);
      
      if (!routesResponse || !routesResponse.routes || routesResponse.routes.length === 0) {
        throw new Error('No swap routes found for PYUSD → ' + selectedToken);
      }

      const route = routesResponse.routes[0];
      console.log('✅ Got LiFi swap route:', route);

      // Configure LiFi SDK for Solana
      const solanaWallet = solanaWallets[0];
      const walletAdapter = {
        publicKey: new PublicKey(solanaWallet.address),
        signTransaction: async (transaction: Transaction | VersionedTransaction) => {
          const serializedTx = transaction.serialize({
            requireAllSignatures: false,
            verifySignatures: false,
          });
          const result = await solanaWallet.signTransaction({ transaction: serializedTx });
          if ('version' in transaction) {
            return VersionedTransaction.deserialize(new Uint8Array(result.signedTransaction));
          } else {
            return Transaction.from(new Uint8Array(result.signedTransaction));
          }
        },
        signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
          const signedTxs = await Promise.all(
            transactions.map(async (tx) => {
              const serializedTx = tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              });
              const result = await solanaWallet.signTransaction({ transaction: serializedTx });
              if ('version' in tx) {
                return VersionedTransaction.deserialize(new Uint8Array(result.signedTransaction));
              } else {
                return Transaction.from(new Uint8Array(result.signedTransaction));
              }
            })
          );
          return signedTxs;
        },
        signMessage: async (message: Uint8Array) => {
          const result = await solanaWallet.signMessage({ message });
          return result.signature;
        },
        toString: () => solanaWallet.address,
        toJSON: () => solanaWallet.address,
      };

      const solanaProvider = Solana({
        getWalletAdapter: async () => walletAdapter as any
      });

      createConfig({
        integrator: 'MarsLiquid',
        apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
        providers: [solanaProvider],
      });

      // Execute swap
      console.log('🔄 Executing swap...');
      const swapResult = await executeRoute(route, {
        updateRouteHook: () => {
          console.log('🔄 Swap in progress...');
        },
        executeInBackground: false,
      });

      console.log('✅ Swap completed:', swapResult);
      
      // Success!
      const completedStep = 4;
      setCurrentTxStep(completedStep);
      setTotalTxSteps(completedStep);
      setProgressMessage(`✅ Successfully withdrawn and swapped to ${selectedToken}!`);
      
      // Clear form
      setWithdrawAmount('');
      
      // Hide progress after 6 seconds
      setTimeout(() => {
        setShowProgress(false);
        setTxSignature(undefined);
      }, 6000);
      
    } catch (error) {
      console.error('❌ Withdrawal/Swap failed:', error);
      setProgressMessage(error instanceof Error ? error.message : 'Unknown error');
      
      setTimeout(() => {
        setShowProgress(false);
      }, 6000);
    }
  };


  const tokenConfigs = {
    USDC: { symbol: 'USDC', name: 'USD Coin', color: '#2775ca' },
    USDT: { symbol: 'USDT', name: 'Tether USD', color: '#26a17b' },
    PYUSD: { symbol: 'PYUSD', name: 'PayPal USD', color: '#0070ba' },
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
              Better for Borrowers, Simpler for Lenders - now with $2m+ in incentives and a bunch of new assets. 
              This is just the beginning though, we need your feedback to improve:{' '}
              <Button 
                variant="text" 
                component="a"
                href="https://feedback.marsliquidity.com"
                target="_blank"
                rel="noopener noreferrer"
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
                feedback.marsliquidity.com
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
                  {userVaultPosition.loading ? (
                    <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
                  ) : userVaultPosition.totalAPY > 0 ? (
                    formatPercentage(userVaultPosition.totalAPY)
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
                  {userVaultPosition.loading ? (
                    <CircularProgress size={24} sx={{ color: '#60a5fa' }} />
                  ) : userVaultPosition.dailyInterestUSD > 0 ? (
                    formatCurrency(userVaultPosition.dailyInterestUSD, 'USD')
                  ) : marsUserEarnings?.dailyEarnings ? (
                    formatCurrency(marsUserEarnings.dailyEarnings, 'USD')
                  ) : (
                    '$0.00'
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
                    {activeTab === 0 ? 'You Deposit' : 'You Withdraw'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                    {activeTab === 0 
                      ? '~$0.00' 
                      : isWalletConnected && userVaultPosition.totalSupplied > 0
                        ? `${userVaultPosition.totalSupplied.toFixed(4)} PYUSD`
                        : '0 PYUSD'
                    }
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
                      {Object.entries(tokenConfigs)
                        .map(([key, config]) => (
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
                
                {activeTab === 0 && (
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1.5, fontSize: '0.85rem' }}>
                    Available: {isWalletConnected ? 
                      (balanceLoading || userVaultPosition.loading) ? 
                        'Loading...' : 
                        `${getWalletBalance(selectedToken)} ${selectedToken}`
                      : '0'}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!isWalletConnected}
                    onClick={() => {
                      if (isWalletConnected) {
                        if (activeTab === 0) {
                          const balance = parseFloat(getWalletBalance(selectedToken).replace(',', ''));
                          setDepositAmount((balance / 2).toString());
                        } else {
                          // For withdraw, use half of vault deposited amount
                          const deposited = selectedToken === 'PYUSD' 
                            ? userVaultPosition.totalSupplied 
                            : 0;
                          setWithdrawAmount((deposited / 2).toString());
                        }
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
                        if (activeTab === 0) {
                          const balance = getWalletBalance(selectedToken).replace(',', '');
                          setDepositAmount(balance);
                        } else {
                          // For withdraw, use max vault deposited amount
                          const deposited = selectedToken === 'PYUSD' 
                            ? userVaultPosition.totalSupplied 
                            : 0;
                          setWithdrawAmount(deposited.toString());
                        }
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
                  marsContract.isProcessing || 
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
                {marsContract.isProcessing ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} sx={{ color: 'white' }} />
                    <span>
                      {marsContract.status === 'building' && 'Building Transaction...'}
                      {marsContract.status === 'signing' && 'Signing Transaction...'}
                      {marsContract.status === 'sending' && 'Sending Transaction...'}
                      {marsContract.status === 'confirming' && 'Confirming...'}
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
              {marsContract.error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {marsContract.error}
                </Alert>
              )}

              {/* Status Display */}
              {marsContract.status !== 'idle' && marsContract.status !== 'success' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Status: {marsContract.status}
                  {marsContract.currentSignature && (
                    <Box sx={{ mt: 1 }}>
                      <a 
                        href={`https://solscan.io/tx/${marsContract.currentSignature}?cluster=mainnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3b82f6', textDecoration: 'underline' }}
                      >
                        View on Solscan
                      </a>
                    </Box>
                  )}
                </Alert>
              )}

              {/* Deposit Button */}
              <Button
                fullWidth
                variant="contained"
                disabled={!isWalletConnected || !depositAmount || marsContract.isProcessing || !currentOpportunity}
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
                {marsContract.isProcessing ? (
                  <>
                    <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                    {marsContract.status === 'building' && 'Building Transaction...'}
                    {marsContract.status === 'signing' && 'Waiting for Signature...'}
                    {marsContract.status === 'sending' && 'Sending Transaction...'}
                    {marsContract.status === 'confirming' && 'Confirming...'}
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
                      <Button
                        size="small"
                        onClick={() => {
                          const now = new Date();
                          setSelectedYear(now.getFullYear().toString());
                          setSelectedMonth((now.getMonth() + 1).toString().padStart(2, '0'));
                          setSelectedDay(now.getDate());
                        }}
                        sx={{
                          color: '#f59e0b',
                          borderColor: '#f59e0b',
                          backgroundColor: 'rgba(245, 158, 11, 0.1)',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          px: 2,
                          '&:hover': {
                            backgroundColor: 'rgba(245, 158, 11, 0.2)',
                            borderColor: '#fbbf24',
                          }
                        }}
                        variant="outlined"
                      >
                        Today
                      </Button>
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
                          // Check if this day is today
                          const isToday = today.getDate() === day && 
                                         today.getMonth() + 1 === parseInt(selectedMonth) && 
                                         today.getFullYear() === parseInt(selectedYear);
                          
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
                                border: isSelected 
                                  ? '2px solid #60a5fa' 
                                  : isToday 
                                  ? '2px solid #f59e0b' 
                                  : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                position: 'relative',
                                backgroundColor: isSelected 
                                  ? 'rgba(96, 165, 250, 0.2)' 
                                  : isToday 
                                  ? 'rgba(245, 158, 11, 0.1)' 
                                  : hasEarning 
                                  ? 'rgba(52, 211, 153, 0.1)' 
                                  : 'transparent',
                                '&:hover': {
                                  background: isSelected 
                                    ? 'rgba(96, 165, 250, 0.3)'
                                    : isToday 
                                    ? 'rgba(245, 158, 11, 0.2)' 
                                    : hasEarning 
                                    ? 'rgba(52, 211, 153, 0.2)' 
                                    : 'rgba(255, 255, 255, 0.05)'
                                }
                              }}
                            >
                              {isToday && (
                                <Typography 
                                  variant="caption" 
                                  sx={{ 
                                    position: 'absolute',
                                    top: 2,
                                    right: 4,
                                    color: '#f59e0b',
                                    fontSize: '0.5rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  Today
                                </Typography>
                              )}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  color: isSelected 
                                    ? '#60a5fa' 
                                    : isToday 
                                    ? '#f59e0b' 
                                    : hasEarning 
                                    ? '#34d399' 
                                    : '#f1f5f9',
                                  fontSize: '0.875rem',
                                  fontWeight: isSelected || isToday || hasEarning ? 700 : 400,
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

    {/* Transaction Progress Indicator */}
    <TransactionProgress
      open={showProgress}
      status={marsContract.status}
      title={progressTitle}
      message={progressMessage}
      currentStep={currentTxStep}
      totalSteps={totalTxSteps}
      error={marsContract.error}
      txSignature={txSignature}
    />
  </Box>
  );
};

export default XFundPage;