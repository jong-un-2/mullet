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
import { marsLiFiService, SUPPORTED_CHAINS } from '../services/marsLiFiService';
import { usePrivy } from '@privy-io/react-auth';
import { useWallets } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

// 支持的代币化股票 (Solana 地址)
const TOKENIZED_STOCKS = [
  { 
    symbol: 'TSLAx', 
    name: 'Tesla xStock', 
    logo: '🚗',
    address: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB', // Solana TSLAx 代币地址
    decimals: 9, // Solana token decimals
    description: 'Electric vehicles and clean energy'
  },
  { 
    symbol: 'AAPLx', 
    name: 'Apple xStock', 
    logo: '🍎',
    address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp', // Solana AAPLx 代币地址
    decimals: 9,
    description: 'Technology and consumer electronics'
  },
  { 
    symbol: 'GOOGLx', 
    name: 'Alphabet xStock', 
    logo: '🔍',
    address: 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN', // Solana GOOGLx 代币地址
    decimals: 9,
    description: 'Search engine and cloud services'
  },
  { 
    symbol: 'AMZNx', 
    name: 'Amazon xStock', 
    logo: '📦',
    address: 'Xs3eBt7uRfJX8QUs4suhyU8p2M6DoUDrJyWBa8LLZsg', // Solana AMZNx 代币地址
    decimals: 9,
    description: 'E-commerce and cloud computing'
  },
  { 
    symbol: 'MSFTx', 
    name: 'Microsoft xStock', 
    logo: '💻',
    address: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX', // Solana MSFTx 代币地址
    decimals: 9,
    description: 'Software and cloud services'
  },
  { 
    symbol: 'NVDAx', 
    name: 'NVIDIA xStock', 
    logo: '🎮',
    address: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh', // Solana NVDAx 代币地址
    decimals: 9,
    description: 'Graphics processing and AI chips'
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

  useEffect(() => {
    if (authenticated && wallets.length > 0) {
      setUserAddress(wallets[0].address);
    }
    if (authenticated && solanaWallets.length > 0) {
      setSolanaAddress(solanaWallets[0].address);
    }
  }, [authenticated, wallets, solanaWallets]);

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

  // 执行购买
  const handleBuy = async () => {
    if (!quote) {
      setError('Please get a quote first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 执行跨链 swap
      const result = await marsLiFiService.executeDeposit({
        userAddress,
        fromChain: paymentToken.chainId,
        fromToken: paymentToken.symbol,
        fromAmount: amount,
        transactionHash: '', // 实际交易哈希
      });

      if (result.success) {
        alert(`Successfully purchased ${estimatedShares} ${selectedStock.symbol} shares!`);
        setAmount('');
        setQuote(null);
      }
    } catch (err: any) {
      console.error('Failed to execute purchase:', err);
      setError(err.message || 'Failed to execute purchase');
    } finally {
      setLoading(false);
    }
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
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(1, 1fr)',
                gap: 2,
              }}>
                {TOKENIZED_STOCKS.map((stock) => (
                  <Card
                    key={stock.symbol}
                    onClick={() => setSelectedStock(stock)}
                    sx={{ 
                      p: 2.5, 
                      cursor: 'pointer',
                      background: selectedStock.symbol === stock.symbol
                        ? 'rgba(59, 130, 246, 0.15)' 
                        : 'rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(10px)',
                      border: selectedStock.symbol === stock.symbol
                        ? '1px solid rgba(59, 130, 246, 0.3)'
                        : '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: 3,
                      boxShadow: selectedStock.symbol === stock.symbol
                        ? '0 8px 32px rgba(59, 130, 246, 0.2)'
                        : '0 8px 32px rgba(0, 0, 0, 0.3)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 40px rgba(59, 130, 246, 0.3)',
                        background: 'rgba(59, 130, 246, 0.2)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                      }
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        background: 'rgba(59, 130, 246, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 2,
                        fontSize: '24px'
                      }}>
                        {stock.logo}
                      </Box>
                      <Box>
                        <Typography sx={{ 
                          color: 'white', 
                          fontWeight: 700,
                          fontSize: '1.1rem'
                        }}>
                          {stock.symbol}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                          {stock.name}
                        </Typography>
                      </Box>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#cbd5e1', lineHeight: 1.4 }}>
                      {stock.description}
                    </Typography>
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
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
    </Box>
  );
};

export default XStockPage;