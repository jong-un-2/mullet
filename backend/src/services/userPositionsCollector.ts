/**
 * User Positions Collector Service
 * Fetches user positions from Kamino Vault
 * Uses @kamino-finance/farms-sdk and @kamino-finance/klend-sdk
 * 
 */

import { 
  getMedianSlotDurationInMsFromLastEpochs,
  KaminoManager,
  KaminoVault,
  UserState,
  Reserve,
  DEFAULT_PUBLIC_KEY,
  lamportsToDecimal,
} from '@kamino-finance/klend-sdk';
import { 
  Farms,
  FarmState,
  calculatePendingRewards,
  getUserStatePDA,
} from '@kamino-finance/farms-sdk';
import {
  createDefaultRpcTransport,
  createRpc,
  createSolanaRpcApi,
  type Rpc,
  type SolanaRpcApi,
  address,
  type Address
} from '@solana/kit';
import { PublicKey } from '@solana/web3.js';
import Decimal from 'decimal.js';

// Solana RPC endpoint
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';

// Protocol addresses
const PYUSD_VAULT_ADDRESS = 'A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK';

export interface RewardInfo {
  tokenName: string;
  tokenMint: string;
  weeklyAmount: number;
  apy: number;
  pendingBalance: number;
}

export interface UserPosition {
  id: string;
  userAddress: string;
  vaultAddress: string;
  protocol: 'mars-vault' | 'kamino-lend' | 'jupiter' | 'mars';
  strategyAddress: string;
  strategyName: string;
  
  // Token information
  baseToken: string;
  baseTokenMint: string;
  
  // Position amounts
  totalShares: string; // User's shares balance
  totalSupplied: string; // Actual tokens held (shares × tokensPerShare)
  totalSuppliedUSD: string; // USD value
  currentValue: string;
  
  // Earnings
  interestEarned: string; // Cumulative interest earned
  dailyInterestUSD: string; // Daily expected earnings
  unrealizedPnl: string;
  
  // APY breakdown
  lendingAPY: number;
  incentivesAPY: number;
  totalAPY: number;
  
  // TVL and liquidity
  tvl?: string;
  liquidityDepth?: string;
  
  // Rewards
  rewards: RewardInfo[];
  pendingRewards: Record<string, string>; // { tokenMint: amount }
  totalRewardsClaimed: Record<string, string>;
  lastRewardClaim?: Date;
  
  // Status
  riskLevel: 'low' | 'medium' | 'high';
  status: 'active' | 'unstaking' | 'closed';
  
  // Timestamps
  firstDepositTime: Date;
  lastActivityTime: Date;
  lastFetchTime: Date;
}

export class UserPositionsCollector {
  private rpc: Rpc<SolanaRpcApi>;
  private kaminoManager: KaminoManager;
  private farmsClient: Farms;
  private slotDuration: number = 400; // Default slot duration in ms

  constructor(rpcEndpoint: string = SOLANA_RPC) {
    const transport = createDefaultRpcTransport({ url: rpcEndpoint });
    this.rpc = createRpc({ api: createSolanaRpcApi(), transport });
    this.kaminoManager = new KaminoManager(this.rpc, this.slotDuration);
    this.farmsClient = new Farms(this.rpc);
  }

  /**
   * Initialize slot duration (call this before first use)
   */
  async initialize(): Promise<void> {
    try {
      this.slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
      this.kaminoManager = new KaminoManager(this.rpc, this.slotDuration);
      console.log(`✅ UserPositionsCollector initialized with slot duration: ${this.slotDuration}ms`);
    } catch (error) {
      console.warn('⚠️ Failed to get median slot duration, using default 400ms:', error);
    }
  }

  /**
   * Fetch all positions for a user across all protocols
   */
  async fetchUserPositions(userAddress: string): Promise<UserPosition[]> {
    const positions: UserPosition[] = [];
    
    try {
      const userAddr = address(userAddress);
      
      // Fetch Kamino Vault positions (PYUSD Vault)
      const vaultPositions = await this.fetchKaminoVaultPositions(userAddr);
      positions.push(...vaultPositions);
      
      // Fetch Kamino Lend positions
      const lendPositions = await this.fetchKaminoLendPositions(userAddr);
      positions.push(...lendPositions);
      
      // TODO: Add Jupiter protocol support
      // const jupiterPositions = await this.fetchJupiterPositions(userAddr);
      // positions.push(...jupiterPositions);
      
      console.log(`✅ Fetched ${positions.length} positions for user ${userAddress}`);
      return positions;
      
    } catch (error) {
      console.error(`❌ Error fetching positions for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Fetch Kamino Vault positions (e.g., PYUSD Vault)
   * Migrated from frontend useUserVaultPosition.ts
   */
  private async fetchKaminoVaultPositions(userAddr: Address): Promise<UserPosition[]> {
    const positions: UserPosition[] = [];
    
    try {
      console.log('📦 Fetching Kamino Vault position for:', userAddr);
      
      // 1. Initialize Vault
      const vault = new KaminoVault(this.rpc, PYUSD_VAULT_ADDRESS as Address);
      const vaultState = await vault.getState();
      console.log('✅ Vault state loaded');
      
      // 2. Get current slot
      const currentSlot = await this.rpc.getSlot({ commitment: 'confirmed' }).send();
      console.log('🎰 Current slot:', currentSlot);
      
      // 3. Token price (PYUSD = $1)
      const tokenPrice = new Decimal(1.0);
      
      // 4. Get user's shares balance
      const userSharesForVault = await this.kaminoManager.getUserSharesBalanceSingleVault(
        userAddr,
        vault
      );
      
      console.log('📊 User shares for vault:', {
        userAddr,
        vaultAddr: PYUSD_VAULT_ADDRESS,
        shares: userSharesForVault?.totalShares?.toString() || 'null'
      });
      
      if (!userSharesForVault || userSharesForVault.totalShares.isZero()) {
        console.log('❌ No vault shares found for user - checking if position exists in DB');
        // Even if on-chain shares are 0, return empty to allow DB cleanup
        return positions;
      }
      
      // 5. Calculate actual tokens held (shares × tokensPerShare)
      const tokensPerShare = await this.kaminoManager.getTokensPerShareSingleVault(vault, currentSlot);
      const userSharesNum = userSharesForVault.totalShares.toNumber();
      const actualTokens = new Decimal(userSharesNum).mul(tokensPerShare);
      const totalSuppliedUSD = actualTokens.toNumber() * tokenPrice.toNumber();
      
      // 6. Calculate interest earned
      const initialTokensPerShare = new Decimal(1.0);
      const initialValue = new Decimal(userSharesNum).mul(initialTokensPerShare).mul(tokenPrice);
      const currentValue = actualTokens.mul(tokenPrice);
      const interestEarned = Math.max(0, currentValue.sub(initialValue).toNumber());
      
      console.log('💰 User has', userSharesNum, 'shares =', actualTokens.toNumber(), 'PYUSD (', totalSuppliedUSD, 'USD)');
      
      // 7. Get reserves details and calculate weighted lending APY
      const reservesOverview = await this.kaminoManager.getVaultReservesDetails(vaultState, currentSlot);
      
      let weightedLendingAPY = new Decimal(0);
      let totalSupplied = new Decimal(0);
      
      reservesOverview.forEach((reserveDetail: any) => {
        const supplied = reserveDetail.suppliedAmount;
        totalSupplied = totalSupplied.add(supplied);
        weightedLendingAPY = weightedLendingAPY.add(reserveDetail.supplyAPY.mul(supplied));
      });
      
      const lendingAPY = totalSupplied.gt(0) ? weightedLendingAPY.div(totalSupplied).toNumber() : 0;
      console.log('📊 Lending APY:', lendingAPY);
      
      // 8. Get farm rewards (vault + reserves)
      const [vaultFarmRewards, ...reserveIncentivesArray] = await Promise.all([
        this.kaminoManager.getVaultFarmRewardsAPY(vault, tokenPrice, this.farmsClient, currentSlot),
        ...Array.from(reservesOverview.keys()).map(reservePubkey =>
          this.kaminoManager.getReserveFarmRewardsAPY(
            reservePubkey,
            tokenPrice,
            this.farmsClient,
            currentSlot
          )
        )
      ]);
      
      // 9. Calculate total incentives APY
      const allRewardsStats: any[] = [...vaultFarmRewards.incentivesStats];
      let totalReserveFarmAPY = 0;
      
      let reserveIndex = 0;
      for (const [, reserveDetail] of reservesOverview.entries()) {
        const reserveIncentives = reserveIncentivesArray[reserveIndex++];
        if (reserveIncentives) {
          const reserveAllocation = (reserveDetail as any).suppliedAmount.div(totalSupplied);
          const weightedReserveFarmAPY = reserveIncentives.collateralFarmIncentives.totalIncentivesApy * reserveAllocation.toNumber();
          totalReserveFarmAPY += weightedReserveFarmAPY;
          
            reserveIncentives.collateralFarmIncentives.incentivesStats.forEach((stat: any) => {
              allRewardsStats.push({
                ...stat,
                incentivesApy: stat.incentivesApy * reserveAllocation.toNumber()
              });
            });
          }
        }      const totalIncentivesAPY = vaultFarmRewards.totalIncentivesApy + totalReserveFarmAPY;
      const totalAPY = lendingAPY + totalIncentivesAPY;
      
      console.log('🎁 Incentives APY:', totalIncentivesAPY, 'Total APY:', totalAPY);
      
      // 10. Calculate daily interest
      const dailyInterestRate = totalAPY / 365;
      const dailyInterestUSD = totalSuppliedUSD * dailyInterestRate;
      
      // 11. Get pending rewards
      const pendingRewardsMap = await this.fetchPendingRewards(userAddr, vault, vaultState, reservesOverview);
      
      // 12. Parse rewards info
      const rewards: RewardInfo[] = allRewardsStats
        .filter(r => r.incentivesApy > 0)
        .map(incentive => {
          const rewardMint = incentive.rewardMint.toString();
          let tokenName = "TOKEN";
          
          if (rewardMint === "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS") {
            tokenName = "KMNO";
          } else if (rewardMint === "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo") {
            tokenName = "PYUSD";
          } else {
            tokenName = rewardMint.slice(0, 5);
          }
          
          return {
            tokenName,
            tokenMint: rewardMint,
            weeklyAmount: incentive.weeklyRewards.toNumber(),
            apy: incentive.incentivesApy,
            pendingBalance: pendingRewardsMap.get(rewardMint) || 0,
          };
        });
      
      // 13. Get vault holdings for TVL
      const holdings: any = await this.kaminoManager.getVaultHoldingsWithPrice(vaultState, tokenPrice);
      
      // 14. Build position object
      const position: UserPosition = {
        id: `mars-vault-${PYUSD_VAULT_ADDRESS}-${userAddr}`,
        userAddress: userAddr,
        vaultAddress: PYUSD_VAULT_ADDRESS,
        protocol: 'mars-vault',
        strategyAddress: PYUSD_VAULT_ADDRESS,
        strategyName: 'PYUSD Vault',
        
        baseToken: 'PYUSD',
        baseTokenMint: vaultState.tokenMint.toString(),
        
        totalShares: userSharesNum.toString(),
        totalSupplied: actualTokens.toString(),
        totalSuppliedUSD: totalSuppliedUSD.toString(),
        currentValue: currentValue.toString(),
        
        interestEarned: interestEarned.toString(),
        dailyInterestUSD: dailyInterestUSD.toString(),
        unrealizedPnl: interestEarned.toString(),
        
        lendingAPY,
        incentivesAPY: totalIncentivesAPY,
        totalAPY,
        
        tvl: holdings.totalUSDIncludingFees?.toString() || '0',
        liquidityDepth: holdings.available?.toString() || '0',
        
        rewards,
        pendingRewards: Object.fromEntries(
          Array.from(pendingRewardsMap.entries()).map(([k, v]) => [k, v.toString()])
        ),
        totalRewardsClaimed: {},
        
        riskLevel: 'low',
        status: 'active',
        
        firstDepositTime: new Date(),
        lastActivityTime: new Date(),
        lastFetchTime: new Date(),
      };
      
      console.log('✅ Kamino Vault position created:', {
        totalSupplied: actualTokens.toNumber(),
        totalSuppliedUSD,
        interestEarned,
        dailyInterestUSD,
        totalAPY,
        rewards: rewards.length
      });

      positions.push(position);
      
    } catch (error) {
      console.error('❌ Error fetching Kamino Vault positions:', error);
    }

    return positions;
  }

  /**
   * Fetch pending rewards for user
   * Migrated from frontend useUserVaultPosition.ts
   */
  private async fetchPendingRewards(
    userAddr: Address,
    vault: KaminoVault,
    vaultState: any,
    reservesOverview: Map<any, any>
  ): Promise<Map<string, number>> {
    const pendingRewardsMap = new Map<string, number>();
    
    try {
      console.log('💰 Fetching pending rewards...');
      
      const currentTimestamp = new Decimal(Date.now() / 1000);
      const userPubkey = new PublicKey(userAddr);
      
      // Check Vault Farm
      if (vaultState.vaultFarm && vaultState.vaultFarm.toString() !== '11111111111111111111111111111111') {
        try {
          const userFarmStateAddress = await getUserStatePDA(
            this.farmsClient.getProgramID(),
            vaultState.vaultFarm,
            userAddr
          );
          
          const farmUserState = await UserState.fetch(this.rpc, userFarmStateAddress, this.farmsClient.getProgramID());
          
          if (farmUserState) {
            const farmState = await FarmState.fetch(this.rpc, farmUserState.farmState);
            
            if (farmState) {
              for (let i = 0; i < farmState.rewardInfos.length; i++) {
                const pendingReward = calculatePendingRewards(farmState, farmUserState, i, currentTimestamp, null);
                
                if (pendingReward && pendingReward.gt(0)) {
                  const rewardInfo = farmState.rewardInfos[i];
                  if (!rewardInfo) continue;
                  
                  const decimals = rewardInfo.token.decimals.toString();
                  const amount = lamportsToDecimal(pendingReward, new Decimal(decimals));
                  const mint = rewardInfo.token.mint.toString();
                  const existing = pendingRewardsMap.get(mint) || 0;
                  pendingRewardsMap.set(mint, existing + amount.toNumber());
                }
              }
            }
          }
        } catch (err: any) {
          console.warn('⚠️  Failed to fetch Vault Farm pending rewards:', err.message);
        }
      }
      
      // Check Reserve Farms
      const reserves = this.kaminoManager.getVaultAllocations(vaultState);
      for (const [reserveAddress] of reserves) {
        try {
          const reserveState = await Reserve.fetch(this.rpc, reserveAddress);
          if (!reserveState || reserveState.farmCollateral === DEFAULT_PUBLIC_KEY) continue;
          
          const delegateePDA = await this.kaminoManager.computeUserFarmStateForUserInVault(
            this.farmsClient.getProgramID(),
            vault.address,
            reserveAddress,
            userAddr
          );
          
          const userFarmStateAddress = await getUserStatePDA(
            this.farmsClient.getProgramID(),
            reserveState.farmCollateral,
            delegateePDA[0]
          );
          
          const farmUserState = await UserState.fetch(this.rpc, userFarmStateAddress, this.farmsClient.getProgramID());
          
          if (farmUserState) {
            const farmState = await FarmState.fetch(this.rpc, farmUserState.farmState);
            
            if (farmState) {
              for (let i = 0; i < farmState.rewardInfos.length; i++) {
                const pendingReward = calculatePendingRewards(farmState, farmUserState, i, currentTimestamp, null);
                
                if (pendingReward && pendingReward.gt(0)) {
                  const rewardInfo = farmState.rewardInfos[i];
                  if (!rewardInfo) continue;
                  
                  const decimals = rewardInfo.token.decimals.toString();
                  const amount = lamportsToDecimal(pendingReward, new Decimal(decimals));
                  const mint = rewardInfo.token.mint.toString();
                  const existing = pendingRewardsMap.get(mint) || 0;
                  pendingRewardsMap.set(mint, existing + amount.toNumber());
                }
              }
            }
          }
        } catch (err: any) {
          console.warn(`⚠️  Failed to fetch Reserve pending rewards:`, err.message);
        }
      }
      
      console.log('✅ Pending rewards fetched:', Object.fromEntries(pendingRewardsMap));
      
    } catch (error) {
      console.error('❌ Error fetching pending rewards:', error);
    }
    
    return pendingRewardsMap;
  }

  /**
   * Fetch Kamino Lend positions (Lending/Borrowing)
   * Currently disabled - focusing on Kamino Vault only
   */
  private async fetchKaminoLendPositions(userAddr: Address): Promise<UserPosition[]> {
    // TODO: Implement Kamino Lend positions if needed
    // For now, we're only focusing on PYUSD Vault
    console.log('⏭️  Skipping Kamino Lend positions (not implemented)');
    return [];
  }

  /**
   * Assess risk level based on utilization ratio
   */
  private assessRiskLevel(utilizationRatio: number): 'low' | 'medium' | 'high' {
    if (utilizationRatio < 0.5) return 'low';
    if (utilizationRatio < 0.8) return 'medium';
    return 'high';
  }

  /**
   * Batch update positions for multiple users
   */
  async batchUpdatePositions(userAddresses: string[]): Promise<Map<string, UserPosition[]>> {
    const results = new Map<string, UserPosition[]>();
    
    // Process in batches to avoid rate limiting
    const BATCH_SIZE = 10;
    for (let i = 0; i < userAddresses.length; i += BATCH_SIZE) {
      const batch = userAddresses.slice(i, i + BATCH_SIZE);
      
      const batchPromises = batch.map(async (address) => {
        try {
          const positions = await this.fetchUserPositions(address);
          results.set(address, positions);
          console.log(`✅ Updated ${positions.length} positions for ${address}`);
        } catch (error) {
          console.error(`❌ Failed to update positions for ${address}:`, error);
          results.set(address, []);
        }
      });
      
      await Promise.allSettled(batchPromises);
      
      // Add delay between batches
      if (i + BATCH_SIZE < userAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// Singleton instance
let collectorInstance: UserPositionsCollector | null = null;

export async function getUserPositionsCollector(rpcEndpoint?: string): Promise<UserPositionsCollector> {
  if (!collectorInstance) {
    collectorInstance = new UserPositionsCollector(rpcEndpoint);
    await collectorInstance.initialize();
  }
  return collectorInstance;
}

