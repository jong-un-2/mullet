/**
 * Token Transfer Component
 * 支持从 Privy MPC 钱包转账 SOL 和各种 SPL Token
 */

import { useState, useEffect } from 'react';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';
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
import { 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  TransactionMessage,
  VersionedTransaction
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
} from '@solana/spl-token';
import { useConnection } from '@solana/wallet-adapter-react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import SendIcon from '@mui/icons-material/Send';
import CallReceivedIcon from '@mui/icons-material/CallReceived';
import CallMadeIcon from '@mui/icons-material/CallMade';
import { toast } from 'sonner';
import { TOKEN_ICONS } from '../config/tokenIcons';

// 常用 Token 列表
const COMMON_TOKENS = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: 'native',
    decimals: 9,
    logo: TOKEN_ICONS.SOL,
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    logo: TOKEN_ICONS.USDC_SOLANA,
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    logo: TOKEN_ICONS.USDT,
  },
  {
    symbol: 'PYUSD',
    name: 'PayPal USD',
    mint: '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
    decimals: 6,
    logo: TOKEN_ICONS.PYUSD,
  },
];

interface TokenTransferProps {
  open: boolean;
  onClose: () => void;
  mode: 'send' | 'receive';
}

export function TokenTransfer({ open, onClose, mode }: TokenTransferProps) {
  const { wallets: solanaWallets } = useSolanaWallets();
  const { connection } = useConnection();
  const [selectedToken, setSelectedToken] = useState(COMMON_TOKENS[0]);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenBalances, setTokenBalances] = useState<Record<string, number>>({});

  // Get Privy wallet using the same detection pattern as CustomUserProfile
  const privyWallet = solanaWallets?.[0];
  const standardWallet = (privyWallet as any)?.standardWallet;
  const isPrivyWallet = !standardWallet?.name; // undefined name = Privy embedded wallet
  
  // Use wallet address
  const walletAddress = privyWallet?.address;

  console.log('🔍 TokenTransfer wallet detection:', {
    hasPrivyWallet: isPrivyWallet,
    hasSolanaWallet: !!privyWallet,
    walletAddress,
    walletName: standardWallet?.name || 'privy',
    mode,
    solanaWalletsCount: solanaWallets?.length
  });

  // Get Token balances
  useEffect(() => {
    if (!walletAddress || !open) return;

    const fetchBalances = async () => {
      try {
        const pubkey = new PublicKey(walletAddress);
        const balances: Record<string, number> = {};

        // 获取 SOL 余额
        const solBalance = await connection.getBalance(pubkey);
        balances['native'] = solBalance / LAMPORTS_PER_SOL;

        // 获取各个 Token 的余额
        for (const token of COMMON_TOKENS) {
          if (token.mint === 'native') continue;

          try {
            const mintPubkey = new PublicKey(token.mint);
            const ata = getAssociatedTokenAddressSync(
              mintPubkey,
              pubkey,
              false,
              TOKEN_PROGRAM_ID
            );

            const tokenAccount = await connection.getTokenAccountBalance(ata);
            balances[token.mint] = tokenAccount.value.uiAmount || 0;
          } catch (err) {
            balances[token.mint] = 0;
          }
        }

        setTokenBalances(balances);
      } catch (err) {
        console.error('Failed to fetch balances:', err);
      }
    };

    fetchBalances();
  }, [walletAddress, connection, open]);

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied to clipboard!');
    }
  };

  const handleTransfer = async () => {
    if (!walletAddress) {
      setError('No wallet found');
      return;
    }

    if (!recipientAddress || !amount) {
      setError('Please enter recipient address and amount');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const senderPubkey = new PublicKey(walletAddress);
      const recipientPubkey = new PublicKey(recipientAddress);
      const transaction = new Transaction();

      if (selectedToken.mint === 'native') {
        // 转账 SOL
        const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: senderPubkey,
            toPubkey: recipientPubkey,
            lamports: Math.floor(lamports),
          })
        );
      } else {
        // 转账 SPL Token
        const mintPubkey = new PublicKey(selectedToken.mint);
        const senderAta = getAssociatedTokenAddressSync(
          mintPubkey,
          senderPubkey,
          false,
          TOKEN_PROGRAM_ID
        );
        const recipientAta = getAssociatedTokenAddressSync(
          mintPubkey,
          recipientPubkey,
          false,
          TOKEN_PROGRAM_ID
        );

        // 检查接收者的 ATA 是否存在
        const recipientAtaInfo = await connection.getAccountInfo(recipientAta);
        if (!recipientAtaInfo) {
          // 创建接收者的 ATA
          transaction.add(
            createAssociatedTokenAccountInstruction(
              senderPubkey,
              recipientAta,
              recipientPubkey,
              mintPubkey,
              TOKEN_PROGRAM_ID
            )
          );
        }

        // 添加转账指令
        const tokenAmount = parseFloat(amount) * Math.pow(10, selectedToken.decimals);
        transaction.add(
          createTransferInstruction(
            senderAta,
            recipientAta,
            senderPubkey,
            Math.floor(tokenAmount),
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // 获取最新的 blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.lastValidBlockHeight = lastValidBlockHeight;
      transaction.feePayer = senderPubkey;

      // 转换为 VersionedTransaction
      const message = TransactionMessage.decompile(transaction.compileMessage());
      const versionedTx = new VersionedTransaction(message.compileToV0Message());

      // 序列化并签名
      const serializedTx = versionedTx.serialize();
      
      // 使用 Privy 钱包签名
      if (!privyWallet) {
        throw new Error('No wallet available for signing');
      }
      
      const signedResult = await (privyWallet as any).signTransaction({ 
        transaction: serializedTx 
      });

      // 发送交易
      const signature = await connection.sendRawTransaction(signedResult.signedTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      // 等待确认
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(
        <Box>
          <Typography variant="body2">Transfer successful!</Typography>
          <a 
            href={`https://solscan.io/tx/${signature}`} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ color: '#3b82f6' }}
          >
            View on Solscan
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
            <CallMadeIcon sx={{ color: '#4ecdc4', fontSize: 28 }} />
            <span>Send Tokens</span>
          </>
        ) : (
          <>
            <CallReceivedIcon sx={{ color: '#4ecdc4', fontSize: 28 }} />
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
              bgcolor: 'rgba(78, 205, 196, 0.1)',
              border: '1px solid rgba(78, 205, 196, 0.3)',
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
                  color: '#4ecdc4'
                }}
              >
                {walletAddress}
              </Typography>
              <IconButton 
                size="small" 
                onClick={handleCopyAddress}
                sx={{ 
                  color: '#4ecdc4',
                  '&:hover': { bgcolor: 'rgba(78, 205, 196, 0.2)' }
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
              {COMMON_TOKENS.map(token => (
                <Box 
                  key={token.mint} 
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
                    sx={{ color: '#4ecdc4', fontWeight: 600 }}
                  >
                    {tokenBalances[token.mint]?.toFixed(token.decimals === 9 ? 4 : 2) || '0.00'}
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
                  '&.Mui-focused fieldset': { borderColor: '#4ecdc4' }
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
                  const token = COMMON_TOKENS.find(t => t.symbol === e.target.value);
                  if (token) setSelectedToken(token);
                }}
                disabled={loading}
                renderValue={(value) => {
                  const token = COMMON_TOKENS.find(t => t.symbol === value);
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
                {COMMON_TOKENS.map(token => (
                  <MenuItem key={token.mint} value={token.symbol}>
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
                        {tokenBalances[token.mint]?.toFixed(2) || '0.00'}
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
                  '&.Mui-focused fieldset': { borderColor: '#4ecdc4' }
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
                        const balance = tokenBalances[selectedToken.mint] || 0;
                        const maxAmount = selectedToken.mint === 'native' 
                          ? Math.max(0, balance - 0.001)
                          : balance;
                        setAmount(maxAmount.toString());
                      }}
                      sx={{ 
                        color: '#4ecdc4',
                        fontWeight: 600,
                        '&:hover': { bgcolor: 'rgba(78, 205, 196, 0.1)' }
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
              placeholder="Enter Solana address"
              disabled={loading}
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.2)' },
                  '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: '#4ecdc4' }
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
                bgcolor: 'rgba(78, 205, 196, 0.1)',
                color: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(78, 205, 196, 0.3)',
                '& .MuiAlert-icon': { color: '#4ecdc4' }
              }}
            >
              <Typography variant="caption">
                Fee: ~0.00001 SOL
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
              bgcolor: '#4ecdc4',
              color: '#1a1a2e',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                bgcolor: '#3dbdb4'
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
