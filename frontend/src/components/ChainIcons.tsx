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
  // 代币特定图标 - 根据官方截图精确还原
  const tokenIcons: Record<string, React.ReactNode> = {
    'USDC': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#2775CA"/>
        <g transform="translate(16, 16)">
          <circle r="9" fill="none" stroke="#fff" strokeWidth="1.5"/>
          <circle r="6.5" fill="none" stroke="#fff" strokeWidth="1.5"/>
          <path d="M-1.5-4h1v2h1v1.5h-1c-.5 0-1 .5-1 1s.5 1 1 1h1c1.1 0 2-.9 2-2 0-.7-.4-1.4-1-1.7v-.1c.6-.3 1-1 1-1.7 0-1.1-.9-2-2-2h-1v-2h-1v2h-1v1.5h1c.5 0 1 .5 1 1s-.5 1-1 1h-1v1.5h1v2h1v-2z" fill="#fff"/>
        </g>
      </svg>
    ),
    'USDT': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#26A17B"/>
        <path d="M17.5 13.5v-3h3v-2h-9v2h3v3c-2.3.3-4 1.1-4 2s1.7 1.7 4 2v4.5h2v-4.5c2.3-.3 4-1.1 4-2s-1.7-1.7-4-2zm-1 3.2c-1.8 0-3.2-.5-3.2-1.2s1.4-1.2 3.2-1.2 3.2.5 3.2 1.2-1.4 1.2-3.2 1.2z" fill="#fff"/>
      </svg>
    ),
    'PYUSD': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#0070E0"/>
        <path d="M11 8h5c2.2 0 4 1.8 4 4s-1.8 4-4 4h-3v5h-2V8zm2 6h3c1.1 0 2-.9 2-2s-.9-2-2-2h-3v4z" fill="#fff"/>
      </svg>
    ),
    'SOL': (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#000"/>
        <defs>
          <linearGradient id={`sol_gradient_${size}`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#00FFA3"/>
            <stop offset="100%" stopColor="#DC1FFF"/>
          </linearGradient>
        </defs>
        <g transform="translate(8, 11)">
          <rect width="16" height="2" rx="1" fill={`url(#sol_gradient_${size})`}/>
          <rect y="4.5" width="16" height="2" rx="1" fill={`url(#sol_gradient_${size})`}/>
          <rect y="9" width="16" height="2" rx="1" fill={`url(#sol_gradient_${size})`}/>
        </g>
      </svg>
    ),
    'ETH': (
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
          bottom: -4,
          right: -4,
        }}
      >
        <ChainIcon chain={chain} size={size * 0.4} />
      </Box>
    </Box>
  );
};
