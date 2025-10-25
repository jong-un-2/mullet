# IPFS 部署指南 - Pinata + Cloudflare Gateway

本指南介绍如何使用 Pinata 将 Mars Liquid 前端部署到 IPFS，并通过 Cloudflare Gateway 提供快速访问。

## 📋 前置条件

1. **Pinata 账户**
   - 注册地址: https://www.pinata.cloud/
   - 免费层级: 1GB 存储 + 每月 100GB 带宽
   - 无需信用卡

2. **Cloudflare 账户** (可选，用于自定义域名)
   - 注册地址: https://cloudflare.com
   - 完全免费使用 IPFS Gateway

## 🚀 快速开始

### 步骤 1: 注册 Pinata

1. 访问 [Pinata Cloud](https://www.pinata.cloud/)
2. 点击 "Sign Up" 注册免费账户
3. 验证邮箱并登录

### 步骤 2: 获取 API Token

1. 登录后，进入 **Dashboard**
2. 点击左侧菜单 **API Keys**
3. 点击 **New Key** 按钮
4. 配置权限:
   - ✅ `pinFileToIPFS`
   - ✅ `pinJSONToIPFS`
5. 给 Key 起个名字，例如: `mars-liquid-deploy`
6. 点击 **Create Key**
7. **重要**: 复制显示的 **JWT Token**（只会显示一次！）

### 步骤 3: 配置环境变量

在 `frontend` 目录下配置环境变量：

```bash
cd frontend

# 复制 .env.example 为 .env
cp .env.example .env
```

编辑 `.env` 文件，找到 IPFS 部署配置部分，填入你的 JWT Token：

```bash
# ======================================
# IPFS 部署配置 (Pinata)
# ======================================
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...你的实际token
```

### 步骤 4: 构建和部署

```bash
# 方法 1: 使用 npm 脚本（推荐）
npm run deploy:ipfs

# 方法 2: 直接运行脚本
./deploy-to-ipfs.sh

# 方法 3: 手动构建后部署
npm run build
./deploy-to-ipfs.sh
```

### 步骤 5: 访问你的网站

部署成功后，你会看到类似输出：

```bash
✅ 上传成功！
CID: QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx

📍 通过 Cloudflare Gateway 访问 (推荐):
   https://cloudflare-ipfs.com/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx

🔗 其他访问链接:
   Pinata:    https://gateway.pinata.cloud/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
   IPFS.io:   https://ipfs.io/ipfs/QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXx
```

点击任意链接即可访问！推荐使用 Cloudflare Gateway，速度最快。

## 🌐 配置自定义域名（可选）

如果你想用自己的域名访问（例如 `ipfs.yourdomain.com`），可以通过 Cloudflare DNSLink 实现。

### 前提条件

- 拥有一个域名
- 域名已添加到 Cloudflare（DNS 托管）

### 配置步骤

#### 1. 在 Cloudflare 添加 CNAME 记录

登录 Cloudflare Dashboard，进入你的域名 DNS 设置：

```
类型: CNAME
名称: ipfs (或任意子域名)
目标: cloudflare-ipfs.com
代理状态: 已代理（橙色云图标）
TTL: 自动
```

#### 2. 添加 DNSLink TXT 记录

```
类型: TXT
名称: _dnslink.ipfs (与上面的 CNAME 对应)
内容: dnslink=/ipfs/YOUR_CID
TTL: 自动
```

**注意**: 将 `YOUR_CID` 替换为实际的 IPFS CID。

#### 3. 访问你的自定义域名

配置完成后，访问: `https://ipfs.yourdomain.com`

### 自动更新 DNSLink

每次部署新版本时，需要更新 DNSLink 记录。可以使用提供的脚本自动化：

#### 配置 Cloudflare API

编辑 `.env` 文件，找到 Cloudflare DNSLink 配置部分，填入你的配置：

```bash
# ======================================
# Cloudflare DNSLink 配置 (可选)
# ======================================
CF_API_TOKEN=your_api_token
CF_ZONE_ID=your_zone_id
CF_DNS_RECORD_ID=your_record_id
CF_DOMAIN=ipfs.yourdomain.com
```

#### 获取 DNS Record ID

```bash
curl -X GET "https://api.cloudflare.com/client/v4/zones/YOUR_ZONE_ID/dns_records?type=TXT&name=_dnslink.ipfs.yourdomain.com" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json"
```

从返回结果中找到 `id` 字段，填入 `CF_DNS_RECORD_ID`。

#### 自动更新脚本

```bash
# 部署后运行此脚本自动更新 DNSLink
npm run ipfs:update-dns

# 或直接运行
./update-dnslink.sh
```

## � 可用命令

```bash
# 构建并部署到 IPFS
npm run deploy:ipfs

# 验证部署（测试各个 Gateway 的可访问性）
npm run ipfs:verify

# 更新自定义域名的 DNSLink
npm run ipfs:update-dns

# 仅构建（不部署）
npm run build
```

## 🔧 项目配置说明

### Vite 配置已优化

`vite.config.ts` 已配置支持 IPFS 部署：

- ✅ `base: './'` - 使用相对路径，兼容任意 IPFS Gateway
- ✅ 资源文件名包含 hash，便于缓存
- ✅ 优化的代码分割策略

### 路由注意事项

如果你的应用使用客户端路由（如 React Router），有两种方案：

**方案 1: 使用 Hash Router（推荐）**
```typescript
import { HashRouter } from 'react-router-dom'

function App() {
  return (
    <HashRouter>
      {/* 路由配置 */}
    </HashRouter>
  )
}
```

**方案 2: 配置 IPFS Gateway 回退**

部分 Gateway（如 Fleek）支持配置 SPA 回退到 `index.html`。

## 🔍 验证部署

使用提供的验证脚本自动检查：

```bash
npm run ipfs:verify
```

脚本会检查：
- ✅ 各个 IPFS Gateway 的可访问性
- ✅ index.html 文件是否存在
- ✅ 静态资源文件是否可以正常加载
- ✅ IPFS 网络传播状态

手动验证：
```bash
# 获取最新的 CID
CID=$(cat .latest-cid)

# 测试 Cloudflare Gateway
curl -I https://cloudflare-ipfs.com/ipfs/$CID

# 检查 HTML 内容
curl https://cloudflare-ipfs.com/ipfs/$CID/index.html | head -20
```

## 🚨 常见问题

### 1. 上传失败 - 401 Unauthorized

**问题**: `PINATA_JWT` 无效或过期

**解决方案**:
- 检查 `.env` 文件中的 JWT Token 是否正确
- 确保复制时没有多余的空格或换行
- 在 Pinata Dashboard 重新生成新的 API Key

### 2. 首次访问很慢

**问题**: IPFS 内容需要传播到网络

**解决方案**:
- 正常现象，首次访问可能需要 1-2 分钟
- 使用 Cloudflare Gateway（最快）
- Pinata 自动固定（pin）你的内容，后续访问会很快

### 3. 资源文件 404

**问题**: CSS/JS 文件路径不正确

**解决方案**:
- 项目已配置 `base: './'`，使用相对路径
- 检查构建输出 `dist` 目录结构
- 确保 `npm run build` 成功完成

### 4. 路由刷新后 404

**问题**: 直接访问 `/portfolio` 等路由返回 404

**解决方案**:
- 使用 Hash Router: `/#/portfolio`
- 或使用支持 SPA 回退的 Gateway（如 Fleek）

### 5. 更新内容不生效

**问题**: 部署新版本但看到旧内容

**解决方案**:
- CID 是内容寻址，每次部署会生成新的 CID
- 如果使用自定义域名，需要更新 DNSLink 记录
- 清除浏览器缓存（Ctrl+Shift+R 或 Cmd+Shift+R）
- DNS 记录更新可能需要几分钟生效

### 6. API 请求失败

**问题**: CORS 错误或混合内容警告

**解决方案**:
- 确保所有 API 端点使用 HTTPS
- 后端 API 需要配置正确的 CORS 头
- 检查 Cloudflare 或 API Gateway 的 SSL/TLS 设置

## � 成本说明

### Pinata 免费层级

- ✅ **1GB** 存储空间
- ✅ **100GB/月** 带宽
- ✅ 无限请求次数
- ✅ 无需信用卡

对于大多数前端项目完全够用！

一个典型的 React 应用构建后约 5-10MB，可以部署 100+ 个版本。

### Cloudflare Gateway

- ✅ **完全免费**
- ✅ 全球 CDN 加速
- ✅ 无带宽限制
- ✅ 自动缓存优化

## � CI/CD 自动化部署

项目已包含 GitHub Actions 工作流，可以自动部署到 IPFS。

### 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库 **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret** 添加：

```
PINATA_JWT          = 你的 Pinata JWT Token
```

可选（如果使用自定义域名）：
```
CF_API_TOKEN        = Cloudflare API Token
CF_ZONE_ID          = Cloudflare Zone ID
CF_DNS_RECORD_ID    = DNS Record ID
CF_DOMAIN           = 你的域名 (如 ipfs.yourdomain.com)
```

### 自动部署

配置完成后，每次推送代码到 `main` 分支的 `frontend` 目录：

1. ✅ 自动构建项目
2. ✅ 部署到 Pinata IPFS
3. ✅ （可选）更新 Cloudflare DNSLink
4. ✅ 在 PR 中评论预览链接

## 🔐 安全建议

1. ✅ **环境变量隔离**: API Token 存储在 `.env` 文件中，已在 `.gitignore` 中排除
2. ✅ **最小权限**: Pinata API Key 仅授予必要的上传权限
3. ✅ **定期轮换**: 每 3-6 个月更新一次 API Token
4. ✅ **前端安全**: 不在代码中硬编码任何密钥或私钥
5. ✅ **HTTPS Only**: 确保所有 API 请求使用 HTTPS

**注意**: 
- `.env` 文件已在 `.gitignore` 中，不会提交到 Git
- GitHub Actions 使用 Secrets 管理敏感信息，更加安全

## 💡 最佳实践

### 1. 版本管理
部署脚本会自动保存部署历史到 `.deployment-history`：
```bash
cat .deployment-history
# 2025-01-15 10:30:00 | QmXxXxXx... | Pinata
# 2025-01-16 15:45:00 | QmYyYyYy... | Pinata
```

### 2. 快速回滚
如果新版本有问题，可以快速切换到旧版本：
```bash
# 查看历史 CID
cat .deployment-history

# 更新 DNSLink 到旧的 CID
# 编辑 .latest-cid 文件为旧的 CID
echo "QmOldCID..." > .latest-cid

# 更新域名解析
npm run ipfs:update-dns
```

### 3. 多 Gateway 访问
建议同时使用多个 Gateway 链接，提高可用性：
- 主链接: Cloudflare Gateway（最快）
- 备用: Pinata Gateway
- 备用: IPFS.io Gateway

### 4. 监控和分析
- 使用 Pinata Dashboard 查看文件访问统计
- 监控带宽使用情况
- 定期检查 Gateway 响应速度

## 📚 参考资源

- 📖 [IPFS 官方文档](https://docs.ipfs.tech/)
- 📌 [Pinata 文档](https://docs.pinata.cloud/)
- ☁️ [Cloudflare IPFS Gateway](https://developers.cloudflare.com/web3/ipfs-gateway/)
- 🔗 [DNSLink 规范](https://dnslink.io/)
- 🎓 [IPFS 最佳实践](https://docs.ipfs.tech/concepts/best-practices/)

## 🆘 获取帮助

遇到问题？

1. 查看本文档的 **常见问题** 部分
2. 运行 `npm run ipfs:verify` 诊断问题
3. 检查 [Pinata Status](https://status.pinata.cloud/)
4. 访问 [IPFS 论坛](https://discuss.ipfs.tech/)

## � 下一步

部署成功后，你可以：

- ✅ 配置自定义域名，提供更好的用户体验
- ✅ 设置 CI/CD 自动化部署
- ✅ 监控网站性能和访问统计
- ✅ 探索更多 Web3 托管方案
