import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { useWallets } from '@privy-io/react-auth/solana';
import { PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import {
  Box,
  Typography,
  Card,
  Tabs,
  Tab,
  Button,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
  Menu,
  MenuItem,
  Slider,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ButtonGroup,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import TuneIcon from '@mui/icons-material/Tune';
import CloseIcon from '@mui/icons-material/Close';
import { JITOSOL_POOLS, depositAndStake, unstakeAndWithdraw, claimFeesAndRewards, getUserPosition, fetchJitoSOLPools } from '../services/kaminoLiquidity';
import { TransactionProgress } from '../components/TransactionProgress';
import Navigation from '../components/Navigation';

// JitoSOL mint address
const JITOSOL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn';

// Format large numbers to human-readable format (e.g., 35514.41 -> 35.51K)
function formatLargeNumber(num: number): string {
  if (num === 0) return '0';
  if (num < 1000) return num.toFixed(4);
  if (num < 1000000) return (num / 1000).toFixed(2) + 'K';
  return (num / 1000000).toFixed(2) + 'M';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function PoolDetail() {
  const { poolAddress } = useParams<{ poolAddress: string }>();
  const navigate = useNavigate();
  const wallet = useWallet();
  const { connection } = useConnection();

  // Privy hooks for multi-chain wallet support
  const { authenticated } = usePrivy();
  const { isConnected: ethConnected } = useAccount();
  const { wallets: solanaWallets } = useWallets();
  
  // Check Solana wallet connection (both Privy and direct wallet adapter)
  let directSolanaConnected = false;
  try {
    directSolanaConnected = wallet.connected;
  } catch (error) {
    console.warn('⚠️ Solana wallet adapter not available:', error);
  }
  
  const solConnected = solanaWallets.length > 0 || directSolanaConnected;
  
  // Check if ANY wallet is connected (Privy auth, ETH external, or Solana external)
  const isWalletConnected = authenticated || ethConnected || solConnected;

  const [activeTab, setActiveTab] = useState(0);
  const [pool, setPool] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedFaq, setExpandedFaq] = useState<number | false>(false);

  // Deposit states
  const [solAmount, setSolAmount] = useState('');
  const [jitosolAmount, setJitosolAmount] = useState('');
  const [singleAssetDeposit, setSingleAssetDeposit] = useState(true);
  const [selectedToken, setSelectedToken] = useState<'SOL' | 'JITOSOL'>('SOL'); // For single asset mode
  const [actionMode, setActionMode] = useState<'deposit' | 'withdraw'>('deposit'); // Deposit or Withdraw mode
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | HTMLElement>(null); // Menu anchor
  const [withdrawPercentage, setWithdrawPercentage] = useState<number>(0); // Withdrawal percentage (0-100)
  const [depositLoading, setDepositLoading] = useState(false);

  // Position states
  const [userPosition, setUserPosition] = useState<any>(null);
  const [positionLoading, setPositionLoading] = useState(false);

  // Balance states
  const [solBalance, setSolBalance] = useState<number>(0);
  const [jitosolBalance, setJitosolBalance] = useState<number>(0);
  const [balancesLoading, setBalancesLoading] = useState(false);

  // Transaction progress states
  const [showProgress, setShowProgress] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'building' | 'signing' | 'sending' | 'confirming' | 'success' | 'error'>('idle');
  const [txMessage, setTxMessage] = useState('');
  const [txSignature, setTxSignature] = useState<string | undefined>();
  const [txType, setTxType] = useState<'deposit' | 'withdraw' | 'claim'>('deposit');

  // Activity Log states
  const [activityLog, setActivityLog] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Performance chart states
  const [perfCurrency, setPerfCurrency] = useState<'USD' | 'SOL'>('SOL');
  const [perfTimePeriod, setPerfTimePeriod] = useState<'7D' | '30D' | '3M' | '6M' | '1Y'>('7D');
  const [perfMenuAnchor, setPerfMenuAnchor] = useState<null | HTMLElement>(null);
  const [perfData, setPerfData] = useState<any>(null);
  const [perfLoading, setPerfLoading] = useState(false);
  const [showPositionValue, setShowPositionValue] = useState(true);
  const [showCostBasis, setShowCostBasis] = useState(true);

  // Transaction settings states
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [slippageTolerance, setSlippageTolerance] = useState<number>(0.5);
  const [customSlippage, setCustomSlippage] = useState('');
  const [priorityFee, setPriorityFee] = useState<'normal' | 'turbo' | 'custom'>('normal');
  const [customPriorityFee, setCustomPriorityFee] = useState('0.001');
  const [versionedTransaction, setVersionedTransaction] = useState(true);

  // Load user balances
  const loadBalances = useCallback(async () => {
    const userAddress = wallet.publicKey?.toString() || (solanaWallets.length > 0 ? solanaWallets[0].address : null);
    
    if (!userAddress) {
      setSolBalance(0);
      setJitosolBalance(0);
      return;
    }
    
    setBalancesLoading(true);
    try {
      const publicKey = new PublicKey(userAddress);
      
      // Get SOL balance
      const solBalanceLamports = await connection.getBalance(publicKey, 'confirmed');
      const solBal = solBalanceLamports / 1e9;
      setSolBalance(solBal);
      console.log('[PoolDetail] SOL Balance:', solBal);
      
      // Get JitoSOL balance
      try {
        const jitosolMint = new PublicKey(JITOSOL_MINT);
        const jitosolAta = await getAssociatedTokenAddress(jitosolMint, publicKey);
        const jitosolAccount = await getAccount(connection, jitosolAta);
        const jitosolBal = Number(jitosolAccount.amount) / 1e9;
        setJitosolBalance(jitosolBal);
        console.log('[PoolDetail] JitoSOL Balance:', jitosolBal);
      } catch (error) {
        // ATA doesn't exist, balance is 0
        console.log('[PoolDetail] JitoSOL ATA not found, balance is 0');
        setJitosolBalance(0);
      }
    } catch (error) {
      console.error('[PoolDetail] Error loading balances:', error);
      setSolBalance(0);
      setJitosolBalance(0);
    } finally {
      setBalancesLoading(false);
    }
  }, [wallet.publicKey, solanaWallets, connection]);

  const loadUserPosition = useCallback(async (poolData: any) => {
    // Check if we have either direct wallet or Privy wallet
    const userAddress = wallet.publicKey?.toString() || (solanaWallets.length > 0 ? solanaWallets[0].address : null);
    
    console.log('[loadUserPosition] Called with userAddress:', userAddress);
    
    if (!userAddress) {
      console.log('[loadUserPosition] No user address, skipping');
      return;
    }
    
    setPositionLoading(true);
    try {
      console.log('[loadUserPosition] Fetching position for strategy:', poolData.address);
      const position = await getUserPosition(
        poolData.address,
        userAddress,
        connection
      );
      console.log('[loadUserPosition] Position fetched:', position);
      setUserPosition(position);
    } catch (error) {
      console.error('[loadUserPosition] Error loading position:', error);
    } finally {
      setPositionLoading(false);
    }
  }, [wallet.publicKey, solanaWallets, connection]);

  // Load activity log from backend
  const loadActivityLog = useCallback(async () => {
    const userAddress = wallet.publicKey?.toString() || (solanaWallets.length > 0 ? solanaWallets[0].address : null);
    
    if (!userAddress || !poolAddress) {
      setActivityLog([]);
      return;
    }
    
    setActivityLoading(true);
    try {
      // Fetch transaction history for this user and strategy
      const response = await fetch(
        `https://api.marsliquidity.com/v1/api/mars/liquidity/transactions/${userAddress}?strategyAddress=${poolAddress}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setActivityLog(result.data);
          console.log('[PoolDetail] Activity log loaded:', result.data.length, 'transactions');
        }
      }
    } catch (error) {
      console.error('[PoolDetail] Error loading activity log:', error);
      setActivityLog([]);
    } finally {
      setActivityLoading(false);
    }
  }, [wallet.publicKey, solanaWallets, poolAddress]);

  // Load performance chart data
  const loadPerformanceData = useCallback(async () => {
    const userAddress = wallet.publicKey?.toString() || (solanaWallets.length > 0 ? solanaWallets[0].address : null);
    
    if (!userAddress || !poolAddress) {
      setPerfData(null);
      return;
    }

    setPerfLoading(true);
    try {
      // Calculate time range based on selected period
      const now = Date.now();
      const ranges = {
        '7D': 7 * 24 * 60 * 60 * 1000,
        '30D': 30 * 24 * 60 * 60 * 1000,
        '3M': 90 * 24 * 60 * 60 * 1000,
        '6M': 180 * 24 * 60 * 60 * 1000,
        '1Y': 365 * 24 * 60 * 60 * 1000,
      };
      const start = now - ranges[perfTimePeriod];

      // Fetch PnL history from Kamino API
      const response = await fetch(
        `https://api.kamino.finance/kvaults/users/${userAddress}/vaults/${poolAddress}/pnl/history?start=${start}&end=${now}`
      );

      if (response.ok) {
        const data = await response.json();
        setPerfData(data);
        console.log('[PoolDetail] Performance data loaded:', data.history?.length || 0, 'points');
      } else {
        console.warn('[PoolDetail] Performance API returned:', response.status);
        setPerfData(null);
      }
    } catch (error) {
      console.error('[PoolDetail] Error loading performance data:', error);
      setPerfData(null);
    } finally {
      setPerfLoading(false);
    }
  }, [wallet.publicKey, solanaWallets, poolAddress, perfTimePeriod]);

  // Reload performance data when currency or time period changes
  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  useEffect(() => {
    const loadPoolData = async () => {
      if (!poolAddress) {
        setLoading(false);
        return;
      }
      
      // First try to find pool in existing data
      let foundPool = JITOSOL_POOLS.find(p => p.address === poolAddress);
      
      // If not found, fetch fresh data from API
      if (!foundPool) {
        console.log('Pool not found in cache, fetching from API...');
        await fetchJitoSOLPools();
        foundPool = JITOSOL_POOLS.find(p => p.address === poolAddress);
      }
      
      setPool(foundPool || null);
      setLoading(false);

      // Check if we have either direct wallet or Privy wallet
      const hasWalletAddress = wallet.publicKey || solanaWallets.length > 0;
      
      if (isWalletConnected && foundPool && hasWalletAddress) {
        console.log('[PoolDetail] Loading user position and activity log...');
        loadUserPosition(foundPool);
        loadActivityLog();
      }
    };
    
    loadPoolData();
  }, [poolAddress, isWalletConnected, wallet.publicKey, solanaWallets, loadUserPosition, loadActivityLog]);

  // Load balances when wallet connects
  useEffect(() => {
    if (isWalletConnected) {
      loadBalances();
    }
  }, [isWalletConnected, loadBalances]);

  const handleDeposit = async () => {
    console.log('handleDeposit called');
    console.log('wallet.publicKey:', wallet.publicKey?.toString());
    console.log('solanaWallets:', solanaWallets);
    console.log('pool:', pool);
    console.log('actionMode:', actionMode);
    console.log('solAmount:', solAmount);
    console.log('jitosolAmount:', jitosolAmount);

    // Check if we have either direct wallet or Privy wallet
    const hasWallet = wallet.publicKey || solanaWallets.length > 0;
    
    if (!hasWallet || !pool) {
      console.log('Early return: wallet or pool not available');
      setShowProgress(true);
      setTxStatus('error');
      setTxMessage('Please connect your Solana wallet first');
      setTimeout(() => setShowProgress(false), 5000);
      return;
    }

    setDepositLoading(true);
    setShowProgress(true);
    setTxType(actionMode); // Set transaction type
    setTxStatus('building');
    setTxMessage('Preparing transaction...');
    setTxSignature(undefined);

    try {
      if (actionMode === 'deposit') {
        // Deposit logic
        const sol = parseFloat(solAmount) || 0;
        const jitosol = parseFloat(jitosolAmount) || 0;

        console.log('Parsed amounts - sol:', sol, 'jitosol:', jitosol);

        if (sol <= 0 && jitosol <= 0) {
          setTxStatus('error');
          setTxMessage('Please enter an amount to deposit');
          setTimeout(() => setShowProgress(false), 5000);
          setDepositLoading(false);
          return;
        }

        // Use Privy wallet if available, otherwise use direct wallet
        const walletToUse = solanaWallets.length > 0 
          ? { 
              publicKey: solanaWallets[0].address,
              signTransaction: async (tx: any) => {
                const serialized = tx.serialize({ requireAllSignatures: false });
                const result = await solanaWallets[0].signTransaction({ transaction: serialized });
                return result.signedTransaction;
              }
            }
          : wallet;

        console.log('Using wallet:', walletToUse);

        setTxStatus('sending');
        setTxMessage('Sending deposit transaction...');

        const signature = await depositAndStake({
          strategyAddress: pool.address,
          amountSOL: sol.toString(),
          amountJitoSOL: jitosol.toString(),
          wallet: walletToUse,
          connection
        });

        setTxStatus('success');
        setTxMessage('Deposit completed successfully!');
        setTxSignature(signature);
        setSolAmount('');
        setJitosolAmount('');
        
        // Reload balances, position, and activity log after successful deposit
        await Promise.all([
          loadBalances(),
          loadUserPosition(pool),
          loadActivityLog()
        ]);

        // Auto-hide progress after 5 seconds
        setTimeout(() => {
          setShowProgress(false);
        }, 5000);
      } else {
        // Withdraw logic
        if (!singleAssetDeposit && withdrawPercentage <= 0) {
          setTxStatus('error');
          setTxMessage('Please select a withdrawal percentage');
          setTimeout(() => setShowProgress(false), 5000);
          setDepositLoading(false);
          return;
        }

        // Use Privy wallet if available, otherwise use direct wallet
        const walletToUse = solanaWallets.length > 0 
          ? { 
              publicKey: solanaWallets[0].address,
              signTransaction: async (tx: any) => {
                const serialized = tx.serialize({ requireAllSignatures: false });
                const result = await solanaWallets[0].signTransaction({ transaction: serialized });
                return result.signedTransaction;
              }
            }
          : wallet;

        // Calculate LP shares needed for withdraw
        let withdrawSharesAmount: number | undefined = undefined;
        
        if (singleAssetDeposit) {
          // In single asset mode, convert token amount to LP shares
          const desiredTokenAmount = parseFloat(selectedToken === 'SOL' ? solAmount : jitosolAmount);
          const withdrawableTokenAmount = selectedToken === 'SOL' 
            ? (userPosition?.withdrawableTokenA || 0)
            : (userPosition?.withdrawableTokenB || 0);
          const totalUserShares = userPosition?.sharesStaked || 0;
          
          // Calculate: (desiredTokenAmount / withdrawableTokenAmount) * totalUserShares
          if (withdrawableTokenAmount > 0 && totalUserShares > 0) {
            const ratio = desiredTokenAmount / withdrawableTokenAmount;
            withdrawSharesAmount = ratio * totalUserShares;
            console.log('[PoolDetail] Token amount:', desiredTokenAmount);
            console.log('[PoolDetail] Withdrawable token:', withdrawableTokenAmount);
            console.log('[PoolDetail] Total shares:', totalUserShares);
            console.log('[PoolDetail] Calculated LP shares to withdraw:', withdrawSharesAmount);
          }
        }
        // For slider mode (non-single asset), withdraw all shares (undefined = withdraw all)

        setTxStatus('sending');
        setTxMessage('Sending withdrawal transaction...');

        const signature = await unstakeAndWithdraw({
          strategyAddress: pool.address,
          amountShares: withdrawSharesAmount ? withdrawSharesAmount.toString() : undefined,
          wallet: walletToUse,
          connection
        });

        setTxStatus('success');
        setTxMessage('Withdrawal completed successfully!');
        setTxSignature(signature);
        setWithdrawPercentage(0);
        setSolAmount('');
        setJitosolAmount('');
        
        // Reload balances, position, and activity log after transaction
        await Promise.all([
          loadBalances(),
          loadUserPosition(pool),
          loadActivityLog()
        ]);

        // Auto-hide progress after 5 seconds
        setTimeout(() => {
          setShowProgress(false);
        }, 5000);
      }
    } catch (error: any) {
      console.error('Transaction error:', error);
      setTxStatus('error');
      setTxMessage(error.message || 'Transaction failed');
      
      // Auto-hide error after 8 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 8000);
    } finally {
      setDepositLoading(false);
    }
  };

  const handleClaimRewards = async () => {
    console.log('handleClaimRewards called');
    
    // Check if we have either direct wallet or Privy wallet
    const hasWallet = wallet.publicKey || solanaWallets.length > 0;
    
    if (!hasWallet || !pool) {
      console.log('Early return: wallet or pool not available');
      setShowProgress(true);
      setTxStatus('error');
      setTxMessage('Please connect your Solana wallet first');
      setTimeout(() => setShowProgress(false), 5000);
      return;
    }

    setDepositLoading(true);
    setShowProgress(true);
    setTxType('claim'); // Set transaction type to claim
    setTxStatus('building');
    setTxMessage('Preparing claim transaction...');
    setTxSignature(undefined);

    try {
      // Use Privy wallet if available, otherwise use direct wallet
      const walletToUse = solanaWallets.length > 0 
        ? { 
            publicKey: solanaWallets[0].address,
            signTransaction: async (tx: any) => {
              const serialized = tx.serialize({ requireAllSignatures: false });
              const result = await solanaWallets[0].signTransaction({ transaction: serialized });
              return result.signedTransaction;
            }
          }
        : wallet;

      setTxStatus('signing');
      setTxMessage('Please approve the transaction in your wallet...');

      // Call claim function
      const signature = await claimFeesAndRewards({
        strategyAddress: pool.address,
        wallet: walletToUse,
        connection,
      });

      console.log('Claim transaction signature:', signature);
      setTxSignature(signature);
      setTxStatus('success');
      setTxMessage('Successfully claimed fees and rewards!');
      
      // Refresh position after claim
      setTimeout(() => {
        if (wallet.publicKey) {
          loadUserPosition(wallet.publicKey.toString());
        }
      }, 2000);
      
      // Auto-hide after success
      setTimeout(() => {
        setShowProgress(false);
      }, 8000);
    } catch (error: any) {
      console.error('Claim error:', error);
      setTxStatus('error');
      setTxMessage(error.message || 'Failed to claim rewards. Please try again.');
      
      // Auto-hide error after 8 seconds
      setTimeout(() => {
        setShowProgress(false);
      }, 8000);
    } finally {
      setDepositLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <CircularProgress sx={{ color: '#3b82f6' }} />
      </Box>
    );
  }

  if (!pool) {
    return (
      <Box sx={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        p: 4
      }}>
        <Typography sx={{ color: '#ffffff', mb: 2 }}>Pool not found</Typography>
        <Button 
          variant="contained"
          onClick={() => navigate('/xliquid')}
          sx={{ 
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            textTransform: 'none'
          }}
        >
          Back to Liquidity
        </Button>
      </Box>
    );
  }

  return (
    <>
      {/* Navigation Bar */}
      <Navigation />

      {/* Main Content */}
      <Box sx={{ 
        minHeight: 'calc(100vh - 64px)',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        p: 4,
        pl: 8  // 增加左边距
      }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <IconButton 
            onClick={() => navigate('/xliquid')}
            sx={{ 
              color: '#94a3b8',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)'
              }
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          
          {/* Token Pair Icons */}
          <Box sx={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <Box
              component="img"
              src="https://storage.googleapis.com/token-metadata/JitoSOL-256.png"
              alt="JitoSOL"
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%',
                border: '3px solid #0f172a',
                zIndex: 2
              }}
            />
            <Box
              component="img"
              src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
              alt="SOL"
              sx={{ 
                width: 48, 
                height: 48, 
                borderRadius: '50%',
                border: '3px solid #0f172a',
                marginLeft: '-16px',
                zIndex: 1
              }}
            />
          </Box>
          
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h4" sx={{ color: '#ffffff', fontWeight: 600 }}>
                {pool.name} Liquidity
              </Typography>
              <Typography sx={{ fontSize: 32 }}>⚡</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
              <Chip 
                label={`DEX: ${pool.dex}`}
                sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
              />
              <Chip 
                label={`Fee Tier: 0.01%`}
                sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa' }}
              />
              <Chip 
                label={`7D Fees APY: ${(pool.feesApy * 100).toFixed(2)}%`}
                icon={<TrendingUpIcon />}
                sx={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', color: '#fbbf24' }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Tabs */}
      <Tabs 
        value={activeTab} 
        onChange={(_e, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': {
            color: '#64748b',
            textTransform: 'none',
            fontSize: '1rem',
            fontWeight: 500,
            '&.Mui-selected': {
              color: '#3b82f6'
            }
          },
          '& .MuiTabs-indicator': {
            backgroundColor: '#3b82f6',
            height: 3
          }
        }}
      >
        <Tab label="Overview" />
        <Tab label="My Position" />
        <Tab label="Analytics" />
        <Tab label="Info & Risk" />
      </Tabs>

      {/* Tab Panels */}
      <TabPanel value={activeTab} index={0}>
        {/* Stats Cards Row */}
        <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>TVL</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${(pool.tvl / 1000000).toFixed(2)}M
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <TrendingUpIcon sx={{ fontSize: 16 }} />
                7D Fees APY
              </Box>
            </Typography>
            <Typography sx={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 600 }}>
              {(pool.feesApy * 100).toFixed(2)}%
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>7D Volume</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${(pool.volume7d / 1000000).toFixed(2)}M
            </Typography>
          </Card>
          <Card sx={{ 
            flex: 1, 
            minWidth: 250, 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>7D Fees Earned</Typography>
            <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
              ${((pool.tvl * pool.feesApy * 7) / 365 / 1000).toFixed(2)}K
            </Typography>
          </Card>
        </Box>

        {/* JTO Rewards Banner */}
        <Card sx={{ 
          p: 4,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Box sx={{ 
              width: 80, 
              height: 80, 
              borderRadius: '50%',
              backgroundColor: 'rgba(100, 116, 139, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2rem'
            }}>
              ⚡
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h5" sx={{ color: '#10b981', fontWeight: 600, mb: 1 }}>
                3 Months of $JTO Rewards!
              </Typography>
              <Typography sx={{ color: '#94a3b8', mb: 2 }}>
                Provide liquidity to the JitoSOL-SOL Vault to earn $JTO for the next three months. Claim your $JTO in real-time. Withdraw at any time.
              </Typography>
              <Button 
                sx={{ 
                  color: '#10b981',
                  textTransform: 'none',
                  '&:hover': { backgroundColor: 'rgba(16, 185, 129, 0.1)' }
                }}
              >
                Learn More →
              </Button>
            </Box>
            <IconButton 
              sx={{ 
                position: 'absolute',
                top: 16,
                right: 16,
                color: '#64748b'
              }}
            >
              ✕
            </IconButton>
          </Box>
        </Card>

        {/* Farm Info */}
        <Card sx={{ 
          p: 4, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Chip 
              label="Boosted Fees APY" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
            <Chip 
              label="Daily JTO Rewards" 
              size="small" 
              sx={{ 
                backgroundColor: 'rgba(100, 116, 139, 0.2)', 
                color: '#94a3b8',
                fontSize: '0.85rem'
              }} 
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Box>
              <Typography sx={{ color: '#10b981', fontSize: '2.5rem', fontWeight: 600 }}>
                {(pool.feesApy * 100 * 0.8).toFixed(2)}%
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 400, mb: 0.5 }}>
                24.83K JTO for past 7D
              </Typography>
            </Box>
          </Box>
        </Card>

        {/* Strategy Section */}
        <Card sx={{ 
          p: 4, 
          mb: 3,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}>
          <Typography sx={{ color: '#3b82f6', fontSize: '1.1rem', fontWeight: 500, mb: 2 }}>
            Drift
          </Typography>
          <Typography sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.7 }}>
            Earn staking yield and trading fees with SOL exposure. Kamino algorithms set and rebalance the trading range, and auto-compound fees and rewards.
          </Typography>
          <Button 
            sx={{ 
              color: '#3b82f6',
              textTransform: 'none',
              pl: 0,
              '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
            }}
          >
            Learn more →
          </Button>
        </Card>

        {/* Two Column Layout: Farm Info & Manage Position */}
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Vault Info - Left Side */}
          <Box sx={{ flex: '1 1 600px', minWidth: 320 }}>
            <Card sx={{ 
              p: 4,
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Farm Info</Typography>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Boosted Fees APY</Typography>
                <Typography sx={{ color: '#10b981', fontSize: '2rem', fontWeight: 600 }}>
                  {(pool.feesApy * 100 * 0.8).toFixed(2)}%
                </Typography>
              </Box>
              <Box sx={{ mb: 3 }}>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Daily JTO Rewards</Typography>
                <Typography sx={{ color: '#ffffff', fontSize: '1.2rem', fontWeight: 600 }}>
                  3.54K JTO
                </Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                  24.83K JTO for past 7D
                </Typography>
              </Box>
            </Card>

            <Card sx={{ 
              p: 4,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600, mb: 2 }}>Strategy: <Box component="span" sx={{ color: '#3b82f6' }}>Drift</Box></Typography>
              <Typography sx={{ color: '#94a3b8', mb: 2, lineHeight: 1.7, fontSize: '0.9rem' }}>
                Earn staking yield and trading fees with SOL exposure. Kamino algorithms set and rebalance the trading range, and auto-compound fees and rewards.
              </Typography>
              <Button 
                sx={{ 
                  color: '#3b82f6',
                  textTransform: 'none',
                  pl: 0,
                  fontSize: '0.85rem',
                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                }}
              >
                Learn more →
              </Button>
            </Card>
          </Box>

          {/* Manage Position - Right Side */}
          <Box sx={{ flex: '0 1 400px', minWidth: 320 }}>
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Manage Position</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Button 
                    size="small"
                    onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                    sx={{ 
                      color: '#3b82f6',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                    }}
                  >
                    {actionMode === 'deposit' ? 'Deposit' : 'Withdraw'} ▼
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSettingsOpen(true);
                    }}
                    sx={{
                      color: '#64748b',
                      padding: '8px',
                      '&:hover': { 
                        color: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)' 
                      }
                    }}
                  >
                    <TuneIcon sx={{ fontSize: '1.2rem' }} />
                  </IconButton>
                  <Menu
                    anchorEl={actionMenuAnchor}
                    open={Boolean(actionMenuAnchor)}
                    onClose={() => setActionMenuAnchor(null)}
                    PaperProps={{
                      sx: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        mt: 1,
                        minWidth: 120
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        setActionMode('deposit');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ 
                        color: actionMode === 'deposit' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      Deposit
                    </MenuItem>
                    <MenuItem 
                      onClick={() => {
                        setActionMode('withdraw');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ 
                        color: actionMode === 'withdraw' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      Withdraw
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>

              {!isWalletConnected ? (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Please connect your wallet to manage your position
                </Alert>
              ) : null}

              {/* Simplified Transaction Settings Display */}
              <Box sx={{ 
                borderTop: '1px solid rgba(59, 130, 246, 0.1)', 
                pt: 2,
                mt: 2
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 500 }}>
                    Transaction Settings
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography sx={{ color: '#3b82f6', fontSize: '0.9rem', fontWeight: 600 }}>
                      {slippageTolerance}%
                    </Typography>
                    <IconButton 
                      size="small" 
                      onClick={() => setSettingsOpen(true)}
                      sx={{ 
                        color: '#64748b',
                        '&:hover': { color: '#3b82f6' }
                      }}
                    >
                      <TuneIcon sx={{ fontSize: '1rem' }} />
                    </IconButton>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>SOL to be Deposited</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 SOL</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>JITOSOL to be Deposited</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 JITOSOL</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Lock-up Period</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0min</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Deposit Value</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>$0.00</Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Farm Overview - Left Side */}
          <Box sx={{ flex: '1 1 600px', minWidth: 0 }}>
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Farm Overview</Typography>
              
              {positionLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {/* Top Row - 4 sections in one line */}
                  <Box sx={{ 
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr auto',
                    gap: 4,
                    alignItems: 'center',
                    mb: 3,
                    pb: 3,
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Your Stake</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
                        ${userPosition?.stakeValue || '0.00'}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {positionLoading ? '...' : formatLargeNumber(userPosition?.sharesStaked || 0)} kJITOSOL-SOL
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Available to Claim</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.8rem', fontWeight: 600 }}>
                        0 JTO
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                        {'<'}$0.01
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', mb: 1 }}>Incentives APY</Typography>
                      <Typography sx={{ color: '#10b981', fontSize: '1.8rem', fontWeight: 600 }}>
                        4.93%
                      </Typography>
                    </Box>
                    <Button 
                      variant="contained" 
                      size="medium"
                      onClick={handleClaimRewards}
                      disabled={depositLoading}
                      sx={{ 
                        background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
                        textTransform: 'none',
                        fontWeight: 600,
                        px: 3.5,
                        py: 1.5,
                        minWidth: 110,
                        alignSelf: 'center'
                      }}
                    >
                      Claim All
                    </Button>
                  </Box>

                  {/* Bottom Row - 4 Stats Cards */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
                    {/* Net Value */}
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: 600, mb: 0.5 }}>
                        ${userPosition?.stakeValue || '0.00'}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Net Value</Typography>
                    </Card>
                    
                    {/* PnL - Need historical cost basis to calculate */}
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ 
                        color: (userPosition?.pnl || 0) >= 0 ? '#10b981' : '#ef4444', 
                        fontSize: '1.3rem', 
                        fontWeight: 600, 
                        mb: 0.5 
                      }}>
                        {(userPosition?.pnl || 0) >= 0 ? '+' : ''}${(userPosition?.pnl || 0).toFixed(2)}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>PnL</Typography>
                    </Card>
                    
                    {/* Fees Earned - From pool's fee earnings */}
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Typography sx={{ color: '#10b981', fontSize: '1.3rem', fontWeight: 600, mb: 0.5 }}>
                        {'<'}$0.01
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>Fees Earned</Typography>
                    </Card>
                    
                    {/* Asset Ratio - SOL vs JitoSOL */}
                    <Card sx={{ 
                      p: 2.5, 
                      textAlign: 'center',
                      background: 'rgba(255, 255, 255, 0.03)',
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: 2,
                      boxShadow: 'none',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
                        {/* SOL amount with icon */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            component="img"
                            src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                            alt="SOL"
                            sx={{ width: 20, height: 20, borderRadius: '50%' }}
                          />
                          <Typography sx={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: 600 }}>
                            {(userPosition?.withdrawableTokenA || 0).toFixed(2)}
                          </Typography>
                        </Box>
                        
                        <Typography sx={{ color: '#64748b', fontSize: '1.3rem', fontWeight: 600 }}>/</Typography>
                        
                        {/* JitoSOL amount with icon */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box
                            component="img"
                            src="https://storage.googleapis.com/token-metadata/JitoSOL-256.png"
                            alt="JitoSOL"
                            sx={{ width: 20, height: 20, borderRadius: '50%' }}
                          />
                          <Typography sx={{ color: '#ffffff', fontSize: '1.3rem', fontWeight: 600 }}>
                            {(userPosition?.withdrawableTokenB || 0).toFixed(2)}
                          </Typography>
                        </Box>
                      </Box>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>My Asset Ratio</Typography>
                    </Card>
                  </Box>
                </Box>
              )}
            </Card>

            {/* Performance Chart */}
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Performance</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Currency Toggle */}
                  <Chip 
                    label="USD" 
                    size="small" 
                    onClick={() => setPerfCurrency('USD')}
                    sx={{ 
                      backgroundColor: perfCurrency === 'USD' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)', 
                      color: perfCurrency === 'USD' ? '#3b82f6' : '#64748b',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                    }} 
                  />
                  <Chip 
                    label="SOL" 
                    size="small" 
                    onClick={() => setPerfCurrency('SOL')}
                    sx={{ 
                      backgroundColor: perfCurrency === 'SOL' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)', 
                      color: perfCurrency === 'SOL' ? '#3b82f6' : '#64748b',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                    }} 
                  />
                  
                  {/* Time Period Toggle - 7D, 30D, 3M (with dropdown) */}
                  <Chip 
                    label="7D" 
                    size="small" 
                    onClick={() => setPerfTimePeriod('7D')}
                    sx={{ 
                      backgroundColor: perfTimePeriod === '7D' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)', 
                      color: perfTimePeriod === '7D' ? '#3b82f6' : '#64748b',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                    }} 
                  />
                  <Chip 
                    label="30D" 
                    size="small" 
                    onClick={() => setPerfTimePeriod('30D')}
                    sx={{ 
                      backgroundColor: perfTimePeriod === '30D' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)', 
                      color: perfTimePeriod === '30D' ? '#3b82f6' : '#64748b',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                    }} 
                  />
                  
                  {/* 3M with dropdown menu */}
                  <Chip 
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <span>{['3M', '6M', '1Y'].includes(perfTimePeriod) ? perfTimePeriod : '3M'}</span>
                        <ExpandMoreIcon sx={{ fontSize: '1rem' }} />
                      </Box>
                    }
                    size="small" 
                    onClick={(e) => setPerfMenuAnchor(e.currentTarget)}
                    sx={{ 
                      backgroundColor: ['3M', '6M', '1Y'].includes(perfTimePeriod) ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.15)',
                      color: ['3M', '6M', '1Y'].includes(perfTimePeriod) ? '#3b82f6' : '#64748b',
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.25)' }
                    }} 
                  />
                  <Menu
                    anchorEl={perfMenuAnchor}
                    open={Boolean(perfMenuAnchor)}
                    onClose={() => setPerfMenuAnchor(null)}
                    PaperProps={{
                      sx: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        mt: 1,
                        minWidth: 80
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        setPerfTimePeriod('3M');
                        setPerfMenuAnchor(null);
                      }}
                      sx={{ 
                        color: perfTimePeriod === '3M' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      3M
                    </MenuItem>
                    <MenuItem 
                      onClick={() => {
                        setPerfTimePeriod('6M');
                        setPerfMenuAnchor(null);
                      }}
                      sx={{ 
                        color: perfTimePeriod === '6M' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      6M
                    </MenuItem>
                    <MenuItem 
                      onClick={() => {
                        setPerfTimePeriod('1Y');
                        setPerfMenuAnchor(null);
                      }}
                      sx={{ 
                        color: perfTimePeriod === '1Y' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      1Y
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>
              
              {/* Performance Chart */}
              <Box sx={{ 
                height: 250, 
                display: 'flex', 
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                px: 2,
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                position: 'relative'
              }}>
                {perfLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%' }}>
                    <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                  </Box>
                ) : perfData && perfData.history && perfData.history.length > 0 ? (
                  <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                    {(() => {
                      // Extract data based on selected currency
                      const currency = perfCurrency.toLowerCase() as 'usd' | 'sol';
                      const history = perfData.history;
                      
                      // Find min and max values for scaling
                      const positionValues = showPositionValue ? history.map((d: any) => parseFloat(d.positionValue[currency])) : [];
                      const costBasisValues = showCostBasis ? history.map((d: any) => parseFloat(d.costBasis[currency])) : [];
                      const allValues = [...positionValues, ...costBasisValues].filter(v => !isNaN(v));
                      
                      if (allValues.length === 0) {
                        return <Typography sx={{ color: '#64748b', textAlign: 'center', py: 8 }}>No data available</Typography>;
                      }
                      
                      const minValue = Math.min(...allValues);
                      const maxValue = Math.max(...allValues);
                      const range = maxValue - minValue || 1;
                      
                      // Generate SVG points (0-100 scale)
                      const generatePoints = (values: number[]) => {
                        return values.map((value, index) => {
                          const x = (index / (values.length - 1)) * 100;
                          const y = 100 - ((value - minValue) / range) * 90; // Leave 10% padding
                          return `${x},${y}`;
                        }).join(' ');
                      };
                      
                      const positionPoints = showPositionValue ? generatePoints(positionValues) : '';
                      const costBasisPoints = showCostBasis ? generatePoints(costBasisValues) : '';
                      
                      return (
                        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
                          <defs>
                            <linearGradient id="positionGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                            </linearGradient>
                            <linearGradient id="costBasisGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          
                          {/* Cost Basis (green) - draw first so it's behind */}
                          {showCostBasis && costBasisPoints && (
                            <>
                              <polyline
                                fill="url(#costBasisGradient)"
                                stroke="none"
                                points={`${costBasisPoints} 100,100 0,100`}
                              />
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                points={costBasisPoints}
                              />
                            </>
                          )}
                          
                          {/* Position Value (blue) - draw second so it's on top */}
                          {showPositionValue && positionPoints && (
                            <>
                              <polyline
                                fill="url(#positionGradient)"
                                stroke="none"
                                points={`${positionPoints} 100,100 0,100`}
                              />
                              <polyline
                                fill="none"
                                stroke="#3b82f6"
                                strokeWidth="2"
                                points={positionPoints}
                              />
                            </>
                          )}
                        </svg>
                      );
                    })()}
                  </Box>
                ) : (
                  <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                    <Typography sx={{ color: '#64748b' }}>
                      {isWalletConnected ? 'No performance data available' : 'Connect wallet to view performance'}
                    </Typography>
                  </Box>
                )}
              </Box>
              
              {/* Chart Legend */}
              <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox 
                    checked={showPositionValue}
                    onChange={(e) => setShowPositionValue(e.target.checked)}
                    size="small" 
                    sx={{ color: '#3b82f6', '&.Mui-checked': { color: '#3b82f6' } }} 
                  />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Position Value</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Checkbox 
                    checked={showCostBasis}
                    onChange={(e) => setShowCostBasis(e.target.checked)}
                    size="small" 
                    sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} 
                  />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Deposited (Cost Basis)</Typography>
                </Box>
              </Box>
            </Card>

            {/* Activity Log */}
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Activity Log</Typography>
              
              {/* Table Header */}
              <Box sx={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr 2fr 1fr',
                gap: 2,
                pb: 2,
                borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
                mb: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Date</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Type</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>Tokens</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'right' }}>Value</Typography>
              </Box>

              {/* Activity Rows */}
              {activityLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress size={24} sx={{ color: '#3b82f6' }} />
                </Box>
              ) : activityLog.length > 0 ? (
                activityLog.map((activity, idx) => {
                  // Format date
                  const date = new Date(activity.timestamp);
                  const formattedDate = date.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  });
                  
                  // Calculate total value
                  const totalValue = activity.tokenAAmountUsd + activity.tokenBAmountUsd;
                  
                  return (
                    <Box 
                      key={idx}
                      sx={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr 2fr 1fr',
                        gap: 2,
                        py: 2.5,
                        borderBottom: '1px solid rgba(59, 130, 246, 0.05)',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.05)' },
                        cursor: 'pointer'
                      }}
                      onClick={() => window.open(`https://solscan.io/tx/${activity.txHash}`, '_blank')}
                    >
                      <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>{formattedDate}</Typography>
                      <Chip 
                        label={activity.transactionType === 'withdraw' ? 'Withdraw' : 'Deposit'}
                        size="small"
                        sx={{ 
                          width: 'fit-content',
                          backgroundColor: activity.transactionType === 'withdraw' ? 'rgba(251, 191, 36, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: activity.transactionType === 'withdraw' ? '#fbbf24' : '#10b981'
                        }}
                      />
                      <Box sx={{ display: 'flex', gap: 2 }}>
                        <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                          {parseFloat(activity.tokenAAmount).toFixed(4)} {activity.tokenASymbol}
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>+</Typography>
                        <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                          {parseFloat(activity.tokenBAmount).toFixed(4)} {activity.tokenBSymbol}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                        <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                          ${totalValue.toFixed(2)}
                        </Typography>
                        <IconButton size="small" sx={{ color: '#64748b' }}>
                          <OpenInNewIcon sx={{ fontSize: '1rem' }} />
                        </IconButton>
                      </Box>
                    </Box>
                  );
                })
              ) : (
                <Box sx={{ mt: 2, textAlign: 'center' }}>
                  <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                    {isWalletConnected ? 'No activity yet' : 'Connect wallet to view activity'}
                  </Typography>
                </Box>
              )}
            </Card>
          </Box>

          {/* Manage Position - Right Side */}
          <Box sx={{ flex: '0 1 400px', minWidth: 320 }}>
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#ffffff' }}>Manage Position</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Button 
                    size="small"
                    onClick={(e) => setActionMenuAnchor(e.currentTarget)}
                    sx={{ 
                      color: '#3b82f6',
                      textTransform: 'none',
                      fontWeight: 600,
                      '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                    }}
                  >
                    {actionMode === 'deposit' ? 'Deposit' : 'Withdraw'} ▼
                  </Button>
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Settings button clicked!');
                      setSettingsOpen(true);
                    }}
                    sx={{
                      color: '#64748b',
                      padding: '8px',
                      '&:hover': { 
                        color: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)' 
                      }
                    }}
                  >
                    <TuneIcon sx={{ fontSize: '1.2rem' }} />
                  </IconButton>
                  <Menu
                    anchorEl={actionMenuAnchor}
                    open={Boolean(actionMenuAnchor)}
                    onClose={() => setActionMenuAnchor(null)}
                    PaperProps={{
                      sx: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        mt: 1,
                        minWidth: 120
                      }
                    }}
                  >
                    <MenuItem 
                      onClick={() => {
                        setActionMode('deposit');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ 
                        color: actionMode === 'deposit' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      Deposit
                    </MenuItem>
                    <MenuItem 
                      onClick={() => {
                        setActionMode('withdraw');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ 
                        color: actionMode === 'withdraw' ? '#3b82f6' : '#94a3b8',
                        '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                      }}
                    >
                      Withdraw
                    </MenuItem>
                  </Menu>
                </Box>
              </Box>

              {!isWalletConnected ? (
                <Alert severity="warning">
                  Please connect your wallet to manage your position
                </Alert>
              ) : (
                <>
                  {/* You Deposit/Withdraw */}
                  <Box sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.9rem' }}>
                        {actionMode === 'deposit' ? 'You Deposit' : 'You Withdraw'}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>~$0.00</Typography>
                    </Box>
                    
                    {actionMode === 'deposit' ? (
                      /* DEPOSIT MODE */
                      <>
                        {singleAssetDeposit ? (
                          /* Single Asset Mode - Show one input with token selector */
                          <Box sx={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: 2,
                            p: 2,
                            mb: 2
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Button
                                onClick={() => setSelectedToken(selectedToken === 'SOL' ? 'JITOSOL' : 'SOL')}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  textTransform: 'none',
                                  color: '#3b82f6',
                                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                                }}
                              >
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  background: selectedToken === 'SOL' 
                                    ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)'
                                    : '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  color: '#ffffff'
                                }}>
                                  {selectedToken === 'SOL' ? '◎' : 'J'}
                                </Box>
                                <Typography sx={{ color: selectedToken === 'SOL' ? '#3b82f6' : '#10b981', fontWeight: 600 }}>
                                  {selectedToken}
                                </Typography>
                                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>▼</Typography>
                              </Button>
                              <TextField
                                value={selectedToken === 'SOL' ? solAmount : jitosolAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  const maxAmount = selectedToken === 'SOL' ? solBalance : jitosolBalance;
                                  if (value === '' || (parseFloat(value) <= maxAmount && !isNaN(parseFloat(value)))) {
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(value);
                                    } else {
                                      setJitosolAmount(value);
                                    }
                                  }
                                }}
                                placeholder="0"
                                variant="standard"
                                type="number"
                                InputProps={{
                                  disableUnderline: true,
                                  inputProps: {
                                    style: { textAlign: 'right' }
                                  }
                                }}
                                sx={{
                                  '& .MuiInputBase-input': {
                                    color: '#ffffff',
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    textAlign: 'right',
                                    padding: 0,
                                  }
                                }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                                Available: {balancesLoading 
                                  ? '...' 
                                  : selectedToken === 'SOL' 
                                    ? `${solBalance.toFixed(9)} SOL`
                                    : `${jitosolBalance.toFixed(9)} JITOSOL`}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button 
                                  size="small" 
                                  onClick={() => {
                                    const balance = selectedToken === 'SOL' ? solBalance : jitosolBalance;
                                    const halfAmount = (balance / 2).toFixed(9);
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(halfAmount);
                                    } else {
                                      setJitosolAmount(halfAmount);
                                    }
                                  }}
                                  disabled={selectedToken === 'SOL' ? solBalance === 0 : jitosolBalance === 0}
                                  sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                >
                                  Half
                                </Button>
                                <Button 
                                  size="small"
                                  onClick={() => {
                                    const balance = selectedToken === 'SOL' ? solBalance : jitosolBalance;
                                    const maxAmount = balance.toFixed(9);
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(maxAmount);
                                    } else {
                                      setJitosolAmount(maxAmount);
                                    }
                                  }}
                                  disabled={selectedToken === 'SOL' ? solBalance === 0 : jitosolBalance === 0}
                                  sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                >
                                  Max
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          /* Dual Asset Mode - Show both inputs */
                          <>
                            {/* SOL Input */}
                            <Box sx={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: 2,
                              p: 2,
                              mb: 2
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ 
                                    width: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem'
                                  }}>
                                    ◎
                                  </Box>
                                  <Typography sx={{ color: '#3b82f6', fontWeight: 600 }}>SOL</Typography>
                                </Box>
                                <TextField
                                  value={solAmount}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const maxAmount = 0.241439641;
                                    if (value === '' || (parseFloat(value) <= maxAmount && !isNaN(parseFloat(value)))) {
                                      setSolAmount(value);
                                    }
                                  }}
                                  placeholder="0.0"
                                  variant="standard"
                                  InputProps={{
                                    disableUnderline: true,
                                    inputProps: {
                                      style: { textAlign: 'right' }
                                    }
                                  }}
                                  sx={{
                                    '& .MuiInputBase-input': {
                                      color: '#ffffff',
                                      fontSize: '1.5rem',
                                      fontWeight: 600,
                                      textAlign: 'right',
                                      padding: 0,
                                    }
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                                  Available: {balancesLoading ? '...' : solBalance.toFixed(9)} SOL
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button 
                                    size="small" 
                                    onClick={() => setSolAmount((solBalance / 2).toFixed(9))}
                                    sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                    disabled={solBalance === 0}
                                  >
                                    Half
                                  </Button>
                                  <Button 
                                    size="small"
                                    onClick={() => setSolAmount(solBalance.toFixed(9))}
                                    sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                    disabled={solBalance === 0}
                                  >
                                    Max
                                  </Button>
                                </Box>
                              </Box>
                            </Box>

                            {/* JITOSOL Input */}
                            <Box sx={{ 
                              backgroundColor: 'rgba(15, 23, 42, 0.8)',
                              border: '1px solid rgba(59, 130, 246, 0.2)',
                              borderRadius: 2,
                              p: 2,
                              mb: 2
                            }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Box sx={{ 
                                    width: 24, 
                                    height: 24, 
                                    borderRadius: '50%', 
                                    backgroundColor: '#10b981',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    color: '#ffffff'
                                  }}>
                                    J
                                  </Box>
                                  <Typography sx={{ color: '#10b981', fontWeight: 600 }}>JITOSOL</Typography>
                                </Box>
                                <TextField
                                  value={jitosolAmount}
                                  onChange={(e) => {
                                    const value = e.target.value;
                                    const maxAmount = 0.080780416;
                                    if (value === '' || (parseFloat(value) <= maxAmount && !isNaN(parseFloat(value)))) {
                                      setJitosolAmount(value);
                                    }
                                  }}
                                  placeholder="0.0"
                                  variant="standard"
                                  InputProps={{
                                    disableUnderline: true,
                                    inputProps: {
                                      style: { textAlign: 'right' }
                                    }
                                  }}
                                  sx={{
                                    '& .MuiInputBase-input': {
                                      color: '#ffffff',
                                      fontSize: '1.5rem',
                                      fontWeight: 600,
                                      textAlign: 'right',
                                      padding: 0,
                                    }
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography sx={{ color: '#64748b', fontSize: '0.85rem' }}>
                                  Available: {balancesLoading ? '...' : jitosolBalance.toFixed(9)} JITOSOL
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                  <Button 
                                    size="small"
                                    onClick={() => setJitosolAmount((jitosolBalance / 2).toFixed(9))}
                                    sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                    disabled={jitosolBalance === 0}
                                  >
                                    Half
                                  </Button>
                                  <Button 
                                    size="small"
                                    onClick={() => setJitosolAmount(jitosolBalance.toFixed(9))}
                                    sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                    disabled={jitosolBalance === 0}
                                  >
                                    Max
                                  </Button>
                                </Box>
                              </Box>
                            </Box>
                          </>
                        )}
                      </>
                    ) : (
                      /* WITHDRAW MODE */
                      <>
                        {singleAssetDeposit ? (
                          /* Single Asset Withdrawal - Show token selector with input */
                          <Box sx={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: 2,
                            p: 2,
                            mb: 2
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                              <Button
                                onClick={() => setSelectedToken(selectedToken === 'SOL' ? 'JITOSOL' : 'SOL')}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  textTransform: 'none',
                                  color: '#3b82f6',
                                  '&:hover': { backgroundColor: 'rgba(59, 130, 246, 0.1)' }
                                }}
                              >
                                <Box sx={{ 
                                  width: 24, 
                                  height: 24, 
                                  borderRadius: '50%', 
                                  background: selectedToken === 'SOL' 
                                    ? 'linear-gradient(135deg, #9945FF 0%, #14F195 100%)'
                                    : '#10b981',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  color: '#ffffff'
                                }}>
                                  {selectedToken === 'SOL' ? '◎' : 'J'}
                                </Box>
                                <Typography sx={{ color: selectedToken === 'SOL' ? '#3b82f6' : '#10b981', fontWeight: 600 }}>
                                  {selectedToken}
                                </Typography>
                                <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>▼</Typography>
                              </Button>
                              <TextField
                                value={selectedToken === 'SOL' ? solAmount : jitosolAmount}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Use withdrawable amounts as max limit
                                  const maxAmount = selectedToken === 'SOL' 
                                    ? (userPosition?.withdrawableTokenA || 0)
                                    : (userPosition?.withdrawableTokenB || 0);
                                  if (value === '' || (parseFloat(value) <= maxAmount && !isNaN(parseFloat(value)))) {
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(value);
                                    } else {
                                      setJitosolAmount(value);
                                    }
                                  }
                                }}
                                placeholder="0"
                                variant="standard"
                                type="number"
                                InputProps={{
                                  disableUnderline: true,
                                  inputProps: {
                                    style: { textAlign: 'right' }
                                  }
                                }}
                                sx={{
                                  '& .MuiInputBase-input': {
                                    color: '#ffffff',
                                    fontSize: '1.5rem',
                                    fontWeight: 600,
                                    textAlign: 'right',
                                    padding: 0,
                                  }
                                }}
                              />
                            </Box>
                            {/* Available to withdraw info - compact display */}
                            <Box sx={{ mt: 1, mb: 1 }}>
                              <Typography sx={{ color: '#64748b', fontSize: '0.75rem', mb: 0.5 }}>
                                Available to withdraw:
                              </Typography>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                                {singleAssetDeposit ? (
                                  // Single Asset Mode - only show selected token
                                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                    {positionLoading 
                                      ? '...' 
                                      : selectedToken === 'SOL'
                                        ? `${(userPosition?.withdrawableTokenA || 0).toFixed(9)} SOL`
                                        : `${(userPosition?.withdrawableTokenB || 0).toFixed(9)} JitoSOL`}
                                  </Typography>
                                ) : (
                                  // Normal Mode - show both tokens
                                  <>
                                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                      {positionLoading 
                                        ? '...' 
                                        : `${(userPosition?.withdrawableTokenA || 0).toFixed(9)} SOL`}
                                    </Typography>
                                    <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                                      {positionLoading 
                                        ? '...' 
                                        : `${(userPosition?.withdrawableTokenB || 0).toFixed(9)} JitoSOL`}
                                    </Typography>
                                  </>
                                )}
                              </Box>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button 
                                  size="small" 
                                  onClick={() => {
                                    // Use withdrawable amounts instead of shares
                                    const withdrawableAmount = selectedToken === 'SOL' 
                                      ? (userPosition?.withdrawableTokenA || 0)
                                      : (userPosition?.withdrawableTokenB || 0);
                                    const halfAmount = (withdrawableAmount / 2).toFixed(9);
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(halfAmount);
                                    } else {
                                      setJitosolAmount(halfAmount);
                                    }
                                  }}
                                  disabled={!userPosition || userPosition.sharesStaked === 0}
                                  sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                >
                                  Half
                                </Button>
                                <Button 
                                  size="small"
                                  onClick={() => {
                                    // Use withdrawable amounts instead of shares
                                    const withdrawableAmount = selectedToken === 'SOL' 
                                      ? (userPosition?.withdrawableTokenA || 0)
                                      : (userPosition?.withdrawableTokenB || 0);
                                    const maxAmount = withdrawableAmount.toFixed(9);
                                    if (selectedToken === 'SOL') {
                                      setSolAmount(maxAmount);
                                    } else {
                                      setJitosolAmount(maxAmount);
                                    }
                                  }}
                                  disabled={!userPosition || userPosition.sharesStaked === 0}
                                  sx={{ color: '#3b82f6', textTransform: 'none', minWidth: 'auto', px: 1 }}
                                >
                                  Max
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        ) : (
                          /* Percentage Slider Withdrawal */
                          <Box sx={{ 
                            backgroundColor: 'rgba(15, 23, 42, 0.8)',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            borderRadius: 2,
                            p: 3,
                            mb: 2
                          }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                              <Typography sx={{ color: '#94a3b8', fontSize: '1rem' }}>
                                {withdrawPercentage}%
                              </Typography>
                              <Typography sx={{ color: '#ffffff', fontSize: '1rem', fontWeight: 600 }}>
                                100%
                              </Typography>
                            </Box>
                            <Slider
                              value={withdrawPercentage}
                              onChange={(_, newValue) => setWithdrawPercentage(newValue as number)}
                              min={0}
                              max={100}
                              sx={{
                                color: '#3b82f6',
                                '& .MuiSlider-thumb': {
                                  width: 24,
                                  height: 24,
                                  backgroundColor: '#ffffff',
                                  border: '2px solid #3b82f6',
                                  '&:hover, &.Mui-focusVisible': {
                                    boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.16)',
                                  },
                                },
                                '& .MuiSlider-track': {
                                  height: 6,
                                  border: 'none',
                                },
                                '& .MuiSlider-rail': {
                                  height: 6,
                                  opacity: 0.3,
                                  backgroundColor: '#64748b',
                                },
                              }}
                            />
                          </Box>
                        )}
                      </>
                    )}

                    {/* Single Asset checkbox */}
                    {actionMode === 'deposit' ? (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={singleAssetDeposit}
                            onChange={(e) => setSingleAssetDeposit(e.target.checked)}
                            sx={{ 
                              color: '#3b82f6',
                              '&.Mui-checked': { color: '#3b82f6' }
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Single Asset Deposit
                          </Typography>
                        }
                      />
                    ) : (
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={singleAssetDeposit}
                            onChange={(e) => setSingleAssetDeposit(e.target.checked)}
                            sx={{ 
                              color: '#3b82f6',
                              '&.Mui-checked': { color: '#3b82f6' }
                            }}
                          />
                        }
                        label={
                          <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                            Single Asset Withdrawal
                          </Typography>
                        }
                      />
                    )}
                  </Box>

                  {/* Action Button */}
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={handleDeposit}
                    disabled={depositLoading || !isWalletConnected}
                    sx={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 600,
                      py: 1.5,
                      mb: 3,
                      '&:hover': {
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      },
                      '&:disabled': {
                        background: 'rgba(59, 130, 246, 0.3)',
                      }
                    }}
                  >
                    {depositLoading ? (
                      <CircularProgress size={24} />
                    ) : (
                      actionMode === 'deposit' ? 'Deposit and Stake' : 'Unstake and Withdraw'
                    )}
                  </Button>

                  {/* Transaction Settings */}
                  <Box sx={{ 
                    borderTop: '1px solid rgba(59, 130, 246, 0.1)', 
                    pt: 3 
                  }}>
                    <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 500, mb: 2 }}>
                      Transaction Settings
                    </Typography>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>SOL to be Deposited</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 SOL</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>JITOSOL to be Deposited</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0 JITOSOL</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Lock-up Period</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>0min</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Deposit Value</Typography>
                      <Typography sx={{ color: '#ffffff', fontSize: '0.85rem', fontWeight: 500 }}>$0.00</Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Card>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Top Stats Cards */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>TVL</Typography>
              <Typography sx={{ color: '#ffffff', fontSize: '2rem', fontWeight: 600 }}>
                $27.67M
              </Typography>
            </Card>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>7D Fees APY</Typography>
              <Typography sx={{ color: '#10b981', fontSize: '2rem', fontWeight: 600 }}>
                1.96%
              </Typography>
            </Card>
            <Card sx={{ 
              flex: '1 1 300px',
              p: 3,
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', mb: 1 }}>7D Volume</Typography>
              <Typography sx={{ color: '#ffffff', fontSize: '2rem', fontWeight: 600 }}>
                $120.01M
              </Typography>
            </Card>
          </Box>

          {/* Performance vs USD Chart */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ color: '#ffffff' }}>Performance vs USD</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label="USD" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.3)', color: '#3b82f6', fontWeight: 600 }} />
                <Chip label="SOL" size="small" sx={{ backgroundColor: 'rgba(59, 130, 246, 0.15)', color: '#64748b' }} />
              </Box>
            </Box>

            {/* Chart Area */}
            <Box sx={{ 
              height: 350, 
              position: 'relative',
              borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
              mb: 3
            }}>
              {/* Y-axis labels */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>10.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>-10.00%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>-20.00%</Typography>
              </Box>

              {/* Chart SVG */}
              <Box sx={{ width: '100%', height: '100%', pr: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="0.5" />
                  
                  {/* Performance line - showing downward trend */}
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1"
                    points="0,45 5,43 10,40 15,38 20,35 25,33 30,30 35,28 40,25 45,27 50,26 55,24 60,30 65,45 70,55 75,52 80,50 85,52 90,60 95,65 100,70"
                  />
                  <polyline
                    fill="url(#performanceGradient)"
                    stroke="none"
                    points="0,45 5,43 10,40 15,38 20,35 25,33 30,30 35,28 40,25 45,27 50,26 55,24 60,30 65,45 70,55 75,52 80,50 85,52 90,60 95,65 100,70 100,100 0,100"
                  />
                  <defs>
                    <linearGradient id="performanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 2
              }}>
                {['23/09', '26/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#10b981', '&.Mui-checked': { color: '#10b981' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Kamino Strategy</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#8b5cf6', '&.Mui-checked': { color: '#8b5cf6' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Token Pair HODL</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#f59e0b', '&.Mui-checked': { color: '#f59e0b' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% SOL HODL</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox defaultChecked size="small" sx={{ color: '#06b6d4', '&.Mui-checked': { color: '#06b6d4' } }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% JITOSOL HODL</Typography>
              </Box>
            </Box>

            {/* Performance Stats */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.41%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Kamino Strategy</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.54%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#8b5cf6' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Token Pair HODL</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.63%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% SOL HODL</Typography>
                </Box>
              </Card>
              <Card sx={{ 
                p: 2.5, 
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 2,
                boxShadow: 'none',
              }}>
                <Typography sx={{ color: '#ef4444', fontSize: '1.5rem', fontWeight: 600, mb: 0.5 }}>
                  -18.22%
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#06b6d4' }} />
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>100% JITOSOL HODL</Typography>
                </Box>
              </Card>
            </Box>
          </Card>

          {/* APY & Fee Chart */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>APY & Fee</Typography>

            {/* Chart Area */}
            <Box sx={{ 
              height: 250, 
              position: 'relative',
              mb: 3
            }}>
              {/* Y-axis labels (left - APY %) */}
              <Box sx={{ 
                position: 'absolute', 
                left: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pl: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>12.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>10.0%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>7.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>5.0%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>2.2%</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.0%</Typography>
              </Box>

              {/* Y-axis labels (right - Fees $) */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.04M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.03M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.02M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.01M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$1.00M</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>$990.00K</Typography>
              </Box>

              {/* Chart */}
              <Box sx={{ width: '100%', height: '100%', px: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Bar chart (APY) */}
                  {Array.from({ length: 50 }).map((_, i) => {
                    const height = Math.random() * 60 + 20;
                    return (
                      <rect
                        key={i}
                        x={i * 2}
                        y={100 - height}
                        width="1.5"
                        height={height}
                        fill="#3b82f6"
                        opacity="0.6"
                      />
                    );
                  })}
                  
                  {/* Cumulative line */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1"
                    points="0,85 10,82 20,80 30,77 40,75 50,73 60,71 70,68 80,65 90,63 100,60"
                  />
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 10
              }}>
                {['22/09', '25/09', '28/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#f97316', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Cumulative Fees & Rewards</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 12, backgroundColor: '#3b82f6', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>24h APY</Typography>
              </Box>
            </Box>
          </Card>

          {/* Historical Ranges & Rebalancing */}
          <Card sx={{ 
            p: 3,
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}>
            <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Historical Ranges & Rebalancing</Typography>

            {/* Chart Area */}
            <Box sx={{ 
              height: 250, 
              position: 'relative',
              mb: 2
            }}>
              {/* Y-axis labels */}
              <Box sx={{ 
                position: 'absolute', 
                right: 0, 
                top: 0, 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                pr: 2
              }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8140</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8120</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8100</Typography>
                <Typography sx={{ color: '#64748b', fontSize: '0.75rem' }}>0.8080</Typography>
              </Box>

              {/* Chart */}
              <Box sx={{ width: '100%', height: '100%', pr: 8 }}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                  {/* Strategy Range (green) */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1"
                    points="0,20 10,20 15,22 20,23 25,25 30,30 35,35 40,38 50,45 60,50 70,52 80,58 90,62 100,65"
                  />
                  
                  {/* Pool Price (blue) */}
                  <polyline
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="1"
                    points="0,25 10,27 15,28 20,30 25,32 30,35 35,38 40,42 50,48 60,53 70,56 80,62 90,67 100,70"
                  />
                </svg>
              </Box>

              {/* X-axis dates */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                mt: 2,
                px: 2
              }}>
                {['22/09', '25/09', '28/09', '01/10', '04/10', '07/10', '10/10', '13/10', '16/10', '19/10', '22/10'].map((date, idx) => (
                  <Typography key={idx} sx={{ color: '#64748b', fontSize: '0.75rem' }}>
                    {idx % 3 === 0 ? date : ''}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Chart Legend */}
            <Box sx={{ display: 'flex', gap: 3, justifyContent: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#3b82f6', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Pool Price</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 12, height: 3, backgroundColor: '#10b981', borderRadius: 1 }} />
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem' }}>Strategy Range</Typography>
              </Box>
            </Box>
          </Card>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* FAQ Section - Left Side */}
          <Box sx={{ flex: '1 1 600px', minWidth: 0 }}>
            <Card sx={{ 
              p: 0, 
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              {/* FAQ Items */}
              {[
                {
                  question: 'What does this vault do?',
                  answer: 'This vault automatically manages a concentrated liquidity position on Mars Finance, optimizing yield through strategic rebalancing and fee collection.'
                },
                {
                  question: 'Where does the yield (APY) come from?',
                  answer: 'Yield comes from trading fees generated by the liquidity pool, plus any additional rewards from liquidity mining programs and JTO incentives.'
                },
                {
                  question: 'When is this vault profitable?',
                  answer: 'The vault is most profitable during periods of high trading volume and when the token pair price remains within the concentrated liquidity range.'
                },
                {
                  question: 'When does this vault perform sub-optimally?',
                  answer: 'Performance may be sub-optimal during extreme price volatility or when prices move significantly outside the liquidity range, resulting in impermanent loss.'
                },
                {
                  question: 'How is the APY calculated?',
                  answer: 'APY is calculated based on the fees earned over the past 7 days, annualized to project yearly returns. It includes both trading fees and reward incentives.'
                },
                {
                  question: 'Where does my yield go?',
                  answer: 'Yields are automatically compounded back into your position, increasing your share of the vault over time without requiring manual reinvestment.'
                },
                {
                  question: 'What should I do after depositing?',
                  answer: 'After depositing, your position will automatically earn yield. You can monitor performance in the "My Position" tab and claim rewards when available.'
                },
                {
                  question: 'Do I have to deposit both tokens?',
                  answer: 'No, you can deposit a single token. The vault will automatically swap and balance your deposit into the optimal ratio for the liquidity position.'
                },
                {
                  question: 'Can I withdraw at any time?',
                  answer: 'Yes, you can withdraw your liquidity at any time. Note that there may be a small lock-up period for certain reward programs.'
                },
                {
                  question: 'What is position range?',
                  answer: 'Position range defines the price boundaries where your liquidity is active. When prices stay within this range, you earn more fees but face impermanent loss risk.'
                },
                {
                  question: 'What are the risks?',
                  answer: 'Main risks include impermanent loss, smart contract risk, and potential losses if prices move outside the liquidity range. Always DYOR before investing.'
                }
              ].map((faq, idx) => (
                <Accordion
                  key={idx}
                  expanded={expandedFaq === idx}
                  onChange={(_, isExpanded) => setExpandedFaq(isExpanded ? idx : false)}
                  sx={{
                    background: 'transparent',
                    boxShadow: 'none',
                    borderBottom: idx < 10 ? '1px solid rgba(59, 130, 246, 0.1)' : 'none',
                    '&:before': {
                      display: 'none'
                    },
                    '&.Mui-expanded': {
                      margin: 0
                    },
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.05)'
                    }
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon sx={{ color: '#64748b' }} />}
                    sx={{
                      color: '#ffffff',
                      py: 1.5,
                      px: 3,
                      flexDirection: 'row-reverse',
                      '& .MuiAccordionSummary-expandIconWrapper': {
                        marginRight: 2,
                        marginLeft: -1
                      },
                      '& .MuiAccordionSummary-content': {
                        margin: '12px 0'
                      },
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '0.95rem', fontWeight: 400 }}>
                      {faq.question}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails
                    sx={{
                      px: 3,
                      pb: 3,
                      pt: 0,
                      color: '#94a3b8',
                      fontSize: '0.9rem',
                      lineHeight: 1.6
                    }}
                  >
                    {faq.answer}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Card>
          </Box>

          {/* Right Side - Vault Info & Asset Details */}
          <Box sx={{ flex: '0 1 400px', minWidth: 320 }}>
            {/* Vault Info */}
            <Card sx={{ 
              p: 3, 
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Vault Info</Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <Button
                  size="small"
                  component="a"
                  href={`https://solscan.io/account/${pool?.address || poolAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Strategy address
                </Button>
                <Button
                  size="small"
                  component="a"
                  href={`https://solscan.io/account/${pool?.poolAddress || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Pool address
                </Button>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ color: '#ffffff', mb: 2, fontWeight: 600 }}>
                  Vault Capacity
                </Typography>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Current Deposit</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$27.67M</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Deposit Capacity per Transaction</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$1.50M</Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem' }}>Max Capacity</Typography>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.9rem', fontWeight: 500 }}>$55.00M</Typography>
                </Box>

                <Button
                  fullWidth
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    justifyContent: 'center',
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box>▾</Box>}
                >
                  More Info
                </Button>
              </Box>
            </Card>

            {/* Asset Details */}
            <Card sx={{ 
              p: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            }}>
              <Typography variant="h6" sx={{ color: '#ffffff', mb: 3 }}>Asset Details</Typography>
              
              <Typography sx={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
                SOL
              </Typography>

              <Button
                size="small"
                component="a"
                href="https://solana.com"
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  color: '#3b82f6',
                  textTransform: 'none',
                  fontSize: '0.85rem',
                  mb: 2,
                  pl: 0,
                  '&:hover': {
                    backgroundColor: 'rgba(59, 130, 246, 0.1)'
                  }
                }}
                endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
              >
                Website
              </Button>

              <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                SOL is the native token of the Solana blockchain, and is the most widely circulating asset in the ecosystem.
              </Typography>

              <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid rgba(59, 130, 246, 0.1)' }}>
                <Typography sx={{ color: '#ffffff', fontSize: '1.1rem', fontWeight: 600, mb: 2 }}>
                  JITOSOL
                </Typography>

                <Button
                  size="small"
                  component="a"
                  href="https://www.jito.network"
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    color: '#3b82f6',
                    textTransform: 'none',
                    fontSize: '0.85rem',
                    mb: 2,
                    pl: 0,
                    '&:hover': {
                      backgroundColor: 'rgba(59, 130, 246, 0.1)'
                    }
                  }}
                  endIcon={<Box sx={{ fontSize: '0.7rem' }}>↗</Box>}
                >
                  Website
                </Button>

                <Typography sx={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.6 }}>
                  JitoSOL is a liquid staking token that represents staked SOL on the Jito Network, earning staking rewards while maintaining liquidity.
                </Typography>
              </Box>
            </Card>
          </Box>
        </Box>
      </TabPanel>

      {/* Transaction Settings Dialog */}
      <Dialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            background: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(59, 130, 246, 0.2)',
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid rgba(59, 130, 246, 0.1)',
          pb: 2
        }}>
          <Typography variant="h6" sx={{ color: '#ffffff' }}>
            Transaction Settings
          </Typography>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(false)}
            sx={{ color: '#64748b' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ mt: 3 }}>
          {/* Slippage Tolerance Section */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600, mb: 2 }}>
              Slippage Tolerance
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              {[0.1, 0.5, 1.0].map((value) => (
                <Button
                  key={value}
                  onClick={() => {
                    setSlippageTolerance(value);
                    setCustomSlippage('');
                  }}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    color: slippageTolerance === value && !customSlippage ? '#3b82f6' : '#94a3b8',
                    borderColor: slippageTolerance === value && !customSlippage ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                    backgroundColor: slippageTolerance === value && !customSlippage ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    }
                  }}
                >
                  {value}%
                </Button>
              ))}
              <TextField
                size="small"
                placeholder="1.0"
                type="number"
                value={customSlippage}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomSlippage(val);
                  const num = parseFloat(val);
                  if (!isNaN(num) && num >= 0 && num <= 100) {
                    setSlippageTolerance(num);
                  }
                }}
                InputProps={{
                  endAdornment: <Typography sx={{ color: '#64748b', fontSize: '0.9rem' }}>%</Typography>,
                }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    color: '#ffffff',
                    backgroundColor: 'rgba(15, 23, 42, 0.5)',
                    '& fieldset': {
                      borderColor: customSlippage ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: '#3b82f6',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& input': {
                    textAlign: 'center',
                  }
                }}
              />
            </Box>
          </Box>

          {/* Priority Fee Section */}
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600, mb: 2 }}>
              Priority Fee
            </Typography>
            <ButtonGroup variant="outlined" sx={{ width: '100%', mb: priorityFee === 'custom' ? 2 : 0 }}>
              {[
                { value: 'normal', label: 'Normal' },
                { value: 'turbo', label: 'Turbo' },
                { value: 'custom', label: 'Custom' }
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setPriorityFee(value as 'normal' | 'turbo' | 'custom')}
                  sx={{
                    flex: 1,
                    color: priorityFee === value ? '#3b82f6' : '#94a3b8',
                    borderColor: priorityFee === value ? '#3b82f6' : 'rgba(148, 163, 184, 0.3)',
                    backgroundColor: priorityFee === value ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                    '&:hover': {
                      borderColor: '#3b82f6',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    }
                  }}
                >
                  {label}
                </Button>
              ))}
            </ButtonGroup>
            {priorityFee === 'custom' && (
              <Box>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.85rem', mb: 1 }}>
                  Custom max priority fee (SOL)
                </Typography>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="0.001"
                  type="number"
                  value={customPriorityFee}
                  onChange={(e) => setCustomPriorityFee(e.target.value)}
                  inputProps={{
                    step: '0.001',
                    min: '0',
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      color: '#ffffff',
                      backgroundColor: 'rgba(15, 23, 42, 0.5)',
                      '& fieldset': {
                        borderColor: 'rgba(148, 163, 184, 0.3)',
                      },
                      '&:hover fieldset': {
                        borderColor: '#3b82f6',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#3b82f6',
                      },
                    },
                  }}
                />
              </Box>
            )}
            <Typography sx={{ color: '#64748b', fontSize: '0.8rem', mt: 1 }}>
              Higher priority fees help your transaction get processed faster during network congestion.
            </Typography>
          </Box>

          {/* Versioned Transaction Section */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={versionedTransaction}
                  onChange={(e) => setVersionedTransaction(e.target.checked)}
                  sx={{ 
                    color: '#3b82f6',
                    '&.Mui-checked': { color: '#3b82f6' }
                  }}
                />
              }
              label={
                <Box>
                  <Typography sx={{ color: '#ffffff', fontSize: '0.95rem' }}>
                    Versioned Transaction
                  </Typography>
                  <Typography sx={{ color: '#ef4444', fontSize: '0.8rem', mt: 0.5 }}>
                    (Please, uncheck if using Ledger or WalletConnect)
                  </Typography>
                </Box>
              }
            />
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          borderTop: '1px solid rgba(59, 130, 246, 0.1)',
          p: 2,
          gap: 2
        }}>
          <Button
            onClick={() => setSettingsOpen(false)}
            sx={{
              color: '#94a3b8',
              '&:hover': {
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
              }
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => setSettingsOpen(false)}
            variant="contained"
            sx={{
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: '#2563eb',
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Progress Indicator */}
      <TransactionProgress
        open={showProgress}
        status={txStatus}
        title={
          txType === 'claim' 
            ? 'Claim Transaction'
            : txType === 'deposit' 
            ? 'Deposit Transaction' 
            : 'Withdraw Transaction'
        }
        message={txMessage}
        txSignature={txSignature}
      />
      </Box>
    </>
  );
}
