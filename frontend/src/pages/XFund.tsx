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
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useWallets } from '@privy-io/react-auth/solana';
import { useWallet } from '@solana/wallet-adapter-react';
import { useMarsOpportunities, getUserWalletAddress, formatPercentage } from '../hooks/useMarsApi';
import { useSolanaBalance } from '../hooks/useSolanaBalance';
import { checkBalance } from '../services/balanceService';
import { useVaultTransactions, useVaultEarningDetails } from '../hooks/useVaultData';
import { useVaultHistoricalData } from '../hooks/useVaultHistoricalData';
import { useMarsContract } from '../hooks/useMarsContract';
import { useUserVaultPosition, refreshUserPositions } from '../hooks/useUserVaultPosition';
import { TransactionProgress } from '../components/TransactionProgress';
import { TokenIcon } from '../components/ChainIcons';
import { SOLANA_CHAIN_ID, SUPPORTED_CHAINS } from '../services/marsLiFiService';
import { createConfig, getRoutes, executeRoute, EVM, Solana } from '@lifi/sdk';
import type { RoutesRequest } from '@lifi/sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { useWallets as useEvmWallets } from '@privy-io/react-auth';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { useWalletContext } from '../contexts/WalletContext';

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
  const { primaryWallet } = useWalletContext(); // Get primary wallet type
  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('PYUSD-Solana'); // Format: TOKEN-Chain
  const [chartView, setChartView] = useState<'TVL' | 'APY'>('APY');
  const [activeTab, setActiveTab] = useState(0); // 0 = Deposit, 1 = Withdraw (default to Deposit)
  const [historyView, setHistoryView] = useState<'earning' | 'history'>('earning');
  const [amountError, setAmountError] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0); // 用于触发余额和持仓刷新
  
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
  
  // Claim rewards state
  const [isClaimingRewards, setIsClaimingRewards] = useState(false);
  
  // Multi-chain balance state
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: {solana: string, evm: string, total: string}}>({});

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

  // Vault historical data for charts (APY and TVL trends)
  const {
    data: vaultHistoricalData,
  } = useVaultHistoricalData(undefined, 30); // Get 30 days of data

  // Calendar data for earnings - using real Neon database
  // Don't specify vault address to get all user transactions across all vaults
  // Calendar data is now computed from earning details
  // const { 
  //   data: calendarData,
  //   loading: calendarLoading 
  // } = useVaultCalendar(
  //   userWalletAddress,
  //   parseInt(selectedYear),
  //   parseInt(selectedMonth)
  // );

  // Transaction history - using real Neon database
  // Don't specify vault address to get all user transactions
  const {
    data: vaultTransactionsData
  } = useVaultTransactions(userWalletAddress);

  // Earning details - using real Neon database
  const {
    data: vaultEarningDetailsData
  } = useVaultEarningDetails(userWalletAddress);



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
  const { getBalance: getSolanaBalance } = useSolanaBalance(userWalletAddress);
  
  // Get user's vault position from backend (cached data, auto-refresh every 60s)
  const userVaultPosition = useUserVaultPosition(userWalletAddress || null, refreshTrigger);
  
  // Unified function to refresh user positions from blockchain
  const forceRefreshPositions = async () => {
    console.log('🔄 Refreshing balances and position...');
    if (userWalletAddress) {
      try {
        // Call backend to refresh from blockchain
        await refreshUserPositions(userWalletAddress);
        console.log('✅ Position refreshed from blockchain');
        // Wait 15 seconds for backend to process and cache the data
        await new Promise(resolve => setTimeout(resolve, 15000));
        // Trigger frontend to fetch the updated data
        setRefreshTrigger(prev => prev + 1);
        console.log('✅ Frontend data refreshed');
      } catch (error) {
        console.error('⚠️ Failed to refresh position:', error);
        // Still trigger refresh even if backend call fails
        setRefreshTrigger(prev => prev + 1);
      }
    } else {
      // No user wallet, just trigger frontend refresh
      setRefreshTrigger(prev => prev + 1);
    }
  };
  
  // Calculate current vault stats from historical data
  const getCurrentVaultStats = () => {
    if (!vaultHistoricalData?.historical || vaultHistoricalData.historical.length === 0) {
      return {
        currentApy: 0,
        currentTvl: 0,
        apyChange: 0,
        tvlChange: 0,
        apyChangePercent: 0,
      };
    }

    const data = vaultHistoricalData.historical;
    const latest = data[data.length - 1];
    
    // Find data from 30 days ago for comparison
    const thirtyDaysAgo = data.length > 1 ? data[0] : latest;
    
    const currentApy = latest.totalApy * 100; // Convert to percentage
    const currentTvl = latest.totalSuppliedUsd;
    const previousApy = thirtyDaysAgo.totalApy * 100;
    const previousTvl = thirtyDaysAgo.totalSuppliedUsd;
    
    const apyChange = currentApy - previousApy;
    const tvlChange = currentTvl - previousTvl;
    const apyChangePercent = previousApy > 0 ? (apyChange / previousApy) * 100 : 0;
    
    return {
      currentApy,
      currentTvl,
      apyChange,
      tvlChange,
      apyChangePercent,
    };
  };

  const vaultStats = getCurrentVaultStats();
  
  // Get unified wallet balance for selected token (checks both Solana and EVM)
  const getWalletBalance = (token: string) => {
    if (!isWalletConnected) return '0';
    
    // 优先返回 Solana 余额
    const solanaBalance = getSolanaBalance(token) || '0';
    
    // 如果有缓存的余额数据，返回总余额
    if (tokenBalances[token]) {
      return tokenBalances[token].total;
    }
    
    // Fallback to Solana balance
    return solanaBalance;
  };
  
  // Fetch multi-chain balances for selected token
  useEffect(() => {
    const fetchBalances = async () => {
      if (!isWalletConnected || !selectedToken) return;
      
      const token = getCurrentToken();
      if (!token) return;
      
      let balance = '0';
      
      try {
        // 根据链类型检查余额
        // EVM 链（USDC, USDT, ETH, PYUSD on Ethereum）使用 ETH 钱包地址
        // Solana 链使用 Solana 钱包地址
        const walletAddress = token.chainId === SOLANA_CHAIN_ID ? userWalletAddress : ethAddress;
        
        if (token.chainId === SOLANA_CHAIN_ID && userWalletAddress) {
          console.log(`🔍 Checking Solana balance for ${token.symbol}...`);
          const solResult = await checkBalance(
            token.address,
            token.chainId,
            walletAddress!,
            token.decimals
          );
          balance = solResult.formatted;
          console.log(`✅ Solana ${token.symbol}: ${balance}`);
        } else if (token.chainId !== SOLANA_CHAIN_ID && ethAddress) {
          console.log(`🔍 Checking EVM balance for ${token.symbol}...`);
          const ethResult = await checkBalance(
            token.address,
            token.chainId,
            walletAddress!,
            token.decimals
          );
          balance = ethResult.formatted;
          console.log(`✅ EVM ${token.symbol}: ${balance}`);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to check balance for ${token.symbol}:`, err);
      }
      
      console.log(`💰 Total ${token.symbol} balance: ${balance} on ${token.chainName}`);
      
      setTokenBalances(prev => ({
        ...prev,
        [selectedToken]: {
          solana: token.chainId === SOLANA_CHAIN_ID ? balance : '0',
          evm: token.chainId !== SOLANA_CHAIN_ID ? balance : '0',
          total: balance
        }
      }));
    };
    
    fetchBalances();
  }, [isWalletConnected, selectedToken, userWalletAddress, ethAddress, refreshTrigger]);

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
    const currentToken = getCurrentToken();

    try {
      // 如果选择 PYUSD on Solana，直接存款
      if (currentToken.symbol === 'PYUSD' && currentToken.chainId === SOLANA_CHAIN_ID) {
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

      // Get the token symbol without chain suffix (e.g., "USDC-Solana" -> "USDC")
      const tokenSymbol = currentToken.symbol;
      
      // 优先使用 Solana，其次 Ethereum
      const useSolana = solanaWallets.length > 0;
      const fromChainId = useSolana ? 1151111081099710 : 1; // Solana or Ethereum
      const toChainId = 1151111081099710; // PYUSD on Solana
      
      const fromToken = useSolana ? TOKEN_ADDRESSES[tokenSymbol].solana : TOKEN_ADDRESSES[tokenSymbol].ethereum;
      const toToken = TOKEN_ADDRESSES.PYUSD.solana;
      const fromAmount = (amount * Math.pow(10, TOKEN_ADDRESSES[tokenSymbol].decimals)).toString();
      
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
        
        console.log('� Configuring Solana provider...');
        console.log('🔌 Solana wallet address:', solanaWallet.address);
        
        // Configure Solana provider with proper wallet adapter (same as XStock)
        const solanaProvider = Solana({
          getWalletAdapter: async () => {
            // Create a PublicKey object from the address
            const publicKey = new PublicKey(solanaWallet.address);
            console.log('✅ Created PublicKey:', publicKey.toBase58());
            
            // Create a proper wallet adapter for LiFi SDK
            const adapter = {
              publicKey,
              signTransaction: async (transaction: any) => {
                console.log('🔵 Signing Solana transaction with Privy wallet...');
                console.log('🔵 Transaction type:', transaction.constructor.name);
                
                try {
                  const serialized = transaction.serialize({ requireAllSignatures: false });
                  console.log('🔵 Serialized transaction length:', serialized.length);
                  
                  const result = await solanaWallet.signTransaction({ transaction: serialized });
                  console.log('✅ Transaction signed successfully');
                  
                  // Deserialize the signed transaction
                  return VersionedTransaction.deserialize(result.signedTransaction);
                } catch (error) {
                  console.error('❌ Failed to sign transaction:', error);
                  throw error;
                }
              },
              signAllTransactions: async (transactions: any[]) => {
                console.log('🔵 Signing multiple Solana transactions with Privy wallet...');
                const results = [];
                for (const tx of transactions) {
                  const signed = await adapter.signTransaction(tx);
                  results.push(signed);
                }
                return results;
              },
            };
            
            console.log('✅ Solana wallet adapter created');
            return adapter as any;
          }
        });
        
        providers.push(solanaProvider);
        console.log('✅ Solana provider added');
      }
      
      // Add EVM provider if using Ethereum
      if (!useSolana && evmWallets.length > 0) {
        console.log('🔧 Configuring EVM provider...');
        const evmWallet = evmWallets[0];
        const provider = await evmWallet.getEthereumProvider();
        
        if (!provider) {
          throw new Error('Failed to get EVM wallet provider');
        }
        
        console.log('✅ EVM provider obtained, creating wallet client...');
        const walletClient = createWalletClient({
          account: evmWallet.address as `0x${string}`,
          chain: mainnet,
          transport: custom(provider)
        });
        
        console.log('✅ Wallet client created:', evmWallet.address);
        const evmProvider = EVM({ 
          getWalletClient: async () => {
            console.log('✅ EVM wallet client requested');
            return walletClient;
          }
        });
        
        providers.push(evmProvider);
        console.log('✅ EVM provider added');
      }
      
      // 使用 Helius RPC 而不是公共节点，避免 403 错误
      const customRpcUrl = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
      console.log(`🔧 Configuring LiFi SDK with ${providers.length} providers...`);
      console.log('🔗 Using custom Solana RPC:', customRpcUrl);
      
      createConfig({
        integrator: 'MarsLiquid',
        apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
        providers: providers,
        // 配置 Solana RPC URL，避免使用公共节点
        rpcUrls: {
          1151111081099710: [customRpcUrl], // Solana Mainnet
        },
      });
      
      // Validate route object integrity (same as XStock)
      if (!route) {
        throw new Error('Route is undefined');
      }
      if (!route.fromChainId) {
        throw new Error('Route fromChainId is undefined');
      }
      if (!route.toChainId) {
        throw new Error('Route toChainId is undefined');
      }
      
      console.log('✅ Route validation passed');
      console.log('📝 Executing route with LiFi SDK...');
      console.log('📋 Route details:', {
        fromChain: route.fromChainId,
        toChain: route.toChainId,
        fromToken: route.fromToken.symbol,
        toToken: route.toToken.symbol,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
      });

      // Execute swap
      const result = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          console.log('🔄 Route updated during execution:', updatedRoute);
        },
        executeInBackground: false,
      });

      console.log('✅ Swap completed:', result);
      
      // 🔥 从 swap 结果中提取实际收到的 PYUSD 数量
      let actualPyusdAmount = amount; // fallback to original amount
      
      try {
        // LiFi executeRoute 返回 RouteExtended，它包含 toAmount（实际收到的金额，以最小单位为单位）
        // route 参数本身就包含 toAmount
        if (route && route.toAmount) {
          const toAmountLamports = parseFloat(route.toAmount);
          actualPyusdAmount = toAmountLamports / Math.pow(10, TOKEN_ADDRESSES.PYUSD.decimals);
          console.log(`💰 预计 Swap 收到: ${actualPyusdAmount} PYUSD (原始输入: ${amount} ${selectedToken})`);
          console.log(`📊 预计滑点损失: ${((amount - actualPyusdAmount) / amount * 100).toFixed(2)}%`);
        }
      } catch (parseError) {
        console.warn('⚠️ 无法解析 route 中的 toAmount，使用原始金额:', parseError);
      }
      
      // Now deposit the actual swapped PYUSD amount
      setProgressTitle('Depositing PYUSD');
      setProgressMessage(`Processing deposit of ${actualPyusdAmount.toFixed(4)} PYUSD to vault...`);
      
      const DEPOSIT_TIMEOUT = 60000;
      const depositPromise = marsContract.deposit(actualPyusdAmount);
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Deposit timeout after 60 seconds')), DEPOSIT_TIMEOUT)
      );
      
      const signature = await Promise.race([depositPromise, timeoutPromise]);
      
      if (signature) {
        console.log('✅ 存款成功!');
        setTxSignature(signature);
        setProgressMessage(`Transaction confirmed!`);
        setDepositAmount('');
        
        // 触发余额和持仓刷新
        setTimeout(async () => {
          await forceRefreshPositions();
        }, 2000); // 等待 2 秒确保链上数据更新
        
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
      const currentToken = getCurrentToken();
      const needsSwap = currentToken.symbol !== 'PYUSD' || currentToken.chainId !== SOLANA_CHAIN_ID; // 如果不是 Solana 上的 PYUSD，需要 swap
      
      console.log('🚀 Starting withdrawal process...');
      if (needsSwap) {
        console.log(`  Withdraw PYUSD from vault → Swap to ${currentToken.symbol} on ${currentToken.chainName}`);
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
        
        // 触发余额和持仓刷新
        setTimeout(async () => {
          await forceRefreshPositions();
        }, 2000); // 等待 2 秒确保链上数据更新
        
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
      setProgressMessage(`Step ${finalStep} of ${finalStep}: Swapping PYUSD to ${currentToken.symbol}...`);
      
      // PYUSD address on Solana (从 vault 取出的代币)
      const fromTokenAddress = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';
      const toTokenAddress = currentToken.address;
      
      // 确定钱包地址
      // EVM 链（USDC, USDT, ETH, PYUSD on Ethereum）使用 ETH 钱包地址
      // Solana 链使用 Solana 钱包地址
      const walletAddress = currentToken.chainId === SOLANA_CHAIN_ID 
        ? solanaWallets[0].address 
        : ethAddress;
      
      if (!walletAddress) {
        throw new Error(`No ${currentToken.chainName} wallet connected`);
      }
      
      // Request LiFi swap route
      const routesRequest: RoutesRequest = {
        fromChainId: SOLANA_CHAIN_ID, // Solana (PYUSD 来源)
        toChainId: currentToken.chainId, // 目标链
        fromTokenAddress: fromTokenAddress,
        toTokenAddress: toTokenAddress,
        fromAddress: solanaWallets[0].address, // PYUSD 在 Solana
        toAddress: walletAddress, // 目标代币接收地址
        fromAmount: (amount * 1_000_000).toString(), // PYUSD uses 6 decimals
      };

      console.log('📡 Requesting LiFi swap route (PYUSD → ' + currentToken.symbol + ' on ' + currentToken.chainName + ')...');
      const routesResponse = await getRoutes(routesRequest);
      
      if (!routesResponse || !routesResponse.routes || routesResponse.routes.length === 0) {
        throw new Error(`No swap routes found for PYUSD → ${currentToken.symbol} on ${currentToken.chainName}`);
      }

      const route = routesResponse.routes[0];
      console.log('✅ Got LiFi swap route:', route);

      // Configure LiFi SDK for Solana (same pattern as deposit)
      const solanaWallet = solanaWallets[0];
      const walletAdapter = {
        publicKey: new PublicKey(solanaWallet.address),
        signTransaction: async (transaction: Transaction | VersionedTransaction) => {
          console.log('🔵 Signing withdrawal Solana transaction...');
          console.log('🔵 Transaction type:', transaction.constructor.name);
          
          try {
            const serialized = transaction.serialize({ requireAllSignatures: false });
            console.log('🔵 Serialized transaction length:', serialized.length);
            
            const result = await solanaWallet.signTransaction({ transaction: serialized });
            console.log('✅ Transaction signed successfully');
            
            // Deserialize the signed transaction (same as deposit)
            return VersionedTransaction.deserialize(result.signedTransaction);
          } catch (error) {
            console.error('❌ Failed to sign transaction:', error);
            throw error;
          }
        },
        signAllTransactions: async (transactions: (Transaction | VersionedTransaction)[]) => {
          console.log('🔵 Signing multiple Solana transactions for withdrawal...');
          const results = [];
          for (const tx of transactions) {
            const signed = await walletAdapter.signTransaction(tx);
            results.push(signed);
          }
          return results;
        },
      };

      const solanaProvider = Solana({
        getWalletAdapter: async () => walletAdapter as any
      });

      // 使用 Helius RPC 而不是公共节点，避免 403 错误
      const customRpcUrl = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
      console.log('🔗 Using custom Solana RPC:', customRpcUrl);
      
      createConfig({
        integrator: 'MarsLiquid',
        apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
        providers: [solanaProvider],
        // 配置 Solana RPC URL，避免使用公共节点
        rpcUrls: {
          1151111081099710: [customRpcUrl], // Solana Mainnet
        },
      });

      // Validate route object integrity (same as deposit)
      if (!route) {
        throw new Error('Route is undefined');
      }
      if (!route.fromChainId) {
        throw new Error('Route fromChainId is undefined');
      }
      if (!route.toChainId) {
        throw new Error('Route toChainId is undefined');
      }
      
      console.log('✅ Route validation passed');
      console.log('📝 Executing route with LiFi SDK...');
      console.log('📋 Route details:', {
        fromChain: route.fromChainId,
        toChain: route.toChainId,
        fromToken: route.fromToken.symbol,
        toToken: route.toToken.symbol,
        fromAmount: route.fromAmount,
        toAmount: route.toAmount,
      });

      // Execute swap
      console.log('🔄 Executing swap...');
      const swapResult = await executeRoute(route, {
        updateRouteHook: (updatedRoute) => {
          console.log('🔄 Swap in progress...');
          console.log('🔄 Route updated:', updatedRoute);
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
      
      // 触发余额和持仓刷新
      setTimeout(async () => {
        await forceRefreshPositions();
      }, 2000); // 等待 2 秒确保链上数据更新
      
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

  // Handle Claim Rewards action
  const handleClaimRewards = async () => {
    if (!isWalletConnected || !userWalletAddress) {
      console.error('❌ Missing wallet connection');
      setShowProgress(true);
      setProgressTitle('Validation Error');
      setProgressMessage('Please connect wallet');
      setTotalTxSteps(0);
      setTimeout(() => setShowProgress(false), 6000);
      return;
    }

    try {
      setIsClaimingRewards(true);
      setShowProgress(true);
      setProgressTitle('Claiming Rewards');
      setTotalTxSteps(1);
      setCurrentTxStep(1);
      setProgressMessage('Preparing claim transaction...');

      console.log('🎁 Starting claim rewards process...');

      // 使用 marsContract 的 claimRewards 方法（类似于 deposit/withdraw）
      setProgressMessage('Processing claim rewards...');
      
      const CLAIM_TIMEOUT = 60000;
      const claimPromise = marsContract.claimRewards();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Transaction timeout after 60 seconds')), CLAIM_TIMEOUT)
      );
      
      const signature = await Promise.race([claimPromise, timeoutPromise]);
      
      if (signature) {
        console.log('✅ Rewards claimed successfully!');
        setTxSignature(signature);
        setProgressMessage('Rewards claimed successfully!');
        
        // Force refresh position from blockchain
        setTimeout(async () => {
          await forceRefreshPositions();
          setShowProgress(false);
          setTxSignature(undefined);
          setIsClaimingRewards(false);
        }, 2000);
      } else {
        throw new Error('No transaction signature received');
      }

    } catch (error) {
      console.error('❌ Claim rewards failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Claim failed';
      setProgressMessage(errorMessage);
      
      setTimeout(() => {
        setShowProgress(false);
        setIsClaimingRewards(false);
      }, 6000);
    }
  };

  // 支付代币选项 - 支持多链，每个代币-链组合作为独立选项
  const tokenConfigs: Record<string, { 
    symbol: string; 
    name: string; 
    chainName: string;
    chain: 'solana' | 'ethereum';
    chainId: number;
    address: string;
    decimals: number;
    color: string;
  }> = {
    // Solana 链代币
    'PYUSD-Solana': {
      symbol: 'PYUSD',
      name: 'PayPal USD',
      chainName: 'Solana',
      chain: 'solana',
      chainId: SOLANA_CHAIN_ID,
      address: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
      decimals: 6,
      color: '#0070ba'
    },
    'USDC-Solana': {
      symbol: 'USDC',
      name: 'USD Coin',
      chainName: 'Solana',
      chain: 'solana',
      chainId: SOLANA_CHAIN_ID,
      address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      color: '#2775ca'
    },
    'USDT-Solana': {
      symbol: 'USDT',
      name: 'Tether',
      chainName: 'Solana',
      chain: 'solana',
      chainId: SOLANA_CHAIN_ID,
      address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6,
      color: '#26a17b'
    },
    'SOL-Solana': {
      symbol: 'SOL',
      name: 'Solana',
      chainName: 'Solana',
      chain: 'solana',
      chainId: SOLANA_CHAIN_ID,
      address: '0x0000000000000000000000000000000000000000',
      decimals: 9,
      color: '#14F195'
    },
    // Ethereum 链代币
    'PYUSD-Ethereum': {
      symbol: 'PYUSD',
      name: 'PayPal USD',
      chainName: 'Ethereum',
      chain: 'ethereum',
      chainId: SUPPORTED_CHAINS.ETHEREUM,
      address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
      decimals: 6,
      color: '#0070ba'
    },
    'USDC-Ethereum': {
      symbol: 'USDC',
      name: 'USD Coin',
      chainName: 'Ethereum',
      chain: 'ethereum',
      chainId: SUPPORTED_CHAINS.ETHEREUM,
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      decimals: 6,
      color: '#2775ca'
    },
    'USDT-Ethereum': {
      symbol: 'USDT',
      name: 'Tether',
      chainName: 'Ethereum',
      chain: 'ethereum',
      chainId: SUPPORTED_CHAINS.ETHEREUM,
      address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      decimals: 6,
      color: '#26a17b'
    },
    'ETH-Ethereum': {
      symbol: 'ETH',
      name: 'Ethereum',
      chainName: 'Ethereum',
      chain: 'ethereum',
      chainId: SUPPORTED_CHAINS.ETHEREUM,
      address: '0x0000000000000000000000000000000000000000',
      decimals: 18,
      color: '#627EEA'
    },
  };

  // 获取当前选中的代币配置
  const getCurrentToken = () => {
    return tokenConfigs[selectedToken] || tokenConfigs['PYUSD-Solana'];
  };

  // 根据主要钱包类型过滤代币列表
  const getFilteredTokens = () => {
    if (!primaryWallet) {
      // 如果没有检测到主要钱包，显示所有代币
      return Object.entries(tokenConfigs);
    }

    // 根据主要钱包类型过滤
    return Object.entries(tokenConfigs).filter(([, token]) => {
      if (primaryWallet === 'sol') {
        return token.chain === 'solana';
      } else if (primaryWallet === 'eth') {
        return token.chain === 'ethereum';
      }
      return true;
    });
  };

  // Chart data - using real historical data from Neon PostgreSQL
  const getChartData = () => {
    // Use real historical data if available
    if (vaultHistoricalData && vaultHistoricalData.historical.length > 0) {
      const historical = vaultHistoricalData.historical;
      const labels = historical.map(item => {
        const date = new Date(item.recordedAt);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      return {
        apy: {
          labels,
          datasets: [{
            label: 'APY (%)',
            data: historical.map(item => item.totalApy * 100), // Convert to percentage
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
            data: historical.map(item => item.totalSuppliedUsd / 1_000_000), // Convert to millions
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
    
    // Fallback data while loading or on error
    return {
      apy: {
        labels: ['Loading...'],
        datasets: [{
          label: 'APY (%)',
          data: [0],
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
        labels: ['Loading...'],
        datasets: [{
          label: 'TVL (M)',
          data: [0],
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

  // Transaction history from Neon database only (no mock data)
  const getTransactionHistory = () => {
    // Use real Neon data only
    if (vaultTransactionsData?.transactions && vaultTransactionsData.transactions.length > 0) {
      return vaultTransactionsData.transactions.map(tx => {
        // 格式化日期为本地时间
        const date = new Date(tx.date);
        const formattedDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        return {
          date: formattedDate,
          type: tx.type,
          tokens: `${tx.asset} ${tx.amount}`,
          value: `$${tx.amountUsd.toFixed(2)}`
        };
      });
    }
    
    // Empty state - no fallback to mock data
    return [];
  };

  // Earning details from Neon database
  const getEarningDetails = () => {
    // Use real Neon data if available
    if (vaultEarningDetailsData?.earningDetails && vaultEarningDetailsData.earningDetails.length > 0) {
      return vaultEarningDetailsData.earningDetails.map(detail => {
        // 格式化日期为本地时间 - use detail.date (ISO format)
        const date = new Date(detail.date);
        const formattedDate = date.toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        return {
          date: formattedDate,
          type: detail.type,
          tokens: `${detail.rewardAmount} Rewards`,
          value: `$${(parseFloat(detail.rewardAmount) * 1).toFixed(2)}`, // Assuming $1 per token
          rewardMint: detail.rewardMint,
          totalClaimed: detail.totalRewardsClaimed,
          timestamp: detail.date, // Use detail.date (ISO format) for calendar processing
          rewardAmount: parseFloat(detail.rewardAmount)
        };
      });
    }
    
    // Empty state
    return [];
  };

  // Convert earning details to calendar data format
  const getCalendarDataFromEarnings = () => {
    const earningDetails = getEarningDetails();
    if (earningDetails.length === 0) {
      return null;
    }

    // Group earnings by date
    const dailyEarnings: Record<string, number> = {};
    let totalEarnings = 0;
    const activeDaysSet = new Set<string>();

    earningDetails.forEach(detail => {
      // Use the 'date' field from API which is already in ISO format
      const dateStr = new Date(detail.timestamp).toISOString().split('T')[0];
      
      if (!dailyEarnings[dateStr]) {
        dailyEarnings[dateStr] = 0;
      }
      
      dailyEarnings[dateStr] += detail.rewardAmount;
      totalEarnings += detail.rewardAmount;
      activeDaysSet.add(dateStr);
    });

    // Convert to dailyBreakdown format
    const dailyBreakdown = Object.entries(dailyEarnings).map(([date, earnings]) => ({
      date,
      earnings,
      apy: 10.41 // Fixed APY for now
    }));

    console.log('Calendar data generated:', {
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      totalEarnings,
      activeDays: activeDaysSet.size,
      dailyBreakdown
    });

    return {
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      monthKey: `${selectedYear}-${selectedMonth}`,
      totalEarnings,
      activeDays: activeDaysSet.size,
      dailyBreakdown
    };
  };

  const transactionHistory = getTransactionHistory();
  // earningDetails is used internally by getCalendarDataFromEarnings
  // const earningDetails = getEarningDetails();
  const calendarDataFromEarnings = getCalendarDataFromEarnings();

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
          {/* Left Side - My Rewards Section */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{ 
              p: 3, 
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              {/* Pending Rewards and Claim Rewards Button */}
              {isWalletConnected && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  {/* Pending Rewards Display */}
                  <Box>
                    <Typography variant="body2" sx={{ color: '#94a3b8', mb: 0.5 }}>
                      Pending Rewards
                    </Typography>
                    {(() => {
                      // 使用 Map 去重，按 rewardMint 分组
                      const uniqueRewards = new Map<string, typeof userVaultPosition.rewards[0]>();
                      userVaultPosition.rewards.forEach(reward => {
                        if (reward.pendingBalance > 0) {
                          const existing = uniqueRewards.get(reward.rewardMint);
                          if (!existing || existing.pendingBalance < reward.pendingBalance) {
                            uniqueRewards.set(reward.rewardMint, reward);
                          }
                        }
                      });
                      
                      return uniqueRewards.size > 0 ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          {Array.from(uniqueRewards.values()).map((reward) => (
                            <Box key={reward.rewardMint} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                component="img"
                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23003087' d='M20.905 9.5c.16 2.167-.77 3.66-2.661 4.78-2.128 1.287-4.784 1.64-7.152 1.578-1.186-.03-2.37-.185-3.538-.396-.238-.042-.394-.22-.448-.45l-1.092-5.203c-.086-.41.137-.645.536-.645h2.655c.325 0 .528.182.595.502l.52 2.488c.067.32.281.489.595.489 1.478 0 2.956-.038 4.408-.398 1.427-.354 2.533-1.116 2.952-2.59.368-1.293-.04-2.346-1.186-3.058-1.042-.648-2.225-.907-3.448-.99-2.188-.145-4.366.028-6.52.534-.253.06-.48.014-.604-.214-.182-.332-.358-.668-.537-1.002-.16-.298-.1-.536.214-.686 2.575-1.226 5.285-1.656 8.094-1.414 1.607.138 3.125.588 4.474 1.524 1.666 1.158 2.456 2.757 2.143 4.851z'/%3E%3Cpath fill='%23009cde' d='M11.5 14.5c-.234.026-.468.052-.703.071-1.186.094-2.375.107-3.564.044-.238-.013-.394-.157-.448-.387l-1.092-5.203c-.086-.41.137-.645.536-.645h2.655c.325 0 .528.182.595.502l.52 2.488c.067.32.281.489.595.489.469 0 .937-.013 1.406-.044z'/%3E%3C/svg%3E"
                                sx={{ width: 20, height: 20 }}
                              />
                              <Typography variant="h6" fontWeight={600} sx={{ color: 'white' }}>
                                {reward.pendingBalance.toFixed(4)}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                ({reward.tokenName})
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="h6" fontWeight={600} sx={{ color: '#94a3b8' }}>
                          -
                        </Typography>
                      );
                    })()}
                  </Box>

                  {/* Claim Rewards Button */}
                  <Button
                    variant="contained"
                    disabled={
                      isClaimingRewards || 
                      !userVaultPosition.rewards.some(reward => reward.pendingBalance > 0)
                    }
                    onClick={handleClaimRewards}
                    sx={{
                      backgroundColor: '#60a5fa',
                      color: 'white',
                      fontWeight: 600,
                      px: 3,
                      py: 1.5,
                      borderRadius: 2,
                      textTransform: 'none',
                      minWidth: '140px',
                      '&:hover': {
                        backgroundColor: '#3b82f6',
                      },
                      '&:disabled': {
                        backgroundColor: 'rgba(96, 165, 250, 0.3)',
                        color: 'rgba(255, 255, 255, 0.5)',
                      }
                    }}
                  >
                    {isClaimingRewards ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CircularProgress size={16} sx={{ color: 'white' }} />
                        <span>Claiming...</span>
                      </Box>
                    ) : (
                      'Claim Rewards'
                    )}
                  </Button>
                </Box>
              )}

              {/* Stats Cards Grid */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 2
              }}>
                {/* Total Supplied Card */}
                <Card sx={{ 
                  p: 2.5, 
                  background: chartView === 'TVL' 
                    ? 'rgba(52, 211, 153, 0.1)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: chartView === 'TVL'
                    ? '1px solid rgba(52, 211, 153, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }
                }}
                onClick={() => setChartView('TVL')}
                >
                  <Typography variant="body2" sx={{ 
                    color: chartView === 'TVL' ? '#34d399' : '#94a3b8', 
                    mb: 1 
                  }}>
                    Total Supplied
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ 
                    color: chartView === 'TVL' ? '#34d399' : 'white' 
                  }}>
                    {vaultStats.currentTvl > 0 ? (
                      `$${(vaultStats.currentTvl / 1_000_000).toFixed(2)}M`
                    ) : (
                      '-'
                    )}
                  </Typography>
                </Card>

                {/* Interest Earned Card */}
                <Card sx={{ 
                  p: 2.5, 
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  boxShadow: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Interest Earned
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#34d399' }}>
                    {userVaultPosition.interestEarned > 0 ? (
                      `$${userVaultPosition.interestEarned.toFixed(4)}`
                    ) : (
                      '-'
                    )}
                  </Typography>
                </Card>

                {/* APY Card */}
                <Card sx={{ 
                  p: 2.5, 
                  background: chartView === 'APY' 
                    ? 'rgba(96, 165, 250, 0.1)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: chartView === 'APY'
                    ? '1px solid rgba(96, 165, 250, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  boxShadow: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }
                }}
                onClick={() => setChartView('APY')}
                >
                  <Typography variant="body2" sx={{ 
                    color: chartView === 'APY' ? '#60a5fa' : '#94a3b8', 
                    mb: 1 
                  }}>
                    APY
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ 
                    color: chartView === 'APY' ? '#60a5fa' : 'white' 
                  }}>
                    {userVaultPosition.totalAPY > 0 ? (
                      formatPercentage(userVaultPosition.totalAPY * 100)
                    ) : (
                      '-'
                    )}
                  </Typography>
                </Card>

                {/* Daily Interest Card */}
                <Card sx={{ 
                  p: 2.5, 
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 2,
                  boxShadow: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                  }
                }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8', mb: 1 }}>
                    Daily Interest
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ color: '#60a5fa' }}>
                    {userVaultPosition.dailyInterestUSD > 0 ? (
                      `$${userVaultPosition.dailyInterestUSD.toFixed(4)}`
                    ) : (
                      '-'
                    )}
                  </Typography>
                </Card>
              </Box>
            </Card>
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
                  onClick={() => {
                    setActiveTab(0);
                    setAmountError('');
                  }}
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
                  onClick={() => {
                    setActiveTab(1);
                    setAmountError('');
                  }}
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
                      ? (() => {
                          const token = getCurrentToken();
                          const balance = getWalletBalance(token.symbol);
                          return `${parseFloat(balance).toFixed(4)} ${token.symbol}`;
                        })()
                      : isWalletConnected && userVaultPosition.totalSupplied > 0
                        ? `${userVaultPosition.totalSupplied.toFixed(4)} PYUSD`
                        : '0 PYUSD'
                    }
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5, gap: 1.5 }}>
                  <FormControl size="small" sx={{ minWidth: 140 }}>
                    <Select
                      value={selectedToken}
                      onChange={(e: any) => setSelectedToken(e.target.value)}
                      renderValue={() => {
                        const token = getCurrentToken();
                        return (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <TokenIcon 
                              symbol={token.symbol} 
                              chain={token.chain} 
                              size={28} 
                              showChainBadge={token.symbol !== 'SOL' && token.symbol !== 'ETH'} 
                            />
                            <Box>
                              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                {token.symbol}
                              </Typography>
                              {token.symbol !== 'SOL' && token.symbol !== 'ETH' && (
                                <Typography sx={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                                  {token.chainName}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        );
                      }}
                      sx={{
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: 1.5,
                        minHeight: 44,
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
                            maxHeight: 400,
                          },
                        },
                      }}
                    >
                      {getFilteredTokens().map(([key, token]) => {
                        return (
                          <MenuItem 
                            key={key} 
                            value={key} 
                            sx={{ 
                              color: 'white',
                              py: 1.5,
                              '&:hover': {
                                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                              }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                              <TokenIcon 
                                symbol={token.symbol} 
                                chain={token.chain} 
                                size={32} 
                                showChainBadge={token.symbol !== 'SOL' && token.symbol !== 'ETH'} 
                              />
                              <Box sx={{ flex: 1 }}>
                                <Typography sx={{ fontWeight: 600, fontSize: '0.95rem' }}>
                                  {token.symbol}
                                </Typography>
                                <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                  {token.name}
                                </Typography>
                              </Box>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                  <Box sx={{ flex: 1 }} />
                  <TextField
                    value={activeTab === 0 ? depositAmount : withdrawAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const value = e.target.value;
                      // Allow empty string or valid numbers
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setAmountError(''); // Clear error when typing
                        const numValue = parseFloat(value) || 0;
                        
                        if (activeTab === 0) {
                          // Deposit: check against wallet balance
                          const token = getCurrentToken();
                          const maxBalance = parseFloat(getWalletBalance(token.symbol).replace(',', ''));
                          if (numValue <= maxBalance || value === '') {
                            setDepositAmount(value);
                          } else {
                            setAmountError(`Insufficient balance. Max: ${maxBalance.toFixed(4)} ${token.symbol}`);
                          }
                        } else {
                          // Withdraw: check against deposited amount
                          const maxDeposited = userVaultPosition.totalSupplied;
                          if (numValue <= maxDeposited || value === '') {
                            setWithdrawAmount(value);
                          } else {
                            setAmountError(`Insufficient deposited amount. Max: ${maxDeposited.toFixed(4)} PYUSD`);
                          }
                        }
                      }
                    }}
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

                {/* Error message */}
                {amountError && (
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: '#ef4444', 
                      fontSize: '0.75rem',
                      display: 'block',
                      mt: 0.5,
                      textAlign: 'center'
                    }}
                  >
                    {amountError}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', gap: 0.75 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!isWalletConnected}
                    onClick={() => {
                      if (isWalletConnected) {
                        setAmountError(''); // Clear error
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
                        setAmountError(''); // Clear error
                        if (activeTab === 0) {
                          const balance = getWalletBalance(selectedToken).replace(',', '');
                          setDepositAmount(balance);
                        } else {
                          // For withdraw, use max vault deposited amount (truncated to 2 decimals)
                          const deposited = userVaultPosition.totalSupplied;
                          // Truncate to 2 decimal places without rounding
                          const truncatedAmount = Math.floor(deposited * 100) / 100;
                          setWithdrawAmount(truncatedAmount.toString());
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
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      const numValue = parseFloat(value) || 0;
                      const token = getCurrentToken();
                      const maxBalance = parseFloat(getWalletBalance(token.symbol).replace(',', ''));
                      if (numValue <= maxBalance) {
                        setDepositAmount(value);
                      }
                    }
                  }}
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
                    {getFilteredTokens().map(([key, token]) => {
                      return (
                        <MenuItem key={key} value={key} sx={{ color: 'white' }}>
                          {token.symbol}
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>
              </Box>

              <Box>
                <Typography variant="body2" sx={{ mb: 0.5, color: '#94a3b8' }}>
                  Wallet: {isWalletConnected ? `${getWalletBalance(selectedToken)} ${selectedToken}` : 'Not Connected'}
                </Typography>
                {isWalletConnected && tokenBalances[selectedToken] && (
                  <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic', mb: 1, display: 'block' }}>
                    {parseFloat(tokenBalances[selectedToken].solana) > 0 && (
                      <span>Solana: {tokenBalances[selectedToken].solana} </span>
                    )}
                    {parseFloat(tokenBalances[selectedToken].evm) > 0 && (
                      <span>
                        {parseFloat(tokenBalances[selectedToken].solana) > 0 && '| '}
                        EVM: {tokenBalances[selectedToken].evm}
                      </span>
                    )}
                  </Typography>
                )}
              </Box>
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
                  {chartView === 'APY' 
                    ? `${vaultStats.currentApy.toFixed(2)}%`
                    : `$${(vaultStats.currentTvl / 1_000_000).toFixed(2)}M`
                  }
                </Typography>
                <Typography variant="body2" sx={{ 
                  color: '#94a3b8',
                  fontSize: '0.875rem'
                }}>
                  {chartView === 'APY' 
                    ? `${vaultStats.apyChange >= 0 ? '↑' : '↓'} ${Math.abs(vaultStats.apyChange).toFixed(2)}% from last month`
                    : `${vaultStats.tvlChange >= 0 ? '↑' : '↓'} $${(Math.abs(vaultStats.tvlChange) / 1_000_000).toFixed(2)}M from last month`
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
                        {calendarDataFromEarnings?.totalEarnings ? (
                          `+$${calendarDataFromEarnings.totalEarnings.toFixed(2)}`
                        ) : (
                          '+$0.00'
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: '0.75rem', mb: 0.5 }}>
                        Active Days
                      </Typography>
                      <Typography variant="h5" fontWeight={600} sx={{ color: '#60a5fa' }}>
                        {calendarDataFromEarnings?.activeDays ? (
                          `${calendarDataFromEarnings.activeDays} days`
                        ) : (
                          '0 days'
                        )}
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
                          
                          // Get earning data from earning details
                          const dateStr = `${selectedYear}-${selectedMonth}-${day.toString().padStart(2, '0')}`;
                          const dayEarning = calendarDataFromEarnings?.dailyBreakdown?.find(d => d.date === dateStr);
                          const hasEarning = !!dayEarning && dayEarning.earnings > 0;
                          const earnings = hasEarning ? `+$${dayEarning.earnings.toFixed(2)}` : null;
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