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
import { TokenIcon } from '../components/TokenIcon';
import { marsLiFiService, SUPPORTED_CHAINS, SOLANA_CHAIN_ID } from '../services/marsLiFiService';
import { checkBalance } from '../services/balanceService';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
import { createConfig, executeRoute, EVM, Solana } from '@lifi/sdk';
import type { Route, ExecutionOptions } from '@lifi/sdk';
import { createWalletClient, custom } from 'viem';
import { mainnet } from 'viem/chains';
import { useWalletContext } from '../contexts/WalletContext';

// 简单的链图标组件
const ChainIcon = ({ chain, size = 20 }: { chain: 'solana' | 'ethereum'; size?: number }) => {
  if (chain === 'ethereum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff"/>
        <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.38z" fill="#fff"/>
      </svg>
    );
  }
  
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`solana_gradient_${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00FFA3"/>
          <stop offset="100%" stopColor="#DC1FFF"/>
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill={`url(#solana_gradient_${size})`}/>
      <g transform="translate(7, 10)">
        <path d="M3.5 8.5c-.2 0-.4-.1-.5-.3-.2-.3-.1-.7.2-.9l2.3-1.8c.1-.1.3-.1.5-.1h11c.3 0 .6.2.7.5.2.3.1.7-.2.9l-2.3 1.8c-.1.1-.3.1-.5.1h-11c-.1 0-.2-.1-.2-.2z" fill="#000"/>
        <path d="M3.5 3.5c-.2 0-.4-.1-.5-.3-.2-.3-.1-.7.2-.9L5.5.5c.1-.1.3-.1.5-.1h11c.3 0 .6.2.7.5.2.3.1.7-.2.9l-2.3 1.8c-.1.1-.3.1-.5.1h-11c-.1 0-.2-.1-.2-.2z" fill="#000"/>
        <path d="M17 11.5c.2 0 .4.1.5.3.2.3.1.7-.2.9l-2.3 1.8c-.1.1-.3.1-.5.1h-11c-.3 0-.6-.2-.7-.5-.2-.3-.1-.7.2-.9l2.3-1.8c.1-.1.3-.1.5-.1h11z" fill="#000"/>
      </g>
    </svg>
  );
};

// 支持的代币化股票 (Solana 地址)
const TOKENIZED_STOCKS = [
  { 
    symbol: 'TSLAx', 
    name: 'Tesla xStock', 
    logo: 'https://img.logo.dev/ticker/TSLA?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', // Solana TSLAx 代币地址
    decimals: 8, // xStock tokens use 8 decimals
    description: 'Electric vehicles and clean energy'
  },
  { 
    symbol: 'AAPLx', 
    name: 'Apple xStock', 
    logo: 'https://img.logo.dev/ticker/AAPL?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', // Solana AAPLx 代币地址
    decimals: 8,
    description: 'Technology and consumer electronics'
  },
  { 
    symbol: 'GOOGLx', 
    name: 'Alphabet xStock', 
    logo: 'https://img.logo.dev/ticker/GOOGL?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', // Solana GOOGLx 代币地址
    decimals: 8,
    description: 'Search engine and cloud services'
  },
  { 
    symbol: 'AMZNx', 
    name: 'Amazon xStock', 
    logo: 'https://img.logo.dev/ticker/AMZN?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', // Solana AMZNx 代币地址
    decimals: 8,
    description: 'E-commerce and cloud computing'
  },
  { 
    symbol: 'MSFTx', 
    name: 'Microsoft xStock', 
    logo: 'https://img.logo.dev/ticker/MSFT?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', // Solana MSFTx 代币地址
    decimals: 8,
    description: 'Software and cloud services'
  },
  { 
    symbol: 'NVDAx', 
    name: 'NVIDIA xStock', 
    logo: 'https://img.logo.dev/ticker/NVDA?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', // Solana NVDAx 代币地址
    decimals: 8,
    description: 'Graphics processing and AI chips'
  },
  { 
    symbol: 'CRCLx', 
    name: 'Circle xStock', 
    logo: 'https://img.logo.dev/ticker/CRCL?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsueG8BtpquVJX9LVLLEGuViXUungE6WmK5YZ3p3bd1', // Solana CRCLx 代币地址
    decimals: 8,
    description: 'Digital currency and payment infrastructure'
  },
  { 
    symbol: 'COINx', 
    name: 'Coinbase xStock', 
    logo: 'https://img.logo.dev/ticker/COIN?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xs7ZdzSHLU9ftNJsii5fCeJhoRWSC32SQGzGQtePxNu', // Solana COINx 代币地址
    decimals: 8,
    description: 'Cryptocurrency exchange platform'
  },
  { 
    symbol: 'METAx', 
    name: 'Meta xStock', 
    logo: 'https://img.logo.dev/ticker/META?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xsa62P5mvPszXL1krVUnU5ar38bBSVcWAB6fmPCo5Zu', // Solana METAx 代币地址
    decimals: 8,
    description: 'Social media and virtual reality'
  },
  { 
    symbol: 'MSTRx', 
    name: 'MicroStrategy xStock', 
    logo: 'https://img.logo.dev/ticker/MSTR?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsP7xzNPvEHS1m6qfanPUGjNmdnmsLKEoNAnHjdxxyZ', // Solana MSTRx 代币地址
    decimals: 8,
    description: 'Bitcoin treasury and business intelligence'
  },
  { 
    symbol: 'QQQx', 
    name: 'Invesco QQQ xStock', 
    logo: 'https://img.logo.dev/ticker/QQQ?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xs8S1uUs1zvS2p7iwtsG3b6fkhpvmwz4GYU3gWAmWHZ', // Solana QQQx 代币地址
    decimals: 8,
    description: 'Nasdaq-100 Index ETF'
  },
  { 
    symbol: 'SPYx', 
    name: 'SPDR S&P 500 xStock', 
    logo: 'https://img.logo.dev/ticker/SPY?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsoCS1TfEyfFhfvj8EtZ528L3CaKBDBRqRapnBbDF2W', // Solana SPYx 代币地址
    decimals: 8,
    description: 'S&P 500 Index ETF'
  },
  { 
    symbol: 'GMEx', 
    name: 'GameStop xStock', 
    logo: 'https://img.logo.dev/ticker/GME?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xsf9mBktVB9BSU5kf4nHxPq5hCBJ2j2ui3ecFGxPRGc', // Solana GMEx 代币地址
    decimals: 8,
    description: 'Video game retailer'
  },
  { 
    symbol: 'PMx', 
    name: 'Philip Morris xStock', 
    logo: 'https://img.logo.dev/ticker/PM?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xsba6tUnSjDae2VcopDB6FGGDaxRrewFCDa5hKn5vT3', // Solana PMx 代币地址
    decimals: 8,
    description: 'Tobacco and smoke-free products'
  },
  { 
    symbol: 'MRVLx', 
    name: 'Marvell Technology xStock', 
    logo: 'https://img.logo.dev/ticker/MRVL?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsuxRGDzbLjnJ72v74b7p9VY6N66uYgTCyfwwRjVCJA', // Solana MRVLx 代币地址
    decimals: 8,
    description: 'Semiconductor and infrastructure solutions'
  },
  { 
    symbol: 'INTCx', 
    name: 'Intel xStock', 
    logo: 'https://img.logo.dev/ticker/INTC?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XshPgPdXFRWB8tP1j82rebb2Q9rPgGX37RuqzohmArM', // Solana INTCx 代币地址
    decimals: 8,
    description: 'Semiconductor chip manufacturer'
  },
  { 
    symbol: 'IBMx', 
    name: 'IBM xStock', 
    logo: 'https://img.logo.dev/ticker/IBM?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XspwhyYPdWVM8XBHZnpS9hgyag9MKjLRyE3tVfmCbSr', // Solana IBMx 代币地址
    decimals: 8,
    description: 'Cloud computing and enterprise solutions'
  },
  { 
    symbol: 'NFLXx', 
    name: 'Netflix xStock', 
    logo: 'https://img.logo.dev/ticker/NFLX?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL', // Solana NFLXx 代币地址
    decimals: 8,
    description: 'Streaming entertainment service'
  },
  { 
    symbol: 'MCDx', 
    name: "McDonald's xStock", 
    logo: 'https://img.logo.dev/ticker/MCD?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsqE9cRRpzxcGKDXj1BJ7Xmg4GRhZoyY1KpmGSxAWT2', // Solana MCDx 代币地址
    decimals: 8,
    description: 'Fast food restaurant chain'
  },
  { 
    symbol: 'ORCLx', 
    name: 'Oracle xStock', 
    logo: 'https://img.logo.dev/ticker/ORCL?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsjFwUPiLofddX5cWFHW35GCbXcSu1BCUGfxoQAQjeL', // Solana ORCLx 代币地址
    decimals: 8,
    description: 'Database and enterprise software'
  },
  { 
    symbol: 'KOx', 
    name: 'Coca-Cola xStock', 
    logo: 'https://img.logo.dev/ticker/KO?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'XsaBXg8dU5cPM6ehmVctMkVqoiRG2ZjMo1cyBJ3AykQ', // Solana KOx 代币地址
    decimals: 8,
    description: 'Beverage and soft drink manufacturer'
  },
  { 
    symbol: 'WMTx', 
    name: 'Walmart xStock', 
    logo: 'https://img.logo.dev/ticker/WMT?token=pk_DW4DBmJtQn-9p3URXziq3Q',
    address: 'Xs151QeqTCiuKtinzfRATnUESM2xTU6V9Wy8Vy538ci', // Solana WMTx 代币地址
    decimals: 8,
    description: 'Retail and supermarket chain'
  },
  { 
    symbol: 'PEPx', 
    name: 'PepsiCo xStock', 
    logo: 'https://img.logo.dev/ticker/PEP?token=pk_DW4DBmJtQn-9p3URXziq3Q',
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

// 支付代币选项 - 优先使用 Solana 链
const PAYMENT_TOKENS = [
  // Solana 链稳定币（优先）
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    chainName: 'Solana',
    chain: 'solana' as const,
    chainId: SOLANA_CHAIN_ID,
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana USDC
    decimals: 6
  },
  { 
    symbol: 'PYUSD', 
    name: 'PayPal USD', 
    chainName: 'Solana',
    chain: 'solana' as const,
    chainId: SOLANA_CHAIN_ID,
    address: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo', // Solana PYUSD
    decimals: 6
  },
  // Ethereum 链稳定币
  { 
    symbol: 'USDC', 
    name: 'USD Coin', 
    chainName: 'Ethereum',
    chain: 'ethereum' as const,
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum USDC
    decimals: 6
  },
  { 
    symbol: 'PYUSD', 
    name: 'PayPal USD', 
    chainName: 'Ethereum',
    chain: 'ethereum' as const,
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8', // Ethereum PYUSD
    decimals: 6
  },
  { 
    symbol: 'USDT', 
    name: 'Tether', 
    chainName: 'Ethereum',
    chain: 'ethereum' as const,
    chainId: SUPPORTED_CHAINS.ETHEREUM,
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6
  },
];

const XStockPage = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets(); // EVM 钱包 (用于 fromAddress)
  const { wallets: solanaWallets } = useSolanaWallets(); // Solana 钱包 (用于 toAddress)
  const { primaryWallet } = useWalletContext(); // Get primary wallet type
  
  const [selectedStock, setSelectedStock] = useState(TOKENIZED_STOCKS[0]);
  const [paymentToken, setPaymentToken] = useState(PAYMENT_TOKENS[0]);
  const [amount, setAmount] = useState('');
  const [estimatedShares, setEstimatedShares] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [quote, setQuote] = useState<any>(null);
  const [userAddress, setUserAddress] = useState(''); // EVM 地址
  const [solanaAddress, setSolanaAddress] = useState(''); // Solana 地址
  const [tokenBalance, setTokenBalance] = useState<string>('0'); // 代币余额
  const [checkingBalance, setCheckingBalance] = useState(false);
  
  // 进度提示状态
  const [showProgress, setShowProgress] = useState(false);
  const [progressTitle, setProgressTitle] = useState('');
  const [progressMessage, setProgressMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string>();
  const [currentTxStep, setCurrentTxStep] = useState(0);
  const [totalTxSteps, setTotalTxSteps] = useState(0);

  // 根据主要钱包类型过滤支付代币列表
  const getFilteredPaymentTokens = () => {
    if (!primaryWallet) {
      // 如果没有检测到主要钱包，显示所有代币
      return PAYMENT_TOKENS;
    }

    // 根据主要钱包类型过滤
    return PAYMENT_TOKENS.filter(token => {
      if (primaryWallet === 'sol') {
        return token.chain === 'solana';
      } else if (primaryWallet === 'eth') {
        return token.chain === 'ethereum';
      }
      return true;
    });
  };

  useEffect(() => {
    console.log('🔍 XStock wallet check:', {
      authenticated,
      walletsCount: wallets.length,
      solanaWalletsCount: solanaWallets.length,
      wallets: wallets.map(w => ({ address: w.address, walletClientType: w.walletClientType })),
      solanaWallets: solanaWallets.map(w => ({ address: w.address }))
    });
    
    // 检查钱包是否连接，不依赖 authenticated 标志
    if (wallets.length > 0) {
      const ethWallet = wallets.find(w => w.address.startsWith('0x'));
      if (ethWallet) {
        setUserAddress(ethWallet.address);
        console.log('✅ ETH wallet set:', ethWallet.address);
      } else {
        console.log('⚠️ No ETH wallet found in wallets array');
        setUserAddress(''); // 清空地址
      }
    } else {
      setUserAddress(''); // 没有钱包时清空地址
    }
    
    if (solanaWallets.length > 0) {
      setSolanaAddress(solanaWallets[0].address);
      console.log('✅ Solana wallet set:', solanaWallets[0].address);
    } else {
      setSolanaAddress(''); // 没有钱包时清空地址
    }
  }, [authenticated, wallets, solanaWallets]);

  // 自动检查代币余额
  useEffect(() => {
    const checkTokenBalance = async () => {
      // 确定使用哪个钱包地址
      // EVM 链（USDC, USDT, ETH, PYUSD on Ethereum）使用 ETH 钱包地址
      // Solana 链使用 Solana 钱包地址
      const fromAddress = paymentToken.chainId === SOLANA_CHAIN_ID ? solanaAddress : userAddress;

      if (!fromAddress) {
        setTokenBalance('0');
        return;
      }

      try {
        setCheckingBalance(true);
        const balanceResult = await checkBalance(
          paymentToken.address, 
          paymentToken.chainId, 
          fromAddress,
          paymentToken.decimals
        );
        setTokenBalance(balanceResult.formatted);
        console.log(`💰 Auto-checked balance: ${balanceResult.formatted} ${paymentToken.symbol}`);
      } catch (error) {
        console.error('Failed to check balance:', error);
        setTokenBalance('0');
      } finally {
        setCheckingBalance(false);
      }
    };

    checkTokenBalance();
  }, [paymentToken, userAddress, solanaAddress]);

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

    const inputAmount = parseFloat(amount);

    // 根据支付代币的链选择对应的钱包地址
    const fromAddress = paymentToken.chainId === SOLANA_CHAIN_ID ? solanaAddress : userAddress;
    
    if (!fromAddress) {
      setError(`Please connect your ${paymentToken.chainId === SOLANA_CHAIN_ID ? 'Solana' : 'EVM'} wallet first`);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // 🔍 检查余额
      console.log('💰 Checking balance before quote...');
      setCheckingBalance(true);
      const balanceResult = await checkBalance(
        paymentToken.address, 
        paymentToken.chainId, 
        fromAddress,
        paymentToken.decimals
      );
      setTokenBalance(balanceResult.formatted);
      setCheckingBalance(false);
      
      const balanceNum = parseFloat(balanceResult.formatted);
      console.log(`💰 Balance: ${balanceResult.formatted} ${paymentToken.symbol}, Required: ${amount}`);
      
      if (balanceNum < inputAmount) {
        setError(`❌ Insufficient balance. You have ${balanceResult.formatted} ${paymentToken.symbol}, but need ${amount}`);
        setLoading(false);
        return;
      }
      
      console.log('✅ Balance check passed');
      
      // 继续获取报价
      // 转换金额为最小单位
      const decimals = paymentToken.decimals;
      const fromAmount = (parseFloat(amount) * Math.pow(10, decimals)).toString();

      console.log('🔵 Fetching quote with:', {
        amount,
        fromAmount,
        decimals,
        paymentToken: paymentToken.symbol,
        paymentTokenAddress: paymentToken.address,
        chainId: paymentToken.chainId,
        stock: selectedStock.symbol,
        fromAddress,
        toAddress: solanaAddress
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
        fromChain: paymentToken.chainId,
        fromAddress,
        toAddress: solanaAddress,
      });

      // 使用 LiFi 获取跨链 swap 报价
      // 调用 LiFi API 获取报价
      const response = await marsLiFiService.getDepositQuote({
        fromChain: paymentToken.chainId,
        fromToken: paymentToken.address, // 使用代币地址而不是符号
        toToken, // Solana上的对应代币地址
        fromAmount, // 使用最小单位
        fromAddress, // 使用正确的链地址（Solana 链用 Solana 地址，EVM 链用 EVM 地址）
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
  // 
  // 错误修复说明:
  // "Cannot read properties of undefined (reading 'toString')" 错误是因为 LiFi SDK
  // 在执行 Solana 交易时需要一个标准的 wallet adapter，它期望有一个 publicKey 对象
  // 该对象必须有 toString() 方法。Privy 的 Solana wallet 直接提供 address 字符串，
  // 但没有提供标准的 PublicKey 对象。
  // 
  // 解决方案：
  // 1. 从 Privy wallet 的 address 创建一个标准的 @solana/web3.js PublicKey 对象
  // 2. 创建一个符合 LiFi SDK 期望的 wallet adapter 接口
  // 3. 添加详细的日志记录来调试任何后续问题
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
      
      // 配置 Solana provider with proper wallet adapter
      const solanaProvider = Solana({
        getWalletAdapter: async () => {
          // Create a PublicKey object from the address
          const { PublicKey } = await import('@solana/web3.js');
          
          let publicKey;
          try {
            publicKey = new PublicKey(solanaWallet.address);
            console.log('✅ Created PublicKey:', publicKey.toBase58());
          } catch (error) {
            console.error('❌ Failed to create PublicKey:', error);
            throw new Error(`Invalid Solana address: ${solanaWallet.address}`);
          }
          
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
                const { VersionedTransaction } = await import('@solana/web3.js');
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
      
      // 使用 Helius RPC 而不是公共节点，避免 403 错误
      const customRpcUrl = 'https://rpc.ankr.com/solana/6399319de5985a2ee9496b8ae8590d7bba3988a6fb28d4fc80cb1fbf9f039fb3';
      console.log('🔗 Configuring LiFi SDK with custom Solana RPC:', customRpcUrl);
      
      // 初始化 LiFi SDK 同时支持 EVM 和 Solana，并配置自定义 RPC URLs
      createConfig({
        integrator: 'mullet1',
        apiKey: '17a821dd-2065-4bdb-b3ec-fe45cdca67ee.f004e74e-b922-498e-bab7-6b8ba539335c',
        providers: [evmProvider, solanaProvider],
        // 全局费用配置（推荐方式）
        routeOptions: {
          fee: 0.0025, // 0.25% 集成商费用，自动应用到所有请求
        },
        // 配置 Solana RPC URL，避免使用公共节点
        rpcUrls: {
          1151111081099710: [customRpcUrl], // Solana Mainnet
        },
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
      console.log('📝 Route details:', JSON.stringify(quote.route, null, 2));
      setProgressMessage('Please sign the transaction in your wallet...');
      setCurrentTxStep(2);
      
      // 执行路由的配置
      const executionOptions: ExecutionOptions = {
        updateRouteHook: (route: Route) => {
          console.log('🔄 Route updated:', route);
        },
        executeInBackground: false,
      };
      
      // 验证 route 对象的完整性
      if (!quote.route) {
        throw new Error('Route is undefined');
      }
      if (!quote.route.fromChainId) {
        throw new Error('Route fromChainId is undefined');
      }
      if (!quote.route.toChainId) {
        throw new Error('Route toChainId is undefined');
      }
      
      console.log('✅ Route validation passed');
      
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
      console.error('❌ Error stack:', err.stack);
      console.error('❌ Error cause:', err.cause);
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
        } else if (err.message.includes('Cannot read properties of undefined')) {
          errorMessage = 'Wallet configuration error. Please reconnect your wallet and try again.';
          console.error('❌ Detailed error: This is likely due to missing wallet adapter properties.');
          console.error('❌ Solana wallet object:', solanaWallets[0]);
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
                      <Box
                        component="img"
                        src={stock.logo}
                        alt={stock.name}
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '8px',
                          background: 'rgba(59, 130, 246, 0.1)',
                          mr: 1.5,
                          objectFit: 'contain',
                          padding: '4px'
                        }}
                        onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.textContent = stock.symbol.charAt(0);
                          fallback.style.cssText = `
                            width: 36px;
                            height: 36px;
                            border-radius: 8px;
                            background: rgba(59, 130, 246, 0.1);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 12px;
                            font-size: 20px;
                            font-weight: 700;
                            color: #3b82f6;
                          `;
                          e.currentTarget.parentNode?.replaceChild(fallback, e.currentTarget);
                        }}
                      />
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
                  <Box
                    component="img"
                    src={selectedStock.logo}
                    alt={selectedStock.name}
                    sx={{
                      width: 56,
                      height: 56,
                      borderRadius: '14px',
                      background: 'rgba(59, 130, 246, 0.15)',
                      mr: 2,
                      objectFit: 'contain',
                      padding: '8px',
                      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.2)'
                    }}
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      e.currentTarget.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.textContent = selectedStock.symbol.charAt(0);
                      fallback.style.cssText = `
                        width: 56px;
                        height: 56px;
                        border-radius: 14px;
                        background: rgba(59, 130, 246, 0.15);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin-right: 16px;
                        font-size: 28px;
                        font-weight: 700;
                        color: #3b82f6;
                        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
                      `;
                      e.currentTarget.parentNode?.replaceChild(fallback, e.currentTarget);
                    }}
                  />
                  <Box>
                    <Typography variant="h5" sx={{ color: 'white', fontWeight: 700 }}>
                      Buy {selectedStock.symbol}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      {selectedStock.name}
                    </Typography>
                  </Box>
                </Box>

                {(!userAddress || !solanaAddress) && (
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
                      {!userAddress && !solanaAddress
                        ? '🔐 Please connect your wallet to trade stocks'
                        : !userAddress
                        ? '🔐 Please add an Ethereum wallet to pay for stocks'
                        : '🔐 Please add a Solana wallet to receive xStock tokens'
                      }
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
                    value={`${paymentToken.symbol}-${paymentToken.chainName}`}
                    label="Pay With"
                    onChange={(e) => {
                      const [symbol, chainName] = e.target.value.split('-');
                      const token = PAYMENT_TOKENS.find(t => t.symbol === symbol && t.chainName === chainName);
                      if (token) setPaymentToken(token);
                    }}
                    renderValue={(value) => {
                      const [symbol, chainName] = value.split('-');
                      const token = PAYMENT_TOKENS.find(t => t.symbol === symbol && t.chainName === chainName);
                      if (!token) return value;
                      
                      return (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <TokenIcon 
                            symbol={token.symbol} 
                            chain={token.chain} 
                            size={28} 
                            showChainBadge={token.symbol !== 'SOL' && token.symbol !== 'ETH'} 
                          />
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: '1rem' }}>
                              {token.symbol}
                            </Typography>
                            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              {token.chainName}
                            </Typography>
                          </Box>
                        </Box>
                      );
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
                    {getFilteredPaymentTokens().map((token) => (
                      <MenuItem 
                        key={`${token.symbol}-${token.chainName}`} 
                        value={`${token.symbol}-${token.chainName}`}
                        sx={{
                          py: 1.5,
                          '&:hover': {
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                          },
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
                            <Typography sx={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                              {token.name}
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <ChainIcon chain={token.chain} size={20} />
                            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8', mt: 0.5 }}>
                              {token.chainName}
                            </Typography>
                          </Box>
                        </Box>
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

                {/* 余额显示 */}
                {(userAddress || solanaAddress) && (
                  <Box sx={{ mb: 2, textAlign: 'right' }}>
                    <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                      💰 Balance: {checkingBalance ? (
                        <CircularProgress size={12} sx={{ ml: 1 }} />
                      ) : (
                        <span style={{ color: '#60a5fa', fontWeight: 600 }}>{tokenBalance} {paymentToken.symbol}</span>
                      )}
                    </Typography>
                  </Box>
                )}

                {/* Get Quote Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={fetchQuote}
                  disabled={loading || !userAddress || !solanaAddress}
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
                  disabled={!quote || loading || !userAddress || !solanaAddress}
                  startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <AccountBalanceWalletIcon />}
                  sx={{
                    py: 2.5,
                    background: !quote || loading || !userAddress || !solanaAddress
                      ? 'rgba(59, 130, 246, 0.2)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    boxShadow: !quote || loading || !userAddress || !solanaAddress
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