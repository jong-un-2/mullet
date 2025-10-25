/**
 * Token Icon Component
 * 统一的代币图标显示组件
 */

import { Box, BoxProps } from '@mui/material';
import { TOKEN_ICONS, getTokenIcon } from '../config/tokenIcons';

interface TokenIconProps extends Omit<BoxProps, 'component'> {
  symbol: string;
  chain?: 'solana' | 'ethereum';
  size?: number;
  showChainBadge?: boolean;
}

// 链图标 SVG 组件
const ChainBadge = ({ chain, size = 12 }: { chain: 'solana' | 'ethereum'; size?: number }) => {
  if (chain === 'ethereum') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16.498 4v8.87l7.497 3.35L16.498 4z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 4L9 16.22l7.498-3.35V4z" fill="#fff"/>
        <path d="M16.498 21.968v6.027L24 17.616l-7.502 4.352z" fill="#fff" fillOpacity="0.602"/>
        <path d="M16.498 27.995v-6.028L9 17.616l7.498 10.38z" fill="#fff"/>
        <path d="M16.498 20.573l7.497-4.353-7.497-3.348v7.701z" fill="#fff" fillOpacity="0.2"/>
        <path d="M9 16.22l7.498 4.353v-7.701L9 16.22z" fill="#fff" fillOpacity="0.602"/>
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

export function TokenIcon({ symbol, chain, size = 24, showChainBadge = false, sx, ...props }: TokenIconProps) {
  const iconUrl = getTokenIcon(symbol, chain);
  
  if (!iconUrl) {
    // 如果没有找到图标，显示代币符号的首字母
    const fallback = (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255, 255, 255, 0.1)',
          color: '#fff',
          fontSize: size * 0.5,
          fontWeight: 600,
        }}
      >
        {symbol.charAt(0)}
      </Box>
    );
    
    if (!showChainBadge || !chain) {
      return <Box sx={sx} {...props}>{fallback}</Box>;
    }
    
    return (
      <Box sx={{ position: 'relative', display: 'inline-block', ...sx }} {...props}>
        {fallback}
        <Box sx={{ position: 'absolute', bottom: -2, right: -2 }}>
          <ChainBadge chain={chain} size={size * 0.4} />
        </Box>
      </Box>
    );
  }
  
  const icon = (
    <Box
      component="img"
      src={iconUrl}
      alt={symbol}
      sx={{
        width: size,
        height: size,
        borderRadius: '50%',
      }}
    />
  );
  
  if (!showChainBadge || !chain) {
    return <Box sx={sx} {...props}>{icon}</Box>;
  }
  
  return (
    <Box sx={{ position: 'relative', display: 'inline-block', ...sx }} {...props}>
      {icon}
      <Box sx={{ position: 'absolute', bottom: -2, right: -2 }}>
        <ChainBadge chain={chain} size={size * 0.4} />
      </Box>
    </Box>
  );
}

export { TOKEN_ICONS, getTokenIcon };
