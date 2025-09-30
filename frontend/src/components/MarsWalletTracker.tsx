/**
 * Mars Wallet Tracker Component
 * 全局钱包连接追踪组件，自动记录用户钱包连接状态
 */

import { useMarsWalletConnection } from '../hooks/useMarsWalletConnection';

const MarsWalletTracker: React.FC = () => {
  // 这个 Hook 会自动处理钱包连接记录
  const { sessions, isRecording, error } = useMarsWalletConnection();

  // 在开发环境下显示调试信息
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Mars Wallet Sessions:', sessions);
    if (isRecording) {
      console.log('📝 Recording wallet connection...');
    }
    if (error) {
      console.error('❌ Wallet recording error:', error);
    }
  }

  // 这个组件不渲染任何 UI，只是在后台工作
  return null;
};

export default MarsWalletTracker;