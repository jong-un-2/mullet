# Mars Admin - Mars 协议管理后台

Mars Protocol 管理后台是基于 [Ant Design Pro](https://pro.ant.design) 构建的企业级管理平台，为 Mars 跨链 DeFi 协议提供完整的后台管理功能。

## 🚀 核心功能

### 👥 用户管理
- **用户列表**: 查看和管理所有用户
- **用户详情**: 用户资产、交易历史、持仓信息
- **权限管理**: 基于角色的访问控制
- **用户分组**: 用户标签和分组管理

### 💼 钱包管理
- **钱包总览**: 多链钱包地址统计
- **资产监控**: 实时钱包余额追踪
- **交易记录**: 完整的交易历史查询
- **异常检测**: 异常交易自动告警

### 📊 数据分析
- **财务报表**: 收入、支出、利润统计
- **交易统计**: DEX 交易量、手续费收入
- **Vault 分析**: TVL、APY、用户增长
- **用户行为**: 活跃用户、留存率分析

### 🏦 资金管理
- **资金结算**: 平台费用结算和分配
- **提现管理**: 用户提现审核和处理
- **资金池管理**: 流动性池配置和监控
- **资金释放**: 锁仓代币释放管理

### 🛠️ 系统管理
- **管理员管理**: 管理员账户和权限
- **系统配置**: 平台参数配置
- **通知管理**: 系统通知和公告
- **操作日志**: 完整的操作审计日志

## 💻 技术栈

### 前端框架
- **React 18**: 现代化的 React 特性
- **Ant Design 5**: 企业级 UI 组件库
- **Ant Design Pro 2.8**: 开箱即用的管理系统方案
- **UmiJS 4**: 企业级前端应用框架
- **TypeScript**: 类型安全保障

### 数据可视化
- **Ant Design Charts**: 基于 G2 的图表库
- **Ant Design Plots**: 统计图表组件
- **ECharts 5**: 强大的数据可视化库

### 状态管理
- **Umi Model**: 轻量级状态管理
- **React Query**: 服务端状态同步
- **Local Storage**: 本地数据持久化

## 🔑 默认登录信息

**管理员账户：**
- 账号：`jong-un`
- 密码：`marspwd123!@#`

⚠️ **安全提示**: 首次登录后请立即修改默认密码！

## 🛠️ 环境准备

### 环境要求
- **Node.js 18+**: 支持最新的 JavaScript 特性
- **npm 或 yarn**: 包管理器
- **Git**: 版本控制

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 yarn（推荐）
yarn install

# 或使用 pnpm
pnpm install
```

## 🚀 快速开始

### 开发环境

```bash
# 启动开发服务器
npm start
# 或
yarn start

# 应用将在 http://localhost:8000 打开
```

### 不同环境启动

```bash
# 开发环境
npm run start:dev

# 测试环境
npm run start:test

# 预发布环境
npm run start:pre

# 不使用 Mock 数据
npm run start:no-mock
```

## 📁 项目结构

```
mars-admin/
├── src/
│   ├── pages/                  # 页面组件
│   │   ├── Welcome.tsx         # 欢迎页
│   │   ├── User/              # 用户管理
│   │   ├── Wallet/            # 钱包管理
│   │   ├── userManage/        # 用户管理详细
│   │   ├── adminUser/         # 管理员管理
│   │   ├── financialStatements/ # 财务报表
│   │   ├── fundSettlement/    # 资金结算
│   │   ├── releaseFunds/      # 资金释放
│   │   ├── payManage/         # 支付管理
│   │   ├── outManage/         # 提现管理
│   │   ├── orderRecord/       # 订单记录
│   │   ├── Product/           # 产品管理
│   │   ├── notice/            # 通知管理
│   │   ├── msgManage/         # 消息管理
│   │   ├── banner/            # Banner 管理
│   │   ├── tgGroup/           # Telegram 群组
│   │   ├── agent/             # 代理管理
│   │   ├── active/            # 活动管理
│   │   └── settlement/        # 结算管理
│   │
│   ├── components/             # 公共组件
│   │   ├── Footer/            # 页脚组件
│   │   ├── HeaderDropdown/    # 头部下拉菜单
│   │   └── RightContent/      # 右侧内容
│   │
│   ├── services/               # API 服务
│   │   ├── ant-design-pro/    # Pro 服务
│   │   └── swagger/           # Swagger API
│   │
│   ├── locales/                # 国际化
│   │   ├── zh-CN/             # 简体中文
│   │   ├── zh-TW/             # 繁体中文
│   │   ├── en-US/             # 英文
│   │   ├── ja-JP/             # 日文
│   │   ├── pt-BR/             # 葡萄牙文
│   │   ├── id-ID/             # 印尼文
│   │   ├── fa-IR/             # 波斯文
│   │   └── bn-BD/             # 孟加拉文
│   │
│   ├── .umi/                   # Umi 临时文件
│   ├── .umi-production/        # 生产构建临时文件
│   ├── access.ts               # 权限配置
│   ├── app.tsx                 # 应用入口配置
│   ├── global.less             # 全局样式
│   └── global.tsx              # 全局配置
│
├── config/                     # 配置文件
│   ├── config.ts               # Umi 配置
│   ├── defaultSettings.ts      # 默认设置
│   ├── proxy.ts                # 代理配置
│   └── routes.ts               # 路由配置
│
├── mock/                       # Mock 数据
│   ├── user.ts                 # 用户 Mock
│   ├── notices.ts              # 通知 Mock
│   └── route.ts                # 路由 Mock
│
├── public/                     # 静态资源
│   ├── icons/                  # 图标
│   └── images/                 # 图片
│
├── tests/                      # 测试文件
│   └── setupTests.jsx
│
├── package.json                # 项目依赖
├── tsconfig.json              # TypeScript 配置
└── README.md                  # 项目说明
```

## 🔨 可用脚本

### 开发相关

```bash
# 启动开发服务器
npm start                   # 默认开发环境
npm run dev                 # 同上
npm run start:dev          # 开发环境
npm run start:test         # 测试环境
npm run start:pre          # 预发布环境
npm run start:no-mock      # 不使用 Mock 数据

# 构建
npm run build              # 生产构建
npm run preview            # 预览构建结果
```

### 代码质量

```bash
# 代码检查
npm run lint               # 运行所有检查
npm run lint:js            # JavaScript/TypeScript 检查
npm run lint:prettier      # Prettier 格式检查
npm run tsc                # TypeScript 类型检查

# 代码修复
npm run lint:fix           # 自动修复 ESLint 问题
npm run prettier           # 格式化所有文件
```

### 测试

```bash
# 运行测试
npm run test               # 运行所有测试
npm run test:coverage      # 生成测试覆盖率
npm run test:update        # 更新快照
```

### 其他工具

```bash
# OpenAPI 代码生成
npm run openapi            # 生成 API 类型定义

# 国际化
npm run i18n-remove        # 移除未使用的国际化

# 部署
npm run deploy             # 构建并部署到 GitHub Pages
npm run gh-pages           # 部署到 GitHub Pages

# 分析
npm run analyze            # 构建并分析包大小
```

## 🌍 国际化

项目支持多语言切换：

- 🇨🇳 简体中文 (zh-CN)
- 🇹🇼 繁体中文 (zh-TW)
- 🇺🇸 英文 (en-US)
- 🇯🇵 日文 (ja-JP)
- 🇧🇷 葡萄牙文 (pt-BR)
- 🇮🇩 印尼文 (id-ID)
- 🇮🇷 波斯文 (fa-IR)
- 🇧🇩 孟加拉文 (bn-BD)

## 🔐 权限管理

### 权限配置

权限配置在 `src/access.ts` 文件中定义：

```typescript
export default function access(initialState: { currentUser?: API.CurrentUser }) {
  const { currentUser } = initialState || {};
  return {
    canAdmin: currentUser && currentUser.access === 'admin',
    canUser: currentUser && currentUser.access === 'user',
  };
}
```

### 路由权限

在路由配置中使用 `access` 字段控制访问权限：

```typescript
{
  path: '/admin',
  name: 'admin',
  icon: 'crown',
  access: 'canAdmin',
  routes: [
    // 子路由
  ],
}
```

## 🎨 主题定制

### 修改主题色

在 `config/defaultSettings.ts` 中修改：

```typescript
const Settings: ProLayoutProps & {
  pwa?: boolean;
  logo?: string;
} = {
  navTheme: 'light',
  primaryColor: '#1890ff',
  layout: 'mix',
  contentWidth: 'Fluid',
  // ...其他配置
};
```

## 📡 API 配置

### 代理配置

开发环境代理配置在 `config/proxy.ts`：

```typescript
export default {
  server: {
    middlewares: [
      (req, res, next) => {
        // Mock API proxy
        if (req.url.startsWith('/api/')) {
          req.url = req.url.replace('/api/', '/');
        }
        next();
      },
    ],
    proxy: {
      '/api': {
        target: 'https://api.marsliquidity.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
};
```

### OpenAPI 集成

项目支持 OpenAPI 自动生成 API 类型定义：

```bash
# 生成 API 类型
npm run openapi
```

## 🧪 测试

### 运行测试

```bash
# 运行所有测试
npm run test

# 生成覆盖率报告
npm run test:coverage

# 更新测试快照
npm run test:update
```

### 测试配置

测试配置在 `jest.config.ts` 文件中。

## 📦 构建部署

### 构建生产版本

```bash
# 构建
npm run build

# 构建文件将输出到 dist/ 目录
```

### 部署到 GitHub Pages

```bash
# 构建并部署
npm run deploy

# 或分步执行
npm run build
npm run gh-pages
```

### 部署到其他平台

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod --dir=dist

# 自定义服务器
# 将 dist/ 目录内容复制到 Web 服务器
```

## 🔍 开发调试

### 开发者工具

- **React DevTools**: React 组件调试
- **Redux DevTools**: 状态调试（如果使用）
- **Network 面板**: API 请求调试
- **Console**: 查看日志输出

### Mock 数据

开发环境自动启用 Mock 数据，配置在 `mock/` 目录：

```bash
# 启动时禁用 Mock
npm run start:no-mock
```

## 🤝 贡献指南

### 开发流程

```bash
# 1. Fork 并克隆项目
git clone https://github.com/your-username/mars-liquid.git
cd mars-liquid/mars-admin

# 2. 创建功能分支
git checkout -b feature/your-feature

# 3. 开发和测试
npm run dev
npm run lint
npm run test

# 4. 提交更改
git commit -m "feat: add your feature"

# 5. 推送并创建 Pull Request
git push origin feature/your-feature
```

### 代码规范

- **ESLint**: JavaScript/TypeScript 代码规范
- **Prettier**: 代码格式化
- **Husky**: Git Hooks 自动检查
- **Lint-staged**: 提交前代码检查
- **Commit 规范**: 使用语义化提交消息

## 📚 相关文档

- 📖 [Ant Design Pro 官方文档](https://pro.ant.design)
- 📖 [UmiJS 文档](https://umijs.org)
- 📖 [Ant Design 文档](https://ant.design)
- 📖 [Mars 主项目](../README.md)
- 📖 [Mars 后端](../backend/README.md)
- 📖 [Mars 前端](../frontend/README.md)
- 📖 [Mars 合约](../contracts-solana/README.md)

## 📞 支持与反馈

- 🐛 **Bug 报告**: [GitHub Issues](https://github.com/jong-un-1/mars-liquid/issues)
- 💡 **功能建议**: [GitHub Discussions](https://github.com/jong-un-1/mars-liquid/discussions)
- 📧 **邮件联系**: support@mars-liquid.finance

## 📄 许可证

本项目采用 [MIT License](../LICENSE) 开源协议。

---

**开发团队**: Mars Liquid Protocol Team  
**项目版本**: 1.0.0  
**框架版本**: Ant Design Pro 2.8, UmiJS 4.3  
**最后更新**: 2025年10月

**Mars Admin** - 专业的 DeFi 协议管理平台 🚀
