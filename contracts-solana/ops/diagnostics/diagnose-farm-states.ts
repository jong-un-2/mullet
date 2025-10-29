/**
 * 诊断脚本：读取 Vault 和 Reserve UserState 的实际 farm_state
 * 目的：确认链上 UserState 内部存储的正确 farm_state 值
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Helius RPC
const HELIUS_RPC = 'https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3';
const connection = new Connection(HELIUS_RPC, 'confirmed');

// 已知的 UserState 地址
const VAULT_USER_STATE = new PublicKey('HtN9eg6qmjPdoRAWXAdMhGe6BJNDDTynGBPvBj2mzEW7');
const RESERVE_USER_STATE = new PublicKey('2gYh4BrV4ghR6ByvNnLpLDfWqkfgWqA8DFVWzxKQYkZN');

// Kamino SDK 返回的 farm_state
const KAMINO_VAULT_FARM = '8hznHD38esVyPps3hUcFahynwekYUfjn43PRz9n5PDZN';
const KAMINO_RESERVE_FARM = 'DEe2NZ5dAXGxC7M8Gs9Esd9wZRPdQzG8jNamXqhL5yku';

async function readUserStateFarmState(userStateAddress: PublicKey, label: string, kaminoFarm: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔍 检查 ${label}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`UserState 地址: ${userStateAddress.toString()}`);
  
  const accountInfo = await connection.getAccountInfo(userStateAddress);
  
  if (!accountInfo) {
    console.log(`❌ 账户不存在！`);
    return null;
  }
  
  console.log(`✅ 账户存在，数据长度: ${accountInfo.data.length} bytes`);
  console.log(`   Owner: ${accountInfo.owner.toString()}`);
  
  if (accountInfo.data.length < 40) {
    console.log(`❌ 数据太短，无法读取 farm_state`);
    return null;
  }
  
  // UserState 结构（Kamino Farms）：
  // 0-8: discriminator (8 bytes)
  // 8-40: farm_state (32 bytes PublicKey)
  // 40-72: owner (32 bytes PublicKey)
  
  const discriminator = accountInfo.data.slice(0, 8);
  const farmStateBytes = accountInfo.data.slice(8, 40);
  const ownerBytes = accountInfo.data.slice(40, 72);
  
  const farmState = new PublicKey(farmStateBytes);
  const owner = new PublicKey(ownerBytes);
  
  console.log(`\n📊 账户结构:`);
  console.log(`   Discriminator: ${Buffer.from(discriminator).toString('hex')}`);
  console.log(`   farm_state (offset 8-40): ${farmState.toString()}`);
  console.log(`   owner (offset 40-72): ${owner.toString()}`);
  
  console.log(`\n🔑 比较结果:`);
  console.log(`   Kamino SDK 返回: ${kaminoFarm}`);
  console.log(`   UserState 内部: ${farmState.toString()}`);
  console.log(`   ${farmState.toString() === kaminoFarm ? '✅ 一致' : '❌ 不一致！'}`);
  
  if (farmState.toString() !== kaminoFarm) {
    console.log(`\n⚠️ ⚠️ ⚠️  发现不匹配！`);
    console.log(`   这就是 ConstraintHasOne 错误的原因！`);
    console.log(`   Kamino 合约检查: passed_farm_state == UserState.farm_state`);
    console.log(`   必须使用 UserState 内部的值: ${farmState.toString()}`);
  }
  
  return {
    userState: userStateAddress.toString(),
    farmStateInUserState: farmState.toString(),
    kaminoSdkFarmState: kaminoFarm,
    owner: owner.toString(),
    matches: farmState.toString() === kaminoFarm,
  };
}

async function main() {
  console.log('🚀 开始诊断 Vault 和 Reserve UserState 的 farm_state...\n');
  
  // 读取 Vault UserState
  const vaultResult = await readUserStateFarmState(
    VAULT_USER_STATE,
    'Vault Farm UserState',
    KAMINO_VAULT_FARM
  );
  
  // 读取 Reserve UserState
  const reserveResult = await readUserStateFarmState(
    RESERVE_USER_STATE,
    'Reserve Farm UserState',
    KAMINO_RESERVE_FARM
  );
  
  // 汇总结果
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📋 汇总结果`);
  console.log(`${'='.repeat(80)}`);
  
  if (vaultResult) {
    console.log(`\n🏦 Vault Farm:`);
    console.log(`   UserState: ${vaultResult.userState}`);
    console.log(`   正确的 farm_state: ${vaultResult.farmStateInUserState}`);
    console.log(`   Kamino SDK 返回: ${vaultResult.kaminoSdkFarmState}`);
    console.log(`   状态: ${vaultResult.matches ? '✅ 匹配' : '❌ 不匹配'}`);
  }
  
  if (reserveResult) {
    console.log(`\n💎 Reserve Farm:`);
    console.log(`   UserState: ${reserveResult.userState}`);
    console.log(`   正确的 farm_state: ${reserveResult.farmStateInUserState}`);
    console.log(`   Kamino SDK 返回: ${reserveResult.kaminoSdkFarmState}`);
    console.log(`   状态: ${reserveResult.matches ? '✅ 匹配' : '❌ 不匹配'}`);
  }
  
  // 生成代码映射
  console.log(`\n${'='.repeat(80)}`);
  console.log(`💻 代码中使用的映射（如果需要）：`);
  console.log(`${'='.repeat(80)}`);
  console.log(`const USER_STATE_FARM_MAP: Record<string, string> = {`);
  if (vaultResult && !vaultResult.matches) {
    console.log(`  '${vaultResult.userState}': '${vaultResult.farmStateInUserState}',`);
  }
  if (reserveResult && !reserveResult.matches) {
    console.log(`  '${reserveResult.userState}': '${reserveResult.farmStateInUserState}',`);
  }
  console.log(`};`);
  
  console.log(`\n✅ 诊断完成！`);
}

main().catch(console.error);
