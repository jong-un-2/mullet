/**
 * 标准区块链图标组件
 */
import { Box } from '@mui/material';

interface ChainIconProps {
  chain: 'ethereum' | 'solana';
  size?: number;
}

export const ChainIcon = ({ chain, size = 24 }: ChainIconProps) => {
  const icons = {
    ethereum: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff"/>
        <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.38z" fill="#fff"/>
        <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity="0.2"/>
        <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity="0.602"/>
      </svg>
    ),
    solana: (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="url(#solana_gradient)"/>
        <defs>
          <linearGradient id="solana_gradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00FFA3"/>
            <stop offset="1" stopColor="#DC1FFF"/>
          </linearGradient>
        </defs>
        <path d="M8.5 19.5l2.5-2.5h13l-2.5 2.5H8.5z" fill="#000"/>
        <path d="M8.5 12.5l2.5 2.5h13l-2.5-2.5H8.5z" fill="#000"/>
        <path d="M8.5 16h13v1H8.5v-1z" fill="#000"/>
      </svg>
    ),
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      {icons[chain]}
    </Box>
  );
};

/**
 * 代币图标组件 - 包含链标识
 */
interface TokenIconProps {
  symbol: string;
  chain: 'ethereum' | 'solana';
  size?: number;
  showChainBadge?: boolean;
}

export const TokenIcon = ({ symbol, chain, size = 32, showChainBadge = true }: TokenIconProps) => {
  // 代币特定图标
  const tokenIcons: Record<string, React.ReactNode> = {
    'USDC': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#2775CA"/>
        <path d="M19.5 16c0-1.933-1.567-3.5-3.5-3.5s-3.5 1.567-3.5 3.5 1.567 3.5 3.5 3.5 3.5-1.567 3.5-3.5z" fill="#fff"/>
        <path d="M16 11c2.761 0 5 2.239 5 5s-2.239 5-5 5-5-2.239-5-5 2.239-5 5-5zm0 1.5c-1.933 0-3.5 1.567-3.5 3.5s1.567 3.5 3.5 3.5 3.5-1.567 3.5-3.5-1.567-3.5-3.5-3.5z" fill="#fff"/>
      </svg>
    ),
    'USDT': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#26A17B"/>
        <path d="M17.5 14v-2h3v-2h-9v2h3v2c-2.5.5-4 1.5-4 2.5s1.5 2 4 2.5v4h2v-4c2.5-.5 4-1.5 4-2.5s-1.5-2-3-2.5z" fill="#fff"/>
      </svg>
    ),
    'PYUSD': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#0070BA"/>
        <path d="M12 9h4c2.2 0 4 1.8 4 4s-1.8 4-4 4h-2v4h-2V9zm2 6h2c1.1 0 2-.9 2-2s-.9-2-2-2h-2v4z" fill="#fff"/>
        <path d="M16 18c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1zm0 3c0 .55-.45 1-1 1s-1-.45-1-1 .45-1 1-1 1 .45 1 1z" fill="#00A2E8"/>
      </svg>
    ),
    'SOL': (
      <ChainIcon chain="solana" size={size} />
    ),
    'ETH': (
      <ChainIcon chain="ethereum" size={size} />
    ),
  };

  const tokenIcon = tokenIcons[symbol] || (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: '#3b82f6',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: size * 0.5,
        fontWeight: 'bold',
      }}
    >
      {symbol[0]}
    </Box>
  );

  if (!showChainBadge) {
    return tokenIcon;
  }

  return (
    <Box sx={{ position: 'relative', display: 'inline-block' }}>
      {tokenIcon}
      <Box
        sx={{
          position: 'absolute',
          bottom: -2,
          right: -2,
          borderRadius: '50%',
          border: '2px solid #0f172a',
          backgroundColor: '#0f172a',
        }}
      >
        <ChainIcon chain={chain} size={size * 0.5} />
      </Box>
    </Box>
  );
};
