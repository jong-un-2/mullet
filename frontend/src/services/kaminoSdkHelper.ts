/**
 * Kamino SDK Helper - 前端版本
 * 提供完整的 Vault 和 Farm 账户动态获取功能
 */

import Decimal from 'decimal.js';
import { 
  getMedianSlotDurationInMsFromLastEpochs, 
  KaminoManager, 
  KaminoVault 
} from '@kamino-finance/klend-sdk';
import { 
  createDefaultRpcTransport, 
  createRpc, 
  createSolanaRpcApi 
} from '@solana/kit';
import { PublicKey, AccountMeta } from '@solana/web3.js';

/**
 * Vault 账户接口
 */
export interface VaultAccounts {
  vaultState: PublicKey;
  tokenVault: PublicKey;
  tokenMint: PublicKey;
  baseAuthority: PublicKey;
  sharesMint: PublicKey;
  userSharesAta: PublicKey;
}

/**
 * Farm 账户接口
 */
export interface FarmAccounts {
  farmsProgram: PublicKey;
  farmState: PublicKey;
  userFarm: PublicKey;
  delegatedStake: PublicKey;
  scopePrices?: PublicKey;
}

/**
 * 存款和质押指令信息
 */
export interface DepositAndStakeInfo {
  deposit: {
    vaultAccounts: VaultAccounts;
    remainingAccounts: AccountMeta[];
  };
  stake: {
    farmAccounts: FarmAccounts;
  };
}

/**
 * Kamino SDK Helper 类 - 前端版本
 */
export class KaminoSDKHelper {
  private rpc: any;
  private manager: KaminoManager | null = null;
  private initialized = false;
  private userPublicKey: PublicKey;

  constructor(rpcUrl: string, userPublicKey: PublicKey) {
    this.userPublicKey = userPublicKey;
    
    // 使用 @solana/kit 的 RPC（和后端版本一样）
    const transport = createDefaultRpcTransport({ url: rpcUrl });
    this.rpc = createRpc({ api: createSolanaRpcApi(), transport });
  }

  /**
   * 初始化 Kamino Manager（异步）
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    console.log('⏳ 初始化 Kamino SDK Manager...');
    const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
    this.manager = new KaminoManager(this.rpc, slotDuration);
    this.initialized = true;
    console.log('✅ Kamino SDK Manager 初始化完成');
  }

  /**
   * 确保已初始化
   */
  private ensureInitialized() {
    if (!this.initialized || !this.manager) {
      throw new Error('KaminoSDKHelper not initialized. Call initialize() first.');
    }
  }

  /**
   * 获取存款指令的所有账户信息
   */
  async getDepositInstructionInfo(
    vaultAddress: PublicKey,
    depositAmount: Decimal
  ): Promise<{ vaultAccounts: VaultAccounts; remainingAccounts: AccountMeta[] }> {
    this.ensureInitialized();

    const user = {
      address: this.userPublicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress.toBase58() as any);
    
    // 获取存款指令
    const depositIxs = await this.manager!.depositToVaultIxs(user, vault, depositAmount);

    if (depositIxs.depositIxs.length === 0) {
      throw new Error('没有找到存款指令');
    }

    // 通常最后一个是主要的存款指令
    const mainDepositIx = depositIxs.depositIxs[depositIxs.depositIxs.length - 1];

    if (!mainDepositIx || !mainDepositIx.accounts) {
      throw new Error('存款指令没有账户信息');
    }

    const accounts = mainDepositIx.accounts;
    
    if (accounts.length < 14) {
      throw new Error(`存款指令账户数量不足，需要至少14个账户，实际只有 ${accounts.length} 个`);
    }
    
    // 主要账户（前13个是固定的）
    const vaultAccounts: VaultAccounts = {
      vaultState: new PublicKey(accounts[1]!.address),
      tokenVault: new PublicKey(accounts[2]!.address),
      tokenMint: new PublicKey(accounts[3]!.address),
      baseAuthority: new PublicKey(accounts[4]!.address),
      sharesMint: new PublicKey(accounts[5]!.address),
      userSharesAta: new PublicKey(accounts[7]!.address),
    };

    // Remaining accounts（从第13个开始）
    const remainingAccounts: AccountMeta[] = accounts.slice(13).map(acc => ({
      pubkey: new PublicKey(acc.address),
      isSigner: false,
      isWritable: acc.role === 1 || acc.role === 3, // 1=writable, 3=signer+writable
    }));

    return {
      vaultAccounts,
      remainingAccounts,
    };
  }

  /**
   * 获取质押到 Farm 的指令信息
   */
  async getStakeInstructionInfo(
    vaultAddress: PublicKey,
    depositAmount: Decimal
  ): Promise<{ farmAccounts: FarmAccounts; setupInstructions: any[]; allDepositIxs: any }> {
    this.ensureInitialized();

    const user = {
      address: this.userPublicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress.toBase58() as any);
    
    // 获取存款指令（包含 stake 指令）
    const depositIxs = await this.manager!.depositToVaultIxs(user, vault, depositAmount);

    // 🔍 调试：打印所有指令类型
    console.log('📋 Kamino SDK 返回的指令结构：');
    console.log(`  - depositIxs: ${depositIxs.depositIxs.length} 个`);
    console.log(`  - stakeInFarmIfNeededIxs: ${depositIxs.stakeInFarmIfNeededIxs.length} 个`);
    
    if (depositIxs.stakeInFarmIfNeededIxs.length === 0) {
      throw new Error('没有找到质押指令');
    }

    // 🔥 获取所有质押相关指令
    // 如果有多个指令，第一个可能是 userFarm 初始化，最后一个是实际的 stake
    const allStakeIxs = depositIxs.stakeInFarmIfNeededIxs;
    
    // 分离 setup 指令和主要 stake 指令
    const setupInstructions = allStakeIxs.length > 1 ? allStakeIxs.slice(0, -1) : [];
    
    console.log(`📋 Setup 指令（userFarm 初始化等）: ${setupInstructions.length} 个`);
    console.log(`📋 Stake 主指令: 1 个`);
    
    // 通常最后一个是主要的质押指令
    const mainStakeIx = allStakeIxs[allStakeIxs.length - 1];

    if (!mainStakeIx || !mainStakeIx.accounts) {
      throw new Error('质押指令没有账户信息');
    }

    const accounts = mainStakeIx.accounts;

    if (accounts.length < 4) {
      throw new Error(`质押指令账户数量不足，需要至少4个账户，实际只有 ${accounts.length} 个`);
    }

    const farmAccounts: FarmAccounts = {
      farmsProgram: new PublicKey(mainStakeIx.programAddress),
      farmState: new PublicKey(accounts[1]!.address),
      userFarm: new PublicKey(accounts[2]!.address),
      delegatedStake: new PublicKey(accounts[3]!.address),
    };

    return { 
      farmAccounts, 
      setupInstructions,
      allDepositIxs: depositIxs  // 返回完整的指令对象供调试
    };
  }

  /**
   * 获取完整的存款并质押信息（一次性获取所有账户）
   */
  async getDepositAndStakeInfo(
    vaultAddress: PublicKey,
    depositAmount: number
  ): Promise<DepositAndStakeInfo & { setupInstructions: any[]; allDepositIxs: any }> {
    this.ensureInitialized();

    const amountDecimal = new Decimal(depositAmount);

    console.log('📡 从 Kamino SDK 获取存款账户...');
    const [depositInfo, stakeInfo] = await Promise.all([
      this.getDepositInstructionInfo(vaultAddress, amountDecimal),
      this.getStakeInstructionInfo(vaultAddress, amountDecimal),
    ]);

    // 统计实际账户数量
    const vaultAccountsCount = Object.keys(depositInfo.vaultAccounts).length;
    const farmAccountsCount = Object.keys(stakeInfo.farmAccounts).filter(key => stakeInfo.farmAccounts[key as keyof FarmAccounts] !== undefined).length;

    console.log('✅ 成功获取所有账户信息');
    console.log(`  - Vault accounts: ${vaultAccountsCount} 个`);
    console.log(`  - Farm accounts: ${farmAccountsCount} 个`);
    console.log(`  - Setup instructions: ${stakeInfo.setupInstructions.length} 个`);
    console.log(`  - Remaining accounts: ${depositInfo.remainingAccounts.length} 个`);

    return {
      deposit: depositInfo,
      stake: {
        farmAccounts: stakeInfo.farmAccounts,
      },
      setupInstructions: stakeInfo.setupInstructions,
      allDepositIxs: stakeInfo.allDepositIxs,
    };
  }

  /**
   * 获取取消质押的指令信息
   */
  async getUnstakeInstructionInfo(
    vaultAddress: PublicKey,
    sharesToWithdraw: Decimal
  ): Promise<FarmAccounts> {
    this.ensureInitialized();

    const user = {
      address: this.userPublicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress.toBase58() as any);
    
    // 获取取款指令（包含 unstake 指令）
    const currentSlot = await this.rpc.getSlot().send();
    const withdrawIxs = await this.manager!.withdrawFromVaultIxs(user, vault, sharesToWithdraw, currentSlot as bigint);

    if (withdrawIxs.unstakeFromFarmIfNeededIxs.length === 0) {
      throw new Error('没有找到取消质押指令');
    }

    // 找到 WithdrawUnstakedDeposits 指令（8字节数据）
    let withdrawUnstakedIx = null;

    for (const ix of withdrawIxs.unstakeFromFarmIfNeededIxs) {
      if (ix.data && ix.data.length === 8) {
        withdrawUnstakedIx = ix; // WithdrawUnstakedDeposits
        break;
      }
    }

    if (!withdrawUnstakedIx || !withdrawUnstakedIx.accounts) {
      throw new Error('没有找到 WithdrawUnstakedDeposits 指令');
    }

    const accounts = withdrawUnstakedIx.accounts;

    if (accounts.length < 6) {
      throw new Error(`取消质押指令账户数量不足，需要至少6个账户，实际只有 ${accounts.length} 个`);
    }

    const farmAccounts: FarmAccounts = {
      farmsProgram: new PublicKey(withdrawUnstakedIx.programAddress),
      farmState: new PublicKey(accounts[1]!.address),
      userFarm: new PublicKey(accounts[2]!.address),
      delegatedStake: new PublicKey(accounts[4]!.address),
      scopePrices: new PublicKey(accounts[5]!.address),
    };

    return farmAccounts;
  }

  /**
   * 获取取款指令的账户信息
   */
  async getWithdrawInstructionInfo(
    vaultAddress: PublicKey,
    sharesToWithdraw: Decimal
  ): Promise<{ vaultAccounts: VaultAccounts; remainingAccounts: AccountMeta[] }> {
    this.ensureInitialized();

    const user = {
      address: this.userPublicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress.toBase58() as any);
    
    // 获取取款指令
    const currentSlot = await this.rpc.getSlot().send();
    const withdrawIxs = await this.manager!.withdrawFromVaultIxs(user, vault, sharesToWithdraw, currentSlot as bigint);

    if (withdrawIxs.withdrawIxs.length === 0) {
      throw new Error('没有找到取款指令');
    }

    // 通常最后一个是主要的取款指令
    const mainWithdrawIx = withdrawIxs.withdrawIxs[withdrawIxs.withdrawIxs.length - 1];

    if (!mainWithdrawIx || !mainWithdrawIx.accounts) {
      throw new Error('取款指令没有账户信息');
    }

    const accounts = mainWithdrawIx.accounts;
    
    if (accounts.length < 14) {
      throw new Error(`取款指令账户数量不足，需要至少14个账户，实际只有 ${accounts.length} 个`);
    }
    
    // 主要账户
    const vaultAccounts: VaultAccounts = {
      vaultState: new PublicKey(accounts[1]!.address),
      tokenVault: new PublicKey(accounts[2]!.address),
      tokenMint: new PublicKey(accounts[5]!.address),
      baseAuthority: new PublicKey(accounts[3]!.address),
      sharesMint: new PublicKey(accounts[7]!.address),
      userSharesAta: new PublicKey(accounts[6]!.address),
    };

    // Remaining accounts (从第13个账户开始)
    const remainingAccounts: AccountMeta[] = accounts.slice(13).map(acc => ({
      pubkey: new PublicKey(acc.address),
      isSigner: false,
      isWritable: acc.role === 1 || acc.role === 3,
    }));

    return {
      vaultAccounts,
      remainingAccounts,
    };
  }

  /**
   * 获取完整的取款信息（包含 unstake 和 withdraw）
   */
  async getWithdrawAndUnstakeInfo(
    vaultAddress: PublicKey,
    sharesToWithdraw: number
  ): Promise<DepositAndStakeInfo> {
    this.ensureInitialized();

    const amountDecimal = new Decimal(sharesToWithdraw);

    console.log('📡 从 Kamino SDK 获取取款账户...');
    const [withdrawInfo, farmAccounts] = await Promise.all([
      this.getWithdrawInstructionInfo(vaultAddress, amountDecimal),
      this.getUnstakeInstructionInfo(vaultAddress, amountDecimal),
    ]);

    // 统计实际账户数量
    const vaultAccountsCount = Object.keys(withdrawInfo.vaultAccounts).length;
    const farmAccountsCount = Object.keys(farmAccounts).filter(key => farmAccounts[key as keyof FarmAccounts] !== undefined).length;

    console.log('✅ 成功获取所有取款账户信息');
    console.log(`  - Vault accounts: ${vaultAccountsCount} 个`);
    console.log(`  - Farm accounts: ${farmAccountsCount} 个`);
    console.log(`  - Remaining accounts: ${withdrawInfo.remainingAccounts.length} 个`);

    return {
      deposit: withdrawInfo,
      stake: {
        farmAccounts,
      },
    };
  }

  /**
   * 获取 Claim Rewards 指令
   * 从 Kamino Farm 领取所有 pending rewards（包括 Vault Farm 和 Reserve Farms）
   * 
   * ⚠️ 重要修复（2025-10-16）：
   * - Vault Farm: isDelegated = false（直接查询用户的 UserState）
   * - Reserve Farm: isDelegated = true + 提供 delegatees（避免 getProgramAccounts）
   * - 避免触发 getProgramAccounts 导致 RPC 限制
   */
  async getClaimRewardsInstructions(vaultAddress: PublicKey): Promise<any[] | null> {
    this.ensureInitialized();

    try {
      // 导入 Farms SDK
      const { Farms, getUserStatePDA } = await import('@kamino-finance/farms-sdk');
      const { UserState, Reserve, DEFAULT_PUBLIC_KEY } = await import('@kamino-finance/klend-sdk');
      const farmsClient = new Farms(this.rpc);

      // 获取 vault 状态
      const vault = new KaminoVault(vaultAddress.toBase58() as any);
      const vaultState = await vault.getState(this.rpc);

      const user = {
        address: this.userPublicKey.toBase58() as any,
        signAndSendTransactions: async () => [] as any,
      };

      const allClaimIxs: any[] = [];

      // 1. 处理 Vault Farm
      if (vaultState.vaultFarm && vaultState.vaultFarm.toString() !== '11111111111111111111111111111111') {
        console.log('🔍 检查 Vault Farm pending rewards...');
        console.log(`  - Farm: ${vaultState.vaultFarm.toString()}`);
        console.log(`  - Vault: ${vault.address.toString()}`);

        // ✅ 检查 UserState 是否存在
        const userStateAddress = await getUserStatePDA(
          farmsClient.getProgramID(),
          vaultState.vaultFarm,
          this.userPublicKey.toBase58() as any
        );

        const userState = await UserState.fetch(this.rpc, userStateAddress, farmsClient.getProgramID());
        if (userState) {
          console.log(`✅ Vault Farm UserState 存在: ${userStateAddress.toString()}`);

          // ✅ Vault Farm: isDelegated = false
          const vaultClaimIxs = await farmsClient.claimForUserForFarmAllRewardsIx(
            user,
            vaultState.vaultFarm,
            false  // isDelegated = false（Vault Farm 不使用委托）
          );

          if (vaultClaimIxs && vaultClaimIxs.length > 0) {
            console.log(`✅ 找到 ${vaultClaimIxs.length} 个 Vault Farm claim rewards 指令`);
            allClaimIxs.push(...vaultClaimIxs);
          }
        } else {
          console.log('ℹ️  Vault Farm 的 UserState 不存在，跳过');
        }
      }

      // 2. 处理 Reserve Farms
      const reserves = this.manager!.getVaultAllocations(vaultState);
      console.log(`🔍 检查 ${reserves.size} 个 Reserve Farms...`);

      for (const [reserveAddress] of reserves) {
        try {
          const reserveState = await Reserve.fetch(this.rpc, reserveAddress);
          
          if (!reserveState || reserveState.farmCollateral === DEFAULT_PUBLIC_KEY) {
            continue;
          }

          // 计算 delegatee PDA (vault 的 farm user state)
          const delegateePDA = await this.manager!.computeUserFarmStateForUserInVault(
            farmsClient.getProgramID(),
            vault.address,
            reserveAddress,
            this.userPublicKey.toBase58() as any
          );

          const userFarmStateAddress = await getUserStatePDA(
            farmsClient.getProgramID(),
            reserveState.farmCollateral,
            delegateePDA[0]
          );

          // 检查 UserState 是否存在
          const farmUserState = await UserState.fetch(this.rpc, userFarmStateAddress, farmsClient.getProgramID());
          
          if (!farmUserState) {
            console.log(`ℹ️  Reserve Farm ${reserveState.farmCollateral.toString().slice(0, 8)}... 的 UserState 不存在，跳过`);
            continue;
          }

          console.log(`✅ Reserve Farm ${reserveState.farmCollateral.toString().slice(0, 8)}... UserState 存在`);

          // ✅ Reserve Farm: isDelegated = true + 提供 delegatees
          const reserveClaimIxs = await farmsClient.claimForUserForFarmAllRewardsIx(
            user,
            reserveState.farmCollateral,
            true,  // isDelegated = true（Reserve Farm 使用委托）
            [delegateePDA[0]]  // 提供 delegatees，避免 getProgramAccounts
          );

          if (reserveClaimIxs && reserveClaimIxs.length > 0) {
            console.log(`✅ 找到 ${reserveClaimIxs.length} 个 Reserve Farm claim rewards 指令`);
            allClaimIxs.push(...reserveClaimIxs);
          }
        } catch (error: any) {
          console.warn(`⚠️  处理 Reserve Farm ${reserveAddress.toString().slice(0, 8)}... 失败:`, error.message);
        }
      }

      if (allClaimIxs.length === 0) {
        console.log('ℹ️  没有 pending rewards 可领取');
        return null;
      }

      console.log(`✅ 总共找到 ${allClaimIxs.length} 个 claim rewards 指令（Vault Farm + Reserve Farms）`);
      return allClaimIxs;
    } catch (error: any) {
      console.warn('⚠️  获取 claim rewards 指令失败:', error.message);
      return null;
    }
  }

  /**
   * 获取用户的 Pending Rewards 余额
   * 从 Vault Farm 和 Reserve Farms 计算所有待领取的奖励
   */
  async getUserPendingRewards(vaultAddress: PublicKey): Promise<Map<string, number>> {
    this.ensureInitialized();

    const pendingRewards = new Map<string, number>();

    try {
      // 动态导入所需模块
      const [{ Farms, FarmState, calculatePendingRewards, getUserStatePDA }, { UserState, Reserve, DEFAULT_PUBLIC_KEY, lamportsToDecimal }] = await Promise.all([
        import('@kamino-finance/farms-sdk'),
        import('@kamino-finance/klend-sdk'),
      ]);

      const farmsClient = new Farms(this.rpc);

      // 1. 获取 vault 状态
      const vault = new KaminoVault(vaultAddress.toBase58() as any);
      const vaultState = await vault.getState(this.rpc);

      const currentTimestamp = new Decimal(Date.now() / 1000);

      // 2. 检查 Vault Farm 的 pending rewards
      if (vaultState.vaultFarm && vaultState.vaultFarm.toString() !== '11111111111111111111111111111111') {
        try {
          // 获取 user farm state
          const userFarmStateAddress = await getUserStatePDA(
            farmsClient.getProgramID(),
            vaultState.vaultFarm,
            this.userPublicKey.toBase58() as any
          );

          const farmUserState = await UserState.fetch(this.rpc, userFarmStateAddress, farmsClient.getProgramID());
          
          if (farmUserState) {
            const farmState = await FarmState.fetch(this.rpc, farmUserState.farmState);
            
            if (farmState) {
              const rewardInfos = farmState.rewardInfos;
              
              for (let i = 0; i < rewardInfos.length; i++) {
                const pendingReward = calculatePendingRewards(
                  farmState,
                  farmUserState,
                  i,
                  currentTimestamp,
                  null
                );

                if (pendingReward && pendingReward.gt(0)) {
                  const decimals = rewardInfos[i].token.decimals.toString();
                  const amount = lamportsToDecimal(pendingReward, new Decimal(decimals));
                  const mint = rewardInfos[i].token.mint.toString();
                  
                  const existing = pendingRewards.get(mint) || 0;
                  pendingRewards.set(mint, existing + amount.toNumber());
                  
                  console.log(`💰 Vault Farm Pending Reward: ${amount.toString()} ${mint.slice(0, 8)}...`);
                }
              }
            }
          }
        } catch (error: any) {
          console.warn('⚠️  无法获取 Vault Farm pending rewards:', error.message);
        }
      }

      // 3. 检查每个 Reserve Farm 的 pending rewards
      const reserves = this.manager!.getVaultAllocations(vaultState);

      for (const [reserveAddress] of reserves) {
        try {
          const reserveState = await Reserve.fetch(this.rpc, reserveAddress);
          
          if (!reserveState || reserveState.farmCollateral === DEFAULT_PUBLIC_KEY) {
            continue;
          }

          // 计算 delegatee PDA (vault 的 farm user state)
          const delegateePDA = await this.manager!.computeUserFarmStateForUserInVault(
            farmsClient.getProgramID(),
            vault.address,
            reserveAddress,
            this.userPublicKey.toBase58() as any
          );

          const userFarmStateAddress = await getUserStatePDA(
            farmsClient.getProgramID(),
            reserveState.farmCollateral,
            delegateePDA[0]
          );

          const farmUserState = await UserState.fetch(this.rpc, userFarmStateAddress, farmsClient.getProgramID());

          if (farmUserState) {
            const farmState = await FarmState.fetch(this.rpc, farmUserState.farmState);
            
            if (farmState) {
              const rewardInfos = farmState.rewardInfos;
              
              for (let i = 0; i < rewardInfos.length; i++) {
                const pendingReward = calculatePendingRewards(
                  farmState,
                  farmUserState,
                  i,
                  currentTimestamp,
                  null
                );

                if (pendingReward && pendingReward.gt(0)) {
                  const decimals = rewardInfos[i].token.decimals.toString();
                  const amount = lamportsToDecimal(pendingReward, new Decimal(decimals));
                  const mint = rewardInfos[i].token.mint.toString();
                  
                  const existing = pendingRewards.get(mint) || 0;
                  pendingRewards.set(mint, existing + amount.toNumber());
                  
                  console.log(`💰 Reserve Farm Pending Reward: ${amount.toString()} ${mint.slice(0, 8)}...`);
                }
              }
            }
          }
        } catch (error: any) {
          console.warn(`⚠️  无法获取 Reserve ${reserveAddress.toString().slice(0, 8)}... pending rewards:`, error.message);
        }
      }

      if (pendingRewards.size > 0) {
        console.log('✅ 总 Pending Rewards:', Object.fromEntries(pendingRewards));
      } else {
        console.log('ℹ️  当前没有 pending rewards');
      }

    } catch (error: any) {
      console.error('❌ 获取 pending rewards 失败:', error);
    }

    return pendingRewards;
  }
}
