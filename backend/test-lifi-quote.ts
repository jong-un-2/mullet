/**
 * Test LiFi quote with correct Solana chainId
 */

async function testLiFiQuote() {
  const API_BASE_URL = 'https://mars-backend-serverless.jongun2038.workers.dev';
  
  const requestBody = {
    fromChain: 1, // Ethereum
    fromToken: '0xA0b86a33E6441a695a7e9B72b67B0a82f0913A50', // USDC on Ethereum
    fromAmount: '100000000', // 100 USDC (6 decimals)
    toChain: 1151111081099710, // Solana (LiFi chainId)
    toToken: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC on Solana
    userAddress: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb', // Dummy Ethereum address
  };

  console.log('Testing LiFi quote API...');
  console.log('Request body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${API_BASE_URL}/v1/api/mars/lifi/quote/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS! LiFi quote working with Solana chainId:', 1151111081099710);
    } else {
      console.log('\n❌ ERROR:', data);
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

testLiFiQuote();
