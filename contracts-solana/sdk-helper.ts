import Decimal from 'decimal.js/decimal';
import { getMedianSlotDurationInMsFromLastEpochs, KaminoManager, KaminoVault } from '@kamino-finance/klend-sdk';
import { createDefaultRpcTransport, createRpc, createSolanaRpcApi } from '@solana/kit';
import { Keypair, PublicKey } from '@solana/web3.js';
import * as fs from 'fs';
import { HELIUS_RPC } from './constants';

/**
 * Kamino Vault 相关账户信息
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
 * Kamino Farm 相关账户信息
 */
export interface FarmAccounts {
  farmsProgram: PublicKey;
  farmState: PublicKey;
  userFarm: PublicKey;
  delegatedStake: PublicKey;
  scopePrices?: PublicKey;
}

/**
 * 存款指令的详细信息
 */
export interface DepositInstructionInfo {
  vaultAccounts: VaultAccounts;
  remainingAccounts: Array<{
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }>;
}

/**
 * Farm 质押指令的详细信息
 */
export interface StakeInstructionInfo {
  farmAccounts: FarmAccounts;
}

/**
 * Farm 取消质押指令的详细信息
 */
export interface UnstakeInstructionInfo {
  farmAccounts: FarmAccounts;
}

/**
 * 完整的存款并质押指令信息
 */
export interface DepositAndStakeInfo {
  deposit: DepositInstructionInfo;
  stake: StakeInstructionInfo;
}

/**
 * Kamino SDK 辅助类
 */
export class KaminoSDKHelper {
  private rpc: any;
  private manager: KaminoManager;
  private wallet: Keypair;

  constructor(walletPath: string) {
    // 加载钱包
    const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
    this.wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));

    // 初始化 RPC
    const transport = createDefaultRpcTransport({ url: HELIUS_RPC });
    this.rpc = createRpc({ api: createSolanaRpcApi(), transport });
  }

  /**
   * 初始化 Kamino Manager（异步）
   */
  async initialize() {
    const slotDuration = await getMedianSlotDurationInMsFromLastEpochs();
    this.manager = new KaminoManager(this.rpc, slotDuration);
  }

  /**
   * 获取存款指令的所有账户信息
   */
  async getDepositInstructionInfo(
    vaultAddress: string,
    depositAmount: Decimal
  ): Promise<DepositInstructionInfo> {
    const user = {
      address: this.wallet.publicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress as any);
    const vaultState = await vault.getState(this.rpc);

    // 获取存款指令
    const depositIxs = await this.manager.depositToVaultIxs(user, vault, depositAmount);

    if (depositIxs.depositIxs.length === 0) {
      throw new Error('没有找到存款指令');
    }

    // 通常最后一个是主要的存款指令
    const mainDepositIx = depositIxs.depositIxs[depositIxs.depositIxs.length - 1];

    if (!mainDepositIx.accounts) {
      throw new Error('存款指令没有账户信息');
    }

    // 解析账户信息
    const accounts = mainDepositIx.accounts;
    
    // 主要账户（前13个是固定的）
    const vaultAccounts: VaultAccounts = {
      vaultState: new PublicKey(accounts[1].address),
      tokenVault: new PublicKey(accounts[2].address),
      tokenMint: new PublicKey(accounts[3].address),
      baseAuthority: new PublicKey(accounts[4].address),
      sharesMint: new PublicKey(accounts[5].address),
      userSharesAta: new PublicKey(accounts[7].address),
    };

    // Remaining accounts（从第13个开始）
    const remainingAccounts = accounts.slice(13).map(acc => ({
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
    vaultAddress: string,
    depositAmount: Decimal
  ): Promise<StakeInstructionInfo> {
    const user = {
      address: this.wallet.publicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress as any);
    
    // 获取存款指令（包含 stake 指令）
    const depositIxs = await this.manager.depositToVaultIxs(user, vault, depositAmount);

    if (depositIxs.stakeInFarmIfNeededIxs.length === 0) {
      throw new Error('没有找到质押指令');
    }

    // 通常最后一个是主要的质押指令
    const mainStakeIx = depositIxs.stakeInFarmIfNeededIxs[depositIxs.stakeInFarmIfNeededIxs.length - 1];

    if (!mainStakeIx.accounts) {
      throw new Error('质押指令没有账户信息');
    }

    const accounts = mainStakeIx.accounts;

    const farmAccounts: FarmAccounts = {
      farmsProgram: new PublicKey(mainStakeIx.programAddress),
      farmState: new PublicKey(accounts[1].address),
      userFarm: new PublicKey(accounts[2].address),
      delegatedStake: new PublicKey(accounts[3].address),
    };

    return {
      farmAccounts,
    };
  }

  /**
   * 获取取消质押的指令信息
   */
  async getUnstakeInstructionInfo(
    vaultAddress: string,
    sharesToWithdraw: Decimal
  ): Promise<UnstakeInstructionInfo> {
    const user = {
      address: this.wallet.publicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress as any);
    const vaultState = await vault.getState(this.rpc);
    
    // 获取取款指令（包含 unstake 指令）
    // withdrawFromVaultIxs(user, vault, amount, currentSlot, minAmountOutLamports?, withdrawStack?)
    const currentSlot = await this.rpc.getSlot().send();
    const withdrawIxs = await this.manager.withdrawFromVaultIxs(user, vault, sharesToWithdraw, currentSlot as bigint);

    if (withdrawIxs.unstakeFromFarmIfNeededIxs.length === 0) {
      throw new Error('没有找到取消质押指令');
    }

    // 找到 StartUnstake 指令（24字节数据）和 WithdrawUnstakedDeposits 指令（8字节数据）
    let startUnstakeIx = null;
    let withdrawUnstakedIx = null;

    for (const ix of withdrawIxs.unstakeFromFarmIfNeededIxs) {
      if (ix.data && ix.data.length === 24) {
        startUnstakeIx = ix; // StartUnstake
      } else if (ix.data && ix.data.length === 8) {
        withdrawUnstakedIx = ix; // WithdrawUnstakedDeposits
      }
    }

    if (!withdrawUnstakedIx || !withdrawUnstakedIx.accounts) {
      throw new Error('没有找到 WithdrawUnstakedDeposits 指令');
    }

    const accounts = withdrawUnstakedIx.accounts;

    const farmAccounts: FarmAccounts = {
      farmsProgram: new PublicKey(withdrawUnstakedIx.programAddress),
      farmState: new PublicKey(accounts[1].address),
      userFarm: new PublicKey(accounts[2].address),
      delegatedStake: new PublicKey(accounts[4].address),
      scopePrices: new PublicKey(accounts[5].address),
    };

    return {
      farmAccounts,
    };
  }

  /**
   * 获取完整的存款并质押信息（一次性获取所有账户）
   */
  async getDepositAndStakeInfo(
    vaultAddress: string,
    depositAmount: Decimal
  ): Promise<DepositAndStakeInfo> {
    const [depositInfo, stakeInfo] = await Promise.all([
      this.getDepositInstructionInfo(vaultAddress, depositAmount),
      this.getStakeInstructionInfo(vaultAddress, depositAmount),
    ]);

    return {
      deposit: depositInfo,
      stake: stakeInfo,
    };
  }

  /**
   * 获取取款指令的账户信息
   */
  async getWithdrawInstructionInfo(
    vaultAddress: string,
    sharesToWithdraw: Decimal
  ): Promise<DepositInstructionInfo> {
    const user = {
      address: this.wallet.publicKey.toBase58() as any,
      signAndSendTransactions: async () => [] as any,
    };

    const vault = new KaminoVault(vaultAddress as any);
    
    // 获取取款指令
    const currentSlot = await this.rpc.getSlot().send();
    const withdrawIxs = await this.manager.withdrawFromVaultIxs(user, vault, sharesToWithdraw, currentSlot as bigint);

    if (withdrawIxs.withdrawIxs.length === 0) {
      throw new Error('没有找到取款指令');
    }

    // 通常最后一个是主要的取款指令
    const mainWithdrawIx = withdrawIxs.withdrawIxs[withdrawIxs.withdrawIxs.length - 1];

    if (!mainWithdrawIx.accounts) {
      throw new Error('取款指令没有账户信息');
    }

    const accounts = mainWithdrawIx.accounts;
    
    // 主要账户
    const vaultAccounts: VaultAccounts = {
      vaultState: new PublicKey(accounts[1].address),
      tokenVault: new PublicKey(accounts[2].address),
      tokenMint: new PublicKey(accounts[5].address),
      baseAuthority: new PublicKey(accounts[3].address),
      sharesMint: new PublicKey(accounts[7].address),
      userSharesAta: new PublicKey(accounts[6].address),
    };

    // Remaining accounts
    const remainingAccounts = accounts.slice(12).map(acc => ({
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
   * 打印账户信息（用于调试）
   */
  static printAccountsInfo(info: DepositAndStakeInfo) {
    console.log("\n📋 Vault 账户 (来自 SDK):");
    console.log("  Vault State:", info.deposit.vaultAccounts.vaultState.toBase58());
    console.log("  Token Vault:", info.deposit.vaultAccounts.tokenVault.toBase58());
    console.log("  Token Mint:", info.deposit.vaultAccounts.tokenMint.toBase58());
    console.log("  Base Authority:", info.deposit.vaultAccounts.baseAuthority.toBase58());
    console.log("  Shares Mint:", info.deposit.vaultAccounts.sharesMint.toBase58());
    console.log("  User Shares ATA:", info.deposit.vaultAccounts.userSharesAta.toBase58());

    console.log("\n📋 Farm 账户 (来自 SDK):");
    console.log("  Farms Program:", info.stake.farmAccounts.farmsProgram.toBase58());
    console.log("  Farm State:", info.stake.farmAccounts.farmState.toBase58());
    console.log("  User Farm:", info.stake.farmAccounts.userFarm.toBase58());
    console.log("  Delegated Stake:", info.stake.farmAccounts.delegatedStake.toBase58());

    console.log("\n📋 Remaining Accounts (reserves + lending markets):");
    info.deposit.remainingAccounts.forEach((acc, i) => {
      const role = acc.isWritable ? 'writable' : 'readonly';
      console.log(`   ${i}: ${acc.pubkey.toBase58()} [${role}]`);
    });
  }
}
