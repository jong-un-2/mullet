/**
 * TRON Token Transfer Component
 * 支持从 Privy 嵌入式 TRON 钱包转账 TRX 和 TRC20 Token (USDT)
 */

import { useState, useEffect } from 'react';
import { usePrivy } from '@privy-io/react-auth';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import { toast } from 'sonner';
import { useTronWallet } from '../hooks/useTronWallet';
import { 
  buildAndSignTronTransaction,
  buildAndSignTrc20Transaction,
  broadcastTronTransaction,
} from '../services/privyTronService';

// TRON 常用 Token 列表
const COMMON_TRON_TOKENS = [
  {
    symbol: 'TRX',
    name: 'TRON',
    address: 'native',
    decimals: 6,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    address: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', // TRON USDT contract
    decimals: 6,
  },
];

interface TronTokenTransferProps {
  open: boolean;
  onClose: () => void;
  mode: 'send' | 'receive';
}

export function TronTokenTransfer({ open, onClose, mode }: TronTokenTransferProps) {
  const { walletInfo, balance: tronBalance } = useTronWallet();
  const { getAccessToken, user } = usePrivy();
  
  const [selectedToken, setSelectedToken] = useState(COMMON_TRON_TOKENS[0]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const walletAddress = walletInfo?.address;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setRecipientAddress('');
      setAmount('');
      setError('');
      setLoading(false);
    }
  }, [open]);

  // Get token balance
  const getTokenBalance = (): number => {
    if (!tronBalance) return 0;
    
    if (selectedToken.symbol === 'TRX') {
      return parseFloat(tronBalance.trx.toString());
    } else if (selectedToken.symbol === 'USDT') {
      const usdtToken = Object.values(tronBalance.tokens).find(
        token => token.symbol === 'USDT'
      );
      return usdtToken ? parseFloat(usdtToken.balance.toString()) : 0;
    }
    return 0;
  };

  const tokenBalance = getTokenBalance();

  // Copy wallet address
  const copyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      toast.success('Address copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Validate TRON address
  const isValidTronAddress = (address: string): boolean => {
    return address.startsWith('T') && address.length === 34;
  };

  // Handle send transaction
  const handleSend = async () => {
    if (!walletAddress) {
      setError('Wallet not connected');
      return;
    }

    if (!recipientAddress) {
      setError('Please enter recipient address');
      return;
    }

    if (!isValidTronAddress(recipientAddress)) {
      setError('Invalid TRON address. Must start with T and be 34 characters long');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > tokenBalance) {
      setError(`Insufficient ${selectedToken.symbol} balance`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get Privy access token
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token');
      }

      // Find TRON embedded wallet from linkedAccounts
      const tronAccount = user?.linkedAccounts?.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'tron'
      ) as any;

      if (!tronAccount) {
        throw new Error('TRON wallet not found');
      }

      const walletId = tronAccount.walletId || tronAccount.id;
      const publicKey = tronAccount.publicKey || walletInfo?.publicKey;

      if (!publicKey) {
        throw new Error('Public key not found');
      }

      console.log('[TronTokenTransfer] Preparing transaction:', {
        from: walletAddress,
        to: recipientAddress,
        amount,
        token: selectedToken.symbol,
        walletId,
      });

      let signedTx: string;

      if (selectedToken.symbol === 'TRX') {
        // Send native TRX
        const amountInSun = Math.floor(parseFloat(amount) * 1_000_000); // Convert to sun (1 TRX = 1,000,000 sun)
        
        signedTx = await buildAndSignTronTransaction(
          walletId,
          walletAddress,
          recipientAddress,
          amountInSun,
          accessToken,
          publicKey
        );
      } else if (selectedToken.symbol === 'USDT') {
        // Send TRC20 USDT
        const amountInSmallestUnit = Math.floor(parseFloat(amount) * Math.pow(10, selectedToken.decimals));
        
        signedTx = await buildAndSignTrc20Transaction(
          walletId,
          walletAddress,
          recipientAddress,
          amountInSmallestUnit,
          selectedToken.address,
          accessToken,
          publicKey
        );
      } else {
        throw new Error(`Unsupported token: ${selectedToken.symbol}`);
      }

      console.log('[TronTokenTransfer] Transaction signed, broadcasting...');

      // Broadcast transaction
      const txId = await broadcastTronTransaction(signedTx);

      console.log('[TronTokenTransfer] Transaction successful:', txId);

      toast.success(
        `Transaction sent! TX: ${txId.slice(0, 8)}...${txId.slice(-8)}`,
        {
          duration: 5000,
        }
      );

      // Reset form and close
      setRecipientAddress('');
      setAmount('');
      onClose();
    } catch (err: any) {
      console.error('[TronTokenTransfer] Send transaction error:', err);
      const errorMessage = err.message || 'Failed to send transaction';
      setError(errorMessage);
      toast.error(`Transaction failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Set max amount
  const setMaxAmount = () => {
    setAmount(tokenBalance.toString());
  };

  if (!walletAddress) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0f172a',
          border: '1px solid rgba(198, 40, 40, 0.3)',
          borderRadius: 2,
        }
      }}
    >
      <DialogTitle sx={{ 
        color: '#c62828',
        fontWeight: 600,
        borderBottom: '1px solid rgba(198, 40, 40, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #c62828, #e53935)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: 700,
            color: 'white'
          }}
        >
          T
        </Box>
        {mode === 'send' ? (
          <>
            <CallReceivedIcon sx={{ transform: 'rotate(180deg)' }} />
            Send TRON Tokens
          </>
        ) : (
          <>
            <CallReceivedIcon />
            Receive TRON Tokens
          </>
        )}
      </DialogTitle>

      <DialogContent sx={{ mt: 2 }}>
        {mode === 'receive' ? (
          // Receive Mode - Show wallet address
          <Box>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)', mb: 2 }}>
              Share this address to receive TRON tokens:
            </Typography>
            
            <Box sx={{
              backgroundColor: 'rgba(198, 40, 40, 0.1)',
              border: '1px solid rgba(198, 40, 40, 0.3)',
              borderRadius: 2,
              p: 2.5,
              mb: 2
            }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.5)',
                  display: 'block',
                  mb: 1,
                  fontFamily: 'monospace'
                }}
              >
                Your TRON Address
              </Typography>
              <Typography
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.95rem',
                  color: '#c62828',
                  wordBreak: 'break-all',
                  fontWeight: 600,
                  mb: 2
                }}
              >
                {walletAddress}
              </Typography>
              
              <Button
                fullWidth
                variant="outlined"
                startIcon={copied ? null : <ContentCopyIcon />}
                onClick={copyAddress}
                sx={{
                  borderColor: 'rgba(198, 40, 40, 0.5)',
                  color: '#c62828',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#c62828',
                    backgroundColor: 'rgba(198, 40, 40, 0.1)'
                  }
                }}
              >
                {copied ? '✓ Copied!' : 'Copy Address'}
              </Button>
            </Box>

            <Alert 
              severity="info" 
              sx={{ 
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#3b82f6'
                }
              }}
            >
              <Typography variant="caption" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
                Supported Tokens:
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                • TRX (native TRON token)<br/>
                • USDT (TRC20)
              </Typography>
            </Alert>
          </Box>
        ) : (
          // Send Mode - Transaction form
          <Box>
            {/* Token Selection */}
            <FormControl fullWidth sx={{ mb: 2.5 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Token</InputLabel>
              <Select
                value={selectedToken.symbol}
                onChange={(e) => {
                  const token = COMMON_TRON_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                label="Token"
                sx={{
                  color: '#c62828',
                  fontWeight: 600,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(198, 40, 40, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(198, 40, 40, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#c62828',
                  },
                }}
              >
                {COMMON_TRON_TOKENS.map((token) => (
                  <MenuItem key={token.symbol} value={token.symbol}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography sx={{ fontWeight: 600 }}>{token.symbol}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {token.name}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Recipient Address */}
            <TextField
              fullWidth
              label="Recipient Address"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="T..."
              disabled={loading}
              sx={{ 
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#c62828' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputBase-input': { 
                  color: '#fff', 
                  fontFamily: 'monospace',
                  fontSize: '0.85rem'
                }
              }}
            />

            {/* Amount */}
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Button
                      size="small"
                      onClick={setMaxAmount}
                      sx={{
                        color: '#c62828',
                        fontWeight: 600,
                        minWidth: 'auto',
                        px: 1,
                        '&:hover': {
                          backgroundColor: 'rgba(198, 40, 40, 0.1)'
                        }
                      }}
                    >
                      MAX
                    </Button>
                  </InputAdornment>
                ),
              }}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#c62828' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiInputBase-input': { color: '#fff' }
              }}
            />

            {/* Error Message */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444'
                }}
              >
                {error}
              </Alert>
            )}

            {/* Info Alert */}
            <Alert 
              severity="warning" 
              sx={{ 
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: 'rgba(255, 255, 255, 0.9)',
                '& .MuiAlert-icon': {
                  color: '#f59e0b'
                }
              }}
            >
              <Typography variant="caption">
                TRON transaction sending is under development. This feature will be available soon.
              </Typography>
            </Alert>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid rgba(198, 40, 40, 0.2)', p: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ 
            color: 'rgba(255, 255, 255, 0.7)',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)'
            }
          }}
        >
          {mode === 'receive' ? 'Close' : 'Cancel'}
        </Button>
        
        {mode === 'send' && (
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={loading || !recipientAddress || !amount}
            startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            sx={{
              backgroundColor: '#c62828',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                backgroundColor: '#b71c1c'
              },
              '&:disabled': {
                backgroundColor: 'rgba(198, 40, 40, 0.3)',
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
