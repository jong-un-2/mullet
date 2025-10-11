import { lifiService } from './index';
import { MARS_CHAIN_IDS } from './constants';

/**
 * Mars LI.FI 集成路由处理器
 */
export async function handleLiFiRoutes(request: Request, env: any): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace('/v1/api/mars/lifi', '');

  try {
    switch (path) {
      case '/chains':
        return handleGetChains(request);
      
      case '/tokens':
        return handleGetTokens(request);
      
      case '/quote/deposit':
        return handleDepositQuote(request);
      
      case '/quote/withdraw':
        return handleWithdrawQuote(request);
      
      // Execute routes removed - frontend now uses LiFi SDK directly
      
      default:
        return new Response('Not found', { status: 404 });
    }
  } catch (error) {
    console.error('LI.FI route error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 获取支持的链列表
 */
async function handleGetChains(request: Request): Promise<Response> {
  const chains = await lifiService.getSupportedChains();
  
  // 过滤Mars支持的主要链
  const marsChains = chains.filter(chain => 
    Object.values(MARS_CHAIN_IDS).includes(chain.id as any)
  );

  return new Response(
    JSON.stringify({
      chains: marsChains,
      count: marsChains.length,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * 获取支持的代币列表
 */
async function handleGetTokens(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const chainId = url.searchParams.get('chainId');

  const tokens = await lifiService.getSupportedTokens(
    chainId ? parseInt(chainId) : undefined
  );

  return new Response(
    JSON.stringify({
      tokens,
      chainId: chainId ? parseInt(chainId) : 'all',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * 获取存款路由报价
 */
async function handleDepositQuote(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body = await request.json() as any;
    console.log('📥 Deposit quote request:', body);
    
    const { fromChain, fromToken, toToken, fromAmount, fromAddress, toAddress, marsProtocol } = body;

    if (!fromChain || !fromToken || !toToken || !fromAmount || !fromAddress) {
      console.error('❌ Missing required parameters:', { fromChain, fromToken, toToken, fromAmount, fromAddress });
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Missing required parameters: fromChain, fromToken, toToken, fromAmount, fromAddress' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔄 Getting best deposit route...');
    const quote = await lifiService.getBestDepositRoute({
      fromChain: parseInt(fromChain),
      fromToken,
      toToken,
      fromAmount,
      fromAddress,
      toAddress, // 可选的Solana目标地址
      marsProtocol: marsProtocol || 'default',
    });

    console.log('✅ Quote generated successfully');
    return new Response(
      JSON.stringify({
        success: true,
        quote,
        type: 'deposit',
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('❌ Deposit quote error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: String(error)
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * 获取提款路由报价
 */
async function handleWithdrawQuote(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await request.json() as any;
  const { toAddress, toToken, fromAmount, fromAddress, marsProtocol } = body;

  if (!toAddress || !toToken || !fromAmount || !fromAddress) {
    return new Response(
      JSON.stringify({ error: 'Missing required parameters: toAddress, toToken, fromAmount, fromAddress' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const quote = await lifiService.getBestWithdrawRoute({
    toAddress,
    toToken,
    fromAmount,
    fromAddress,
    marsProtocol: marsProtocol || 'default',
  });

  return new Response(
    JSON.stringify({
      success: true,
      quote,
      type: 'withdraw',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

// Execute functions removed - frontend now uses LiFi SDK directly to execute transactions
// Backend only provides quote endpoints for cross-chain operations