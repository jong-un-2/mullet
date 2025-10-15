import { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  Grid, 
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  CircularProgress,
  Chip,
  Divider,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import Navigation from '../components/Navigation';
import { TransactionProgress } from '../components/TransactionProgress';
import { marsLiFiService, SUPPORTED_CHAINS } from '../services/marsLiFiService';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { createConfig, executeRoute, EVM, Solana } from '@lifi/sdk';
import type { Route, ExecutionOptions } from '@lifi/sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';

// 支持的代币化股票 (Solana 地址)
const TOKENIZED_STOCKS = [
  { 
    symbol: 'TSLAx', 
    name: 'Tesla xStock', 
    logo: '🚗',
    address: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', // Solana TSLAx 代币地址
    decimals: 8, // xStock tokens use 8 decimals
    description: 'Electric vehicles and clean energy'
  },
  { 
    symbol: 'AAPLx', 
    name: 'Apple xStock', 
    logo: '🍎',
    address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', // Solana AAPLx 代币地址
    decimals: 8,
    description: 'Technology and consumer electronics'
  },
  { 
    symbol: 'GOOGLx', 
    name: 'Alphabet xStock', 
    logo: '🔍',
    address: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', // Solana GOOGLx 代币地址
    decimals: 8,
    description: 'Search engine and cloud services'
  },
  { 
    symbol: 'AMZNx', 
    name: 'Amazon xStock', 
    logo: '📦',
    address: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', // Solana AMZNx 代币地址
    decimals: 8,
    description: 'E-commerce and cloud computing'
  },
  { 
    symbol: 'MSFTx', 
    name: 'Microsoft xStock', 
    logo: '💻',
    address: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', // Solana MSFTx 代币地址
    decimals: 8,
    description: 'Software and cloud services'
  },
  { 
    symbol: 'NVDAx', 
    name: 'NVIDIA xStock', 
    logo: '🎮',
    address: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', // Solana NVDAx 代币地址
    decimals: 8,
    description: 'Graphics processing and AI chips'
  },
  { 
    symbol: 'CRCLx', 
    name: 'Circle xStock', 
    logo: '⭕',
    address: 'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1', // Solana CRCLx 代币地址
    decimals: 8,
    description: 'Digital currency and payment infrastructure'
  },
  { 
    symbol: 'COINx', 
    name: 'Coinbase xStock', 
    logo: '🪙',
    address: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', // Solana COINx 代币地址
    decimals: 8,
    description: 'Cryptocurrency exchange platform'
  },
  { 
    symbol: 'METAx', 
    name: 'Meta xStock', 
    logo: '📱',
    address: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', // Solana METAx 代币地址
    decimals: 8,
    description: 'Social media and virtual reality'
  },
  { 
    symbol: 'MSTRx', 
    name: 'MicroStrategy xStock', 
    logo: '₿',
    address: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', // Solana MSTRx 代币地址
    decimals: 8,
    description: 'Bitcoin treasury and business intelligence'
  },
  { 
    symbol: 'QQQx', 
    name: 'Invesco QQQ xStock', 
    logo: '📈',
    address: 'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ', // Solana QQQx 代币地址
    decimals: 8,
    description: 'Nasdaq-100 Index ETF'
  },
  { 
    symbol: 'SPYx', 
    name: 'SPDR S&P 500 xStock', 
    logo: '🏛️',
    address: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W', // Solana SPYx 代币地址
    decimals: 8,
    description: 'S&P 500 Index ETF'
  },
  { 
    symbol: 'GMEx', 
    name: 'GameStop xStock', 
    logo: '🎮',
    address: 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc', // Solana GMEx 代币地址
    decimals: 8,
    description: 'Video game retailer'
  },
  { 
    symbol: 'PMx', 
    name: 'Philip Morris xStock', 
    logo: '🚬',
    address: 'Xsba6tUnSjDae2VcopDB6FGGDaxRrewFCDa5hKn5vT3', // Solana PMx 代币地址
    decimals: 8,
    description: 'Tobacco and smoke-free products'
  },
  { 
    symbol: 'MRVLx', 
    name: 'Marvell Technology xStock', 
    logo: '🔧',
    address: 'XsuxRGDzbLjnJ72v74b7p9VY6N66uYgTCyfwwRjVCJA', // Solana MRVLx 代币地址
    decimals: 8,
    description: 'Semiconductor and infrastructure solutions'
  },
  { 
    symbol: 'INTCx', 
    name: 'Intel xStock', 
    logo: '🖥️',
    address: 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', // Solana INTCx 代币地址
    decimals: 8,
    description: 'Semiconductor chip manufacturer'
  },
  { 
    symbol: 'IBMx', 
    name: 'IBM xStock', 
    logo: '💼',
    address: 'XspwhyYPdWVM8XBHZnpS9hgyag9MKjLRyE3tVfmCbSr', // Solana IBMx 代币地址
    decimals: 8,
    description: 'Cloud computing and enterprise solutions'
  },
  { 
    symbol: 'NFLXx', 
    name: 'Netflix xStock', 
    logo: '🎬',
    address: 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL', // Solana NFLXx 代币地址
    decimals: 8,
    description: 'Streaming entertainment service'
  },
  { 
    symbol: 'MCDx', 
    name: "McDonald's xStock", 
    logo: '🍔',
    address: 'XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2', // Solana MCDx 代币地址
    decimals: 8,
    description: 'Fast food restaurant chain'
  },
  { 
    symbol: 'ORCLx', 
    name: 'Oracle xStock', 
    logo: '🗄️',
    address: 'XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL', // Solana ORCLx 代币地址
    decimals: 8,
    description: 'Database and enterprise software'
  },
  { 
    symbol: 'KOx', 
    name: 'Coca-Cola xStock', 
    logo: '🥤',
    address: 'XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ', // Solana KOx 代币地址
    decimals: 8,
    description: 'Beverage and soft drink manufacturer'
  },
  { 
    symbol: 'WMTx', 
    name: 'Walmart xStock', 
    logo: '🛒',
    address: 'Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci', // Solana WMTx 代币地址
    decimals: 8,
    description: 'Retail and supermarket chain'
  },
  { 
    symbol: 'PEPx', 
    name: 'PepsiCo xStock', 
    logo: '🥤',
    address: 'Xsv99frTRUeornyvCfvhnDesQDWuvns1M852Pez91vF', // Solana PEPx 代币地址
    decimals: 8,
    description: 'Beverage and snack food manufacturer'
  },
  { 
    symbol: 'CVXx', 
    name: 'Chevron xStock', 
    logo: '⛽',
    address: 'XsNNMt7WTNA2sV3jrb1NNfNgapxRF5i4i6GcnTRRHts', // Solana CVXx 代币地址
    decimals: 8,
    description: 'Oil and gas energy company'
  },
  { 
    symbol: 'Vx', 
    name: 'Visa xStock', 
    logo: '💳',
    address: 'XsqgsbXwWogGJsNcVZ3TyVouy2MbTkfCFhCGGGcQZ2p', // Solana Vx 代币地址
    decimals: 8,
    description: 'Global payments technology company'
  },
  { 
    symbol: 'MAx', 
    name: 'Mastercard xStock', 
    logo: '💳',
    address: 'XsApJFV9MAktqnAc6jqzsHVujxkGm9xcSUffaBoYLKC', // Solana MAx 代币地址
    decimals: 8,
    description: 'Payment processing and technology'
  },
];

// 支付代币选项
const PAYMENT_TOKENS = [
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // 正确的 Ethereum USDC 地址
    decimals: 6
  },
  { 
    symbol: 'USDT', 
    name: 'Tether', 
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6
  },
  { 
    symbol: 'ETH', 
    name: 'Ethereum', 
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0x0000000000000000000000000000000000000000',
    decimals: 18
  },
];

const XStockPage = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets(); // EVM 钱包 (用于 fromAddress)
  const { wallets: solanaWallets } = useSolanaWallets(); // Solana 钱包 (用于 toAddress)
  
  const [selectedStock, setSelectedStock] = useState(TOKENIZED_STOCKS[0]);
  const [paymentToken, setPaymentToken] = useState(PAYMENT_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [estimatedShares, setEstimatedShares] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [userAddress, setUserAddress] = useState(''); // EVM 地址
  const [solanaAddress, setSolanaAddress] = useState(''); // Solana 地址
  
  // 进度提示状态
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string>();
  const [currentTxStep, setCurrentTxStep] = useState(0);
  const [totalTxSteps, setTotalTxSteps] = useState(0);

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      setUserAddress(wallets[0].address);
    }
    if (authenticated && solanaWallets.length > 0) {
      setSolanaAddress(solanaWallets[0].address);
    }
  }, [authenticated, wallets, solanaWallets]);

  // Auto-fetch quote when stock changes (if amount is already entered)
  useEffect(() => {
    // Only auto-fetch if user has already entered an amount and gotten a quote before
    if (amount && parseFloat(amount) > 0 && quote) {
      console.log('🔄 Stock changed to', selectedStock.symbol, '- auto-fetching new quote');
      fetchQuote();
    }
  }, [selectedStock]);

  // 获取报价
  const fetchQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (!userAddress) {
      setError('Please connect your wallet');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 转换金额为最小单位（wei）
      // USDC/USDT 是 6 decimals，ETH 是 18 decimals
      const decimals = paymentToken.symbol === 'ETH' ? 18 : 6;
      const fromAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      console.log('🔵 Fetching quote with:', {
        amount,
        fromAmount,
        decimals,
        paymentToken: paymentToken.symbol,
        paymentTokenAddress: paymentToken.address,
        stock: selectedStock.symbol,
        user: userAddress
      });

      // 使用选中股票的 Solana 代币地址作为目标代币
      const toToken = selectedStock.address;

      // 检查是否有 Solana 地址
      if (!solanaAddress) {
        setError('Please connect your Solana wallet first. You need both EVM and Solana wallets connected.');
        setLoading(false);
        return;
      }

      console.log('🔵 Using addresses:', {
        fromAddress: userAddress,
        toAddress: solanaAddress,
      });

      // 使用 LiFi 获取跨链 swap 报价
      // 调用 LiFi API 获取报价
      const response = await marsLiFiService.getDepositQuote({
        fromChain: paymentToken.chainId,
        fromToken: paymentToken.address, // 使用代币地址而不是符号
        toToken, // Solana上的对应代币地址
        fromAmount, // 使用最小单位
        fromAddress: userAddress, // EVM 地址（付款地址）
        toAddress: solanaAddress, // Solana 地址（接收地址）
      });

      console.log('✅ Quote received:', response);

      setQuote(response);
      
      // 从 LiFi 报价中获取实际能收到的代币数量
      // toAmount 是以最小单位返回的，需要除以 decimals
      const toTokenDecimals = selectedStock.decimals; // 使用股票代币的 decimals
      const receivedAmount = parseFloat(response.route.toAmount) / Math.pow(10, toTokenDecimals);
      
      console.log('📊 Received token amount:', {
        stock: selectedStock.symbol,
        toAmount: response.route.toAmount,
        decimals: toTokenDecimals,
        receivedAmount,
      });
      
      setEstimatedShares(receivedAmount.toFixed(6)); // 使用 6 位小数显示更精确
      
    } catch (err: any) {
      console.error('Failed to fetch quote:', err);
      setError(err.message || 'Failed to get quote');
    } finally {
      setLoading(false);
    }
  };

  // 执行购买 - 使用 LiFi SDK 执行跨链交易
  const handleBuy = async () => {
    if (!quote || !quote.route) {
      setError('Please get a quote first');
      return;
    }

    if (!authenticated || !wallets.length) {
      setError('Please connect your EVM wallet');
      return;
    }

    // 检查输入金额
    const inputAmount = parseFloat(amount);
    if (inputAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    try {
      console.log('🚀 Starting cross-chain purchase...');
      console.log('📊 Input amount:', amount, paymentToken.symbol);
      console.log('📊 Expected output:', estimatedShares, selectedStock.symbol);
      
      // 获取 EVM wallet provider
      const evmWallet = wallets[0];
      const provider = await evmWallet.getEthereumProvider();
      
      if (!provider) {
        throw new Error('Failed to get EVM wallet provider');
      }
      
      // 将 Privy 的 EIP1193Provider 转换为 Viem WalletClient
      const walletClient = createWalletClient({
        account: evmWallet.address as `0x${string}`,
        chain: mainnet,
        transport: custom(provider)
      });
      
      // 配置 EVM provider
      const evmProvider = EVM({ 
        getWalletClient: async () => walletClient 
      });
      
      // 获取 Solana wallet adapter
      const solanaWallet = solanaWallets[0];
      if (!solanaWallet) {
        throw new Error('Solana wallet not found');
      }
      
      // 配置 Solana provider
      const solanaProvider = Solana({
        getWalletAdapter: async () => {
          // Privy Solana wallet 已经实现了 SignerWalletAdapter 接口
          return solanaWallet as any;
        }
      });
      
      // 初始化 LiFi SDK 同时支持 EVM 和 Solana
      createConfig({
        integrator: 'MarsLiquid',
        apiKey: '9c3f31e3-312b-4e47-87d0-9eda9dfaac6f.c19a2c37-a846-4882-a111-9dc3cf90317d',
        providers: [evmProvider, solanaProvider],
      });
      
      // 确保钱包已连接
      console.log('🔌 Connected EVM wallet:', evmWallet.address);
      console.log('🔌 Connected Solana wallet:', solanaWallet.address);
      console.log('🔌 Multi-chain providers configured (EVM + Solana)');
      
      // 显示进度提示
      setShowProgress(true);
      setProgressTitle(`Buying ${selectedStock.symbol}`);
      setProgressMessage('Preparing transaction...');
      setTotalTxSteps(3);
      setCurrentTxStep(1);
      
      console.log('📝 Executing route with LiFi SDK...');
      setProgressMessage('Please sign the transaction in your wallet...');
      setCurrentTxStep(2);
      
      // 执行路由的配置
      const executionOptions: ExecutionOptions = {
        updateRouteHook: (route: Route) => {
          console.log('🔄 Route updated:', route);
        },
        executeInBackground: false,
      };
      
      // 使用 LiFi SDK 执行跨链交易
      const result = await executeRoute(quote.route, {
        ...executionOptions,
        updateRouteHook: () => {
          console.log('🔄 Route updated during execution');
          setProgressMessage('Transaction in progress...');
          setCurrentTxStep(2);
        },
      });
      
      console.log('✅ Transaction completed:', result);
      
      // 更新为成功状态
      setCurrentTxStep(3);
      setProgressMessage('Purchase completed successfully!');
      
      // 获取交易哈希（如果有）
      if (result.steps && result.steps.length > 0) {
        const firstStep = result.steps[0];
        if (firstStep.execution?.process && firstStep.execution.process.length > 0) {
          const txHash = firstStep.execution.process[0].txHash;
          if (txHash) {
            setTxSignature(txHash);
            console.log(`🔗 Transaction: https://etherscan.io/tx/${txHash}`);
          }
        }
      }
      
      // 清空表单
      setAmount('');
      setQuote(null);
      setEstimatedShares('0');
      
      // 6秒后隐藏进度提示
      setTimeout(() => {
        setShowProgress(false);
        setTxSignature(undefined);
      }, 6000);
      
    } catch (err: any) {
      console.error('❌ Purchase failed:', err);
      console.log('📋 Quote details for execution:', quote);
      
      // 提取更有用的错误信息
      let errorMessage = 'Transaction failed';
      
      if (err.message) {
        if (err.message.includes('User rejected') || err.message.includes('User denied')) {
          errorMessage = 'Transaction was rejected';
        } else if (err.message.includes('insufficient funds') || err.message.includes('Insufficient balance')) {
          errorMessage = 'Insufficient funds for transaction';
        } else if (err.message.includes('internal error')) {
          errorMessage = 'Transaction failed. Please check your USDC balance and approval.';
        } else {
          errorMessage = err.message.substring(0, 100);
        }
      }
      
      setProgressMessage(errorMessage);
      setTotalTxSteps(0);
      setError(errorMessage);
      
      // 6秒后隐藏错误提示
      setTimeout(() => {
        setShowProgress(false);
      }, 6000);
    }
    
    console.log('📋 Quote details for execution:', {
      route: quote.route,
      fromAmount: amount,
      toAmount: estimatedShares,
      totalFees: quote.totalFees,
      estimatedTime: quote.estimatedTime,
    });
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
        
        <Container maxWidth="lg" sx={{ py: 4 }}>
          {/* Header */}
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
                <TrendingUpIcon sx={{ color: 'white', fontSize: 20 }} />
              </Box>
              <Typography variant="h3" component="h1" fontWeight={700} sx={{ 
                background: 'linear-gradient(45deg, #ffffff 0%, #e2e8f0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                X Stock
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ color: '#94a3b8', mb: 1 }}>
              Trade tokenized stocks on the blockchain with cross-chain swaps powered by LI.FI
            </Typography>
            <Chip 
              label="Beta - Powered by LI.FI" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                color: '#60a5fa',
                fontWeight: 600
              }} 
            />
          </Box>

          <Grid container spacing={3}>
            {/* Left: Stock Selection */}
            <Grid size={{ xs: 12, md: 4 }}>
              {/* Stock count header */}
              <Box sx={{ 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                px: 1
              }}>
                <Typography variant="body1" sx={{ color: '#94a3b8', fontWeight: 600 }}>
                  Available Stocks
                </Typography>
                <Chip 
                  label={`${TOKENIZED_STOCKS.length} stocks`}
                  size="small"
                  sx={{ 
                    backgroundColor: 'rgba(59, 130, 246, 0.2)', 
                    color: '#60a5fa',
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                />
              </Box>
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 1.5,
                maxHeight: '600px',
                overflowY: 'auto',
                pr: 1,
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(59, 130, 246, 0.3)',
                  borderRadius: '3px',
                  '&:hover': {
                    background: 'rgba(59, 130, 246, 0.5)',
                  },
                },
              }}>
                {TOKENIZED_STOCKS.map((stock) => (
                  <Card
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    sx={{ 
                      p: 2, 
                      cursor: 'pointer',
                      background: selectedStock.symbol === stock.symbol
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: selectedStock.symbol === stock.symbol
                        ? '2px solid rgba(59, 130, 246, 0.5)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 2,
                      boxShadow: selectedStock.symbol === stock.symbol
                        ? '0 8px 32px rgba(59, 130, 246, 0.2)'
                        : '0 4px 16px rgba(0, 0, 0, 0.2)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Box sx={{
                        width: 36,
                        height: 36,
                        borderRadius: '8px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5,
                        fontSize: '20px'
                      }}>
                        {stock.logo}
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography sx={{ 
                          color: 'white', 
                          fontWeight: 700,
                          fontSize: '0.95rem'
                        }}>
                          {stock.symbol}
                        </Typography>
                        <Typography variant="caption" sx={{ 
                          color: '#94a3b8',
                          display: 'block',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {stock.name}
                        </Typography>
                      </Box>
                    </Box>
                  </Card>
                ))}
              </Box>
            </Grid>

            {/* Right: Trading Interface */}
            <Grid size={{ xs: 12, md: 8 }}>
              <Card sx={{ 
                p: 3, 
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Box sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '14px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mr: 2,
                    fontSize: '28px',
                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                  }}>
                    {selectedStock.logo}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                      Buy {selectedStock.symbol}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {selectedStock.name}
                    </Typography>
                  </Box>
                </Box>

                {!authenticated && (
                  <Alert 
                    severity="warning" 
                    sx={{ 
                      mb: 3,
                      backgroundColor: 'rgba(255, 152, 0, 0.1)',
                      border: '1px solid rgba(255, 152, 0, 0.3)',
                      color: '#ffb74d',
                      '& .MuiAlert-icon': { color: '#ffb74d' }
                    }}
                  >
                    <Typography variant="body2">
                      🔐 Please connect your wallet to trade stocks
                    </Typography>
                  </Alert>
                )}

                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3,
                      backgroundColor: 'rgba(244, 67, 54, 0.1)',
                      border: '1px solid rgba(244, 67, 54, 0.3)',
                      color: '#ef5350',
                      '& .MuiAlert-icon': { color: '#ef5350' }
                    }}
                  >
                    {error}
                  </Alert>
                )}

                {/* Payment Token Selection */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                  <InputLabel 
                    sx={{ 
                      color: '#94a3b8',
                      '&.Mui-focused': { color: '#60a5fa' }
                    }}
                  >
                    Pay With
                  </InputLabel>
                  <Select
                    value={paymentToken.symbol}
                    label="Pay With"
                    onChange={(e) => {
                      const token = PAYMENT_TOKENS.find(t => t.symbol === e.target.value);
                      if (token) setPaymentToken(token);
                    }}
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '.MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: '#3b82f6',
                      },
                    }}
                  >
                    {PAYMENT_TOKENS.map((token) => (
                      <MenuItem key={token.symbol} value={token.symbol}>
                        {token.symbol} - {token.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {/* Amount Input */}
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    const value = e.target.value;
                    // 防止负数输入
                    if (value === '' || parseFloat(value) >= 0) {
                      setAmount(value);
                    }
                  }}
                  placeholder="0.00"
                  inputProps={{
                    min: 0,
                    step: 0.01,
                  }}
                  sx={{
                    mb: 3,
                    input: { 
                      color: 'white',
                      fontSize: '1.2rem',
                      fontWeight: 600
                    },
                    label: { 
                      color: '#94a3b8',
                      '&.Mui-focused': { color: '#60a5fa' }
                    },
                    '.MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      '& fieldset': {
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                      },
                      '&:hover fieldset': {
                        borderColor: 'rgba(59, 130, 246, 0.5)',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                      },
                    },
                  }}
                  InputProps={{
                    endAdornment: (
                      <Chip 
                        label={paymentToken.symbol} 
                        size="small"
                        sx={{ 
                          backgroundColor: 'rgba(59, 130, 246, 0.2)',
                          color: '#60a5fa',
                          fontWeight: 600
                        }}
                      />
                    ),
                  }}
                />

                {/* Get Quote Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={fetchQuote}
                  disabled={loading || !authenticated}
                  startIcon={loading ? <CircularProgress size={20} /> : <SwapHorizIcon />}
                  sx={{
                    mb: 3,
                    py: 1.5,
                    borderColor: 'rgba(59, 130, 246, 0.5)',
                    color: '#60a5fa',
                    fontWeight: 600,
                    fontSize: '1rem',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)',
                    },
                    '&:disabled': {
                      borderColor: 'rgba(255, 255, 255, 0.1)',
                      color: 'rgba(255, 255, 255, 0.3)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {loading ? 'Getting Quote...' : '🔄 Get Quote'}
                </Button>

                {/* Quote Display */}
                {quote && (
                  <Box sx={{ mb: 3 }}>
                    <Card sx={{ 
                      p: 3, 
                      background: 'linear-gradient(135deg, rgba(52, 211, 153, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                      border: '1px solid rgba(52, 211, 153, 0.3)',
                      borderRadius: 2,
                      boxShadow: '0 4px 16px rgba(52, 211, 153, 0.1)',
                    }}>
                      <Box sx={{ textAlign: 'center', mb: 2 }}>
                        <Typography variant="caption" sx={{ color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                          You will receive
                        </Typography>
                        <Typography variant="h3" sx={{ 
                          fontWeight: 800, 
                          my: 1,
                          background: 'linear-gradient(135deg, #34d399 0%, #3b82f6 100%)',
                          backgroundClip: 'text',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}>
                          {estimatedShares}
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#60a5fa', fontWeight: 600 }}>
                          {selectedStock.symbol} Shares
                        </Typography>
                      </Box>
                      
                      <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.1)' }} />
                      
                      {/* 汇率信息 */}
                      <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        mb: 1.5,
                        p: 1.5,
                        bgcolor: 'rgba(59, 130, 246, 0.1)',
                        borderRadius: 1,
                        border: '1px solid rgba(59, 130, 246, 0.2)'
                      }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          📊 Exchange Rate
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                          1 {paymentToken.symbol} ≈ {(parseFloat(estimatedShares) / parseFloat(amount || '1')).toFixed(4)} {selectedStock.symbol}
                        </Typography>
                      </Box>

                      {/* 你支付的金额 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          💸 You Pay
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                          {amount} {paymentToken.symbol} (${quote.route.fromAmountUSD || amount})
                        </Typography>
                      </Box>

                      {/* 你接收的金额 */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          📥 You Receive
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#34d399', fontWeight: 600 }}>
                          {estimatedShares} {selectedStock.symbol} (${quote.route.toAmountUSD || (parseFloat(estimatedShares) * 200).toFixed(2)})
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            ⏱️ Estimated Time
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                          {quote.estimatedTime < 60 
                            ? `~${quote.estimatedTime} sec` 
                            : `~${Math.floor(quote.estimatedTime / 60)} min`}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                            💰 Network Fee
                          </Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                          ${quote.totalFees.toFixed(2)}
                        </Typography>
                      </Box>
                    </Card>
                  </Box>
                )}

                {/* Buy Button */}
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleBuy}
                  disabled={!quote || loading || !authenticated}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AccountBalanceWalletIcon />}
                  sx={{
                    py: 2.5,
                    background: !quote || loading || !authenticated
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    boxShadow: !quote || loading || !authenticated
                      ? 'none'
                      : '0 8px 24px rgba(59, 130, 246, 0.4)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 12px 32px rgba(59, 130, 246, 0.5)',
                    },
                    '&:disabled': {
                      background: 'rgba(59, 130, 246, 0.2)',
                      color: 'rgba(255, 255, 255, 0.4)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {loading ? 'Processing Transaction...' : `🛒 Buy ${selectedStock.symbol}`}
                </Button>

                {/* Info */}
                <Alert 
                  severity="info" 
                  sx={{ 
                    mt: 3,
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: '#94a3b8',
                    '& .MuiAlert-icon': { color: '#60a5fa' }
                  }}
                >
                  <Typography variant="body2" sx={{ color: '#cbd5e1', lineHeight: 1.6 }}>
                    <strong style={{ color: '#60a5fa' }}>⚡ Powered by LI.FI</strong>
                    <br />
                    Your tokens will be automatically swapped and bridged across chains to purchase tokenized stocks on the blockchain.
                  </Typography>
                </Alert>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
      
      {/* Transaction Progress Indicator */}
      <TransactionProgress
        open={showProgress}
        status={loading ? 'building' : 'success'}
        title={progressTitle}
        message={progressMessage}
        currentStep={currentTxStep}
        totalSteps={totalTxSteps}
        txSignature={txSignature}
      />
    </Box>
  );
};

export default XStockPage;