/**
 * Jupiter Lend Helper - 封装 Jupiter Lend Earn 的存款和取款功能
 * 
 * 功能:
 * - 存款到 Jupiter Lend Earn 池
 * - 从 Jupiter Lend Earn 池取款
 * - 查询用户存款余额
 * - 查询池子详情和 APY
 */

import {
  Connection,
  PublicKey,
  TransactionMessage,
  TransactionInstruction,
  VersionedTransaction,
  Keypair,
} from "@solana/web3.js";
import { 
  getDepositIx, 
  getWithdrawIx, 
  getLendingTokens, 
  getLendingTokenDetails, 
  getUserLendingPositionByAsset 
} from "@jup-ag/lend/earn";
import BN from "bn.js";

// Jupiter Lend Earn 程序 ID
export const JUPITER_LEND_PROGRAM_ID = new PublicKey("jup3YeL8QhtSx1e253b2FDvsMNC87fDrgQZivbrndc9");

// USDC Mint
export const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

// SOL Native
export const SOL_NATIVE = new PublicKey("So11111111111111111111111111111111111111112");

export interface DepositParams {
  amount: BN;
  asset: PublicKey;
  signer: PublicKey;
  connection: Connection;
  cluster?: "mainnet" | "devnet";
}

export interface WithdrawParams {
  amount: BN;
  asset: PublicKey;
  signer: PublicKey;
  connection: Connection;
  cluster?: "mainnet" | "devnet";
}

export interface LendingTokenDetails {
  id: number;
  address: PublicKey;
  asset: PublicKey;
  decimals: number;
  totalAssets: BN;
  totalSupply: BN;
  convertToShares: BN;
  convertToAssets: BN;
  rewardsRate: BN;
  supplyRate: BN;
}

export interface UserPosition {
  lendingTokenShares: BN;
  underlyingAssets: BN;    // 用户的实际资产价值（当前余额）
  underlyingBalance: BN;    // SDK 返回但不应使用
}

/**
 * Jupiter Lend Helper 类
 */
export class JupiterLendHelper {
  private connection: Connection;
  private cluster: "mainnet" | "devnet";

  constructor(connection: Connection, cluster: "mainnet" | "devnet" = "mainnet") {
    this.connection = connection;
    this.cluster = cluster;
  }

  /**
   * 获取所有 Jupiter Lend 支持的代币
   */
  async getAllLendingTokens(): Promise<PublicKey[]> {
    return getLendingTokens({ connection: this.connection });
  }

  /**
   * 获取特定代币的 Lending Token 详情
   */
  async getLendingTokenDetails(asset: PublicKey): Promise<LendingTokenDetails | null> {
    try {
      const tokens = await this.getAllLendingTokens();
      
      // 找到对应 asset 的 lending token
      for (const lendingToken of tokens) {
        const details = await getLendingTokenDetails({
          lendingToken,
          connection: this.connection,
        });

        if (details.asset.equals(asset)) {
          return details as LendingTokenDetails;
        }
      }

      return null;
    } catch (error) {
      console.error("获取 Lending Token 详情失败:", error);
      return null;
    }
  }

  /**
   * 计算存款的 APY (年化收益率)
   */
  calculateAPY(supplyRate: BN): number {
    // supplyRate 是 1e4 精度，1e4 = 100%
    return supplyRate.toNumber() / 100; // 转换为百分比
  }

  /**
   * 获取用户在 Jupiter Lend 的存款位置
   */
  async getUserPosition(asset: PublicKey, user: PublicKey): Promise<UserPosition | null> {
    try {
      const position = await getUserLendingPositionByAsset({
        asset,
        user,
        connection: this.connection,
      });

      return position as UserPosition;
    } catch (error) {
      // 用户可能没有该资产的仓位，返回 null
      throw error;
    }
  }

  /**
   * 创建存款指令
   */
  async createDepositInstruction(params: DepositParams): Promise<TransactionInstruction> {
    const { amount, asset, signer, connection } = params;

    const depositIx = await getDepositIx({
      amount,
      asset,
      signer,
      connection,
    });

    // 转换为 TransactionInstruction
    return new TransactionInstruction({
      programId: new PublicKey(depositIx.programId),
      keys: depositIx.keys.map((key) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(depositIx.data),
    });
  }

  /**
   * 创建取款指令
   */
  async createWithdrawInstruction(params: WithdrawParams): Promise<TransactionInstruction> {
    const { amount, asset, signer, connection } = params;

    const withdrawIx = await getWithdrawIx({
      amount,
      asset,
      signer,
      connection,
    });

    // 转换为 TransactionInstruction
    return new TransactionInstruction({
      programId: new PublicKey(withdrawIx.programId),
      keys: withdrawIx.keys.map((key) => ({
        pubkey: new PublicKey(key.pubkey),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
      data: Buffer.from(withdrawIx.data),
    });
  }

  /**
   * 执行存款交易
   */
  async deposit(
    amount: BN,
    asset: PublicKey,
    signer: Keypair
  ): Promise<string> {
    console.log("\n🔄 准备存款到 Jupiter Lend Earn...");
    console.log(`📊 存款金额: ${amount.toString()}`);
    console.log(`💰 资产: ${asset.toBase58()}`);

    // 创建存款指令
    const depositInstruction = await this.createDepositInstruction({
      amount,
      asset,
      signer: signer.publicKey,
      connection: this.connection,
    });

    // 获取最新区块哈希
    const latestBlockhash = await this.connection.getLatestBlockhash();

    // 构建交易
    const messageV0 = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [depositInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([signer]);

    // 发送交易
    console.log("\n📤 发送交易...");
    const signature = await this.connection.sendRawTransaction(transaction.serialize());

    console.log(`✅ 交易已发送: ${signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${signature}`);

    // 等待确认
    console.log("\n⏳ 等待交易确认...");
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, "confirmed");

    console.log("✅ 交易已确认!");

    return signature;
  }

  /**
   * 执行取款交易
   */
  async withdraw(
    amount: BN,
    asset: PublicKey,
    signer: Keypair
  ): Promise<string> {
    console.log("\n🔄 准备从 Jupiter Lend Earn 取款...");
    console.log(`📊 取款金额: ${amount.toString()}`);
    console.log(`💰 资产: ${asset.toBase58()}`);

    // 创建取款指令
    const withdrawInstruction = await this.createWithdrawInstruction({
      amount,
      asset,
      signer: signer.publicKey,
      connection: this.connection,
    });

    // 获取最新区块哈希
    const latestBlockhash = await this.connection.getLatestBlockhash();

    // 构建交易
    const messageV0 = new TransactionMessage({
      payerKey: signer.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [withdrawInstruction],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([signer]);

    // 发送交易
    console.log("\n📤 发送交易...");
    const signature = await this.connection.sendRawTransaction(transaction.serialize());

    console.log(`✅ 交易已发送: ${signature}`);
    console.log(`🔗 Solscan: https://solscan.io/tx/${signature}`);

    // 等待确认
    console.log("\n⏳ 等待交易确认...");
    await this.connection.confirmTransaction({
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    }, "confirmed");

    console.log("✅ 交易已确认!");

    return signature;
  }

  /**
   * 格式化金额显示
   */
  formatAmount(amount: BN, decimals: number): string {
    const divisor = new BN(10).pow(new BN(decimals));
    const whole = amount.div(divisor);
    const remainder = amount.mod(divisor);
    const fractional = remainder.toString().padStart(decimals, '0');
    return `${whole.toString()}.${fractional}`;
  }

  /**
   * 打印池子详情
   */
  async printPoolDetails(asset: PublicKey): Promise<void> {
    console.log("\n📊 Jupiter Lend Earn 池子详情");
    console.log("=" .repeat(60));

    const details = await this.getLendingTokenDetails(asset);
    if (!details) {
      console.log("❌ 未找到该资产的 Lending Pool");
      return;
    }

    const apy = this.calculateAPY(details.supplyRate);
    const totalDeposits = this.formatAmount(details.totalAssets, details.decimals);

    console.log(`资产地址:     ${details.asset.toBase58()}`);
    console.log(`jlToken 地址: ${details.address.toBase58()}`);
    console.log(`精度:         ${details.decimals}`);
    console.log(`总存款:       ${totalDeposits}`);
    console.log(`总份额:       ${details.totalSupply.toString()}`);
    console.log(`供应 APY:     ${apy.toFixed(2)}%`);
    console.log(`奖励率:       ${this.calculateAPY(details.rewardsRate).toFixed(2)}%`);
    console.log("=" .repeat(60));
  }

  /**
   * 打印用户位置
   */
  async printUserPosition(asset: PublicKey, user: PublicKey): Promise<void> {
    console.log("\n👤 用户存款位置");
    console.log("=" .repeat(60));

    const position = await this.getUserPosition(asset, user);
    const details = await this.getLendingTokenDetails(asset);

    if (!position || !details) {
      console.log("❌ 未找到用户存款位置");
      return;
    }

    const formattedAssets = this.formatAmount(position.underlyingAssets, details.decimals);
    const formattedBalance = this.formatAmount(position.underlyingBalance, details.decimals);

    console.log(`用户地址:     ${user.toBase58()}`);
    console.log(`资产地址:     ${asset.toBase58()}`);
    console.log(`持有份额:     ${position.lendingTokenShares.toString()}`);
    console.log(`基础资产:     ${formattedAssets}`);
    console.log(`当前余额:     ${formattedBalance}`);
    console.log("=" .repeat(60));
  }
}
