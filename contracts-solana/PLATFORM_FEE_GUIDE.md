# Mars 平台费完整指南

## 📋 目录
- [概述](#概述)
- [功能特性](#功能特性)
- [技术实现](#技术实现)
- [CLI 使用](#cli-使用)
- [费率配置](#费率配置)
- [使用场景](#使用场景)
- [前端集成](#前端集成)
- [安全注意事项](#安全注意事项)

---

## 概述

Mars 平台费系统已从**硬编码 25%** 升级为**完全可配置**的动态费率系统。管理员可以通过 CLI 命令实时调整每个 Vault 的平台费率，无需重新部署合约。

### 当前默认费率

- **默认费率**: 25% (2500 basis points)
- **用户获得**: 75% 的奖励
- **平台收取**: 25% 的奖励

### 计算示例

| 总奖励 | 平台费 (25%) | 用户净收入 (75%) |
|--------|--------------|------------------|
| 100    | 25           | 75               |
| 1,000  | 250          | 750              |
| 10,000 | 2,500        | 7,500            |
| 100,000| 25,000       | 75,000           |

---

## 功能特性

### 1. **完全可配置**
- ✅ 费率存储在链上 (`VaultState.platform_fee_bps`)
- ✅ 支持 0-10000 bps (0%-100%)
- ✅ 默认值：2500 bps (25%)

### 2. **动态调整**
- ✅ 无需重新部署合约
- ✅ 实时生效
- ✅ 只影响后续的 claim 操作

### 3. **按 Vault 独立配置**
- ✅ 每个 Vault 可以设置不同的费率
- ✅ 通过 vault_mint 地址区分

### 4. **安全权限**
- ✅ 只有 admin 可以更新
- ✅ 费率范围验证（0-10000 bps）
- ✅ 事件记录所有更新

---

## 技术实现

### 数据结构

#### VaultState 字段
```rust
pub struct VaultState {
    // ... 其他字段
    
    /// 平台费用基点（例如：2500 = 25%）
    pub platform_fee_bps: u16,
    
    /// 总共收取的平台费（从奖励中收取）
    pub total_platform_fee_collected: u64,
    
    /// 总领取的奖励数量（用于统计）
    pub total_rewards_claimed: u64,
    
    // ... 其他字段
}
```

### Claim Rewards 逻辑

```rust
// 使用 vault_state 中配置的平台费率（可通过管理指令更新）
let platform_fee_bps: u64 = if ctx.accounts.vault_state.platform_fee_bps == 0 {
    2500 // 默认 25%
} else {
    ctx.accounts.vault_state.platform_fee_bps as u64
};

// 计算平台费
let platform_fee = reward_claimed
    .checked_mul(platform_fee_bps)
    .ok_or(MarsError::MathOverflow)?
    .checked_div(10_000)
    .ok_or(MarsError::MathOverflow)?;

// 计算用户实际收益
let user_reward_after_fee = reward_claimed.saturating_sub(platform_fee);
```

### 更新费率指令

```rust
pub struct UpdateVaultPlatformFee<'info> {
    /// Admin 账户
    #[account(
        mut,
        constraint = vault_state.admin == *admin.key() @ MarsError::InvalidAdmin
    )]
    pub admin: Signer<'info>,
    
    /// Vault state 账户
    #[account(
        mut,
        seeds = [b"vault-state", vault_state.vault_mint.as_ref()],
        bump = vault_state.bump,
    )]
    pub vault_state: Account<'info, VaultState>,
}

pub fn update_vault_platform_fee(
    ctx: Context<UpdateVaultPlatformFee>,
    new_platform_fee_bps: u16,
) -> Result<()> {
    // 验证费率范围
    require!(
        new_platform_fee_bps <= 10_000,
        MarsError::InvalidParameter
    );
    
    // 更新费率
    let vault_state = &mut ctx.accounts.vault_state;
    vault_state.platform_fee_bps = new_platform_fee_bps;
    vault_state.last_updated = Clock::get()?.unix_timestamp;
    
    // 发出事件
    emit!(FeeConfigUpdated { /* ... */ });
    
    Ok(())
}
```

### 事件定义

```rust
#[event]
pub struct FarmRewardsClaimedEvent {
    pub user: Pubkey,
    pub vault_mint: Pubkey,
    pub farm_state: Pubkey,
    pub reward_mint: Pubkey,
    pub reward_amount: u64,        // 用户实际收到的奖励（扣除平台费后）
    pub platform_fee: u64,         // 平台收取的费用
    pub total_rewards_claimed: u64,
    pub timestamp: i64,
}

#[event]
pub struct FeeConfigUpdated {
    pub vault_id: [u8; 32],
    pub platform_fee_bps: u16,
    pub deposit_fee_bps: u16,
    pub withdraw_fee_bps: u16,
    pub management_fee_bps: u16,
    pub performance_fee_bps: u16,
    pub timestamp: i64,
}
```

### 修改的文件列表

1. **`programs/mars/src/instructions/claim_farm_rewards.rs`**
   - 从硬编码的 `2500 bps` 改为读取 `vault_state.platform_fee_bps`
   - 添加默认值逻辑
   - 更新日志输出

2. **`programs/mars/src/instructions/update_vault_platform_fee.rs`** (新文件)
   - 创建更新费率的管理指令
   - 权限验证和范围检查

3. **`programs/mars/src/instructions/mod.rs`**
   - 添加并导出 `update_vault_platform_fee` 模块

4. **`programs/mars/src/lib.rs`**
   - 添加公共指令 `update_vault_platform_fee`

5. **`lib/scripts.ts`**
   - 新增 `updateVaultPlatformFeeTx()` 函数

6. **`cli/scripts.ts`**
   - 新增 `updateVaultPlatformFee()` 函数

7. **`cli/command.ts`**
   - 新增 CLI 命令支持

---

## CLI 使用

### 更新平台费率

```bash
npm run script -- update-vault-platform-fee \
  -m <vault_mint> \
  -f <fee_bps>
```

**参数：**
- `-m, --vault_mint <string>`: Vault 基础代币 mint 地址 (例如 PYUSD)
- `-f, --fee_bps <number>`: 新平台费率（basis points，0-10000）
- `-e, --env <string>`: Solana 网络 (mainnet-beta, devnet, testnet)
- `-k, --keypair <string>`: 管理员钱包路径
- `-r, --rpc <string>`: RPC URL

### 使用示例

```bash
# 设置为 25% (默认费率)
npm run script -- update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 2500

# 设置为 10% (低费率)
npm run script -- update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 1000

# 设置为 5% (推广费率)
npm run script -- update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 500

# 在 devnet 测试
npm run script -- update-vault-platform-fee \
  -e devnet \
  -m <DEVNET_MINT> \
  -f 1000
```

### 输出示例

```
⚙️  Updating Vault Platform Fee:
  Vault Mint: 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo
  Vault State: ABC123...
  Admin: XYZ789...
  New Platform Fee: 1000 bps ( 10 %)

✅ Platform fee updated successfully!
Transaction: 5Kx7Yx...

📊 Updated Vault Configuration:
  Platform Fee: 1000 bps ( 10 %)
  Last Updated: 2025-10-17T12:34:56.789Z
```

---

## 费率配置

### 费率对照表

| Basis Points | 百分比 | 用户获得 | 平台收取 (1000 代币) |
|--------------|--------|----------|---------------------|
| 0            | 0%     | 100%     | 0                   |
| 100          | 1%     | 99%      | 10                  |
| 500          | 5%     | 95%      | 50                  |
| 1000         | 10%    | 90%      | 100                 |
| 1500         | 15%    | 85%      | 150                 |
| 2000         | 20%    | 80%      | 200                 |
| 2500         | 25%    | 75%      | 250 (默认)          |
| 3000         | 30%    | 70%      | 300                 |
| 5000         | 50%    | 50%      | 500                 |
| 10000        | 100%   | 0%       | 1000                |

### 权限管理

**谁可以更新费率？**
- 只有 Vault 的 **admin** 账户可以更新平台费率
- Admin 地址存储在 `VaultState.admin` 字段中

**费率限制：**
- 最小值：0 bps (0%)
- 最大值：10000 bps (100%)
- 超出范围会返回 `InvalidParameter` 错误

**默认行为：**
- 如果 `platform_fee_bps = 0`，代码会使用默认值 2500 (25%)
- 如果真的想设置为 0%，需要修改合约代码逻辑

### 查询当前配置

```typescript
// 读取链上 VaultState
const vaultState = await program.account.vaultState.fetch(vaultStatePDA);

console.log("Platform Fee:", vaultState.platformFeeBps, "bps");
console.log("Platform Fee %:", vaultState.platformFeeBps / 100, "%");
console.log("Total Platform Fees Collected:", vaultState.totalPlatformFeeCollected.toString());
console.log("Total Rewards Claimed:", vaultState.totalRewardsClaimed.toString());
```

---

## 使用场景

### 场景 1: 市场推广

临时降低费率吸引用户：

```bash
# 推广期：降低费率
npm run script -- update-vault-platform-fee -m <MINT> -f 500  # 5%

# 推广结束：恢复正常费率
npm run script -- update-vault-platform-fee -m <MINT> -f 2500  # 25%
```

### 场景 2: VIP 服务

为不同用户群体提供差异化费率：

```bash
# 普通用户 Vault - 25%
npm run script -- update-vault-platform-fee \
  -m <STANDARD_MINT> -f 2500

# VIP 用户 Vault - 10%
npm run script -- update-vault-platform-fee \
  -m <VIP_MINT> -f 1000

# 机构用户 Vault - 5%
npm run script -- update-vault-platform-fee \
  -m <INSTITUTIONAL_MINT> -f 500
```

### 场景 3: A/B 测试

测试不同费率对用户行为的影响：

```bash
# Vault A - 15%
npm run script -- update-vault-platform-fee -m <VAULT_A> -f 1500

# Vault B - 25%
npm run script -- update-vault-platform-fee -m <VAULT_B> -f 2500

# Vault C - 35%
npm run script -- update-vault-platform-fee -m <VAULT_C> -f 3500
```

### 场景 4: 竞争应对

根据市场情况动态调整：

```bash
# 竞争激烈时降低费率
npm run script -- update-vault-platform-fee -m <MINT> -f 1000  # 10%

# 市场独占时提高费率
npm run script -- update-vault-platform-fee -m <MINT> -f 3000  # 30%

# 恢复默认费率
npm run script -- update-vault-platform-fee -m <MINT> -f 2500  # 25%
```

---

## 前端集成

### 显示当前费率

```typescript
import { PublicKey } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

// 获取 vault 配置
async function getVaultPlatformFee(
  program: Program,
  vaultMint: PublicKey
): Promise<number> {
  // 派生 vault state PDA
  const [vaultStatePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault-state"), vaultMint.toBuffer()],
    program.programId
  );
  
  // 获取 vault state
  const vaultState = await program.account.vaultState.fetch(vaultStatePDA);
  const platformFeeBps = vaultState.platformFeeBps || 2500; // 默认 25%
  
  return platformFeeBps;
}

// 在 UI 中显示
function PlatformFeeDisplay({ platformFeeBps }: { platformFeeBps: number }) {
  const platformFeePercentage = platformFeeBps / 100;
  
  return (
    <div>
      <h3>Platform Fee: {platformFeePercentage}%</h3>
      <p>You keep: {100 - platformFeePercentage}% of rewards</p>
    </div>
  );
}
```

### 计算用户实际收益

```typescript
function calculateUserReward(
  totalRewards: number,
  platformFeeBps: number
): { platformFee: number; userReceives: number } {
  const platformFee = Math.floor(totalRewards * platformFeeBps / 10000);
  const userReceives = totalRewards - platformFee;
  
  return { platformFee, userReceives };
}

// 使用示例
const totalRewards = 1000;
const platformFeeBps = 2500; // 25%
const { platformFee, userReceives } = calculateUserReward(totalRewards, platformFeeBps);

// 在 UI 中显示
<div className="reward-breakdown">
  <div>Total Rewards: {totalRewards} tokens</div>
  <div>Platform Fee ({platformFeeBps / 100}%): {platformFee} tokens</div>
  <div>You Receive: {userReceives} tokens</div>
</div>
```

### React Hook 示例

```typescript
import { useEffect, useState } from 'react';
import { useAnchorWallet, useConnection } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

export function usePlatformFee(vaultMint: PublicKey) {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(2500);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    async function fetchPlatformFee() {
      if (!wallet) return;
      
      try {
        const provider = new AnchorProvider(connection, wallet, {});
        const program = new Program(IDL, PROGRAM_ID, provider);
        
        const [vaultStatePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("vault-state"), vaultMint.toBuffer()],
          program.programId
        );
        
        const vaultState = await program.account.vaultState.fetch(vaultStatePDA);
        setPlatformFeeBps(vaultState.platformFeeBps || 2500);
      } catch (error) {
        console.error('Error fetching platform fee:', error);
        setPlatformFeeBps(2500); // 使用默认值
      } finally {
        setLoading(false);
      }
    }
    
    fetchPlatformFee();
  }, [connection, wallet, vaultMint]);
  
  return { 
    platformFeeBps, 
    platformFeePercentage: platformFeeBps / 100,
    loading 
  };
}
```

---

## 安全注意事项

### 1. 密钥管理
- ⚠️ 妥善保管管理员密钥文件
- ⚠️ 不要将密钥提交到 git 仓库
- ⚠️ 考虑使用硬件钱包进行管理操作
- ⚠️ 定期轮换管理员密钥

### 2. 费率变更
- ⚠️ 避免频繁更改费率，影响用户信任
- ⚠️ 重大费率变更应提前通知用户
- ⚠️ 在 UI 中清晰显示当前费率
- ⚠️ 记录所有费率变更的历史

### 3. 测试验证
- ✅ 在 devnet 充分测试后再在 mainnet 操作
- ✅ 验证数学计算精度（无舍入误差）
- ✅ 测试边界情况（0%, 100%, 极大金额）
- ✅ 检查事件发出的数据正确性

### 4. 监控和审计
- 📊 监控每日平台费收入
- 📊 追踪用户领取奖励频率
- 📊 定期检查平台费账户余额
- 📊 设置异常大额领取告警

### 5. 权限验证
```rust
// 合约中的权限检查
#[account(
    mut,
    constraint = vault_state.admin == *admin.key() @ MarsError::InvalidAdmin
)]
pub admin: Signer<'info>,

// 费率范围检查
require!(
    new_platform_fee_bps <= 10_000,
    MarsError::InvalidParameter
);
```

### 6. 事件监听

监听链上事件以追踪费率变更：

```typescript
// 监听 FeeConfigUpdated 事件
program.addEventListener('FeeConfigUpdated', (event) => {
  console.log('Fee config updated:', {
    vaultId: event.vaultId,
    platformFeeBps: event.platformFeeBps,
    timestamp: new Date(event.timestamp * 1000)
  });
  
  // 发送通知给用户
  notifyUsers({
    type: 'fee_update',
    newFee: event.platformFeeBps / 100,
    effectiveDate: new Date(event.timestamp * 1000)
  });
});
```

---

## 常见问题

### Q1: 如何查看 Vault Mint 地址？
**A:** 可以通过 Solana Explorer 或程序日志查看。PYUSD mint 地址为 `2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo`

### Q2: 费率更新是否需要重启服务？
**A:** 不需要，费率更新后立即生效，影响后续的所有 claim 操作。

### Q3: 可以设置为 0% 吗？
**A:** 代码中当设置为 0 时会使用默认值 2500 (25%)。如果真的想设置为 0%，需要修改合约代码逻辑。

### Q4: 不同网络需要分别设置吗？
**A:** 是的，devnet 和 mainnet 是独立的链，需要分别配置费率。

### Q5: 如何撤销错误的配置？
**A:** 再次运行命令，设置为正确的值即可。更新会立即生效。

### Q6: 费率更新会影响已领取的奖励吗？
**A:** 不会，只影响更新后的 claim 操作，已领取的奖励不受影响。

### Q7: 如何验证费率已成功更新？
**A:** 查看交易日志或通过 RPC 调用查询 VaultState 账户数据。

### Q8: 多个 Vault 可以有不同的费率吗？
**A:** 可以，每个 Vault（通过 vault_mint 区分）都有独立的费率配置。

---

## 完整工作流程

### 初始部署

```bash
# 1. 编译合约
cd contracts-solana
anchor build

# 2. 部署到 devnet 测试
anchor deploy --provider.cluster devnet

# 3. 初始化 Vault（使用默认 25% 费率）
npm run script -- init -e devnet

# 4. (可选) 调整费率
npm run script -- update-vault-platform-fee \
  -e devnet \
  -m <DEVNET_MINT> \
  -f 1000

# 5. 测试验证
# ... 执行测试 ...

# 6. 部署到主网
anchor deploy --provider.cluster mainnet

# 7. 在主网初始化
npm run script -- init -e mainnet-beta

# 8. 设置主网费率
npm run script -- update-vault-platform-fee \
  -e mainnet-beta \
  -m <MAINNET_MINT> \
  -f 2500
```

### 日常管理

```bash
# 1. 检查当前配置
# （通过 Solana Explorer 或 RPC 查询）

# 2. 根据需要调整费率
npm run script -- update-vault-platform-fee \
  -m <VAULT_MINT> \
  -f <NEW_FEE_BPS>

# 3. 验证更新
# 查看交易日志确认费率已更新

# 4. 监控费用收集
npm run script -- claim-all-fees -v <VAULT_ID>

# 5. 定期审计
# 检查平台费账户余额和统计数据
```

---

## 相关文档

- [CLI_COMMANDS.md](./CLI_COMMANDS.md) - CLI 命令完整指南
- [PROGRAM.md](./PROGRAM.md) - 程序合约详细说明
- [BUILD_DEPLOY.md](./BUILD_DEPLOY.md) - 编译和部署指南
- [程序源代码](./programs/mars/src/) - 合约实现代码

---

## 总结

通过可配置的平台费率系统，Mars 协议现在具备：

✅ **灵活性**: 无需重新部署即可调整费率  
✅ **实时性**: 费率更新立即生效  
✅ **安全性**: 严格的权限和范围验证  
✅ **透明性**: 完整的事件记录和统计追踪  
✅ **可扩展性**: 支持多个 Vault 独立配置  
✅ **用户友好**: 简单的 CLI 命令操作  

立即开始使用：
```bash
npm run script -- update-vault-platform-fee \
  -m <YOUR_VAULT_MINT> \
  -f <YOUR_FEE_BPS>
```

🚀 享受灵活的费率管理吧！
