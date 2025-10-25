/**
 * Ethereum Token Transfer Component
 * 支持从 Privy MPC 钱包转账 ETH 和 ERC20 Token
 */

import { useState, useEffect } from 'react';
import { useWallets } from '@privy-io/react-auth';
import { 
  Button, 
  TextField, 
  Box, 
  Typography, 
  Alert, 
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import { toast } from 'sonner';
import { parseEther, formatEther } from 'viem';
import { usePublicClient, useWalletClient } from 'wagmi';
import { TOKEN_ICONS } from '../config/tokenIcons';

// 常用 ERC20 Token 列表
const COMMON_ETH_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    address: 'native',
    decimals: 18,
    logo: TOKEN_ICONS.ETH,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    decimals: 6,
    logo: TOKEN_ICONS.USDC_ETHEREUM,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
    logo: TOKEN_ICONS.USDT,
  },
  {
    symbol: 'PYUSD',
    name: 'PayPal USD',
    address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
    decimals: 6,
    logo: TOKEN_ICONS.PYUSD,
  },
];

interface EthTokenTransferProps {
  open: boolean;
  onClose: () => void;
  mode: 'send' | 'receive';
}

export function EthTokenTransfer({ open, onClose, mode }: EthTokenTransferProps) {
  const { wallets } = useWallets();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  
  const [selectedToken, setSelectedToken] = useState(COMMON_ETH_TOKENS[0]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});

  // Get Privy embedded Ethereum wallet
  const ethWallet = wallets.find(w => w.address.startsWith('0x') && w.walletClientType === 'privy');
  const walletAddress = ethWallet?.address;

  console.log('🔍 EthTokenTransfer wallet detection:', {
    hasPrivyWallet: !!ethWallet,
    walletAddress,
    mode,
  });

  // 获取 Token 余额
  useEffect(() => {
    if (!walletAddress || !open || !publicClient) return;

    const fetchBalances = async () => {
      try {
        const balances: Record<string, number> = {};

        // 获取 ETH 余额
        const ethBalance = await publicClient.getBalance({ 
          address: walletAddress as `0x${string}` 
        });
        balances['native'] = parseFloat(formatEther(ethBalance));

        // 获取 ERC20 Token 余额
        for (const token of COMMON_ETH_TOKENS.filter(t => t.address !== 'native')) {
          try {
            const balance = await publicClient.readContract({
              address: token.address as `0x${string}`,
              abi: [
                {
                  name: 'balanceOf',
                  type: 'function',
                  stateMutability: 'view',
                  inputs: [{ name: 'account', type: 'address' }],
                  outputs: [{ name: 'balance', type: 'uint256' }],
                },
              ],
              functionName: 'balanceOf',
              args: [walletAddress as `0x${string}`],
            });
            
            balances[token.address] = parseFloat(formatEther(balance as bigint)) * Math.pow(10, 18 - token.decimals);
          } catch (err) {
            console.error(`Error fetching ${token.symbol} balance:`, err);
            balances[token.address] = 0;
          }
        }

        setTokenBalances(balances);
      } catch (err) {
        console.error('Error fetching balances:', err);
      }
    };

    fetchBalances();
  }, [walletAddress, open, publicClient]);

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied to clipboard!');
    }
  };

  const handleTransfer = async () => {
    if (!walletAddress || !walletClient) {
      setError('No wallet connected');
      return;
    }

    if (!recipientAddress || !amount) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let hash: `0x${string}`;

      if (selectedToken.address === 'native') {
        // 发送 ETH
        hash = await walletClient.sendTransaction({
          to: recipientAddress as `0x${string}`,
          value: parseEther(amount),
        });
      } else {
        // 发送 ERC20 Token
        const tokenAmount = BigInt(Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.decimals)));
        
        hash = await walletClient.writeContract({
          address: selectedToken.address as `0x${string}`,
          abi: [
            {
              name: 'transfer',
              type: 'function',
              stateMutability: 'nonpayable',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' },
              ],
              outputs: [{ name: 'success', type: 'bool' }],
            },
          ],
          functionName: 'transfer',
          args: [recipientAddress as `0x${string}`, tokenAmount],
        });
      }

      // 等待确认
      await publicClient!.waitForTransactionReceipt({ hash });

      toast.success(
        <Box>
          <Typography variant="body2">Transfer successful!</Typography>
          <a 
            href={`https://etherscan.io/tx/${hash}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#3b82f6' }}
          >
            View on Etherscan
          </a>
        </Box>
      );

      // 清空表单
      setRecipientAddress('');
      setAmount('');
      
      // 关闭对话框
      setTimeout(() => onClose(), 1000);

    } catch (err: any) {
      console.error('Transfer error:', err);
      setError(err.message || 'Transfer failed');
      toast.error('Transfer failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  if (!walletAddress) {
    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Token Transfer</DialogTitle>
        <DialogContent>
          <Alert severity="info">
            No Privy embedded wallet found. Please create one first.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="xs" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#1a1a2e',
        }
      }}
    >
      <DialogTitle sx={{ 
        bgcolor: '#16213e',
        color: '#fff',
        fontWeight: 600,
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}>
        {mode === 'send' ? (
          <>
            <CallMadeIcon sx={{ color: '#627eea', fontSize: 28 }} />
            <span>Send Tokens</span>
          </>
        ) : (
          <>
            <CallReceivedIcon sx={{ color: '#627eea', fontSize: 28 }} />
            <span>Receive Tokens</span>
          </>
        )}
      </DialogTitle>
      
      <DialogContent sx={{ bgcolor: '#1a1a2e', pt: 10, pb: 3 }}>
        {mode === 'receive' ? (
          // 接收模式：只显示地址和复制按钮
          <Box>
            <Typography 
              variant="body2" 
              sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2, mt: 3 }}
            >
              Share this address to receive tokens:
            </Typography>
            
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 1,
              p: 2,
              bgcolor: 'rgba(98, 126, 234, 0.1)',
              border: '1px solid rgba(98, 126, 234, 0.3)',
              borderRadius: 2,
              mb: 2
            }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                  flex: 1,
                  color: '#627eea'
                }}
              >
                {walletAddress}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCopyAddress}
                sx={{ 
                  color: '#627eea',
                  '&:hover': { bgcolor: 'rgba(98, 126, 234, 0.2)' }
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* 余额显示 */}
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'rgba(255, 255, 255, 0.5)',
                mb: 1,
                display: 'block',
                fontWeight: 600
              }}
            >
              YOUR BALANCES
            </Typography>
            <Box sx={{ maxHeight: 250, overflowY: 'auto' }}>
              {COMMON_ETH_TOKENS.map(token => (
                <Box 
                  key={token.address} 
                  sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 1.5,
                    mb: 1,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 1,
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.08)'
                    }
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      component="img"
                      src={token.logo}
                      alt={token.symbol}
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                      }}
                    />
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ color: '#fff', fontWeight: 600 }}
                      >
                        {token.symbol}
                      </Typography>
                      <Typography 
                        variant="caption" 
                        sx={{ color: 'rgba(255, 255, 255, 0.5)' }}
                      >
                        {token.name}
                      </Typography>
                    </Box>
                  </Box>
                  <Typography 
                    variant="body1" 
                    sx={{ color: '#627eea', fontWeight: 600 }}
                  >
                    {tokenBalances[token.address]?.toFixed(token.decimals === 18 ? 4 : 2) || '0.00'}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        ) : (
          // 发送模式：简化的发送表单
          <Box>
            {/* Token 选择 */}
            <FormControl 
              fullWidth 
              sx={{ 
                mt: 3,
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#627eea' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiSelect-select': { 
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  paddingTop: '20px',
                  paddingBottom: '20px'
                }
              }}
            >
              <InputLabel>Token</InputLabel>
              <Select
                value={selectedToken.symbol}
                label="Token"
                onChange={(e) => {
                  const token = COMMON_ETH_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                disabled={loading}
                renderValue={(value) => {
                  const token = COMMON_ETH_TOKENS.find(t => t.symbol === value);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        component="img"
                        src={token?.logo}
                        alt={token?.symbol}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                        }}
                      />
                      <Typography>{value}</Typography>
                    </Box>
                  );
                }}
              >
                {COMMON_ETH_TOKENS.map(token => (
                  <MenuItem key={token.address} value={token.symbol}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                      <Box
                        component="img"
                        src={token.logo}
                        alt={token.symbol}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                        }}
                      />
                      <Typography sx={{ flex: 1 }}>{token.symbol}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {tokenBalances[token.address]?.toFixed(2) || '0.00'}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* 金额输入 */}
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              disabled={loading}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#627eea' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={() => {
                        const balance = tokenBalances[selectedToken.address] || 0;
                        const maxAmount = selectedToken.address === 'native' 
                          ? Math.max(0, balance - 0.001)
                          : balance;
                        setAmount(maxAmount.toString());
                      }}
                      sx={{ 
                        color: '#627eea',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(98, 126, 234, 0.1)' }
                      }}
                    >
                      MAX
                    </Button>
                  </InputAdornment>
                ),
              }}
            />

            {/* 接收地址 */}
            <TextField
              fullWidth
              label="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="Enter Ethereum address (0x...)"
              disabled={loading}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#627eea' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputBase-input': { color: '#fff', fontFamily: 'monospace', fontSize: '0.85rem' }
              }}
            />

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  bgcolor: 'rgba(220, 38, 38, 0.1)',
                  color: '#ff6b6b',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  '& .MuiAlert-icon': { color: '#ff6b6b' }
                }}
              >
                {error}
              </Alert>
            )}

            {/* 费用提示 */}
            <Alert 
              severity="info" 
              sx={{ 
                bgcolor: 'rgba(98, 126, 234, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(98, 126, 234, 0.3)',
                '& .MuiAlert-icon': { color: '#627eea' }
              }}
            >
              <Typography variant="caption">
                Network fees apply (varies by gas price)
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ 
        bgcolor: '#16213e', 
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        p: 2,
        gap: 1
      }}>
        <Button 
          onClick={onClose} 
          disabled={loading}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' }
          }}
        >
          {mode === 'receive' ? 'Done' : 'Cancel'}
        </Button>
        {mode === 'send' && (
          <Button
            variant="contained"
            onClick={handleTransfer}
            disabled={loading || !recipientAddress || !amount}
            startIcon={loading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <SendIcon />}
            sx={{
              bgcolor: '#627eea',
              color: '#fff',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: '#4c63d2'
              },
              '&:disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                color: 'rgba(255, 255, 255, 0.3)'
              }
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
