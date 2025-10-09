# 🔑 Mars 项目钱包配置文档

## 钱包文件说明

### 主钱包 - recover.json
- **地址**: `CNoytfbY9TDT2sGVG4yvz1pranT2mbahsxjnxdY74gzB`
- **用途**: 主要的开发和部署钱包
- **当前状态**: 已设置为默认钱包
- **余额**: 0 SOL (需要充值)

### 备用钱包 - recover-2.json  
- **地址**: `43si8unpvF2xVpg4ZKu93B7931Zv9ouZY2WaBPfpEUCs`
- **用途**: 备用钱包，用于备份和紧急情况
- **当前状态**: 待激活
- **余额**: 0 SOL

### 部署钱包 - recover1.json
- **地址**: `AaZM1f2SKvnZGg8mXqoNJh52vhVFSSWthzGGyoE9qoeg`  
- **用途**: 专用于合约部署和程序管理
- **当前状态**: 待激活
- **余额**: 0 SOL

### 用户钱包 - user.json
- **地址**: `4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w`
- **用途**: 用户测试和交互钱包 (来源: phantom-wallet.json)
- **当前状态**: 已激活 ✅ (主网)
- **余额**: 1.505231796 SOL ✅
- **权限**: Mars 程序升级权限拥有者

### Mars Admin 钱包 - ~/.config/solana/mars-admin.json
- **地址**: `7hqw1eavxzT3GUidn9yPzaf3HsJ3momzxpRdMxvE2XXW`
- **用途**: Anchor 项目的管理钱包，用于部署和升级合约
- **当前状态**: 已激活 (本地测试网)
- **余额**: 29.99615356 SOL ✅

## 使用说明

### 切换钱包
```bash
# 切换到主钱包
solana config set --keypair recover.json

# 切换到备用钱包  
solana config set --keypair recover-2.json

# 切换到部署钱包
solana config set --keypair recover1.json

# 切换到用户钱包
solana config set --keypair user.json
```

### 查看钱包信息
```bash
# 查看当前钱包地址
solana address

# 查看钱包余额
solana balance

# 查看所有钱包地址
solana-keygen pubkey recover.json
solana-keygen pubkey recover-2.json  
solana-keygen pubkey recover1.json
solana-keygen pubkey user.json
```

### 充值建议
- **主钱包**: 建议保持 1-2 SOL 用于日常开发
- **备用钱包**: 建议保持 0.5 SOL 作为备用
- **部署钱包**: 根据部署需求充值 (合约部署通常需要 5-10 SOL)

## 安全提示

⚠️ **重要**: 这些钱包文件包含私钥，请妥善保管！

- 定期备份到安全位置
- 不要提交到 git 仓库
- 不要在不安全的网络环境中使用
- 考虑使用硬件钱包进行大额操作

## Mars 程序信息

### 主网部署 (当前版本 V3)
- **程序ID**: `AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8`
- **网络**: Solana Mainnet Beta
- **部署时间**: 2025-10-01 21:45
- **升级权限**: 4AiFD35M6ZmddV9BbG6mKxvABMq8aeqz4usJSsT7c17w (user.json)
- **程序大小**: 494KB (506,000 bytes)
- **租金余额**: ~3.5 SOL
- **部署签名**: 5W8YtdP4bkcwbu5LhXh36jik2A8MG4jvnn1r2gCDmPPSiSbvkpJNySH62cw2Ut342J6wuyYie5UiVFWX1hUEr8Mf
- **浏览器**: https://explorer.solana.com/address/AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8?cluster=mainnet
- **新特性**: 
  - ✨ 支持 Token-2022 (可处理 PYUSD 等新型代币)
  - ✨ 支持 Kamino Vault remaining_accounts (reserves + lending markets)
  - ✨ 重命名为 KaminoDepositCPI（更简洁的命名）

### 旧程序ID (已关闭/废弃)
- ~~BFw4j7oRUpS19jGfnTSw9HiW4MVyKh1z1U2dvh7CtLN9~~ (V2, 已关闭，租金已回收 3.52 SOL)
- ~~FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY~~ (V1, 已关闭，租金已回收 3.53 SOL)
- ~~5j75RWGLHdj8UL3rtrinkBt4iHz5pE7rqo5hp4gvmWF~~ (V0, 已关闭，租金已回收)
- ~~6668zv314yKTUWEo3EygNaeEkQRPbczvaMiubksH67V~~ (本地测试使用)

### Kamino 集成
- **Kamino Vault 程序ID (V2)**: `KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd`
- **Klend 程序ID**: `KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD`
- **集成功能**: 
  - ✅ kamino_deposit - 存款到任意Kamino Vault (完整实现，匹配SDK)
  - ✅ kamino_withdraw - 从任意Kamino Vault取款 (完整实现，匹配SDK)
  - ✅ 支持所有Kamino V2 vaults (USDC, PYUSD, SOL等)
  - ✅ 支持 Token-2022 程序 (TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
- **示例Vault**: `A2wsxhA7pF4B2UKVfXocb6TAAP9ipfPJam6oMKgDE5BK` (PYUSD vault，可用于测试)

## 更新记录

- **2025-10-01 21:45**: ✅ 成功部署 Mars V3 到主网！程序ID: AU5u98eeW17LZSPPd47BY3fYBeCZBCYc2nonBmmor5s8
  - 🎉 **新特性**: 支持 Kamino Vault remaining_accounts
  - 修改 kamino_deposit_cpi 支持动态 remaining_accounts
  - 可传入 vault reserves 和对应的 lending markets
  - 重命名 KaminoDepositCPIComplete → KaminoDepositCPI
  - 关闭旧程序 BFw4j...，回收租金 3.52 SOL
  - 合约大小: 494KB
- **2025-10-01 20:30**: ✅ 成功部署 Mars V2 到主网 (已关闭) 程序ID: BFw4j7oRUpS19jGfnTSw9HiW4MVyKh1z1U2dvh7CtLN9
  - 🎉 **新特性**: 支持 Token-2022 程序 (可处理 PYUSD 等新型代币)
  - 修改 kamino_cpi.rs，使用 AccountInfo 替代 Account<TokenAccount>
  - 灵活支持标准 Token 和 Token-2022 两种程序
  - 关闭旧程序 FA11b...，回收租金 3.53 SOL
  - 合约大小: 494KB
- **2025-10-01 19:50**: ✅ 成功部署 Mars V1 到主网 (已关闭) 程序ID: FA11bwhCyQA1xqKGv9c9VuSYiWB6EJTeupbYpJwEtvJY
  - 更新为Kamino V2程序ID (KvauGMspG5k6rtzrqqn7WNn3oZdyKqLKwK2XWQ8FLjd)
  - 修复deposit discriminator，与SDK 100%一致
  - 合约大小: 495KB
- **2025-10-01 18:00**: 部署到主网 (V0，已关闭) 程序ID: 5j75RWGLHdj8UL3rtrinkBt4iHz5pE7rqo5hp4gvmWF
- **2025-10-01 17:30**: 回收之前失败部署的租金 3.58 SOL
- **2025-10-01 17:00**: 重新生成所有钱包文件，替换旧的 recover 系列钱包
- **注意**: 旧钱包已删除，如果有重要资产请及时转移

## 网络配置

当前配置为 Helius 主网:
```
RPC URL: https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
Keypair: ./user.json
Commitment: confirmed
```