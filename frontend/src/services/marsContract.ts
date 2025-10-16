/**
 * Mars 合约直接集成 - PYUSD 存款和取款
 * 
 * ⚠️ 重要修复（2025-10-15）：
 * - Claim Rewards 时从 Kamino harvestReward 指令的 accounts[2] 提取真正的 FarmState
 * - 不再使用 SDK 的 farmAccounts.farmState（那个是 token vault，不是 FarmState）
 * - 使用正确的 FarmState 推导 UserState PDA 和创建 initializeUser 指令
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
import { KaminoSDKHelper } from './kaminoSdkHelper';

// Mars 合约常量
// Mars Program ID (V19 - Added FarmRewardsClaimedEvent for indexing)
const MARS_PROGRAM_ID = new PublicKey("83Veoxix4ee4F9VETcAkmKJTXrCcwBRozd2dZXYjhD6N");
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
  
  // 0. 先检查 Pending Rewards（可选，用于更好的用户体验）
  try {
    const pendingRewards = await sdkHelper.getUserPendingRewards(PYUSD_VAULT);
    console.log('💰 Pending Rewards:');
    if (pendingRewards.size === 0) {
      console.log('   ℹ️  暂无可领取的奖励');
      return null;
    }
    for (const [mint, amount] of pendingRewards.entries()) {
      console.log(`   💵 ${mint.slice(0, 8)}... : ${amount.toFixed(6)} tokens`);
    }
  } catch (error) {
    console.warn('⚠️  无法获取 pending rewards，继续尝试构建交易:', error);
  }
  
  // 1. 使用 Kamino SDK 获取 claim 指令（这会告诉我们有哪些奖励）
  const kaminoClaimIxs = await sdkHelper.getClaimRewardsInstructions(PYUSD_VAULT);
  
  if (!kaminoClaimIxs || kaminoClaimIxs.length === 0) {
    console.log('ℹ️  SDK 未返回 claim 指令，可能没有可领取的奖励');
    return null;
  }
  
  console.log(`✅ Kamino SDK 返回了 ${kaminoClaimIxs.length} 个 harvestReward 指令`);
  
  // 2. 从 Kamino harvestReward 指令中提取真正的 farmState 地址
  // ⚠️ 重要：不要使用 getDepositAndStakeInfo 的 farmAccounts.farmState，那个是 token vault！
  // 从 harvestReward 指令的 accounts[2] 提取真正的 FarmState
  const firstKaminoIx = kaminoClaimIxs[0];
  const kaminoAccounts = firstKaminoIx.accounts || firstKaminoIx.keys;
  
  if (!kaminoAccounts || kaminoAccounts.length < 3) {
    console.error('❌ Kamino 指令账户不足，无法提取 farmState');
    return null;
  }
  
  // Kamino harvestReward 指令账户顺序：
  // 0: owner, 1: userState, 2: farmState ✅, 3: globalConfig, 4: rewardMint...
  const farmStateAddress = new PublicKey(kaminoAccounts[2].pubkey || kaminoAccounts[2].address);
  
  console.log('✅ Farm State (从 Kamino 指令提取):', farmStateAddress.toString());
  
  // 推导 userFarm PDA 用于日志
  const [userFarmPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('user'), farmStateAddress.toBuffer(), userPublicKey.toBuffer()],
    KAMINO_FARMS_PROGRAM
  );
  console.log('✅ User Farm PDA (推导):', userFarmPda.toString());
  
  // 3. 推导 Farm Authority PDA
  const [farmAuthorityPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('authority'), farmStateAddress.toBuffer()],
    KAMINO_FARMS_PROGRAM
  );
  
  // 4. 获取 Mars PDAs
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
  // ⚠️ 注意：Kamino SDK 现在只返回 harvestReward 指令（11个账户）
  // ATA 创建指令（6个账户）已经被 SDK 内部处理
  console.log(`📝 处理 ${kaminoClaimIxs.length} 个 Kamino harvestReward 指令`);
  
  for (let rewardIndex = 0; rewardIndex < kaminoClaimIxs.length; rewardIndex++) {
    const kaminoIx = kaminoClaimIxs[rewardIndex];
    
    // Kamino SDK 可能返回的是它们自己的格式，而不是标准的 TransactionInstruction
    // 尝试访问 accounts 字段（Kamino 格式）或 keys 字段（标准格式）
    const accounts = kaminoIx.accounts || kaminoIx.keys;
    
    if (!accounts || accounts.length < 10) {
      console.warn(`⚠️  指令 ${rewardIndex} 账户数不足 (${accounts?.length || 0})，跳过（可能是 ATA 创建指令）`);
      
      // 如果是 ATA 创建指令（6个账户），添加到 setupInstructions
      if (accounts && accounts.length >= 6 && accounts.length < 10) {
        console.log(`✅ 检测到 ATA 创建指令，添加到 setupInstructions`);
        setupInstructions.push(kaminoIx);
      }
      continue;
    }
    
    console.log(`✅ 处理 harvestReward 指令 ${rewardIndex + 1}/${kaminoClaimIxs.length} (${accounts.length} 个账户)`);
    
    
    // 🔍 打印所有账户地址以确定正确的顺序
    console.log(`🔍 Kamino 指令 ${rewardIndex} 所有账户:`, accounts.map((acc: any, idx: number) => {
      const addr = (acc.pubkey || acc.address).toString();
      let name = `account_${idx}`;
      // 标注关键账户
      if (idx === 0) name = 'owner';
      else if (idx === 1) name = 'userState';
      else if (idx === 2) name = 'farmState ✅';
      else if (idx === 3) name = 'globalConfig';
      else if (idx === 4) name = 'rewardMint';
      else if (idx === 5) name = 'userRewardAta';
      else if (idx === 6) name = 'rewardsVault';
      else if (idx === 7) name = 'treasuryVault';
      else if (idx === 8) name = 'farmAuthority';
      
      return {
        index: idx,
        name,
        address: addr,
        writable: acc.isWritable || acc.role === 1 || acc.role === 3,
        signer: acc.isSigner || acc.role === 2 || acc.role === 3,
      };
    }));
    
    // Kamino harvestReward 指令的账户顺序（标准）：
    // 0: owner (user)
    // 1: userState (UserState PDA: [b"user", farmState, owner])
    // 2: farmState ✅ (真正的 FarmState 账户)
    // 3: globalConfig (Kamino Farms Global Config)
    // 4: rewardMint (奖励代币 mint)
    // 5: userRewardAta (用户的奖励代币账户)
    // 6: rewardsVault (Farm 的奖励代币池)
    // 7: rewardsTreasuryVault (国库奖励账户)
    // 8: farmVaultsAuthority (Farm 权限 PDA)
    // 9: scopePrices (价格预言机)
    // 10: tokenProgram
    
    // 从 Kamino 指令中提取账户
    // 注意：Kamino SDK 返回的顺序可能不同于 harvestReward 指令
    // 实际账户顺序（从日志）：
    // 0: user, 1: farmState, 2: userFarm, 3: globalConfig(?), 4: rewardMint, 
    // 5: userRewardAta, 6: rewardsVault, 7: treasuryVault, 8: farmAuthority, 9: farmsProgram, 10: tokenProgram
    
    // 从 Kamino harvestReward 指令中提取账户：
    // 0: owner, 1: userState, 2: farmState ✅, 3: globalConfig, 4: rewardMint, 
    // 5: userRewardAta, 6: rewardsVault, 7: treasuryVault, 8: farmAuthority, 9: scopePrices, 10: tokenProgram
    const farmStateFromIx = new PublicKey(accounts[2].pubkey || accounts[2].address);
    const globalConfigFromIx = new PublicKey(accounts[3].pubkey || accounts[3].address);
    const rewardMint = new PublicKey(accounts[4].pubkey || accounts[4].address);
    const rewardVault = new PublicKey(accounts[6].pubkey || accounts[6].address);
    
    // 验证 farmState 一致性
    if (!farmStateFromIx.equals(farmStateAddress)) {
      console.warn(`⚠️  FarmState 不一致！外层: ${farmStateAddress.toString()}, 指令内: ${farmStateFromIx.toString()}`);
      console.warn(`⚠️  使用指令内的 farmState: ${farmStateFromIx.toString()}`);
    }
    
    console.log(`🔍 从 Kamino 指令提取账户:`);
    console.log(`   - FarmState: ${farmStateFromIx.toString()}`);
    console.log(`   - Global Config: ${globalConfigFromIx.toString()}`);
    console.log(`   - Reward Mint: ${rewardMint.toString()}`);
    
    // 推导正确的 UserState PDA
    // ⚠️ 重要：使用从指令中提取的真实 farmState，不是 SDK 返回的 token vault！
    // seeds: [b"user", farmState, owner]
    const [userState] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('user'),
        farmStateFromIx.toBuffer(),  // ✅ 使用指令中的真实 farmState
        userPublicKey.toBuffer(),
      ],
      KAMINO_FARMS_PROGRAM
    );
    
    // 🔍 检查 UserState 是否已初始化，如果没有则创建初始化指令
    const userStateInfo = await connection.getAccountInfo(userState);
    if (!userStateInfo || userStateInfo.owner.equals(SystemProgram.programId)) {
      console.log(`⚠️  UserState 未初始化 (${userState.toString()})，添加 initializeUser 指令`);
      
      // 创建 Kamino Farms initializeUser 指令
      // Discriminator: [111, 17, 185, 250, 60, 122, 38, 254]
      const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
      
      const initUserIx = new TransactionInstruction({
        programId: KAMINO_FARMS_PROGRAM,
        keys: [
          { pubkey: userPublicKey, isSigner: true, isWritable: false },   // authority
          { pubkey: userPublicKey, isSigner: true, isWritable: true },    // payer
          { pubkey: userPublicKey, isSigner: false, isWritable: false },  // owner
          { pubkey: userPublicKey, isSigner: false, isWritable: false },  // delegatee (= owner)
          { pubkey: userState, isSigner: false, isWritable: true },       // userState (PDA)
          { pubkey: farmStateFromIx, isSigner: false, isWritable: true }, // farmState ✅ 真实的 FarmState
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // systemProgram
          { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },    // rent
        ],
        data: Buffer.from([111, 17, 185, 250, 60, 122, 38, 254]), // initializeUser discriminator
      });
      
      setupInstructions.push(initUserIx);
      console.log(`✅ 已添加 initializeUser 指令 (farmState: ${farmStateFromIx.toString().slice(0, 8)}...)`);
    }
    
    console.log(`🔍 Reward ${rewardIndex} 关键账户:`, {
      userState: userState.toString(),
      farmState: farmStateFromIx.toString(),
      rewardMint: rewardMint.toString(),
      rewardVault: rewardVault.toString(),
      derivedFrom: `[b"user", ${farmStateFromIx.toString().slice(0, 8)}..., ${userPublicKey.toString().slice(0, 8)}...]`,
      userStateInitialized: userStateInfo ? '✅ 已初始化' : '🆕 将在交易中初始化'
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
    
    // ✅ 从 Kamino 指令提取 Treasury Vault (index 7)
    // 不要自己推导！Kamino Farms 使用特定的 treasury vault
    const treasuryVault = new PublicKey(accounts[7].pubkey || accounts[7].address);
    
    console.log(`🔍 Reward ${rewardIndex} Treasury Vault (从指令):`, treasuryVault.toString());
    
    // 从 Kamino 指令提取 scopePrices (index 9)
    const scopePrices = accounts.length > 9 
      ? new PublicKey(accounts[9].pubkey || accounts[9].address)
      : new PublicKey('HFn8GnPADiny6XqUoWE8uRPPxb29ikn4yTuPa9MF2fWJ'); // Scope Prices Mainnet
    
    // 创建 claim_farm_rewards 指令（使用从 Kamino 指令提取的真实 farmState）
    const claimIx = createMarsClaimFarmRewardsInstruction({
      user: userPublicKey,
      globalState: globalStatePda,
      vaultState: vaultStatePda,
      vaultMint: PYUSD_MINT,  // ✅ 添加 vaultMint
      userFarm: userState,  // ✅ 使用推导的 userState
      farmState: farmStateFromIx,  // ✅ 使用指令中的真实 farmState
      rewardMint: rewardMint,
      rewardVault: rewardVault,
      treasuryVault: treasuryVault,  // ✅ 正确的参数名
      userRewardAta: userRewardAta,
      farmAuthority: farmAuthorityPda,
      globalConfig: globalConfigFromIx,
      scopePrices: scopePrices,  // ✅ 添加 scopePrices
      farmsProgram: KAMINO_FARMS_PROGRAM,
      rewardTokenProgram: rewardTokenProgram,
    }, rewardIndex);    claimTx.add(claimIx);
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
