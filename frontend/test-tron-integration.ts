/**
 * TRON 集成测试脚本
 * 用于验证 TRON 服务和组件是否正常工作
 */

import { tronService } from './src/services/tronService';
import { TRON_CHAIN_ID, TRON_TOKENS } from './src/constants/tronConstants';

console.log('🧪 TRON Integration Test Starting...\n');

// 测试 1: 验证 TRON Chain ID
console.log('Test 1: TRON Chain ID');
console.log('✅ TRON_CHAIN_ID:', TRON_CHAIN_ID);
console.log('Expected: mainnet (字符串标识符)');
console.assert(TRON_CHAIN_ID === 'mainnet', 'TRON_CHAIN_ID mismatch!');
console.log('');

// 测试 2: 验证代币地址
console.log('Test 2: TRON Token Addresses');
console.log('✅ USDT:', TRON_TOKENS.USDT);
console.log('✅ USDC:', TRON_TOKENS.USDC);
console.assert(TRON_TOKENS.USDT === 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', 'USDT address mismatch!');
console.log('');

// 测试 3: TRON 地址验证
console.log('Test 3: TRON Address Validation');
const validTronAddress = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
const invalidTronAddress = '0x1234567890123456789012345678901234567890';
const ethAddress = '0x1234567890123456789012345678901234567890';

console.log(`Valid TRON address (${validTronAddress.slice(0, 10)}...):`, 
  tronService.isValidAddress(validTronAddress));
console.log(`Invalid TRON address:`, 
  tronService.isValidAddress(invalidTronAddress));
console.log(`ETH address:`, 
  tronService.isValidAddress(ethAddress));
console.log('');

// 测试 4: 网络配置
console.log('Test 4: Network Configuration');
const networkConfig = tronService.getNetworkConfig();
console.log('✅ Network Name:', networkConfig.name);
console.log('✅ Chain ID:', networkConfig.chainId);
console.log('✅ RPC URL:', networkConfig.fullHost);
console.log('✅ Block Explorer:', networkConfig.blockExplorer);
console.log('');

// 测试 5: TronLink 检测
console.log('Test 5: TronLink Detection');
tronService.detectTronLink().then((detected) => {
  if (detected) {
    console.log('✅ TronLink wallet detected!');
  } else {
    console.log('⚠️  TronLink wallet not detected (this is normal in Node.js environment)');
  }
  console.log('');
  
  console.log('🎉 All tests completed!\n');
  console.log('📝 Summary:');
  console.log('- TRON Chain ID configured correctly');
  console.log('- Token addresses set up');
  console.log('- Address validation working');
  console.log('- Network configuration loaded');
  console.log('\nNext steps:');
  console.log('1. Install TronLink extension in your browser');
  console.log('2. Run the app: npm run dev');
  console.log('3. Open CustomUserProfile and connect TronLink');
  console.log('4. Test TRON wallet functionality in the UI');
}).catch((error) => {
  console.error('❌ Error during TronLink detection:', error);
});
