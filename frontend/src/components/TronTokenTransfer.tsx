/**
 * TRON Token Transfer Component
 * 支持从 Privy 嵌入式 TRON 钱包转账 TRX 和 TRC20 Token (USDT)
 */

import { useState, useEffect } from 'react';
import { usePrivy, useIdentityToken } from '@privy-io/react-auth';
import { 
  Button, 
  TextField, 
  Box, 
  Typography, 
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
  Alert,
} from '@mui/material';

import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import SecurityIcon from '@mui/icons-material/Security';
// QR code generator (no types in this project) - toDataURL is used to create an image data URL
// @ts-ignore
import QRCodeLib from 'qrcode';
import { toast } from 'sonner';
import { useTronWallet } from '../hooks/useTronWallet';
import { useSessionSigner } from '../hooks/useSessionSigner';
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
  const { identityToken } = useIdentityToken();
  const { 
    isSessionSignerAdded, 
    isAdding: sessionSignerAdding,
    addSessionSigner 
  } = useSessionSigner();
  
  const [selectedToken, setSelectedToken] = useState(COMMON_TRON_TOKENS[0]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  // const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const walletAddress = walletInfo?.address;

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setRecipientAddress('');
      setAmount('');
  // setError removed
      setLoading(false);
    }
  }, [open]);

  // Generate QR code data URL for receive mode
  useEffect(() => {
    let mounted = true;
    if (mode === 'receive' && walletAddress) {
      QRCodeLib.toDataURL(walletAddress, {
        errorCorrectionLevel: 'H',
        margin: 1,
        color: {
          dark: '#c62828',
          light: '#ffffff',
        },
      })
        .then((url: string) => {
          if (mounted) setQrDataUrl(url);
        })
        .catch((err: any) => {
          console.error('[TronTokenTransfer] QR generation error', err);
          if (mounted) setQrDataUrl(null);
        });
    } else {
      setQrDataUrl(null);
    }

    return () => {
      mounted = false;
    };
  }, [mode, walletAddress]);

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
  toast.error('Wallet not connected');
  return;
    }

    if (!recipientAddress) {
  toast.error('Please enter recipient address');
  return;
    }

    if (!isValidTronAddress(recipientAddress)) {
  toast.error('Invalid TRON address. Must start with T and be 34 characters long');
  return;
    }

    if (!amount || parseFloat(amount) <= 0) {
  toast.error('Please enter a valid amount');
  return;
    }

    if (parseFloat(amount) > tokenBalance) {
  toast.error(`Insufficient ${selectedToken.symbol} balance`);
  return;
    }

  setLoading(true);

    try {
      // Get Privy identity token (not access token) for wallet signing
      // Identity token is required for user-owned wallet authorization
      const userToken = identityToken || await getAccessToken();
      if (!userToken) {
        throw new Error('Failed to get user token');
      }

      // Find TRON embedded wallet from linkedAccounts
      const tronAccount = user?.linkedAccounts?.find(
        (account: any) => account.type === 'wallet' && account.chainType === 'tron'
      ) as any;

      if (!tronAccount) {
        throw new Error('TRON wallet not found');
      }

      // Log full tronAccount to debug walletId issue
      console.log('[TronTokenTransfer] Full tronAccount object:', tronAccount);
      console.log('[TronTokenTransfer] Available properties:', Object.keys(tronAccount));
      
      const walletId = tronAccount.walletId || tronAccount.id || tronAccount.address;
      const publicKey = tronAccount.publicKey || walletInfo?.publicKey;

      if (!publicKey) {
        throw new Error('Public key not found');
      }

      if (!walletId) {
        console.error('[TronTokenTransfer] No wallet ID found in tronAccount:', tronAccount);
        throw new Error('Wallet ID not found. Please try refreshing the page.');
      }

      console.log('[TronTokenTransfer] Preparing transaction:', {
        from: walletAddress,
        to: recipientAddress,
        amount,
        token: selectedToken.symbol,
        walletId,
        publicKey: publicKey.substring(0, 10) + '...',
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
          userToken,
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
          userToken,
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
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
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
              
              {/* QR Code for easy scanning */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mt: 2 }}>
                <Box sx={{ backgroundColor: '#fff', p: 1, borderRadius: 2 }}>
                  {qrDataUrl ? (
                    // show generated QR image
                    // width/height kept square and use decode-friendly white background
                    <img src={qrDataUrl} alt="TRON QR Code" width={160} height={160} style={{ display: 'block' }} />
                  ) : (
                    <Box sx={{ width: 160, height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CircularProgress size={28} sx={{ color: '#c62828' }} />
                    </Box>
                  )}
                </Box>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)' }}>Scan to receive TRON</Typography>
              </Box>
            </Box>

            {/* Supported Tokens alert removed as per request */}
          </Box>
        ) : (
          // Send Mode - Transaction form
          <Box>
            {/* Session Signer Warning */}
            {!isSessionSignerAdded && (
              <Alert 
                severity="warning" 
                sx={{ 
                  mb: 2.5,
                  backgroundColor: 'rgba(255, 152, 0, 0.1)',
                  borderLeft: '4px solid #ff9800',
                  color: 'rgba(255, 255, 255, 0.9)',
                  '& .MuiAlert-icon': {
                    color: '#ff9800'
                  }
                }}
              >
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography variant="body2">
                    <strong>Server Signing Not Enabled</strong>
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    To sign transactions from this wallet, you need to authorize our server to sign on your behalf. 
                    This is a secure delegation that allows seamless transaction signing.
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<SecurityIcon />}
                    onClick={addSessionSigner}
                    disabled={sessionSignerAdding}
                    sx={{
                      mt: 0.5,
                      borderColor: '#ff9800',
                      color: '#ff9800',
                      fontWeight: 600,
                      '&:hover': {
                        borderColor: '#fb8c00',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)'
                      }
                    }}
                  >
                    {sessionSignerAdding ? 'Authorizing...' : 'Authorize Server Signing'}
                  </Button>
                </Box>
              </Alert>
            )}

            {/* Token Selection */}
            <FormControl 
              fullWidth 
              sx={{ 
                mt: 3,
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(198, 40, 40, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(198, 40, 40, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#c62828' }
                },
                '& .MuiInputLabel-root': { color: 'rgba(255, 255, 255, 0.7)' },
                '& .MuiSelect-select': { 
                  color: '#c62828',
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
                  const token = COMMON_TRON_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                renderValue={(value) => {
                  const token = COMMON_TRON_TOKENS.find(t => t.symbol === value);
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Typography sx={{ fontWeight: 600 }}>{token?.symbol}</Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {token?.name}
                      </Typography>
                    </Box>
                  );
                }}
              >
                {COMMON_TRON_TOKENS.map((token) => (
                  <MenuItem key={token.symbol} value={token.symbol}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                      <Typography sx={{ flex: 1, fontWeight: 600 }}>{token.symbol}</Typography>
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
            {/* Error alert removed as per request */}
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
            disabled={loading || !recipientAddress || !amount || !isSessionSignerAdded}
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
