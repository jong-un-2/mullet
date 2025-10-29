/**
 * Mars 合约 Claim Rewards - V2
 * 关键修复：分开处理 Vault Farm 和 Reserve Farm，动态读取 UserState.farm_state
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  ComputeBudgetProgram,
  SystemProgram,
} from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { KaminoSDKHelper } from './kaminoLendHelper';

// Mars 合约常量
const MARS_PROGRAM_ID = new PublicKey("G1dzv2HFp5x4131GSRyo8b3BHzwsrCdSVq5YCBXoMvKy");
export const KAMINO_V2_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
export const KLEND_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
export const PYUSD_MINT = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
export const PYUSD_VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
export const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");
export const KAMINO_FARMS_PROGRAM = new PublicKey("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

// Instruction discriminators
const DISCRIMINATOR_DEPOSIT_AND_STAKE = Buffer.from([42, 143, 36, 40, 74, 180, 200, 42]);
const DISCRIMINATOR_START_UNSTAKE = Buffer.from([69, 169, 100, 27, 224, 93, 160, 125]);
const DISCRIMINATOR_UNSTAKE = Buffer.from([147, 182, 155, 59, 74, 113, 23, 203]);
const DISCRIMINATOR_WITHDRAW = Buffer.from([199, 101, 41, 45, 213, 98, 224, 200]);
const DISCRIMINATOR_CLAIM_FARM_REWARDS = Buffer.from([102, 40, 223, 149, 90, 81, 228, 23]);

/**
 * 获取平台费用钱包地址（从 GlobalState 读取）
 */
async function getPlatformFeeWallet(
  connection: Connection,
  globalStatePda: PublicKey
): Promise<PublicKey> {
  try {
    const accountInfo = await connection.getAccountInfo(globalStatePda);
    if (!accountInfo) {
      throw new Error('GlobalState account not found');
    }
    
    // GlobalState 布局:
    // - discriminator: 8 bytes
    // - admin: 32 bytes (offset 8)
    // - pending_admin: 33 bytes (1 byte option + 32 bytes pubkey, offset 40)
    // - rebalance_threshold: 2 bytes (offset 73)
    // - cross_chain_fee_bps: 2 bytes (offset 75)
    // - base_mint: 32 bytes (offset 77)
    // - frozen: 1 byte (offset 109)
    // - max_order_amount: 8 bytes (offset 110)
    // - platform_fee_wallet: 32 bytes (offset 86 - ACTUAL LOCATION from on-chain data!)
    // Note: Rust alignment/padding causes platform_fee_wallet to be at offset 86, not 118
    
    const offset = 86; // Verified from on-chain data
    const platformFeeWalletBytes = accountInfo.data.slice(offset, offset + 32);
    const platformFeeWallet = new PublicKey(platformFeeWalletBytes);
    
    console.log(`📋 Platform Fee Wallet: ${platformFeeWallet.toString()}`);
    return platformFeeWallet;
  } catch (error) {
    console.error('❌ 获取平台费用钱包失败:', error);
    throw error;
  }
}

/**
 * 获取平台费用 ATA（用于接收平台费用）
 */
async function getPlatformFeeAta(
  connection: Connection,
  globalStatePda: PublicKey,
  rewardMint: PublicKey,
  tokenProgram: PublicKey
): Promise<PublicKey> {
  const platformFeeWallet = await getPlatformFeeWallet(connection, globalStatePda);
  
  const platformFeeAta = getAssociatedTokenAddressSync(
    rewardMint,
    platformFeeWallet,
    false,
    tokenProgram
  );
  
  console.log(`💰 Platform Fee ATA for ${rewardMint.toString().slice(0, 8)}...: ${platformFeeAta.toString()}`);
  
  return platformFeeAta;
}


/**
 * 创建 Mars claim_farm_rewards 指令
 */
function createMarsClaimFarmRewardsInstruction(accounts: {
  user: PublicKey;
  globalState: PublicKey;
  vaultState: PublicKey;
  vaultMint: PublicKey;
  farmState: PublicKey;
  userFarm: PublicKey;
  globalConfig: PublicKey;
  rewardMint: PublicKey;
  rewardVault: PublicKey;
  treasuryVault: PublicKey;
  userRewardAta: PublicKey;
  platformFeeAta: PublicKey;  // 新增：平台费用接收账户
  farmAuthority: PublicKey;
  scopePrices: PublicKey;
  farmsProgram: PublicKey;
  rewardTokenProgram: PublicKey;
}, rewardIndex: number): TransactionInstruction {
  const data = Buffer.alloc(8 + 8);
  DISCRIMINATOR_CLAIM_FARM_REWARDS.copy(data, 0);
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(rewardIndex), 0);
  indexBuffer.copy(data, 8);
  
  const keys = [
    { pubkey: accounts.user, isSigner: true, isWritable: true },
    { pubkey: accounts.globalState, isSigner: false, isWritable: true },
    { pubkey: accounts.vaultState, isSigner: false, isWritable: true },
    { pubkey: accounts.vaultMint, isSigner: false, isWritable: false },
    { pubkey: accounts.farmState, isSigner: false, isWritable: true },
    { pubkey: accounts.userFarm, isSigner: false, isWritable: true },
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: false },
    { pubkey: accounts.rewardMint, isSigner: false, isWritable: false },
    { pubkey: accounts.rewardVault, isSigner: false, isWritable: true },
    { pubkey: accounts.treasuryVault, isSigner: false, isWritable: true },
    { pubkey: accounts.userRewardAta, isSigner: false, isWritable: true },
    { pubkey: accounts.platformFeeAta, isSigner: false, isWritable: true },  // 新增
    { pubkey: accounts.farmAuthority, isSigner: false, isWritable: false },
    { pubkey: accounts.scopePrices, isSigner: false, isWritable: false },
    { pubkey: accounts.farmsProgram, isSigner: false, isWritable: false },
    { pubkey: accounts.rewardTokenProgram, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];
  
  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}

// 直接使用 Kamino SDK 提供的 farm_state（已验证是正确的）

/**
 * 处理单个 Farm 的所有奖励
 */
async function processSingleFarm(params: {
  connection: Connection;
  userPublicKey: PublicKey;
  farmInstructions: any[];
  globalStatePda: PublicKey;
  vaultStatePda: PublicKey;
  transaction: Transaction;
  setupInstructions: TransactionInstruction[];
}): Promise<void> {
  const {
    connection,
    userPublicKey,
    farmInstructions,
    globalStatePda,
    vaultStatePda,
    transaction,
    setupInstructions,
  } = params;
  
  // 每个 Farm 的 reward_index 从 0 开始！
  let farmRewardIndex = 0;
  
  // 从第一个指令中提取 Farm 信息
  const firstIx = farmInstructions[0];
  const firstAccounts = firstIx.accounts || firstIx.keys;
  
  const userState = new PublicKey(firstAccounts[1].pubkey || firstAccounts[1].address);
  const sdkFarmState = new PublicKey(firstAccounts[2].pubkey || firstAccounts[2].address);
  const globalConfig = new PublicKey(firstAccounts[3].pubkey || firstAccounts[3].address);
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🏦 处理 Farm`);
  console.log(`   UserState: ${userState.toString()}`);
  console.log(`   Farm State: ${sdkFarmState.toString()}`);
  console.log(`   奖励数量: ${farmInstructions.length}`);
  console.log(`${'='.repeat(80)}`);
  
  // 直接使用 Kamino SDK 提供的 farm_state（已验证是正确的）
  const farmState = sdkFarmState;
  
  // 推导 Farm Authority
  const [farmAuthority] = PublicKey.findProgramAddressSync(
    [Buffer.from('authority'), farmState.toBuffer()],
    KAMINO_FARMS_PROGRAM
  );
  
  // 处理每个奖励
  for (let i = 0; i < farmInstructions.length; i++) {
    const ix = farmInstructions[i];
    const accounts = ix.accounts || ix.keys;
    
    if (!accounts || accounts.length < 10) {
      console.warn(`⚠️  跳过账户不足的指令`);
      continue;
    }
    
    console.log(`\n  💰 奖励 ${i + 1}/${farmInstructions.length}`);
    
    const rewardMint = new PublicKey(accounts[4].pubkey || accounts[4].address);
    const rewardVault = new PublicKey(accounts[6].pubkey || accounts[6].address);
    const treasuryVault = new PublicKey(accounts[7].pubkey || accounts[7].address);
    const scopePrices = accounts.length > 9 
      ? new PublicKey(accounts[9].pubkey || accounts[9].address)
      : new PublicKey('HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ');
    
    console.log(`     Mint: ${rewardMint.toString().slice(0, 8)}...`);
    
    // 检测 Token Program
    const mintInfo = await connection.getAccountInfo(rewardMint);
    const tokenProgram = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    // 获取用户 ATA
    const userAta = getAssociatedTokenAddressSync(
      rewardMint,
      userPublicKey,
      false,
      tokenProgram
    );
    
    // 检查并创建用户 ATA
    const ataInfo = await connection.getAccountInfo(userAta);
    if (!ataInfo) {
      console.log(`     创建用户 ATA...`);
      setupInstructions.push(
        createAssociatedTokenAccountInstruction(
          userPublicKey,
          userAta,
          userPublicKey,
          rewardMint,
          tokenProgram
        )
      );
    }
    
    // 获取平台费用 ATA
    const platformFeeAta = await getPlatformFeeAta(
      connection,
      globalStatePda,
      rewardMint,
      tokenProgram
    );
    
    // 检查平台费用 ATA 是否存在（不自动创建，需要管理员预先创建）
    const platformFeeAtaInfo = await connection.getAccountInfo(platformFeeAta);
    if (!platformFeeAtaInfo) {
      console.warn(`⚠️  警告: 平台费用 ATA 不存在，需要管理员创建: ${platformFeeAta.toString()}`);
      console.warn(`     Reward Mint: ${rewardMint.toString()}`);
      // 注意: 我们不自动创建平台费用 ATA，这应该由管理员提前创建
    }
    
    // 创建 Mars claim 指令（使用当前 Farm 的 reward_index）
    console.log(`\n     🏗️  创建 Mars claim 指令 (reward_index=${farmRewardIndex}):`);
    console.log(`        farmState: ${farmState.toString()}`);
    console.log(`        userFarm: ${userState.toString()}`);
    console.log(`        farmAuthority: ${farmAuthority.toString()}`);
    console.log(`        platformFeeAta: ${platformFeeAta.toString()}`);
    
    const claimIx = createMarsClaimFarmRewardsInstruction({
      user: userPublicKey,
      globalState: globalStatePda,
      vaultState: vaultStatePda,
      vaultMint: PYUSD_MINT,
      farmState: farmState,
      userFarm: userState,
      globalConfig: globalConfig,
      rewardMint: rewardMint,
      rewardVault: rewardVault,
      treasuryVault: treasuryVault,
      userRewardAta: userAta,
      platformFeeAta: platformFeeAta,  // 新增：平台费用 ATA
      farmAuthority: farmAuthority,
      scopePrices: scopePrices,
      farmsProgram: KAMINO_FARMS_PROGRAM,
      rewardTokenProgram: tokenProgram,
    }, farmRewardIndex);  // 使用当前 Farm 的索引
    
    console.log(`     ✅ Mars 指令已创建并添加到交易`);
    transaction.add(claimIx);
    farmRewardIndex++;  // 该 Farm 的下一个奖励
  }
}

/**
 * 创建 Claim Rewards 交易（V2 - 分开处理 Vault 和 Reserve Farm，动态读取 farm_state）
 */
export async function createClaimRewardsTransaction(
  userPublicKey: PublicKey,
  connection: Connection,
  sdkHelper: KaminoSDKHelper
): Promise<Transaction | null> {
  console.log('🚀🚀🚀 [V3-FIXED] 使用动态读取 farm_state 的新版本！🚀🚀🚀');
  console.log('🎁 [Claim Rewards] 开始构建交易（分开处理各个 Farm）');
  
  try {
    // 1. 获取所有 Kamino 奖励指令
    const allInstructions = await sdkHelper.getClaimRewardsInstructions(PYUSD_VAULT);
    
    if (!allInstructions || allInstructions.length === 0) {
      console.log('ℹ️  没有可领取的奖励');
      return null;
    }
    
    console.log(`✅ SDK 返回 ${allInstructions.length} 个指令`);
    
    // 2. 按 UserState 分组（区分 Vault Farm vs Reserve Farm）
    const instructionsByFarm = new Map<string, any[]>();
    
    for (const ix of allInstructions) {
      const accounts = ix.accounts || ix.keys;
      if (!accounts || accounts.length < 10) continue;
      
      const userState = new PublicKey(accounts[1].pubkey || accounts[1].address);
      const key = userState.toString();
      
      if (!instructionsByFarm.has(key)) {
        instructionsByFarm.set(key, []);
      }
      instructionsByFarm.get(key)!.push(ix);
    }
    
    console.log(`📊 发现 ${instructionsByFarm.size} 个 Farm`);
    Array.from(instructionsByFarm.entries()).forEach(([userState, ixs]) => {
      console.log(`   - ${userState.slice(0, 8)}...: ${ixs.length} 个奖励`);
    });
    
    // 3. 获取 Mars PDAs
    const [globalStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('mars-global-state-seed')],
      MARS_PROGRAM_ID
    );
    
    const [vaultStatePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault-state'), PYUSD_VAULT.toBuffer()],
      MARS_PROGRAM_ID
    );
    
    // 4. 构建交易
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const transaction = new Transaction();
    transaction.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
    
    const setupInstructions: TransactionInstruction[] = [];
    
    // 5. 分别处理每个 Farm（每个 Farm 的 reward_index 独立计数）
    for (const farmInstructions of Array.from(instructionsByFarm.values())) {
      await processSingleFarm({
        connection,
        userPublicKey,
        farmInstructions,
        globalStatePda,
        vaultStatePda,
        transaction,
        setupInstructions,
      });
    }
    
    // 6. 添加 setup 指令到交易开头
    if (setupInstructions.length > 0) {
      console.log(`✅ 添加 ${setupInstructions.length} 个 ATA 创建指令`);
      const existingInstructions = transaction.instructions.slice();
      transaction.instructions = [...setupInstructions, ...existingInstructions];
    }
    
    transaction.recentBlockhash = blockhash;
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    transaction.feePayer = userPublicKey;
    
    console.log(`✅ 交易构建完成（共 ${instructionsByFarm.size} 个 Farm）`);
    return transaction;
    
  } catch (error) {
    console.error('❌ 构建交易失败:', error);
    return null;
  }
}
export async function getUserPyusdAccount(userPublicKey: PublicKey): Promise<PublicKey> {
  return getAssociatedTokenAddressSync(
    PYUSD_MINT,
    userPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );
}

/**
 * 检查 PYUSD 余额
 */
export async function checkPyusdBalance(
  userPublicKey: PublicKey,
  connection: Connection
): Promise<number> {
  try {
    const pyusdAccount = await getUserPyusdAccount(userPublicKey);
    const balance = await connection.getTokenAccountBalance(pyusdAccount);
    return balance.value.uiAmount || 0;
  } catch (error) {
    console.error('获取 PYUSD 余额失败:', error);
    return 0;
  }
}

/**
 * 检查 SOL 余额
 */
export async function checkSolBalance(
  userPublicKey: PublicKey,
  connection: Connection
): Promise<number> {
  try {
    const balance = await connection.getBalance(userPublicKey);
    return balance / 1e9; // 转换为 SOL
  } catch (error) {
    console.error('获取 SOL 余额失败:', error);
    return 0;
  }
}

/**
 * 创建存款并质押交易
 */
export async function createDepositAndStakeTransaction(
  userPublicKey: PublicKey,
  amount: number,
  connection: Connection
): Promise<Transaction> {
  console.log('🏗️ 构建存款交易...', { amount, user: userPublicKey.toString() });

  // ⚠️ 关键：检查用户的 SOL 余额（用于支付交易费用）
  const solBalance = await connection.getBalance(userPublicKey);
  const solBalanceInSol = solBalance / 1e9;
  console.log(`💰 SOL Balance: ${solBalanceInSol.toFixed(4)} SOL (${solBalance} lamports)`);
  
  // 计算所需的最小 SOL：
  // - 创建 ATA 账户租金: ~0.00203928 SOL
  // - 交易费用: ~0.00001 SOL
  // - 保持账户租金豁免: ~0.00089088 SOL
  // 总计至少需要: 0.025 SOL（留有余量）
  const minRequiredSol = 0.025;
  if (solBalanceInSol < minRequiredSol) {
    const errorMsg = `Insufficient SOL balance! Need at least ${minRequiredSol} SOL for transaction fees and account rent, but only have ${solBalanceInSol.toFixed(4)} SOL. Please deposit more SOL to your wallet first.`;
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  console.log('✅ SOL balance sufficient');

  // 初始化 SDK
  const rpcUrl = connection.rpcEndpoint;
  const sdkHelper = new KaminoSDKHelper(rpcUrl, userPublicKey);
  await sdkHelper.initialize();

  // 从 SDK 获取账户信息
  const depositAndStakeInfo = await sdkHelper.getDepositAndStakeInfo(
    PYUSD_VAULT,
    amount
  );

  const { vaultAccounts, remainingAccounts } = depositAndStakeInfo.deposit;
  const { farmAccounts } = depositAndStakeInfo.stake;
  const { setupInstructions } = depositAndStakeInfo;

  // 🔍 调试信息
  console.log('📋 从 Kamino SDK 获取的账户信息：');
  console.log(`  - userFarm: ${farmAccounts.userFarm.toString()}`);
  console.log(`  - farmState: ${farmAccounts.farmState.toString()}`);
  console.log(`  - delegatedStake: ${farmAccounts.delegatedStake.toString()}`);
  console.log(`  - farmsProgram: ${farmAccounts.farmsProgram.toString()}`);
  console.log(`  - setup 指令数量: ${setupInstructions?.length || 0}`);
  
  if (setupInstructions && setupInstructions.length > 0) {
    console.log('🔍 Setup 指令详情：');
    setupInstructions.forEach((ix: any, i: number) => {
      console.log(`  [${i}] Program: ${ix.programAddress}, Data length: ${ix.data?.length || 0}, Accounts: ${ix.accounts?.length || 0}`);
    });
  }

  // 获取用户的 PYUSD ATA
  const userPyusdAccount = await getUserPyusdAccount(userPublicKey);

  // 转换金额为 lamports (6 decimals)
  const amountLamports = Math.floor(amount * 1_000_000);

  // 创建交易
  const transaction = new Transaction();

  // 1. 添加 Compute Budget（增加到 500K，确保足够）
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 500_000 })
  );

  // 2. 检查并创建 Shares ATA（如果需要）
  const sharesAtaInfo = await connection.getAccountInfo(vaultAccounts.userSharesAta);
  if (!sharesAtaInfo) {
    console.log('⚠️ Shares ATA 不存在，创建中...');
    
    // 检查 shares mint 使用的 token program
    const sharesMintInfo = await connection.getAccountInfo(vaultAccounts.sharesMint);
    const sharesTokenProgram = sharesMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID)
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;
    
    console.log(`  - Shares Token Program: ${sharesTokenProgram.toString()}`);
    
    const createAtaIx = createAssociatedTokenAccountInstruction(
      userPublicKey,
      vaultAccounts.userSharesAta,
      userPublicKey,
      vaultAccounts.sharesMint,
      sharesTokenProgram
    );
    transaction.add(createAtaIx);
  } else {
    console.log('✅ Shares ATA 已存在');
  }

  // 2.5 🔥 添加 Farm setup 指令（如果有的话，通常是 InitializeFarm）
  // SDK 返回的 stakeInFarmIfNeededIxs 可能包含多个指令：
  // - 如果 userFarm 不存在：[InitializeFarm, Stake]
  // - 如果 userFarm 已存在：[Stake]
  if (setupInstructions && setupInstructions.length > 0) {
    console.log(`🔧 添加 ${setupInstructions.length} 个 Farm setup 指令（如 InitializeFarm）`);
    for (let i = 0; i < setupInstructions.length; i++) {
      const setupIx = setupInstructions[i];
      console.log(`  [${i + 1}/${setupInstructions.length}] Program: ${setupIx.programAddress}, Data: ${setupIx.data?.length} bytes`);
      
      // 将 Kamino SDK 的指令转换为 Solana TransactionInstruction
      const ix = new TransactionInstruction({
        programId: new PublicKey(setupIx.programAddress),
        keys: setupIx.accounts.map((acc: any) => ({
          pubkey: new PublicKey(acc.address),
          isSigner: acc.role === 2 || acc.role === 3, // 2=signer, 3=signer+writable
          isWritable: acc.role === 1 || acc.role === 3, // 1=writable, 3=signer+writable
        })),
        data: Buffer.from(setupIx.data),
      });
      transaction.add(ix);
    }
    console.log('✅ Farm setup 指令已添加到交易中');
  } else {
    console.log('ℹ️  没有 Farm setup 指令（userFarm 可能已存在）');
  }

  // 3. 创建 kamino_deposit_and_stake 指令
  const depositInstruction = createDepositAndStakeInstruction(
    userPublicKey,
    PYUSD_VAULT,
    vaultAccounts,
    farmAccounts,
    userPyusdAccount,
    amountLamports,
    remainingAccounts
  );

  transaction.add(depositInstruction);

  // 设置最近的 blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.feePayer = userPublicKey;

  console.log('✅ 存款交易构建完成');
  return transaction;
}

/**
 * 创建 kamino_deposit_and_stake 指令
 */
function createDepositAndStakeInstruction(
  userPublicKey: PublicKey,
  vaultState: PublicKey,
  vaultAccounts: any,
  farmAccounts: any,
  userTokenAta: PublicKey,
  amount: number,
  remainingAccounts: any[]
): TransactionInstruction {
  // 序列化金额参数
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount), 0);

  const data = Buffer.concat([DISCRIMINATOR_DEPOSIT_AND_STAKE, amountBuffer]);

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },
    { pubkey: vaultState, isSigner: false, isWritable: true },
    { pubkey: vaultAccounts.tokenVault, isSigner: false, isWritable: true },
    { pubkey: vaultAccounts.tokenMint, isSigner: false, isWritable: false },
    { pubkey: vaultAccounts.baseAuthority, isSigner: false, isWritable: false },
    { pubkey: vaultAccounts.sharesMint, isSigner: false, isWritable: true },
    { pubkey: userTokenAta, isSigner: false, isWritable: true },
    { pubkey: vaultAccounts.userSharesAta, isSigner: false, isWritable: true },
    { pubkey: new PublicKey(KLEND_PROGRAM), isSigner: false, isWritable: false },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: KAMINO_V2_PROGRAM, isSigner: false, isWritable: false },
    { pubkey: farmAccounts.farmState, isSigner: false, isWritable: true },
    { pubkey: farmAccounts.userFarm, isSigner: false, isWritable: true },
    { pubkey: farmAccounts.delegatedStake, isSigner: false, isWritable: true },
    { pubkey: farmAccounts.farmsProgram, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ...remainingAccounts,
  ];

  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * 创建取消质押和取款的批量交易（一次签名）
 * 包含前置步骤：Claim Rewards（如果有 pending rewards）
 */
export async function createUnstakeAndWithdrawTransactions(
  userPublicKey: PublicKey,
  sharesAmount: number,
  connection: Connection
): Promise<Transaction[]> {
  console.log('🏗️ 构建取款批量交易...', { sharesAmount, user: userPublicKey.toString() });

  // 初始化 SDK
  const rpcUrl = connection.rpcEndpoint;
  const sdkHelper = new KaminoSDKHelper(rpcUrl, userPublicKey);
  await sdkHelper.initialize();

  const transactions: Transaction[] = [];
  
  // 转换金额为 lamports (6 decimals for shares)
  const amountLamports = Math.floor(sharesAmount * 1_000_000);

  // 获取最新的 blockhash
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

  // 获取用户 PYUSD 账户
  const userPyusdAccount = await getUserPyusdAccount(userPublicKey);

  // 尝试获取账户信息（可能没有 farm 质押）
  let needUnstake = true;
  let farmAccounts: any = null;
  let withdrawInfo: any;

  try {
    // 从 SDK 获取完整的账户信息（包含 unstake）
    withdrawInfo = await sdkHelper.getWithdrawAndUnstakeInfo(
      PYUSD_VAULT,
      sharesAmount
    );
    farmAccounts = withdrawInfo.stake.farmAccounts;
    console.log('✅ 检测到 Farm 质押，需要执行 unstake');
  } catch (error: any) {
    if (error.message?.includes('没有找到取消质押指令') || error.message?.includes('没有找到 WithdrawUnstakedDeposits')) {
      console.log('⚠️  没有 Farm 质押，跳过 unstake 步骤');
      needUnstake = false;
      
      // 只获取 withdraw 账户信息
      const withdrawOnlyInfo = await sdkHelper.getWithdrawInstructionInfo(
        PYUSD_VAULT,
        new (await import('decimal.js')).default(sharesAmount)
      );
      withdrawInfo = { deposit: withdrawOnlyInfo };
    } else {
      throw error;
    }
  }

  const { vaultAccounts, remainingAccounts } = withdrawInfo.deposit;

  // === 创建批量交易 ===
  const batchTx = new Transaction();
  
  if (needUnstake && farmAccounts) {
    // 需要 unstake：3 个指令
    console.log('📦 构建完整批量交易（Start Unstake + Unstake + Withdraw）');
    
    // 设置更高的 compute units
    batchTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 1_000_000 }));
    
    // 获取当前 slot
    const currentSlot = await connection.getSlot();
    
    // 1. Start Unstake 指令
    batchTx.add(
      createStartUnstakeInstruction(
        userPublicKey,
        farmAccounts,
        amountLamports,
        currentSlot
      )
    );
    
    // 2. Unstake 指令
    batchTx.add(
      createUnstakeInstruction(
        userPublicKey,
        farmAccounts,
        vaultAccounts.userSharesAta,
        amountLamports
      )
    );
  } else {
    // 不需要 unstake：只有 1 个指令
    console.log('📦 构建简化批量交易（只有 Withdraw）');
    
    // 设置较低的 compute units
    batchTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  }
  
  // 3. Withdraw 指令（总是需要）
  batchTx.add(
    createWithdrawInstruction(
      userPublicKey,
      PYUSD_VAULT,
      vaultAccounts,
      userPyusdAccount,
      amountLamports,
      remainingAccounts
    )
  );

  batchTx.recentBlockhash = blockhash;
  batchTx.lastValidBlockHeight = lastValidBlockHeight;
  batchTx.feePayer = userPublicKey;

  const instructionCount = needUnstake ? 3 : 1;
  console.log(`✅ 批量取款交易构建完成（${instructionCount} 个指令）`);
  
  transactions.push(batchTx);
  
  console.log(`✅ 总共 ${transactions.length} 个交易需要签名`);
  console.log('  1️⃣ Unstake & Withdraw (取消质押并提款)');
  
  return transactions;
}

/**
 * 创建 start_unstake 指令
 * @param currentSlot 当前 slot（必须参数，用于 Kamino Farm）
 */
function createStartUnstakeInstruction(
  userPublicKey: PublicKey,
  farmAccounts: any,
  amount: number,
  currentSlot: number
): TransactionInstruction {
  // 指令数据: discriminator (8 bytes) + amount (8 bytes) + slot (8 bytes)
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount), 0);
  
  const slotBuffer = Buffer.alloc(8);
  slotBuffer.writeBigUInt64LE(BigInt(currentSlot), 0);
  
  const data = Buffer.concat([DISCRIMINATOR_START_UNSTAKE, amountBuffer, slotBuffer]);

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },
    { pubkey: farmAccounts.farmState, isSigner: false, isWritable: true },
    { pubkey: farmAccounts.userFarm, isSigner: false, isWritable: true },
    { pubkey: farmAccounts.farmsProgram, isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * 创建 unstake 指令 (WithdrawUnstakedDeposits)
 * 这个指令不需要 amount 参数（Kamino 自动计算可取的 shares）
 */
function createUnstakeInstruction(
  userPublicKey: PublicKey,
  farmAccounts: any,
  userSharesAta: PublicKey,
  _amount: number  // 保留参数以保持接口一致，但实际不使用
): TransactionInstruction {
  // WithdrawUnstakedDeposits 指令只有 discriminator（8 bytes），没有参数
  const data = DISCRIMINATOR_UNSTAKE;

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },                    // 0: user
    { pubkey: farmAccounts.farmState, isSigner: false, isWritable: true },          // 1: farm_state
    { pubkey: farmAccounts.userFarm, isSigner: false, isWritable: true },           // 2: user_farm
    { pubkey: userSharesAta, isSigner: false, isWritable: true },                   // 3: user_shares_ata
    { pubkey: farmAccounts.delegatedStake, isSigner: false, isWritable: true },     // 4: delegated_stake
    { pubkey: farmAccounts.scopePrices || PublicKey.default, isSigner: false, isWritable: false }, // 5: scope_prices
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },               // 6: token_program
    { pubkey: farmAccounts.farmsProgram, isSigner: false, isWritable: false },      // 7: farms_program ✅ 新增
  ];

  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * 创建 withdraw 指令
 * 账户顺序必须匹配 KaminoWithdrawCPI struct
 */
function createWithdrawInstruction(
  userPublicKey: PublicKey,
  vaultState: PublicKey,
  vaultAccounts: any,
  userTokenAta: PublicKey,
  amount: number,
  remainingAccounts: any[]
): TransactionInstruction {
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amount), 0);
  const data = Buffer.concat([DISCRIMINATOR_WITHDRAW, amountBuffer]);

  const keys = [
    { pubkey: userPublicKey, isSigner: true, isWritable: true },                    // 0: user
    { pubkey: vaultState, isSigner: false, isWritable: true },                      // 1: vault_state
    { pubkey: vaultAccounts.tokenVault, isSigner: false, isWritable: true },        // 2: token_vault
    { pubkey: vaultAccounts.baseAuthority, isSigner: false, isWritable: false },    // 3: base_vault_authority
    { pubkey: userTokenAta, isSigner: false, isWritable: true },                    // 4: user_token_ata ✅
    { pubkey: vaultAccounts.tokenMint, isSigner: false, isWritable: true },         // 5: token_mint
    { pubkey: vaultAccounts.userSharesAta, isSigner: false, isWritable: true },     // 6: user_shares_ata
    { pubkey: vaultAccounts.sharesMint, isSigner: false, isWritable: true },        // 7: shares_mint
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },          // 8: token_program
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },               // 9: shares_token_program
    { pubkey: new PublicKey(KLEND_PROGRAM), isSigner: false, isWritable: false },   // 10: klend_program
    { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },                // 11: event_authority
    { pubkey: KAMINO_V2_PROGRAM, isSigner: false, isWritable: false },              // 12: kamino_vault_program
    ...remainingAccounts,                                                           // 13+: remaining_accounts
  ];

  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}
