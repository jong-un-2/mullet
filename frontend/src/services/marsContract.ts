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
export const MARS_PROGRAM_ID = new PublicKey("6dZQiWCbkUCPibxjBs8LVLtRBZYfAZEcWDAJLgVNAXTA");
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

// Kamino Farms Program (用于 claim rewards)
export const KAMINO_FARMS_PROGRAM = new PublicKey("FarmsPZpWu9i7Kky8tPN37rs2TpmMrAZrC7S7vJa91Hr");

/**
 * 创建 Claim Rewards 交易
 * 从 Kamino Farm 领取所有 pending rewards
 * 
 * 暂时注释掉，不在 withdraw 时自动 claim rewards
 */
// async function createClaimRewardsTransaction(
//   userPublicKey: PublicKey,
//   connection: Connection,
//   sdkHelper: KaminoSDKHelper
// ): Promise<Transaction | null> {
//   try {
//     // 获取 vault farm 信息
//     const claimInstructions = await sdkHelper.getClaimRewardsInstructions(PYUSD_VAULT);
//     
//     if (!claimInstructions || claimInstructions.length === 0) {
//       console.log('ℹ️  没有 rewards 可领取');
//       return null;
//     }

//     const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
//     const claimTx = new Transaction();
//     
//     // 添加 compute budget
//     claimTx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300_000 }));
//     
//     // 添加所有 claim 指令（转换为标准 TransactionInstruction）
//     claimInstructions.forEach((ix: any) => {
//       // Kamino SDK 返回的指令格式可能是 { programId, keys, data } 或自定义格式
//       if (ix.programId && ix.keys && ix.data) {
//         // 已经是标准格式
//         claimTx.add(ix);
//       } else if (ix.programAddress && ix.accounts && ix.data) {
//         // Kamino SDK 自定义格式，需要转换
//         const standardIx = new TransactionInstruction({
//           programId: new PublicKey(ix.programAddress),
//           keys: ix.accounts.map((acc: any) => ({
//             pubkey: new PublicKey(acc.address),
//             isSigner: acc.role === 2 || acc.role === 3, // 2=signer, 3=signer+writable
//             isWritable: acc.role === 1 || acc.role === 3, // 1=writable, 3=signer+writable
//           })),
//           data: Buffer.from(ix.data),
//         });
//         claimTx.add(standardIx);
//       } else {
//         console.warn('⚠️  未知的指令格式:', ix);
//       }
//     });
//     
//     claimTx.recentBlockhash = blockhash;
//     claimTx.lastValidBlockHeight = lastValidBlockHeight;
//     claimTx.feePayer = userPublicKey;
//     
//     console.log(`✅ Claim Rewards 交易构建完成 (${claimInstructions.length} 个指令)`);
//     return claimTx;
//   } catch (error: any) {
//     console.warn('⚠️  创建 claim rewards 交易失败:', error.message);
//     return null;
//   }
// }

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
  
  // === 步骤 1: 尝试领取 Farm Rewards（如果有） ===
  // try {
  //   console.log('💰 检查是否有 pending rewards...');
  //   const claimTx = await createClaimRewardsTransaction(userPublicKey, connection, sdkHelper);
  //   if (claimTx) {
  //     console.log('✅ 添加 Claim Rewards 交易');
  //     transactions.push(claimTx);
  //   } else {
  //     console.log('ℹ️  没有 pending rewards 可领取');
  //   }
  // } catch (error: any) {
  //   console.warn('⚠️  无法创建 claim rewards 交易，继续 withdraw 流程:', error.message);
  // }

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
  
  // === 步骤 2: 添加 Withdraw 交易 ===
  transactions.push(batchTx);
  
  console.log(`✅ 总共 ${transactions.length} 个交易需要签名`);
  if (transactions.length > 1) {
    console.log('  1️⃣ Claim Rewards (领取奖励)');
    console.log('  2️⃣ Unstake & Withdraw (取消质押并提款)');
  } else {
    console.log('  1️⃣ Unstake & Withdraw (取消质押并提款)');
  }
  
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
