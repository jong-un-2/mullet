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
- **当前状态**: 已激活
- **余额**: 0.192675956 SOL ✅

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

## 更新记录

- **2025-10-01**: 重新生成所有钱包文件，替换旧的 recover 系列钱包
- **注意**: 旧钱包已删除，如果有重要资产请及时转移

## 网络配置

当前配置为 Helius 主网:
```
RPC URL: https://mainnet.helius-rpc.com/?api-key=3e4462af-f2b9-4a36-9387-a649c63273d3
```