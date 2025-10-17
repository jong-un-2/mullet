# Mars CLI 命令完整列表

## 📋 所有可用命令

### 1. 初始化和管理员命令

#### `init` - 初始化项目
初始化 Mars 程序的全局状态和 vault 账户
```bash
npm run script init
```

#### `change-admin` - 更改管理员
将管理员权限转移给新地址（两步流程的第一步）
```bash
npm run script change-admin -n <NEW_ADMIN_ADDRESS>

# 示例
npm run script change-admin -n A9WxRgrw9m3PMU7X3kgN9baSaBnLyNMpxnb3ENBzXaGr
```

#### `accept-authority` - 接受管理员权限
新管理员接受管理员角色（两步流程的第二步）
```bash
npm run script accept-authority
```

### 2. 全局配置命令

#### `update-global-state-params` - 更新全局状态参数
更新再平衡阈值、跨链费用和最大订单金额
```bash
npm run script update-global-state-params \
  -rt <REBALANCE_THRESHOLD> \
  -cfb <CROSS_CHAIN_FEE_BPS> \
  -moa <MAX_ORDER_AMOUNT>

# 示例
npm run script update-global-state-params -rt 80 -cfb 5 -moa 110000000000
```
**参数说明**：
- `-rt, --rebalance_threshold`: 再平衡阈值
- `-cfb, --cross_chain_fee_bps`: 跨链费用（basis points）
- `-moa, --max_order_amount`: 最大订单金额

#### `set-target-chain-min-fee` - 设置目标链最小费用
设置特定目标链的最小费用
```bash
npm run script set-target-chain-min-fee -d <DEST_CHAIN_ID> -f <MIN_FEE>

# 示例
npm run script set-target-chain-min-fee -d 10 -f 1
```
**参数说明**：
- `-d, --dest_chain_id`: 目标链 ID
- `-f, --min_fee`: 最小费用

### 3. 费用配置命令

#### `set-fee-tiers` - 设置费用等级
设置费用等级结构
```bash
npm run script set-fee-tiers
```

#### `set-insurance-fee-tiers` - 设置保险费用等级
设置保险费用等级结构
```bash
npm run script set-insurance-fee-tiers
```

#### `set-protocol-fee-fraction` - 设置协议费用比例
设置协议费用的分子和分母
```bash
npm run script set-protocol-fee-fraction -n <NUMERATOR> -d <DENOMINATOR>

# 示例：设置为 1/100 (1%)
npm run script set-protocol-fee-fraction -n 1 -d 100
```
**参数说明**：
- `-n, --numerator`: 分子
- `-d, --denominator`: 分母

### 4. Vault 费用管理命令

#### `claim-fees` - 提取指定类型的费用
管理员提取 Vault 中累积的特定类型费用
```bash
npm run script claim-fees \
  -v <VAULT_ID> \
  -a <AMOUNT> \
  -t <FEE_TYPE>

# 示例：提取 100 个存款费用
npm run script claim-fees \
  -v 0000000000000000000000000000000000000000000000000000000000000001 \
  -a 100 \
  -t deposit
```
**参数说明**：
- `-v, --vault_id`: Vault ID (32 字节 hex)
- `-a, --amount`: 提取金额
- `-t, --fee_type`: 费用类型 (deposit, withdraw, management, performance)

#### `claim-all-fees` - 提取所有费用
管理员一次性提取 Vault 中所有累积的费用
```bash
npm run script claim-all-fees -v <VAULT_ID>

# 示例
npm run script claim-all-fees -v 0000000000000000000000000000000000000000000000000000000000000001
```
**参数说明**：
- `-v, --vault_id`: Vault ID (32 字节 hex)

#### `update-vault-platform-fee` - 更新 Vault 平台费率 ⭐ 新增
动态更新 Vault 的平台费率配置
```bash
npm run script update-vault-platform-fee \
  -m <VAULT_MINT> \
  -f <FEE_BPS>

# 示例：设置为 25% (2500 bps)
npm run script update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 2500

# 示例：设置为 10% (1000 bps)
npm run script update-vault-platform-fee \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 1000
```
**参数说明**：
- `-m, --vault_mint`: Vault 基础代币 mint 地址
- `-f, --fee_bps`: 新的平台费率（basis points，如 2500 = 25%）

### 5. Jito 相关命令

#### `get-jito-tip` - 获取 Jito tip 金额
查询 Jito tip 账户的平均 tip 金额
```bash
npm run script get-jito-tip
```

## 🔧 通用参数

所有命令都支持以下可选参数：

### `-e, --env <string>` - Solana 网络环境
指定要连接的 Solana 网络
```bash
-e mainnet-beta   # 主网（默认）
-e devnet         # 开发网
-e testnet        # 测试网
```

### `-k, --keypair <string>` - 钱包路径
指定管理员钱包的 keypair 文件路径
```bash
-k ~/.config/solana/mars-temp-admin.json  # 默认路径
-k /path/to/your/keypair.json
```

### `-r, --rpc <string>` - RPC URL
指定 Solana RPC 节点地址
```bash
-r https://mainnet.helius-rpc.com/?api-key=YOUR_KEY  # 默认
-r https://api.devnet.solana.com
```

## 📝 完整命令示例

### 初始化新项目
```bash
# 1. 初始化项目（仅执行一次）
npm run script init -e devnet -k ./admin-keypair.json

# 2. 配置全局参数
npm run script update-global-state-params \
  -e devnet \
  -rt 80 \
  -cfb 5 \
  -moa 110000000000

# 3. 设置费用结构
npm run script set-fee-tiers -e devnet
npm run script set-insurance-fee-tiers -e devnet
npm run script set-protocol-fee-fraction -n 1 -d 100 -e devnet
```

### 管理员权限转移
```bash
# 当前管理员：提名新管理员
npm run script change-admin \
  -e mainnet-beta \
  -n A9WxRgrw9m3PMU7X3kgN9baSaBnLyNMpxnb3ENBzXaGr

# 新管理员：接受权限
npm run script accept-authority \
  -e mainnet-beta \
  -k /path/to/new-admin-keypair.json
```

### Vault 费用管理
```bash
# 查看 Vault 状态后提取费用
npm run script claim-fees \
  -e mainnet-beta \
  -v 0000000000000000000000000000000000000000000000000000000000000001 \
  -a 1000 \
  -t deposit

# 或一次性提取所有费用
npm run script claim-all-fees \
  -e mainnet-beta \
  -v 0000000000000000000000000000000000000000000000000000000000000001
```

### 平台费率调整
```bash
# 调整 PYUSD Vault 的平台费率
npm run script update-vault-platform-fee \
  -e mainnet-beta \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 2500

# 推广期降低费率
npm run script update-vault-platform-fee \
  -e mainnet-beta \
  -m 2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo \
  -f 500
```

## 🎯 常用工作流程

### 日常运维流程
```bash
# 1. 查询 Jito tip（可选）
npm run script get-jito-tip

# 2. 提取累积的费用
npm run script claim-all-fees -v <VAULT_ID>

# 3. 根据市场情况调整费率
npm run script update-vault-platform-fee -m <MINT> -f <NEW_FEE>

# 4. 更新全局配置（如需要）
npm run script update-global-state-params -rt 80 -cfb 5
```

### 应急响应流程
```bash
# 1. 紧急调整费率
npm run script update-vault-platform-fee -m <MINT> -f 0

# 2. 提取所有费用
npm run script claim-all-fees -v <VAULT_ID>

# 3. 如需要，转移管理员权限
npm run script change-admin -n <NEW_ADMIN>
```

## ⚠️ 注意事项

1. **权限要求**：
   - 大部分命令需要管理员权限
   - 确保使用正确的 keypair 文件

2. **网络选择**：
   - 开发测试：使用 `-e devnet`
   - 生产环境：使用 `-e mainnet-beta`

3. **Gas 费用**：
   - 主网操作会消耗 SOL
   - 确保钱包有足够余额

4. **数据验证**：
   - 重要操作前在 devnet 测试
   - 使用 Solana Explorer 验证交易

5. **备份**：
   - 保管好 keypair 文件
   - 记录所有重要的账户地址

## 📞 获取帮助

查看命令帮助：
```bash
# 查看所有命令
npm run script --help

# 查看特定命令的帮助（如果支持）
npm run script init --help
```

查看版本：
```bash
npm run script --version
```

## 🔗 相关文档

- [CONFIGURABLE_PLATFORM_FEE_GUIDE.md](./CONFIGURABLE_PLATFORM_FEE_GUIDE.md) - 平台费配置详细指南
- [CONFIGURABLE_FEE_SUMMARY.md](./CONFIGURABLE_FEE_SUMMARY.md) - 费用系统总结
- [README.md](./README.md) - 项目总体说明

## 📊 命令分类汇总

### 初始化 (1 个命令)
- `init`

### 管理员管理 (2 个命令)
- `change-admin`
- `accept-authority`

### 全局配置 (2 个命令)
- `update-global-state-params`
- `set-target-chain-min-fee`

### 费用配置 (3 个命令)
- `set-fee-tiers`
- `set-insurance-fee-tiers`
- `set-protocol-fee-fraction`

### Vault 管理 (3 个命令)
- `claim-fees`
- `claim-all-fees`
- `update-vault-platform-fee` ⭐ 新增

### 工具 (1 个命令)
- `get-jito-tip`

**总计：12 个命令**
