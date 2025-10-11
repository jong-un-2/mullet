import { ChainType, getChains } from '@lifi/sdk';

async function testLiFiChains() {
  try {
    console.log('Fetching EVM chains...');
    const evmChains = await getChains({ chainTypes: [ChainType.EVM] });
    console.log('EVM Chains:', evmChains.length);
    console.log('Sample EVM chains:', evmChains.slice(0, 3).map(c => ({ id: c.id, key: c.key, name: c.name })));

    console.log('\n---\n');

    console.log('Fetching SVM (Solana) chains...');
    const svmChains = await getChains({ chainTypes: [ChainType.SVM] });
    console.log('SVM Chains:', svmChains.length);
    console.log('SVM chains:', svmChains.map(c => ({ id: c.id, key: c.key, name: c.name, chainType: c.chainType })));

    console.log('\n---\n');

    console.log('Fetching ALL chains...');
    const allChains = await getChains();
    console.log('Total chains:', allChains.length);
    
    // Find Solana
    const solanaChains = allChains.filter(c => c.name.toLowerCase().includes('solana') || c.key.toLowerCase().includes('sol'));
    console.log('Solana-related chains:', solanaChains.map(c => ({ id: c.id, key: c.key, name: c.name, chainType: c.chainType })));

  } catch (error) {
    console.error('Error:', error);
  }
}

testLiFiChains();
