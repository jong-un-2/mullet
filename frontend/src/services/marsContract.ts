/**
 * Mars 合约直接集成 - PYUSD 存款和取款
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import { 
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { KaminoSDKHelper } from './kaminoSdkHelper';

// Mars 合约常量
// Mars Program ID (V18 - Fixed Token-2022 support in claim_farm_rewards)
const MARS_PROGRAM_ID = new PublicKey("AsL42FUJVwPuJy9Noe4ATnHNQhS47ExB7qo4dnK42VQx");
export const KAMINO_V2_PROGRAM = new PublicKey("KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd");
export const KLEND_PROGRAM = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");
export const PYUSD_MINT = new PublicKey("2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo");
export const PYUSD_VAULT = new PublicKey("A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK");
export const EVENT_AUTHORITY = new PublicKey("24tHwQyJJ9akVXxnvkekGfAoeUJXXS7mE6kQNioNySsK");

// Instruction discriminators
const DISCRIMINATOR_DEPOSIT_AND_STAKE = Buffer.from([42, 143, 36, 40, 74, 180, 200, 42]);
const DISCRIMINATOR_START_UNSTAKE = Buffer.from([69, 169, 100, 27, 224, 93, 160, 125]);
const DISCRIMINATOR_UNSTAKE = Buffer.from([147, 182, 155, 59, 74, 113, 23, 203]);
const DISCRIMINATOR_WITHDRAW = Buffer.from([199, 101, 41, 45, 213, 98, 224, 200]);
const DISCRIMINATOR_CLAIM_FARM_REWARDS = Buffer.from([102, 40, 223, 149, 90, 81, 228, 23]);

// Kamino Farms Program (用于 claim rewards)
export const KAMINO_FARMS_PROGRAM = new PublicKey("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

/**
 * 解析 Farm State 数据获取 Global Config
 * Farm State 结构：Global Config 在偏移量 8 处（8 bytes discriminator 之后）
 */
function parseFarmStateGlobalConfig(data: Buffer): PublicKey {
  try {
    // Farm State 布局：
    // 0-8: discriminator
    // 8-40: global_config (Pubkey, 32 bytes)
    const GLOBAL_CONFIG_OFFSET = 8;
    const globalConfigBytes = data.slice(GLOBAL_CONFIG_OFFSET, GLOBAL_CONFIG_OFFSET + 32);
    const globalConfig = new PublicKey(globalConfigBytes);
    console.log('🔍 解析到 Global Config:', globalConfig.toString());
    return globalConfig;
  } catch (error) {
    console.warn('⚠️  解析 Global Config 失败，使用默认值', error);
    return KAMINO_FARMS_PROGRAM;
  }
}

/**
 * 创建 Mars claim_farm_rewards 指令（单个奖励）
 * 新版本每次只领取一个奖励，需要指定 reward_index
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
  farmAuthority: PublicKey;
  scopePrices: PublicKey;
  farmsProgram: PublicKey;
  rewardTokenProgram: PublicKey;
}, rewardIndex: number): TransactionInstruction {
  // claim_farm_rewards 指令: discriminator + reward_index (u64, 8 bytes)
  const data = Buffer.alloc(8 + 8); // discriminator + u64
  DISCRIMINATOR_CLAIM_FARM_REWARDS.copy(data, 0);
  
  // 写入 reward_index (u64, little-endian)
  const indexBuffer = Buffer.alloc(8);
  indexBuffer.writeBigUInt64LE(BigInt(rewardIndex), 0);
  indexBuffer.copy(data, 8);
  
  const keys = [
    { pubkey: accounts.user, isSigner: true, isWritable: true },                    // 0: user
    { pubkey: accounts.globalState, isSigner: false, isWritable: true },            // 1: global_state
    { pubkey: accounts.vaultState, isSigner: false, isWritable: true },             // 2: vault_state
    { pubkey: accounts.vaultMint, isSigner: false, isWritable: false },             // 3: vault_mint
    { pubkey: accounts.farmState, isSigner: false, isWritable: true },              // 4: farm_state
    { pubkey: accounts.userFarm, isSigner: false, isWritable: true },               // 5: user_farm
    { pubkey: accounts.globalConfig, isSigner: false, isWritable: false },          // 6: global_config
    { pubkey: accounts.rewardMint, isSigner: false, isWritable: false },            // 7: reward_mint
    { pubkey: accounts.rewardVault, isSigner: false, isWritable: true },            // 8: reward_vault
    { pubkey: accounts.treasuryVault, isSigner: false, isWritable: true },          // 9: treasury_vault
    { pubkey: accounts.userRewardAta, isSigner: false, isWritable: true },          // 10: user_reward_ata
    { pubkey: accounts.farmAuthority, isSigner: false, isWritable: false },         // 11: farm_authority
    { pubkey: accounts.scopePrices, isSigner: false, isWritable: false },           // 12: scope_prices
    { pubkey: accounts.farmsProgram, isSigner: false, isWritable: false },          // 13: farms_program
    { pubkey: accounts.rewardTokenProgram, isSigner: false, isWritable: false },    // 14: reward_token_program
    { pubkey: new PublicKey('11111111111111111111111111111111'), isSigner: false, isWritable: false }, // 15: system_program
  ];
  
  return new TransactionInstruction({
    programId: MARS_PROGRAM_ID,
    keys,
    data,
  });
}

/**
 * 创建 Claim Rewards 交易
 * 通过 Mars 合约从 Kamino Farm 领取所有 pending rewards
 * 
 * 实现方式：使用 Mars 合约的 claim_farm_rewards 指令
 * 优势：可以收取手续费、记录统计数据、更好的控制
 */
export async function createClaimRewardsTransaction(
  userPublicKey: PublicKey,
  connection: Connection,
  sdkHelper: KaminoSDKHelper
): Promise<Transaction | null> {
  try {
    console.log('🎁 [Claim Rewards] 开始构建 claim rewards 交易 (通过 Mars 合约)');
    return await createClaimRewardsThroughMarsContract(userPublicKey, connection, sdkHelper);
  } catch (error: any) {
    console.error('❌ 创建 claim rewards 交易失败:', error);
    return null;
  }
}

/**
 * 通过 Mars 合约 claim rewards
 * 新版本：每次只领取一个奖励，使用 Kamino SDK 获取奖励信息
 */
async function createClaimRewardsThroughMarsContract(
  userPublicKey: PublicKey,
  connection: Connection,
  sdkHelper: KaminoSDKHelper
): Promise<Transaction | null> {
  console.log('📋 使用 Mars 合约方式 claim rewards');
  
  // 1. 使用 Kamino SDK 获取 claim 指令（这会告诉我们有哪些奖励）
  const kaminoClaimIxs = await sdkHelper.getClaimRewardsInstructions(PYUSD_VAULT);
  
  if (!kaminoClaimIxs || kaminoClaimIxs.length === 0) {
    console.log('ℹ️  没有可领取的奖励');
    return null;
  }
  
  console.log(`✅ Kamino SDK 返回了 ${kaminoClaimIxs.length} 个奖励指令`);
  
  // 2. 从 SDK Helper 获取 Farm 账户信息
  const depositInfo = await sdkHelper.getDepositAndStakeInfo(PYUSD_VAULT, 0.01);
  const { farmAccounts } = depositInfo.stake;
  
  const farmStateAddress = farmAccounts.farmState;
  
  console.log('✅ Farm State:', farmStateAddress.toString());
  console.log('✅ User Farm PDA:', farmAccounts.userFarm.toString());
  
  // 3. 推导 Farm Authority PDA
  const [farmAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('authority'), farmStateAddress.toBuffer()],
    KAMINO_FARMS_PROGRAM
  );
  
  // 4. 获取 Farm State 数据以提取 Global Config
  const farmStateInfo = await connection.getAccountInfo(farmStateAddress);
  if (!farmStateInfo) {
    console.log('❌ 无法获取 Farm State 数据');
    return null;
  }
  
  // 5. 解析 Global Config
  const globalConfig = parseFarmStateGlobalConfig(farmStateInfo.data);
  console.log('✅ Global Config:', globalConfig.toString());
  
  // 6. 获取 Mars PDAs
  const [globalStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-state')],
    MARS_PROGRAM_ID
  );
  
  const [vaultStatePda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault-state'), PYUSD_MINT.toBuffer()],
    MARS_PROGRAM_ID
  );
  
  // 7. 构建交易：为每个 Kamino 指令创建对应的 Mars 合约指令
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const claimTx = new Transaction();
  
  claimTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }));
  
  const setupInstructions: TransactionInstruction[] = [];
  
  // 从 Kamino 指令中提取奖励信息
  console.log(`📝 从 ${kaminoClaimIxs.length} 个 Kamino 指令中提取奖励信息`);
  
  for (let rewardIndex = 0; rewardIndex < kaminoClaimIxs.length; rewardIndex++) {
    const kaminoIx = kaminoClaimIxs[rewardIndex];
    
    // 🔍 调试：检查 Kamino SDK 返回的指令结构
    console.log(`🔍 Kamino 指令 ${rewardIndex} 结构:`, {
      hasKeys: !!kaminoIx.keys,
      hasAccounts: !!kaminoIx.accounts,
      keysLength: kaminoIx.keys?.length,
      accountsLength: kaminoIx.accounts?.length,
    });
    
    // Kamino SDK 可能返回的是它们自己的格式，而不是标准的 TransactionInstruction
    // 尝试访问 accounts 字段（Kamino 格式）或 keys 字段（标准格式）
    const accounts = kaminoIx.accounts || kaminoIx.keys;
    
    if (!accounts || accounts.length < 6) {
      console.warn(`⚠️  Reward ${rewardIndex} 指令账户不足，跳过`);
      continue;
    }
    
    // Kamino harvestReward 指令的账户顺序：
    // 0: owner (user)
    // 1: userState (NOT userFarm! UserState tracks rewards per user per reward mint)
    // 2: farmState
    // 3: globalConfig
    // 4: rewardMint
    // 5: userRewardAta
    // 6: rewardsVault
    // 7: rewardsTreasuryVault
    // 8: farmVaultsAuthority
    // 9: scopePrices
    // 10: tokenProgram
    
    // 从 Kamino 指令中提取账户
    const userState = new PublicKey(accounts[1].pubkey || accounts[1].address);
    const rewardMint = new PublicKey(accounts[4].pubkey || accounts[4].address);
    const rewardVault = new PublicKey(accounts[6].pubkey || accounts[6].address);
    
    console.log(`🔍 Reward ${rewardIndex} 关键账户:`, {
      userState: userState.toString(),
      rewardMint: rewardMint.toString(),
      rewardVault: rewardVault.toString(),
    });
    
    console.log(`💰 处理 Reward ${rewardIndex}:`, rewardMint.toString());
    
    // 检测 reward token 的 Token Program
    const rewardMintInfo = await connection.getAccountInfo(rewardMint);
    const rewardTokenProgram = rewardMintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) 
      ? TOKEN_2022_PROGRAM_ID 
      : TOKEN_PROGRAM_ID;
    
    console.log(`🔍 Reward ${rewardIndex} Token Program:`, rewardTokenProgram.toString());
    
    // 获取用户的 reward ATA
    const userRewardAta = getAssociatedTokenAddressSync(
      rewardMint, 
      userPublicKey, 
      false, 
      rewardTokenProgram
    );
    
    // 检查 ATA 是否存在，不存在则创建
    const ataInfo = await connection.getAccountInfo(userRewardAta);
    if (!ataInfo) {
      console.log(`⚠️  Reward ${rewardIndex} ATA 不存在，创建中...`);
      const createAtaIx = createAssociatedTokenAccountInstruction(
        userPublicKey,
        userRewardAta,
        userPublicKey,
        rewardMint,
        rewardTokenProgram
      );
      setupInstructions.push(createAtaIx);
    }
    
    // 获取 Treasury Vault
    const [treasuryVault] = PublicKey.findProgramAddressSync(
      [Buffer.from('treasury'), globalConfig.toBuffer(), rewardMint.toBuffer()],
      KAMINO_FARMS_PROGRAM
    );
    
    // 创建 claim_farm_rewards 指令（使用从 Kamino 指令提取的 userState）
    const claimIx = createMarsClaimFarmRewardsInstruction({
      user: userPublicKey,
      globalState: globalStatePda,
      vaultState: vaultStatePda,
      vaultMint: PYUSD_MINT,
      farmState: farmStateAddress,
      userFarm: userState, // ✅ 使用从 Kamino 指令提取的 userState，而不是 farmAccounts.userFarm
      globalConfig: globalConfig,
      rewardMint: rewardMint,
      rewardVault: rewardVault,
      treasuryVault: treasuryVault,
      userRewardAta: userRewardAta,
      farmAuthority: farmAuthorityPda,
      scopePrices: KAMINO_FARMS_PROGRAM, // 使用 Program ID 作为占位符
      farmsProgram: KAMINO_FARMS_PROGRAM,
      rewardTokenProgram: rewardTokenProgram,
    }, rewardIndex);
    
    claimTx.add(claimIx);
  }
  
  // 添加 setup 指令（创建 ATA）
  if (setupInstructions.length > 0) {
    console.log(`✅ 添加 ${setupInstructions.length} 个 ATA 创建指令`);
    // 将 setup 指令添加到交易开头
    const txInstructions = claimTx.instructions.slice();
    claimTx.instructions = [...setupInstructions, ...txInstructions];
  }
  
  claimTx.recentBlockhash = blockhash;
  claimTx.lastValidBlockHeight = lastValidBlockHeight;
  claimTx.feePayer = userPublicKey;
  
  console.log(`✅ Mars 合约 Claim Rewards 交易构建完成（${kaminoClaimIxs.length} 个奖励）`);
  return claimTx;
}

/**
 * 获取用户的 PYUSD ATA
 */
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
 * 创建存款并质押交易
 */
export async function createDepositAndStakeTransaction(
  userPublicKey: PublicKey,
  amount: number,
  connection: Connection
): Promise<Transaction> {
  console.log('🏗️ 构建存款交易...', { amount, user: userPublicKey.toString() });

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

  // 1. 添加 Compute Budget
  transaction.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })
  );

  // 2. 检查并创建 Shares ATA（如果需要）
  const sharesAtaInfo = await connection.getAccountInfo(vaultAccounts.userSharesAta);
  if (!sharesAtaInfo) {
    console.log('⚠️ Shares ATA 不存在，创建中...');
    const createAtaIx = createAssociatedTokenAccountInstruction(
      userPublicKey,
      vaultAccounts.userSharesAta,
      userPublicKey,
      vaultAccounts.sharesMint,
      TOKEN_PROGRAM_ID
    );
    transaction.add(createAtaIx);
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
