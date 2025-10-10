/**
 * TransactionProgress - 交易进度浮动提示组件
 * 显示在左下角，带有进度指示和状态更新
 */

import React from 'react';
import { Box, Typography, CircularProgress, Fade } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

interface TransactionProgressProps {
  open: boolean;
  status: 'idle' | 'building' | 'signing' | 'sending' | 'confirming' | 'success' | 'error';
  title?: string;
  message?: string;
  currentStep?: number;
  totalSteps?: number;
  error?: string;
  onClose?: () => void;
}

export const TransactionProgress: React.FC<TransactionProgressProps> = ({
  open,
  status,
  title = 'Processing Transaction',
  message,
  currentStep,
  totalSteps,
  error,
}) => {
  const getStatusText = () => {
    switch (status) {
      case 'building':
        return 'Building transaction...';
      case 'signing':
        return 'Waiting for signature...';
      case 'sending':
        return 'Sending transaction...';
      case 'confirming':
        return 'Confirming on blockchain...';
      case 'success':
        return 'Transaction successful!';
      case 'error':
        return error || 'Transaction failed';
      default:
        return '';
    }
  };

  const getIcon = () => {
    if (status === 'success') {
      return <CheckCircleIcon sx={{ fontSize: 24, color: '#22c55e' }} />;
    }
    if (status === 'error') {
      return <ErrorIcon sx={{ fontSize: 24, color: '#ef4444' }} />;
    }
    return <CircularProgress size={20} sx={{ color: '#60a5fa' }} />;
  };

  const getProgressColor = () => {
    if (status === 'success') return '#22c55e';
    if (status === 'error') return '#ef4444';
    return '#60a5fa';
  };

  const isProcessing = ['building', 'signing', 'sending', 'confirming'].includes(status);
  const progress = currentStep && totalSteps ? (currentStep / totalSteps) * 100 : 0;

  return (
    <Fade in={open} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 9999,
          minWidth: 320,
          maxWidth: 400,
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1)',
          overflow: 'hidden',
          border: `1px solid ${getProgressColor()}40`,
        }}
      >
        {/* Progress bar at top */}
        {isProcessing && (
          <Box
            sx={{
              height: 3,
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                height: '100%',
                width: progress > 0 ? `${progress}%` : '100%',
                backgroundColor: getProgressColor(),
                transition: 'width 0.3s ease',
                animation: progress === 0 ? 'pulse 1.5s ease-in-out infinite' : 'none',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
          </Box>
        )}

        <Box sx={{ p: 2.5 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            {getIcon()}
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                {title}
              </Typography>
              {currentStep && totalSteps && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#94a3b8',
                    fontSize: '0.75rem',
                  }}
                >
                  Step {currentStep} of {totalSteps}
                </Typography>
              )}
            </Box>
          </Box>

          {/* Status message */}
          <Typography
            variant="body2"
            sx={{
              color: status === 'error' ? '#fca5a5' : '#cbd5e1',
              fontSize: '0.85rem',
              lineHeight: 1.5,
            }}
          >
            {message || getStatusText()}
          </Typography>

          {/* Additional info for multi-step transactions */}
          {isProcessing && totalSteps && totalSteps > 1 && (
            <Box
              sx={{
                mt: 1.5,
                pt: 1.5,
                borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#94a3b8',
                  fontSize: '0.75rem',
                  display: 'block',
                }}
              >
                Please confirm each transaction in your wallet
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Fade>
  );
};
